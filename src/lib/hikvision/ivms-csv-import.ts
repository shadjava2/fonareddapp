import { coerceDirectionToken } from '@/lib/hikvision/acs-event-ingest-fields';
import { prisma } from '@/lib/prisma';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';

export type IvmsCsvImportResult = {
  rowsParsed: number;
  inserted: number;
  updated: number;
  usersUpserted: number;
  skipped: number;
  errors: string[];
  total: number;
};

export type IvmsCsvProgress = {
  phase: 'start' | 'progress' | 'done';
  total: number;
  current: number;
  inserted: number;
  updated: number;
  skipped: number;
  usersUpserted: number;
  percent: number;
  message?: string;
};

/** Taille des lots SQL (bon compromis latence Tailscale / taille requête). */
const EVENT_BATCH_SIZE = 200;
/**
 * Concurrence agents : doit rester < DB_CONNECTION_LIMIT
 * (sinon pool timeout — le navigateur appelle aussi /config, /auth/me, etc.).
 */
const USER_CONCURRENCY = 2;

type ParsedEventRow = {
  lineNo: number;
  employee_no: string;
  name: string;
  department: string;
  event_time: Date;
  event_type: string;
  direction: string | null;
  card_no: string | null;
  person_name: string | null;
  checkpoint: string | null;
  custom_status: string | null;
  data_source: string;
  event_index: bigint;
  raw: Prisma.InputJsonValue;
};

function decodeCsvBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString('utf16le');
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8');
  }
  const sample = buf.subarray(0, Math.min(200, buf.length));
  let nuls = 0;
  for (const b of sample) if (b === 0) nuls += 1;
  if (nuls > sample.length / 4) return buf.toString('utf16le');
  return buf.toString('utf8');
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === sep && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function detectSep(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  if (tabs >= commas && tabs >= semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function normHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type ColKey =
  | 'personId'
  | 'name'
  | 'department'
  | 'time'
  | 'status'
  | 'checkpoint'
  | 'custom'
  | 'dataSource'
  | 'cardNo';

const HEADER_ALIASES: Record<ColKey, string[]> = {
  personId: ['person id', 'personid', 'id', 'employee no', 'employee id', 'no'],
  name: ['name', 'person name', 'nom'],
  department: ['department', 'departement', 'dept'],
  time: ['time', 'datetime', 'date time', 'authentication date and time', 'heure'],
  status: [
    'attendance status',
    'status',
    'check status',
    'statut',
    'pointage',
  ],
  checkpoint: [
    'attendance check point',
    'check point',
    'checkpoint',
    'device',
    'device name',
    'point de controle',
  ],
  custom: ['custom name', 'custom', 'nom personnalise', 'label'],
  dataSource: ['data source', 'source'],
  cardNo: ['card no', 'card number', 'card', 'badge'],
};

function mapHeaders(headers: string[]): Partial<Record<ColKey, number>> {
  const map: Partial<Record<ColKey, number>> = {};
  const normalized = headers.map(normHeader);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [
    ColKey,
    string[],
  ][]) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) map[key] = idx;
  }
  return map;
}

function cell(cols: string[], idx: number | undefined): string {
  if (idx == null || idx < 0 || idx >= cols.length) return '';
  return (cols[idx] || '').trim();
}

function parseEventTime(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
  );
  if (m) {
    return new Date(
      Date.UTC(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6])
      )
    );
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stableEventIndex(parts: string[]): bigint {
  const hex = createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 15);
  return BigInt(`0x${hex}`);
}

function computePercent(current: number, total: number): number {
  if (total <= 0) return 0;
  // Une décimale pour éviter « 0 % » trompeur au début (ex. 20/6448).
  return Math.min(100, Math.round((current / total) * 1000) / 10);
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]!);
    }
  });
  await Promise.all(workers);
}

function sqlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function toSqlDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * INSERT … ON DUPLICATE KEY UPDATE en un seul aller-retour MySQL par lot.
 * Compte approx. : affectedRows MySQL (1=insert, 2=update).
 */
async function upsertEventBatch(
  device_ip: string,
  rows: ParsedEventRow[]
): Promise<{ inserted: number; updated: number }> {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const indexes = rows.map((r) => r.event_index);
  const existing = await prisma.acs_events.findMany({
    where: {
      device_ip,
      event_index: { in: indexes },
    },
    select: { event_index: true },
  });
  const existingSet = new Set(existing.map((e) => e.event_index.toString()));

  const valuesSql = rows
    .map((r) => {
      const dir = r.direction == null ? 'NULL' : `'${sqlEscape(r.direction)}'`;
      const card = r.card_no == null ? 'NULL' : `'${sqlEscape(r.card_no)}'`;
      const pname =
        r.person_name == null ? 'NULL' : `'${sqlEscape(r.person_name)}'`;
      const cp =
        r.checkpoint == null ? 'NULL' : `'${sqlEscape(r.checkpoint)}'`;
      const custom =
        r.custom_status == null ? 'NULL' : `'${sqlEscape(r.custom_status)}'`;
      const rawJson = sqlEscape(JSON.stringify(r.raw));
      return `(${[
        `'${sqlEscape(device_ip)}'`,
        r.event_index.toString(),
        `'${toSqlDateTime(r.event_time)}'`,
        `'${sqlEscape(r.event_type)}'`,
        'NULL', // door_no
        dir,
        card,
        `'${sqlEscape(r.employee_no)}'`,
        pname,
        cp,
        'NULL', // device_serial
        custom,
        `'${sqlEscape(r.data_source)}'`,
        `'ivms_csv'`,
        'NULL', // photo_path
        `'${rawJson}'`,
      ].join(',')})`;
    })
    .join(',\n');

  await prisma.$executeRawUnsafe(`
    INSERT INTO acs_events (
      device_ip, event_index, event_time, event_type, door_no, direction,
      card_no, employee_no, person_name, checkpoint, device_serial,
      custom_status, data_source, source, photo_path, raw
    ) VALUES ${valuesSql}
    ON DUPLICATE KEY UPDATE
      event_time = VALUES(event_time),
      event_type = VALUES(event_type),
      direction = VALUES(direction),
      card_no = VALUES(card_no),
      employee_no = VALUES(employee_no),
      person_name = VALUES(person_name),
      checkpoint = VALUES(checkpoint),
      custom_status = VALUES(custom_status),
      data_source = VALUES(data_source),
      source = VALUES(source),
      raw = VALUES(raw)
  `);

  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    if (existingSet.has(r.event_index.toString())) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated };
}

/**
 * Importe un CSV « Original Records » iVMS vers acs_events / acs_users.
 * Optimisé : parse mémoire → agents uniques → événements par lots SQL.
 */
export async function importIvmsOriginalRecordsCsv(
  input: Buffer | string,
  options?: {
    onProgress?: (p: IvmsCsvProgress) => void | Promise<void>;
    /** Fréquence des callbacks de progression (défaut : chaque lot). */
    progressEvery?: number;
  }
): Promise<IvmsCsvImportResult> {
  if (!prisma) {
    throw new Error('Prisma non initialisé (DATABASE_URL manquante)');
  }

  const onProgress = options?.onProgress;

  const emit = async (
    phase: IvmsCsvProgress['phase'],
    partial: Omit<IvmsCsvProgress, 'phase' | 'percent'> & { percent?: number }
  ) => {
    if (!onProgress) return;
    const percent =
      partial.percent ?? computePercent(partial.current, partial.total);
    await onProgress({ phase, ...partial, percent });
  };

  const text = typeof input === 'string' ? input : decodeCsvBuffer(input);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\0/g, ''))
    .filter((l) => l.trim().length > 0);

  const result: IvmsCsvImportResult = {
    rowsParsed: 0,
    inserted: 0,
    updated: 0,
    usersUpserted: 0,
    skipped: 0,
    errors: [],
    total: Math.max(0, lines.length - 1),
  };

  if (lines.length < 2) {
    result.errors.push('CSV vide ou sans données');
    await emit('done', {
      total: 0,
      current: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      usersUpserted: 0,
      message: 'CSV vide',
    });
    return result;
  }

  const sep = detectSep(lines[0]);
  const headers = parseCsvLine(lines[0], sep);
  const col = mapHeaders(headers);
  if (col.time == null) {
    result.errors.push(
      `Colonne Time introuvable. En-têtes: ${headers.join(' | ')}`
    );
    await emit('done', {
      total: result.total,
      current: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      usersUpserted: 0,
      message: result.errors[0],
    });
    return result;
  }

  const device_ip = 'ivms:csv';

  await emit('start', {
    total: result.total,
    current: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    usersUpserted: 0,
    message: `Analyse de ${result.total} ligne(s)…`,
  });

  // ── 1) Parse en mémoire (rapide) ──────────────────────────────────────
  const parsed: ParsedEventRow[] = [];
  const usersByNo = new Map<
    string,
    { employee_no: string; name: string; department: string }
  >();

  for (let i = 1; i < lines.length; i++) {
    result.rowsParsed += 1;
    try {
      const cols = parseCsvLine(lines[i], sep);
      const personId = cell(cols, col.personId)
        .replace(/^'+/, '')
        .replace(/'+$/, '')
        .trim();
      const name = cell(cols, col.name);
      const department = cell(cols, col.department) || 'FONAREDD';
      const timeRaw = cell(cols, col.time);
      const status = cell(cols, col.status);
      const checkpoint = cell(cols, col.checkpoint);
      const custom = cell(cols, col.custom);
      const dataSource = cell(cols, col.dataSource);
      const cardNo = cell(cols, col.cardNo);

      const event_time = parseEventTime(timeRaw);
      if (!event_time) {
        result.skipped += 1;
        if (result.errors.length < 50) {
          result.errors.push(`Ligne ${i + 1}: date invalide « ${timeRaw} »`);
        }
        continue;
      }

      const employee_no =
        personId ||
        (name
          ? `n:${createHash('sha1').update(name.toLowerCase()).digest('hex').slice(0, 12)}`
          : null);
      if (!employee_no) {
        result.skipped += 1;
        continue;
      }

      let direction =
        coerceDirectionToken(status) ??
        coerceDirectionToken(custom) ??
        null;
      const statusNorm = status.toLowerCase();
      if (!direction) {
        if (statusNorm.includes('check-in') || statusNorm.includes('checkin'))
          direction = 'in';
        else if (
          statusNorm.includes('check-out') ||
          statusNorm.includes('checkout')
        )
          direction = 'out';
      }

      let event_type = (custom || status || 'Unknown').slice(0, 64);
      if (
        !custom &&
        (statusNorm.includes('check-in') || statusNorm === 'checkin')
      ) {
        event_type = 'Check-in';
      } else if (
        !custom &&
        (statusNorm.includes('check-out') || statusNorm === 'checkout')
      ) {
        event_type = 'Check-out';
      }

      usersByNo.set(employee_no, {
        employee_no,
        name: name || employee_no,
        department,
      });

      const event_index = stableEventIndex([
        employee_no,
        event_time.toISOString(),
        checkpoint,
        custom || status,
        direction || '',
      ]);

      parsed.push({
        lineNo: i + 1,
        employee_no,
        name: name || employee_no,
        department,
        event_time,
        event_type,
        direction,
        card_no: cardNo || null,
        person_name: name || null,
        checkpoint: checkpoint || null,
        custom_status: custom || null,
        data_source: dataSource || 'Original Records',
        event_index,
        raw: {
          source: 'ivms_csv',
          personId,
          name,
          department,
          time: timeRaw,
          status,
          checkpoint,
          custom,
          dataSource,
          cardNo,
        },
      });
    } catch (e: unknown) {
      result.skipped += 1;
      if (result.errors.length < 50) {
        result.errors.push(
          `Ligne ${i + 1}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  await emit('progress', {
    total: result.total,
    current: Math.min(result.total, Math.round(result.total * 0.05)),
    inserted: 0,
    updated: 0,
    skipped: result.skipped,
    usersUpserted: 0,
    message: `${usersByNo.size} agent(s) unique(s) — synchronisation…`,
  });

  // ── 2) Agents uniques (pas 1 upsert / ligne) ──────────────────────────
  const userList = [...usersByNo.values()];
  await mapPool(userList, USER_CONCURRENCY, async (u) => {
    await prisma.acs_users.upsert({
      where: {
        device_ip_employee_no: { device_ip, employee_no: u.employee_no },
      },
      create: {
        device_ip,
        employee_no: u.employee_no,
        name: u.name,
        department: u.department,
        raw: { source: 'ivms_csv' },
      },
      update: {
        name: u.name || undefined,
        department: u.department || undefined,
      },
    });
  });
  result.usersUpserted = userList.length;

  await emit('progress', {
    total: result.total,
    current: Math.min(result.total, Math.round(result.total * 0.1)),
    inserted: 0,
    updated: 0,
    skipped: result.skipped,
    usersUpserted: result.usersUpserted,
    message: `Import des événements (${parsed.length}) par lots de ${EVENT_BATCH_SIZE}…`,
  });

  // ── 3) Événements par lots SQL ────────────────────────────────────────
  for (let offset = 0; offset < parsed.length; offset += EVENT_BATCH_SIZE) {
    const chunk = parsed.slice(offset, offset + EVENT_BATCH_SIZE);
    try {
      const { inserted, updated } = await upsertEventBatch(device_ip, chunk);
      result.inserted += inserted;
      result.updated += updated;
    } catch (e: unknown) {
      // Repli ligne à ligne sur le lot en échec (ne perd pas tout le lot).
      for (const r of chunk) {
        try {
          const existing = await prisma.acs_events.findUnique({
            where: {
              device_ip_event_index: {
                device_ip,
                event_index: r.event_index,
              },
            },
            select: { id: true },
          });
          await prisma.acs_events.upsert({
            where: {
              device_ip_event_index: {
                device_ip,
                event_index: r.event_index,
              },
            },
            create: {
              device_ip,
              event_index: r.event_index,
              event_time: r.event_time,
              event_type: r.event_type,
              direction: r.direction,
              card_no: r.card_no,
              employee_no: r.employee_no,
              person_name: r.person_name,
              checkpoint: r.checkpoint,
              custom_status: r.custom_status,
              data_source: r.data_source,
              source: 'ivms_csv',
              raw: r.raw,
            },
            update: {
              event_time: r.event_time,
              event_type: r.event_type,
              direction: r.direction,
              card_no: r.card_no,
              employee_no: r.employee_no,
              person_name: r.person_name,
              checkpoint: r.checkpoint,
              custom_status: r.custom_status,
              data_source: r.data_source,
              source: 'ivms_csv',
              raw: r.raw,
            },
          });
          if (existing) result.updated += 1;
          else result.inserted += 1;
        } catch (rowErr: unknown) {
          result.skipped += 1;
          if (result.errors.length < 50) {
            result.errors.push(
              `Ligne ${r.lineNo}: ${
                rowErr instanceof Error ? rowErr.message : String(rowErr)
              }`
            );
          }
        }
      }
      if (result.errors.length < 50) {
        result.errors.push(
          `Lot ${offset}-${offset + chunk.length}: ${
            e instanceof Error ? e.message : String(e)
          } (repli ligne à ligne)`
        );
      }
    }

    const eventsDone = Math.min(offset + chunk.length, parsed.length);
    const current = Math.min(
      result.total,
      result.skipped + eventsDone
    );
    await emit('progress', {
      total: result.total,
      current,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      usersUpserted: result.usersUpserted,
      message: `${eventsDone} / ${parsed.length} événements écrits`,
    });
  }

  await emit('done', {
    total: result.total,
    current: result.total,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    usersUpserted: result.usersUpserted,
    percent: 100,
    message: 'Import terminé',
  });

  return result;
}
