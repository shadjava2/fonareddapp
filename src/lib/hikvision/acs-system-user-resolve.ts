import { getAcsSystemUserIds } from '@/lib/hikvision/acs-system-user-link-sql';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import { prisma } from '@/lib/prisma';

export type AcsSystemIdentity = {
  employeeNo: string;
  /** Nom lecteur (ACS), inchangé */
  readerName: string | null;
  /** Nom affiché rapports : système si lié, sinon lecteur */
  displayName: string;
  department: string;
  fonction: string | null;
  role: string | null;
  services: string | null;
  systemUserId: string | null;
  linked: boolean;
};

function normalizeEmployeeNo(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^'+/, '')
    .replace(/'+$/, '')
    .trim();
}

/** Affichage Prénom NOM POST-NOM */
export function formatSystemFullName(u: {
  nom: string;
  postnom?: string | null;
  prenom?: string | null;
}): string {
  return formatPersonDisplayName(u);
}

function acsNameFallback(row: {
  name?: string | null;
  raw?: unknown;
}): string | null {
  const raw = (row.raw as Record<string, unknown>) || {};
  const fromRaw = raw.personName ?? raw.name ?? raw.employeeName ?? raw.Name;
  const n =
    (row.name && String(row.name).trim()) ||
    (fromRaw != null ? String(fromRaw).trim() : '');
  return n || null;
}

type SysUserLoaded = {
  id: bigint;
  nom: string;
  postnom: string | null;
  prenom: string | null;
  username: string;
  fonction: { nom: string } | null;
  role: { nom: string } | null;
  droitsServices: Array<{ service: { designation: string | null } | null }>;
};

export async function loadSystemUsersByIds(
  ids: bigint[]
): Promise<Map<string, SysUserLoaded>> {
  const map = new Map<string, SysUserLoaded>();
  if (ids.length === 0) return map;
  const rows = await prisma.utilisateurs.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nom: true,
      postnom: true,
      prenom: true,
      username: true,
      fonction: { select: { nom: true } },
      role: { select: { nom: true } },
      droitsServices: {
        select: { service: { select: { designation: true } } },
      },
    },
  });
  for (const u of rows) {
    map.set(String(u.id), u as SysUserLoaded);
  }
  return map;
}

function identityFromParts(
  emp: string,
  readerName: string | null,
  sys: SysUserLoaded | null | undefined
): AcsSystemIdentity {
  if (sys) {
    const services = (sys.droitsServices || [])
      .map((d) => (d.service?.designation || '').trim())
      .filter(Boolean);
    const servicesStr = services.length ? services.join(' · ') : null;
    return {
      employeeNo: emp,
      readerName,
      displayName: formatSystemFullName(sys) || readerName || emp,
      department: servicesStr || '—',
      fonction: sys.fonction?.nom?.trim() || null,
      role: sys.role?.nom?.trim() || null,
      services: servicesStr,
      systemUserId: String(sys.id),
      linked: true,
    };
  }
  return {
    employeeNo: emp,
    readerName,
    displayName: readerName || emp,
    // Sans liaison système : pas de service inventé depuis le département ACS
    department: '—',
    fonction: null,
    role: null,
    services: null,
    systemUserId: null,
    linked: false,
  };
}

/**
 * Résout l’identité affichage pour une liste d’employee_no (normalisés ou bruts).
 * Priorité : utilisateur système lié → sinon données ACS lecteur.
 */
export async function resolveAcsSystemIdentities(
  employeeNos: string[]
): Promise<Map<string, AcsSystemIdentity>> {
  const normalized = [
    ...new Set(
      employeeNos
        .map((n) => normalizeEmployeeNo(String(n || '')))
        .filter(Boolean)
    ),
  ];
  const out = new Map<string, AcsSystemIdentity>();
  if (normalized.length === 0) return out;

  const variants = [
    ...new Set(normalized.flatMap((n) => [n, `'${n}`].filter(Boolean))),
  ];

  const acsRows = await prisma.acs_users.findMany({
    where: { employee_no: { in: variants } },
    orderBy: { id: 'desc' },
  });

  const byNo = new Map<string, (typeof acsRows)[number]>();
  for (const row of acsRows) {
    const key = normalizeEmployeeNo(row.employee_no);
    if (!key || byNo.has(key)) continue;
    byNo.set(key, row);
  }

  const linkMap = await getAcsSystemUserIds(
    [...byNo.values()].map((r) => r.id)
  );

  const sysIds = [
    ...new Set(
      [...linkMap.values()].filter((id): id is bigint => id != null)
    ),
  ];
  const sysMap = await loadSystemUsersByIds(sysIds);

  for (const emp of normalized) {
    const row = byNo.get(emp);
    const readerName = row ? acsNameFallback(row) : null;
    const sid = row ? linkMap.get(String(row.id)) : null;
    const sys = sid != null ? sysMap.get(String(sid)) : null;
    out.set(emp, identityFromParts(emp, readerName, sys));
  }

  return out;
}

/** Une seule identité (employé). */
export async function resolveAcsSystemIdentity(
  employeeNo: string
): Promise<AcsSystemIdentity | null> {
  const key = normalizeEmployeeNo(employeeNo);
  if (!key) return null;
  const map = await resolveAcsSystemIdentities([key]);
  return map.get(key) ?? null;
}
