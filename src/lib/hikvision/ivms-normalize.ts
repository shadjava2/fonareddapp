import { coerceDirectionToken } from '@/lib/hikvision/acs-event-ingest-fields';
import {
  computePercent,
  type IngestStreamProgress,
} from '@/lib/hikvision/ingest-progress';
import { prisma } from '@/lib/prisma';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';

export const IVMS_DEVICE_PREFIX = 'ivms';

function stableEventIndex(parts: string[]): bigint {
  const hex = createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 15);
  return BigInt(`0x${hex}`);
}

function deviceKey(deviceSerial?: string | null, deviceName?: string | null): string {
  const s = (deviceSerial || '').trim();
  if (s) return `${IVMS_DEVICE_PREFIX}:${s}`.slice(0, 64);
  const n = (deviceName || '').trim();
  if (n) {
    const h = createHash('sha1').update(n).digest('hex').slice(0, 10);
    return `${IVMS_DEVICE_PREFIX}:${h}`.slice(0, 64);
  }
  return IVMS_DEVICE_PREFIX;
}

function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export type NormalizeIvmsResult = {
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  usersUpserted: number;
  errors: string[];
};

/**
 * Normalise les lignes `ivms_attendance` non traitées vers `acs_events` / `acs_users`.
 */
export async function normalizeIvmsAttendance(options?: {
  limit?: number;
  onProgress?: (p: IngestStreamProgress) => void | Promise<void>;
}): Promise<NormalizeIvmsResult> {
  if (!prisma) {
    throw new Error('Prisma non initialisé (DATABASE_URL manquante)');
  }

  const limit = options?.limit ?? 2000;
  const totalPending = await prisma.ivms_attendance.count({
    where: { normalized_at: null },
  });
  const pending = await prisma.ivms_attendance.findMany({
    where: { normalized_at: null },
    orderBy: { id: 'asc' },
    take: limit,
  });

  const result: NormalizeIvmsResult = {
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    usersUpserted: 0,
    errors: [],
  };

  if (pending.length === 0) {
    await options?.onProgress?.({
      phase: 'done',
      mode: 'normalize',
      total: 0,
      current: 0,
      percent: 100,
      inserted: 0,
      updated: 0,
      skipped: 0,
      fetched: 0,
      pages: 0,
      monthsProcessed: 0,
      usersUpserted: 0,
      message: 'Aucune ligne iVMS en attente',
    });
    return result;
  }

  const batchTotal = pending.length;
  await options?.onProgress?.({
    phase: 'start',
    mode: 'normalize',
    total: batchTotal,
    current: 0,
    percent: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    fetched: totalPending,
    pages: 0,
    monthsProcessed: 0,
    usersUpserted: 0,
    message: `${batchTotal} ligne(s) à normaliser (${totalPending} en attente)`,
  });

  const allUsers = await prisma.acs_users.findMany({
    select: { id: true, device_ip: true, employee_no: true, name: true, department: true },
  });
  const byCard = new Map<string, (typeof allUsers)[0]>();
  const byName = new Map<string, (typeof allUsers)[0]>();
  for (const u of allUsers) {
    if (u.name) byName.set(normName(u.name), u);
  }
  const cards = await prisma.acs_cards.findMany({
    select: { card_no: true, employee_no: true, device_ip: true },
  });
  for (const c of cards) {
    const user = allUsers.find(
      (u) => u.employee_no === c.employee_no && u.device_ip === c.device_ip
    );
    if (user) byCard.set(c.card_no.trim(), user);
  }

  for (const row of pending) {
    result.processed += 1;
    try {
      const device_ip = deviceKey(row.device_serial, row.device_name);
      const direction =
        coerceDirectionToken(row.direction) ??
        (normName(row.direction || '').includes('enter')
          ? 'in'
          : normName(row.direction || '').includes('exit')
            ? 'out'
            : null);

      let event_type = 'Unknown';
      if (direction === 'in') event_type = 'Check-in';
      else if (direction === 'out') event_type = 'Check-out';
      if (row.direction?.trim()) {
        const d = row.direction.trim();
        if (!['enter', 'exit', 'in', 'out', '1', '0'].includes(d.toLowerCase())) {
          event_type = d.slice(0, 64);
        }
      }

      let employee_no = (row.employee_no || '').trim() || null;
      if (!employee_no && row.card_no?.trim()) {
        const u = byCard.get(row.card_no.trim());
        if (u) employee_no = u.employee_no;
      }
      if (!employee_no && row.person_name?.trim()) {
        const u = byName.get(normName(row.person_name));
        if (u) employee_no = u.employee_no;
      }
      if (!employee_no && row.person_name?.trim()) {
        // Crée un ID stable dérivé du nom si inconnu
        employee_no = `n:${createHash('sha1')
          .update(normName(row.person_name))
          .digest('hex')
          .slice(0, 12)}`;
      }

      if (employee_no && row.person_name?.trim()) {
        await prisma.acs_users.upsert({
          where: {
            device_ip_employee_no: {
              device_ip,
              employee_no,
            },
          },
          create: {
            device_ip,
            employee_no,
            name: row.person_name.trim(),
            department: 'FONAREDD',
            raw: { source: 'ivms_push', ivms_id: row.ivms_id?.toString() },
          },
          update: {
            name: row.person_name.trim(),
          },
        });
        result.usersUpserted += 1;
        byName.set(normName(row.person_name), {
          id: BigInt(0),
          device_ip,
          employee_no,
          name: row.person_name.trim(),
          department: 'FONAREDD',
        });
      }

      const event_index =
        row.ivms_id != null
          ? row.ivms_id
          : stableEventIndex([
              row.auth_datetime.toISOString(),
              device_ip,
              row.person_name || '',
              row.direction || '',
              row.card_no || '',
            ]);

      const raw: Prisma.InputJsonValue = {
        source: 'ivms_push',
        ivms_id: row.ivms_id?.toString() ?? null,
        auth_datetime: row.auth_datetime.toISOString(),
        auth_date: row.auth_date?.toISOString().slice(0, 10) ?? null,
        auth_time: row.auth_time,
        direction: row.direction,
        device_name: row.device_name,
        device_serial: row.device_serial,
        person_name: row.person_name,
        card_no: row.card_no,
        employee_no,
      };

      const existing = await prisma.acs_events.findUnique({
        where: {
          device_ip_event_index: { device_ip, event_index },
        },
        select: { id: true },
      });

      await prisma.acs_events.upsert({
        where: {
          device_ip_event_index: { device_ip, event_index },
        },
        create: {
          device_ip,
          event_index,
          event_time: row.auth_datetime,
          event_type,
          direction,
          card_no: row.card_no,
          employee_no,
          person_name: row.person_name,
          checkpoint: row.device_name,
          device_serial: row.device_serial,
          custom_status: null,
          data_source: 'ivms_push',
          source: 'ivms_push',
          raw,
        },
        update: {
          event_time: row.auth_datetime,
          event_type,
          direction,
          card_no: row.card_no,
          employee_no,
          person_name: row.person_name,
          checkpoint: row.device_name,
          device_serial: row.device_serial,
          source: 'ivms_push',
          raw,
        },
      });

      if (existing) result.updated += 1;
      else result.inserted += 1;

      await prisma.ivms_attendance.update({
        where: { id: row.id },
        data: { normalized_at: new Date() },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`ivms#${row.id}: ${msg}`);
      result.skipped += 1;
    }

    if (
      result.processed % 15 === 0 ||
      result.processed === batchTotal
    ) {
      await options?.onProgress?.({
        phase: 'progress',
        mode: 'normalize',
        total: batchTotal,
        current: result.processed,
        percent: computePercent(result.processed, batchTotal),
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        fetched: totalPending,
        pages: 0,
        monthsProcessed: 0,
        usersUpserted: result.usersUpserted,
        message: `${result.processed} / ${batchTotal} normalisé(s)`,
      });
    }
  }

  await options?.onProgress?.({
    phase: 'done',
    mode: 'normalize',
    total: batchTotal,
    current: result.processed,
    percent: 100,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    fetched: totalPending,
    pages: 0,
    monthsProcessed: 0,
    usersUpserted: result.usersUpserted,
    message: 'Normalisation terminée',
  });

  return result;
}
