import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/** Lecture / écriture system_user_id via SQL (indépendant du client Prisma généré). */

export async function getAcsSystemUserIds(
  acsIds: bigint[]
): Promise<Map<string, bigint | null>> {
  const map = new Map<string, bigint | null>();
  if (acsIds.length === 0) return map;
  const rows = await prisma.$queryRaw<
    Array<{ id: bigint; system_user_id: bigint | null }>
  >`
    SELECT id, system_user_id
    FROM acs_users
    WHERE id IN (${Prisma.join(acsIds)})
  `;
  for (const r of rows) {
    map.set(String(r.id), r.system_user_id);
  }
  return map;
}

export async function findAcsBySystemUserId(
  systemUserId: bigint,
  exceptAcsId?: bigint
): Promise<{ id: bigint; employee_no: string } | null> {
  const rows = exceptAcsId
    ? await prisma.$queryRaw<Array<{ id: bigint; employee_no: string }>>`
        SELECT id, employee_no FROM acs_users
        WHERE system_user_id = ${systemUserId} AND id <> ${exceptAcsId}
        LIMIT 1
      `
    : await prisma.$queryRaw<Array<{ id: bigint; employee_no: string }>>`
        SELECT id, employee_no FROM acs_users
        WHERE system_user_id = ${systemUserId}
        LIMIT 1
      `;
  return rows[0] ?? null;
}

export async function setAcsSystemUserId(
  acsId: bigint,
  systemUserId: bigint | null
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE acs_users
    SET system_user_id = ${systemUserId}
    WHERE id = ${acsId}
  `;
}

export async function listAcsWithSystemUserId(params: {
  whereSql: Prisma.Sql;
  orderLimitSql: Prisma.Sql;
}): Promise<
  Array<{
    id: bigint;
    device_ip: string;
    employee_no: string;
    name: string | null;
    department: string | null;
    face_path: string | null;
    system_user_id: bigint | null;
    raw: unknown;
  }>
> {
  return prisma.$queryRaw`
    SELECT id, device_ip, employee_no, name, department, face_path, system_user_id, raw
    FROM acs_users
    WHERE ${params.whereSql}
    ${params.orderLimitSql}
  `;
}
