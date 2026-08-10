import { prisma } from '@/lib/prisma';

export type AcsDuplicateCandidate = {
  id: string;
  device_ip: string;
  employee_no: string;
  name: string | null;
  department: string | null;
  system_user_id: string | null;
  eventsCount: number;
  isNumericId: boolean;
};

export type AcsDuplicateGroup = {
  key: string;
  displayName: string;
  candidates: AcsDuplicateCandidate[];
  /** ID proposé à garder (numérique en priorité) */
  suggestedKeepEmployeeNo: string;
};

function normalizePersonName(name: string | null | undefined): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function isNumericEmployeeNo(employeeNo: string): boolean {
  const s = String(employeeNo || '').trim();
  // "004", "47", éventuellement avec apostrophe Excel
  const cleaned = s.replace(/^'+|'+$/g, '');
  return /^\d+$/.test(cleaned);
}

function scoreCandidate(c: {
  employee_no: string;
  eventsCount: number;
  system_user_id: string | null;
}): number {
  let score = 0;
  if (isNumericEmployeeNo(c.employee_no)) score += 1000;
  if (c.system_user_id) score += 50;
  score += Math.min(c.eventsCount, 500);
  // préfère les ID courts numériques ("004" vs "0004") — déjà couvert par numeric
  if (String(c.employee_no).startsWith('n:')) score -= 200;
  return score;
}

/**
 * Détecte les doublons ACS : même nom normalisé, employee_no distincts.
 */
export async function listAcsDuplicateGroups(params?: {
  search?: string;
}): Promise<AcsDuplicateGroup[]> {
  if (!prisma) return [];

  const users = await prisma.acs_users.findMany({
    select: {
      id: true,
      device_ip: true,
      employee_no: true,
      name: true,
      department: true,
      system_user_id: true,
    },
    orderBy: { name: 'asc' },
  });

  const search = (params?.search || '').trim().toLowerCase();
  const filtered = search
    ? users.filter((u) => {
        const hay = `${u.name || ''} ${u.employee_no}`.toLowerCase();
        return hay.includes(search);
      })
    : users;

  const eventCounts = await prisma.acs_events.groupBy({
    by: ['employee_no'],
    _count: { _all: true },
    where: {
      employee_no: {
        in: [
          ...new Set(
            filtered.map((u) => u.employee_no).filter((x): x is string => !!x)
          ),
        ],
      },
    },
  });
  const countMap = new Map<string, number>();
  for (const row of eventCounts) {
    if (row.employee_no) {
      countMap.set(row.employee_no, row._count._all);
    }
  }

  const byName = new Map<string, typeof filtered>();
  for (const u of filtered) {
    const key = normalizePersonName(u.name);
    if (!key || key.length < 2) continue;
    const list = byName.get(key) || [];
    list.push(u);
    byName.set(key, list);
  }

  const groups: AcsDuplicateGroup[] = [];
  for (const [key, list] of byName) {
    const uniqueNos = [
      ...new Set(list.map((u) => String(u.employee_no).trim()).filter(Boolean)),
    ];
    if (uniqueNos.length < 2) continue;

    // Une entrée par employee_no (si multi-device, on agrège)
    const byNo = new Map<string, AcsDuplicateCandidate>();
    for (const u of list) {
      const no = String(u.employee_no).trim();
      const existing = byNo.get(no);
      const eventsCount = countMap.get(no) || 0;
      if (!existing) {
        byNo.set(no, {
          id: String(u.id),
          device_ip: u.device_ip,
          employee_no: no,
          name: u.name,
          department: u.department,
          system_user_id:
            u.system_user_id != null ? String(u.system_user_id) : null,
          eventsCount,
          isNumericId: isNumericEmployeeNo(no),
        });
      } else {
        existing.eventsCount = Math.max(existing.eventsCount, eventsCount);
        if (!existing.system_user_id && u.system_user_id != null) {
          existing.system_user_id = String(u.system_user_id);
          existing.id = String(u.id);
        }
      }
    }

    const candidates = [...byNo.values()].sort(
      (a, b) => scoreCandidate(b) - scoreCandidate(a)
    );
    if (candidates.length < 2) continue;

    groups.push({
      key,
      displayName: candidates[0]?.name || key,
      candidates,
      suggestedKeepEmployeeNo: candidates[0].employee_no,
    });
  }

  groups.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' })
  );
  return groups;
}

export type MergeAcsDuplicateResult = {
  keepEmployeeNo: string;
  mergedEmployeeNos: string[];
  eventsUpdated: number;
  cardsUpdated: number;
  monitoringUpdated: number;
  ivmsUpdated: number;
  usersDeleted: number;
};

/**
 * Fusionne un ou plusieurs employee_no sources dans keepEmployeeNo.
 * Additive / safe : repointer les FKs texte, consolider acs_users, supprimer les lignes alias.
 */
export async function mergeAcsDuplicates(params: {
  keepEmployeeNo: string;
  mergeEmployeeNos: string[];
}): Promise<MergeAcsDuplicateResult> {
  if (!prisma) {
    throw new Error('Prisma non initialisé');
  }

  const keep = String(params.keepEmployeeNo || '').trim();
  const sources = [
    ...new Set(
      (params.mergeEmployeeNos || [])
        .map((x) => String(x || '').trim())
        .filter((x) => x && x !== keep)
    ),
  ];

  if (!keep) throw new Error('ID à conserver requis');
  if (sources.length === 0) {
    throw new Error('Aucun ID source à fusionner');
  }

  const keepUsers = await prisma.acs_users.findMany({
    where: { employee_no: keep },
  });
  if (keepUsers.length === 0) {
    throw new Error(`Aucune fiche ACS pour l'ID à conserver « ${keep} »`);
  }

  let eventsUpdated = 0;
  let cardsUpdated = 0;
  let monitoringUpdated = 0;
  let ivmsUpdated = 0;
  let usersDeleted = 0;

  await prisma.$transaction(async (tx) => {
    // 1) Pointages
    const ev = await tx.acs_events.updateMany({
      where: { employee_no: { in: sources } },
      data: { employee_no: keep },
    });
    eventsUpdated = ev.count;

    // 2) Cartes — éviter collision unique (device_ip, card_no)
    for (const src of sources) {
      const cards = await tx.acs_cards.findMany({ where: { employee_no: src } });
      for (const card of cards) {
        const clash = await tx.acs_cards.findFirst({
          where: {
            device_ip: card.device_ip,
            card_no: card.card_no,
            employee_no: keep,
          },
        });
        if (clash) {
          await tx.acs_cards.delete({ where: { id: card.id } });
        } else {
          await tx.acs_cards.update({
            where: { id: card.id },
            data: { employee_no: keep },
          });
          cardsUpdated += 1;
        }
      }
    }

    // 3) Monitoring présence — unique (employee_no, year, month, rule_code)
    try {
      const mon = (tx as any).presenceMonitoringAction;
      if (mon) {
        const actions = await mon.findMany({
          where: { employee_no: { in: sources } },
        });
        for (const action of actions) {
          const clash = await mon.findFirst({
            where: {
              employee_no: keep,
              year: action.year,
              month: action.month,
              rule_code: action.rule_code,
            },
          });
          if (clash) {
            await mon.delete({ where: { id: action.id } });
          } else {
            await mon.update({
              where: { id: action.id },
              data: { employee_no: keep },
            });
            monitoringUpdated += 1;
          }
        }
      }
    } catch {
      /* table absente */
    }

    // 4) Tampon iVMS
    try {
      const iv = await tx.ivms_attendance.updateMany({
        where: { employee_no: { in: sources } },
        data: { employee_no: keep },
      });
      ivmsUpdated = iv.count;
    } catch {
      /* ignore */
    }

    // 5) Consolider acs_users : transférer system_user_id si besoin, puis supprimer alias
    const keepPrimary = keepUsers[0];
    let keepHasSystem =
      keepUsers.some((u) => u.system_user_id != null) ||
      keepPrimary.system_user_id != null;

    const sourceUsers = await tx.acs_users.findMany({
      where: { employee_no: { in: sources } },
    });

    for (const srcUser of sourceUsers) {
      if (srcUser.system_user_id != null && !keepHasSystem) {
        // Libérer unique system_user_id sur la source avant transfert
        await tx.acs_users.update({
          where: { id: srcUser.id },
          data: { system_user_id: null },
        });
        await tx.acs_users.update({
          where: { id: keepPrimary.id },
          data: { system_user_id: srcUser.system_user_id },
        });
        keepHasSystem = true;
      }

      // Enrichir nom/département manquants sur keep
      if (
        (!keepPrimary.name || !String(keepPrimary.name).trim()) &&
        srcUser.name
      ) {
        await tx.acs_users.update({
          where: { id: keepPrimary.id },
          data: { name: srcUser.name },
        });
      }
      if (
        (!keepPrimary.department || !String(keepPrimary.department).trim()) &&
        srcUser.department
      ) {
        await tx.acs_users.update({
          where: { id: keepPrimary.id },
          data: { department: srcUser.department },
        });
      }

      await tx.acs_users.delete({ where: { id: srcUser.id } });
      usersDeleted += 1;
    }
  });

  return {
    keepEmployeeNo: keep,
    mergedEmployeeNos: sources,
    eventsUpdated,
    cardsUpdated,
    monitoringUpdated,
    ivmsUpdated,
    usersDeleted,
  };
}
