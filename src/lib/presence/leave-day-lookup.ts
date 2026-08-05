import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type LeaveDayKind = 'conge' | 'conge_non_justifie';

/** employee_no → dateKey YYYY-MM-DD → kind (NJ prioritaire) */
export type LeaveDayMap = Map<string, Map<string, LeaveDayKind>>;

function dateKeyFromDb(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachDateKeyInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00.000Z`);
  const end = new Date(`${to}T12:00:00.000Z`);
  while (cur.getTime() <= end.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function normalizeEmployeeNo(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^'+/, '')
    .replace(/'+$/, '')
    .trim();
}

/**
 * Résout utilisateur système → employee_no ACS (liaison system_user_id).
 */
async function employeeNosBySystemUserIds(
  userIds: bigint[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  const rows = await prisma.$queryRaw<
    Array<{ system_user_id: bigint; employee_no: string }>
  >`
    SELECT system_user_id, employee_no
    FROM acs_users
    WHERE system_user_id IN (${Prisma.join(userIds)})
      AND employee_no IS NOT NULL
      AND employee_no <> ''
  `;
  for (const r of rows) {
    const uid = String(r.system_user_id);
    const emp = normalizeEmployeeNo(r.employee_no);
    if (!emp) continue;
    const list = map.get(uid) || [];
    if (!list.includes(emp)) list.push(emp);
    map.set(uid, list);
  }
  return map;
}

function putLeave(
  out: LeaveDayMap,
  employeeNo: string,
  dateKey: string,
  kind: LeaveDayKind
) {
  const emp = normalizeEmployeeNo(employeeNo);
  if (!emp) return;
  let byDay = out.get(emp);
  if (!byDay) {
    byDay = new Map();
    out.set(emp, byDay);
  }
  const existing = byDay.get(dateKey);
  // NJ prioritaire sur Congé
  if (existing === 'conge_non_justifie') return;
  if (kind === 'conge_non_justifie' || !existing) {
    byDay.set(dateKey, kind);
  }
}

/**
 * Charge les jours Congé (demandes APPROUVEE) et Congé non justifié
 * pour une période, indexés par employee_no ACS.
 */
export async function loadLeaveDaysByEmployee(
  from: string,
  to: string
): Promise<LeaveDayMap> {
  const out: LeaveDayMap = new Map();
  const fromD = new Date(`${from}T00:00:00.000Z`);
  const toD = new Date(`${to}T23:59:59.999Z`);

  const [demandes, retraits] = await Promise.all([
    prisma.congedemande.findMany({
      where: {
        statut: 'APPROUVEE',
        du: { not: null, lte: toD },
        au: { not: null, gte: fromD },
        usercreateid: { not: null },
      },
      select: {
        usercreateid: true,
        du: true,
        au: true,
      },
      take: 20_000,
    }),
    prisma.congeNonJustifieRetrait.findMany({
      where: {
        dateDebut: { not: null, lte: toD },
        dateFin: { not: null, gte: fromD },
      },
      select: {
        fkUtilisateur: true,
        dateDebut: true,
        dateFin: true,
      },
      take: 20_000,
    }),
  ]);

  const userIds = new Set<bigint>();
  for (const d of demandes) {
    if (d.usercreateid != null) userIds.add(d.usercreateid);
  }
  for (const r of retraits) {
    userIds.add(r.fkUtilisateur);
  }

  const empByUser = await employeeNosBySystemUserIds([...userIds]);

  for (const d of demandes) {
    if (!d.usercreateid || !d.du || !d.au) continue;
    const emps = empByUser.get(String(d.usercreateid));
    if (!emps?.length) continue;
    const start = dateKeyFromDb(d.du);
    const end = dateKeyFromDb(d.au);
    const clippedFrom = start < from ? from : start;
    const clippedTo = end > to ? to : end;
    if (clippedFrom > clippedTo) continue;
    for (const day of eachDateKeyInclusive(clippedFrom, clippedTo)) {
      for (const emp of emps) putLeave(out, emp, day, 'conge');
    }
  }

  for (const r of retraits) {
    if (!r.dateDebut || !r.dateFin) continue;
    const emps = empByUser.get(String(r.fkUtilisateur));
    if (!emps?.length) continue;
    const start = dateKeyFromDb(r.dateDebut);
    const end = dateKeyFromDb(r.dateFin);
    const clippedFrom = start < from ? from : start;
    const clippedTo = end > to ? to : end;
    if (clippedFrom > clippedTo) continue;
    for (const day of eachDateKeyInclusive(clippedFrom, clippedTo)) {
      for (const emp of emps) putLeave(out, emp, day, 'conge_non_justifie');
    }
  }

  return out;
}

export function leaveKindForEmployeeDay(
  leaveMap: LeaveDayMap | null | undefined,
  employeeNo: string,
  dateKey: string
): LeaveDayKind | null {
  if (!leaveMap) return null;
  const byDay = leaveMap.get(normalizeEmployeeNo(employeeNo));
  return byDay?.get(dateKey) ?? null;
}
