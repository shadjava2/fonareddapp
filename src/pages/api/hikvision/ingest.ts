import {
  computePercent,
  countMonthsBetween,
  type IngestStreamProgress,
} from '@/lib/hikvision/ingest-progress';
import { prisma } from '@/lib/prisma';
import DigestFetch from 'digest-fetch';
import { createHash } from 'node:crypto';
import https from 'node:https';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  effectiveAcsEventClassificationInput,
  normalizeHikvisionAcsEventFields,
} from '@/lib/hikvision/acs-event-ingest-fields';
import { getHikvisionConfig } from './config';

export const config = {
  api: {
    responseLimit: false,
  },
};

/**
 * Format date pour AcsEvent (DS-K1T). ISO 8601 avec fuseau (ex. 2026-02-17T18:33:29-0800).
 * offsetMinutes = fuseau du lecteur (ex. -480 pour GMT-08). Si null, utilise l'heure du serveur.
 */
function formatHikvisionDate(date: Date, offsetMinutes: number | null): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  let y: number, m: number, d: number, h: number, min: number, s: number;
  let sign: string, tzH: number, tzM: number;
  if (offsetMinutes !== null && offsetMinutes !== undefined) {
    const adjusted = new Date(date.getTime() - offsetMinutes * 60 * 1000);
    y = adjusted.getUTCFullYear();
    m = adjusted.getUTCMonth() + 1;
    d = adjusted.getUTCDate();
    h = adjusted.getUTCHours();
    min = adjusted.getUTCMinutes();
    s = adjusted.getUTCSeconds();
    sign = offsetMinutes <= 0 ? '-' : '+';
    tzH = Math.floor(Math.abs(offsetMinutes) / 60);
    tzM = Math.abs(offsetMinutes) % 60;
  } else {
    y = date.getFullYear();
    m = date.getMonth() + 1;
    d = date.getDate();
    h = date.getHours();
    min = date.getMinutes();
    s = date.getSeconds();
    const tzOffset = -date.getTimezoneOffset();
    sign = tzOffset >= 0 ? '+' : '-';
    tzH = Math.floor(Math.abs(tzOffset) / 60);
    tzM = Math.abs(tzOffset) % 60;
  }
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}${sign}${pad(tzH)}:${pad(tzM)}`;
}

type Data = {
  ok: boolean;
  inserted?: number;
  skipped?: number;
  /** Nombre d’événements renvoyés par l’appareil (après parsing JSON) */
  fetched?: number;
  /** Si true, une 2e tentative fenêtre 30 j. a été faite (incrémental seulement) */
  widenedRetry?: boolean;
  error?: string;
  window?: { beginISO: string; endISO: string };
  /** Réponse mode `?full=1` */
  full?: boolean;
  batches?: number;
  monthsProcessed?: number;
  /** Lignes mises à jour depuis `raw` (direction / type d’événement) */
  repairedFromRaw?: number;
};

async function resolveDeviceHost(): Promise<{
  baseUrl: string;
  deviceIp: string;
}> {
  const config = await getHikvisionConfig();
  const protocol = config.port === 443 ? 'https' : 'http';
  const baseUrl = `${protocol}://${config.ip}:${config.port}`;
  return { baseUrl, deviceIp: config.ip };
}

/**
 * Récupère une page d'événements via POST uniquement (DS-K1T321MFWX n'accepte pas GET sur AcsEvent).
 * Dates au format strict sans millisecondes ni 'Z'. Pagination par searchResultPosition.
 */
async function fetchEvents(
  beginISO: string,
  endISO: string,
  maxResults = 100,
  searchResultPosition = 0
): Promise<any> {
  const { baseUrl } = await resolveDeviceHost();
  const config = await getHikvisionConfig();

  const client = new DigestFetch(config.username, config.password, {
    basic: false,
    algorithm: 'MD5',
  });

  const useHttps = baseUrl.startsWith('https');
  const agent = useHttps
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  const url = `${baseUrl}/ISAPI/AccessControl/AcsEvent?format=json`;
  const body = {
    AcsEventCond: {
      searchID: '1',
      searchResultPosition: Number(searchResultPosition),
      maxResults: Math.min(Number(maxResults), 100),
      major: 0,
      minor: 0,
      startTime: beginISO,
      endTime: endISO,
      timeReverseOrder: true,
    },
  };

  const res = await client.fetch(url, {
    method: 'POST',
    agent: agent as any,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 400) {
      throw new Error(
        `Requête AcsEvent refusée (format invalide, ex. startTime/endTime): ${res.status} - ${errorText.substring(0, 150)}`
      );
    }
    throw new Error(`HIK event fetch failed: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data;
}

/**
 * InfoList peut être un tableau, un seul objet événement, ou { Info: [...] } selon firmware.
 */
function flattenHikvisionInfoList(infoList: unknown): any[] {
  if (infoList == null) return [];
  if (Array.isArray(infoList)) return infoList.filter(Boolean);
  if (typeof infoList === 'object') {
    const o = infoList as Record<string, unknown>;
    if (o.Info != null) {
      const inf = o.Info;
      return (Array.isArray(inf) ? inf : [inf]).filter(Boolean);
    }
    if (
      'time' in o ||
      'eventTime' in o ||
      'major' in o ||
      'minor' in o ||
      'serialNo' in o ||
      'eventIndex' in o
    ) {
      return [o];
    }
  }
  return [];
}

function parseEventsFromResponse(data: any): any[] {
  if (!data) return [];
  if (data.AcsEvent?.InfoList != null) {
    return flattenHikvisionInfoList(data.AcsEvent.InfoList);
  }
  if (data.AcsEventSearchResult?.InfoList != null) {
    return flattenHikvisionInfoList(data.AcsEventSearchResult.InfoList);
  }
  if (data.AcsEventTotal?.InfoList != null) {
    return flattenHikvisionInfoList(data.AcsEventTotal.InfoList);
  }
  if (Array.isArray(data.AcsEvent)) return data.AcsEvent;
  if (data.AcsEvent && typeof data.AcsEvent === 'object') {
    const inner =
      data.AcsEvent.InfoList ??
      data.AcsEvent.EventList ??
      data.AcsEvent.eventList;
    if (inner != null) return flattenHikvisionInfoList(inner);
  }
  if (Array.isArray(data)) return data;
  return [];
}

/** Plusieurs variantes de champs selon firmware / modèle Hikvision */
function normalizeEmployeeNoFromEvent(e: any): string | null {
  const raw =
    e?.employeeNoString ??
    e?.employeeNo ??
    e?.EmployeeNoString ??
    e?.EmployeeNo ??
    e?.employeeID ??
    e?.EmployeeID ??
    null;
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

/**
 * Clé unique côté base : @@unique([device_ip, event_index]).
 * Beaucoup de terminaux renvoient eventIndex=0 pour tous les pointages → un seul enregistrement puis tout « ignoré ».
 * On privilégie serialNo, puis eventIndex > 0, sinon hash stable du contenu.
 */
function deriveEventIndexBigInt(e: any): bigint {
  const sn = e?.serialNo ?? e?.SerialNo ?? e?.serialNO;
  if (sn != null && String(sn).trim() !== '') {
    const digits = String(sn).replace(/\D/g, '');
    if (digits) {
      try {
        let n = BigInt(digits.slice(0, 18));
        const cap = (1n << 63n) - 2n;
        if (n > cap) n = n % cap;
        if (n > 0n) return n;
      } catch {
        /* fallthrough */
      }
    }
  }
  const ev = Number(e?.eventIndex ?? e?.eventId ?? 0);
  if (Number.isFinite(ev) && ev > 0) {
    return BigInt(ev);
  }
  const t = String(e?.time ?? e?.eventTime ?? '');
  const emp = normalizeEmployeeNoFromEvent(e) ?? '';
  const door = String(e?.doorNo ?? '');
  const card = String(e?.cardNo ?? e?.cardNumber ?? '');
  const key = `${t}|${emp}|${door}|${card}`;
  const buf = createHash('sha256').update(key, 'utf8').digest();
  let n = 0n;
  for (let i = 0; i < 8; i++) {
    n = (n << 8n) + BigInt(buf[i] ?? 0);
  }
  const maxSigned = (1n << 63n) - 1n;
  n = (n & maxSigned) || 1n;
  return n;
}

function getLastEventTime(events: any[]): Date | null {
  if (events.length === 0) return null;
  let latest: Date | null = null;
  for (const e of events) {
    const t = e?.time ?? e?.eventTime;
    if (t) {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
    }
  }
  return latest;
}

async function insertEventBatch(
  deviceIp: string,
  events: any[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const e of events) {
    const eventIndex = deriveEventIndexBigInt(e);
    const eventTime = e?.time ?? e?.eventTime ?? new Date().toISOString();
    const { event_type: eventTypeNorm, direction: directionNorm } =
      normalizeHikvisionAcsEventFields(e);
    const eventType = eventTypeNorm;
    const doorNo = e?.doorNo ? Number(e.doorNo) : null;
    const direction = directionNorm;
    const cardNo = e?.cardNo ?? e?.cardNumber ?? null;
    const employeeNo = normalizeEmployeeNoFromEvent(e);
    try {
      const existing = await prisma.acs_events.findFirst({
        where: { device_ip: deviceIp, event_index: eventIndex },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.acs_events.create({
        data: {
          device_ip: deviceIp,
          event_index: eventIndex,
          event_time: new Date(eventTime),
          event_type: eventType,
          door_no: doorNo,
          direction,
          card_no: cardNo,
          employee_no: employeeNo,
          raw: e ?? {},
        },
      });
      inserted++;
    } catch {
      skipped++;
    }
  }
  return { inserted, skipped };
}

/**
 * Met à jour `direction` et `event_type` à partir de `raw` (anciens enregistrements
 * importés avant la normalisation Hikvision complète).
 */
export async function repairAcsEventsFromStoredRaw(
  maxRows = 3000
): Promise<{ scanned: number; updated: number }> {
  const candidates = await prisma.acs_events.findMany({
    where: {
      OR: [
        { direction: null },
        { event_type: 'Unknown' },
        { event_type: 'test' },
      ],
    },
    orderBy: { id: 'desc' },
    take: maxRows,
  });
  let updated = 0;
  for (const row of candidates) {
    const eff = effectiveAcsEventClassificationInput({
      direction: row.direction,
      event_type: row.event_type,
      raw: row.raw,
    });
    const sameDir = (row.direction ?? null) === (eff.direction ?? null);
    const sameType = row.event_type === eff.event_type;
    if (sameDir && sameType) continue;
    await prisma.acs_events.update({
      where: { id: row.id },
      data: {
        direction: eff.direction,
        event_type: eff.event_type,
      },
    });
    updated++;
  }
  return { scanned: candidates.length, updated };
}

/** Pagination AcsEvent (searchResultPosition) jusqu’à épuisement pour une fenêtre [beginISO, endISO]. */
async function runIngestPages(
  deviceIp: string,
  beginISO: string,
  endISO: string,
  onPage?: (stats: {
    pages: number;
    fetched: number;
    inserted: number;
    skipped: number;
  }) => void | Promise<void>
): Promise<{
  inserted: number;
  skipped: number;
  fetched: number;
  pages: number;
}> {
  const maxResults = 100;
  let searchResultPosition = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let fetched = 0;
  let pages = 0;
  for (;;) {
    const data = await fetchEvents(beginISO, endISO, maxResults, searchResultPosition);
    const events = parseEventsFromResponse(data);
    fetched += events.length;
    if (events.length === 0) break;
    pages++;
    const { inserted, skipped } = await insertEventBatch(deviceIp, events);
    totalInserted += inserted;
    totalSkipped += skipped;
    await onPage?.({
      pages,
      fetched,
      inserted: totalInserted,
      skipped: totalSkipped,
    });
    if (events.length < maxResults) break;
    searchResultPosition += events.length;
  }
  return { inserted: totalInserted, skipped: totalSkipped, fetched, pages };
}

/** Début par défaut de l’import « tout l’historique » (AcsEvent), UTC. */
const DEFAULT_FULL_IMPORT_FROM_MS = Date.UTC(2010, 0, 1, 0, 0, 0, 0);

/**
 * Import complet : depuis une date de début (défaut **2010-01-01**) jusqu’à maintenant,
 * **mois par mois** (pagination interne 100 événements / requête par fenêtre).
 * Les doublons sont ignorés via `device_ip` + `event_index`.
 */
export async function runFullEventImport(options?: {
  /** Si fourni et valide, remplace le 2010-01-01 par défaut */
  from?: Date;
  onProgress?: (p: IngestStreamProgress) => void | Promise<void>;
}): Promise<{
  inserted: number;
  skipped: number;
  batches: number;
  fetched: number;
  monthsProcessed: number;
  totalMonths: number;
}> {
  const { deviceIp } = await resolveDeviceHost();
  const config = await getHikvisionConfig();
  const tzOffset = config.timezone_offset_minutes ?? null;
  const limitEnd = new Date(Date.now() - 60 * 1000);

  const fromArg = options?.from;
  let cursor =
    fromArg && !Number.isNaN(fromArg.getTime())
      ? new Date(fromArg)
      : new Date(DEFAULT_FULL_IMPORT_FROM_MS);

  const totalMonths = countMonthsBetween(cursor, limitEnd);

  if (cursor >= limitEnd) {
    return {
      inserted: 0,
      skipped: 0,
      batches: 0,
      fetched: 0,
      monthsProcessed: 0,
      totalMonths: 0,
    };
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFetched = 0;
  let totalBatches = 0;
  let monthsProcessed = 0;

  while (cursor < limitEnd) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const monthLabel = `${y}-${String(m + 1).padStart(2, '0')}`;
    const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    const chunkEnd =
      endOfMonth.getTime() < limitEnd.getTime() ? endOfMonth : limitEnd;
    const chunkStart = new Date(cursor);

    if (chunkStart.getTime() >= chunkEnd.getTime()) {
      break;
    }

    const beginISO = formatHikvisionDate(chunkStart, tzOffset);
    const endISO = formatHikvisionDate(chunkEnd, tzOffset);

    console.log(
      `[ingest-full] ${monthLabel} : ${beginISO} → ${endISO}`
    );
    const r = await runIngestPages(deviceIp, beginISO, endISO);
    totalInserted += r.inserted;
    totalSkipped += r.skipped;
    totalFetched += r.fetched;
    totalBatches += r.pages;
    monthsProcessed++;

    await options?.onProgress?.({
      phase: 'progress',
      mode: 'full',
      total: totalMonths,
      current: monthsProcessed,
      percent: computePercent(monthsProcessed, totalMonths),
      inserted: totalInserted,
      updated: 0,
      skipped: totalSkipped,
      fetched: totalFetched,
      pages: totalBatches,
      monthsProcessed,
      usersUpserted: 0,
      monthLabel,
      message: `Mois ${monthLabel} — ${totalInserted} inséré(s)`,
    });

    cursor = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  }

  console.log(
    `[ingest-full] Terminé : ${monthsProcessed} mois traités, ${totalInserted} insérés, ${totalSkipped} ignorés, ${totalFetched} parsés`
  );

  return {
    inserted: totalInserted,
    skipped: totalSkipped,
    batches: totalBatches,
    fetched: totalFetched,
    monthsProcessed,
    totalMonths,
  };
}

async function runIncrementalIngest(options?: {
  startTime?: string;
  endTime?: string;
  onProgress?: (p: IngestStreamProgress) => void | Promise<void>;
}): Promise<{
  inserted: number;
  skipped: number;
  fetched: number;
  widenedRetry: boolean;
  window: { beginISO: string; endISO: string };
  pages: number;
}> {
  const { deviceIp } = await resolveDeviceHost();
  const config = await getHikvisionConfig();
  const tzOffset = config.timezone_offset_minutes ?? null;
  const useCustomPeriod = Boolean(options?.startTime || options?.endTime);

  let beginISO: string;
  let endISO: string;

  if (useCustomPeriod) {
    let startDate = options?.startTime
      ? new Date(options.startTime)
      : new Date('2010-01-01T00:00:00');
    let endDate = options?.endTime
      ? new Date(options.endTime)
      : new Date(Date.now() - 60 * 1000);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Dates startTime/endTime invalides (format ISO attendu)');
    }
    if (startDate > endDate) {
      const t = startDate;
      startDate = endDate;
      endDate = t;
    }
    beginISO = formatHikvisionDate(startDate, tzOffset);
    endISO = formatHikvisionDate(endDate, tzOffset);
  } else {
    const endDate = new Date(Date.now() - 60 * 1000);
    const lastEvent = await prisma.acs_events.findFirst({
      where: { device_ip: deviceIp },
      orderBy: { event_time: 'desc' },
    });
    let lastTime = lastEvent?.event_time
      ? new Date(lastEvent.event_time)
      : new Date(Date.UTC(2010, 0, 1, 0, 0, 0, 0));
    if (lastTime >= endDate) {
      lastTime = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    let beginMs = lastTime.getTime() + 1000;
    const endMs = endDate.getTime();
    if (beginMs >= endMs) {
      beginMs = endMs - 7 * 24 * 60 * 60 * 1000;
    }
    beginISO = formatHikvisionDate(new Date(beginMs), tzOffset);
    endISO = formatHikvisionDate(endDate, tzOffset);
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFetched = 0;
  let totalPages = 0;
  let widenedRetry = false;

  const emitPage = async (label: string, pages: number) => {
    await options?.onProgress?.({
      phase: 'progress',
      mode: 'incremental',
      total: 0,
      current: pages,
      percent: Math.min(88, 12 + pages * 6),
      inserted: totalInserted,
      updated: 0,
      skipped: totalSkipped,
      fetched: totalFetched,
      pages: totalPages,
      monthsProcessed: 0,
      usersUpserted: 0,
      message: label,
    });
  };

  const r1 = await runIngestPages(deviceIp, beginISO, endISO, async (p) => {
    totalPages = p.pages;
    totalInserted = p.inserted;
    totalSkipped = p.skipped;
    totalFetched = p.fetched;
    await emitPage(
      `Page ${p.pages} — ${p.fetched} reçu(s), ${p.inserted} inséré(s)`,
      p.pages
    );
  });
  totalInserted = r1.inserted;
  totalSkipped = r1.skipped;
  totalFetched = r1.fetched;
  totalPages = r1.pages;

  if (!useCustomPeriod && r1.fetched === 0 && totalInserted === 0) {
    const endDate = new Date(Date.now() - 60 * 1000);
    const endMs = endDate.getTime();
    const widenBeginISO = formatHikvisionDate(
      new Date(endMs - 30 * 24 * 60 * 60 * 1000),
      tzOffset
    );
    const widenEndISO = formatHikvisionDate(endDate, tzOffset);
    widenedRetry = true;
    await options?.onProgress?.({
      phase: 'progress',
      mode: 'incremental',
      total: 0,
      current: totalPages,
      percent: 90,
      inserted: totalInserted,
      updated: 0,
      skipped: totalSkipped,
      fetched: totalFetched,
      pages: totalPages,
      monthsProcessed: 0,
      usersUpserted: 0,
      message: 'Aucun événement — nouvelle tentative sur 30 jours',
    });
    const r2 = await runIngestPages(
      deviceIp,
      widenBeginISO,
      widenEndISO,
      async (p) => {
        await emitPage(
          `Reprise 30 j. — page ${r1.pages + p.pages}, ${r1.inserted + p.inserted} inséré(s)`,
          r1.pages + p.pages
        );
      }
    );
    totalInserted = r1.inserted + r2.inserted;
    totalSkipped = r1.skipped + r2.skipped;
    totalFetched = r1.fetched + r2.fetched;
    totalPages = r1.pages + r2.pages;
    beginISO = widenBeginISO;
    endISO = widenEndISO;
  }

  return {
    inserted: totalInserted,
    skipped: totalSkipped,
    fetched: totalFetched,
    widenedRetry,
    window: { beginISO, endISO },
    pages: totalPages,
  };
}

function wantsNdjsonStream(req: NextApiRequest): boolean {
  return (
    req.query.stream === '1' ||
    req.query.stream === 'true' ||
    String(req.headers.accept || '').includes('ndjson')
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const full = req.query.full === '1' || req.query.full === 'true';
  const startTimeParam = req.query.startTime as string | undefined;
  const endTimeParam = req.query.endTime as string | undefined;
  const stream = wantsNdjsonStream(req);

  const writeNdjsonLine = (obj: Record<string, unknown>) => {
    res.write(`${JSON.stringify(obj)}\n`);
  };

  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    try {
      if (full) {
        const fromQ = req.query.from as string | undefined;
        let fromDate: Date | undefined;
        if (fromQ) {
          fromDate = new Date(fromQ);
          if (Number.isNaN(fromDate.getTime())) {
            writeNdjsonLine({
              type: 'error',
              ok: false,
              error: 'Paramètre from invalide (date ISO)',
            });
            res.end();
            return;
          }
        }
        const limitEnd = new Date(Date.now() - 60 * 1000);
        const fromStart =
          fromDate && !Number.isNaN(fromDate.getTime())
            ? fromDate
            : new Date(DEFAULT_FULL_IMPORT_FROM_MS);
        const totalMonths = countMonthsBetween(fromStart, limitEnd);

        writeNdjsonLine({
          type: 'start',
          ok: true,
          mode: 'full',
          phase: 'start',
          total: totalMonths,
          current: 0,
          percent: 0,
          message: `Import historique — ${totalMonths} mois estimé(s)`,
        });

        const result = await runFullEventImport({
          from: fromDate,
          onProgress: async (p) => {
            writeNdjsonLine({ type: 'progress', ...p });
          },
        });

        writeNdjsonLine({
          type: 'progress',
          phase: 'progress',
          mode: 'full',
          total: result.totalMonths,
          current: result.monthsProcessed,
          percent: 96,
          inserted: result.inserted,
          updated: 0,
          skipped: result.skipped,
          fetched: result.fetched,
          pages: result.batches,
          monthsProcessed: result.monthsProcessed,
          usersUpserted: 0,
          message: 'Réparation des événements bruts…',
        });

        let repairedFromRaw = 0;
        try {
          const rep = await repairAcsEventsFromStoredRaw(5000);
          repairedFromRaw = rep.updated;
        } catch (e) {
          console.warn('[ingest] repairAcsEventsFromStoredRaw (full stream)', e);
        }

        writeNdjsonLine({
          type: 'done',
          ok: true,
          full: true,
          inserted: result.inserted,
          skipped: result.skipped,
          fetched: result.fetched,
          batches: result.batches,
          monthsProcessed: result.monthsProcessed,
          totalMonths: result.totalMonths,
          repairedFromRaw,
          percent: 100,
          message: 'Import historique terminé',
        });
        res.end();
        return;
      }

      writeNdjsonLine({
        type: 'start',
        ok: true,
        mode: 'incremental',
        phase: 'start',
        total: 0,
        current: 0,
        percent: 0,
        message: 'Connexion au lecteur — ingestion incrémentale',
      });

      const inc = await runIncrementalIngest({
        startTime: startTimeParam,
        endTime: endTimeParam,
        onProgress: async (p) => {
          writeNdjsonLine({ type: 'progress', ...p });
        },
      });

      writeNdjsonLine({
        type: 'progress',
        phase: 'progress',
        mode: 'incremental',
        total: 0,
        current: inc.pages,
        percent: 95,
        inserted: inc.inserted,
        updated: 0,
        skipped: inc.skipped,
        fetched: inc.fetched,
        pages: inc.pages,
        monthsProcessed: 0,
        usersUpserted: 0,
        message: 'Réparation des événements bruts…',
      });

      let repairedFromRaw = 0;
      try {
        const rep = await repairAcsEventsFromStoredRaw(3000);
        repairedFromRaw = rep.updated;
      } catch (e) {
        console.warn('[ingest] repairAcsEventsFromStoredRaw (stream)', e);
      }

      writeNdjsonLine({
        type: 'done',
        ok: true,
        inserted: inc.inserted,
        skipped: inc.skipped,
        fetched: inc.fetched,
        widenedRetry: inc.widenedRetry,
        window: inc.window,
        pages: inc.pages,
        repairedFromRaw,
        percent: 100,
        message: 'Ingestion incrémentale terminée',
      });
      res.end();
      return;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[ingest stream]', msg);
      if (
        msg.includes('404') ||
        msg.includes('methodNotAllowed') ||
        msg.includes('Invalid Operation')
      ) {
        writeNdjsonLine({
          type: 'error',
          ok: false,
          code: 'DEVICE_UNSUPPORTED',
          error:
            "Cet appareil (ex. DS-K1T) ne supporte pas la récupération des événements via l'API.",
        });
      } else {
        writeNdjsonLine({ type: 'error', ok: false, error: msg });
      }
      res.end();
      return;
    }
  }

  try {
    if (full) {
      console.log(
        "🔍 Import complet des événements (mois par mois, du 2010-01-01 à maintenant par défaut)..."
      );
      const fromQ = req.query.from as string | undefined;
      let fromDate: Date | undefined;
      if (fromQ) {
        fromDate = new Date(fromQ);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            ok: false,
            error:
              'Paramètre from invalide (date ISO, ex. 2015-01-01T00:00:00.000Z)',
          });
        }
      }
      const result = await runFullEventImport(
        fromDate ? { from: fromDate } : {}
      );
      let repairedFromRaw = 0;
      try {
        const rep = await repairAcsEventsFromStoredRaw(5000);
        repairedFromRaw = rep.updated;
      } catch (e) {
        console.warn('[ingest] repairAcsEventsFromStoredRaw (full)', e);
      }
      return res.status(200).json({
        ok: true,
        inserted: result.inserted,
        skipped: result.skipped,
        fetched: result.fetched,
        full: true,
        batches: result.batches,
        monthsProcessed: result.monthsProcessed,
        repairedFromRaw,
      });
    }

    console.log("🔍 Début de l'ingestion des événements Hikvision (incrémental)...");
    const inc = await runIncrementalIngest({
      startTime: startTimeParam,
      endTime: endTimeParam,
    });

    console.log(
      `✅ Ingestion terminée: ${inc.inserted} insérés, ${inc.skipped} ignorés, ${inc.fetched} événements parsés depuis l’API`
    );

    let repairedFromRaw = 0;
    try {
      const rep = await repairAcsEventsFromStoredRaw(3000);
      repairedFromRaw = rep.updated;
    } catch (e) {
      console.warn('[ingest] repairAcsEventsFromStoredRaw', e);
    }

    return res.status(200).json({
      ok: true,
      inserted: inc.inserted,
      skipped: inc.skipped,
      fetched: inc.fetched,
      widenedRetry: inc.widenedRetry,
      window: inc.window,
      repairedFromRaw,
    });
  } catch (error: unknown) {
    console.error("❌ Erreur lors de l'ingestion:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const deviceUnsupported =
      msg.includes('404') ||
      msg.includes('methodNotAllowed') ||
      msg.includes('Invalid Operation');
    if (deviceUnsupported) {
      return res.status(200).json({
        ok: false,
        error:
          "Cet appareil (ex. DS-K1T) ne supporte pas la récupération des événements via l'API.",
        code: 'DEVICE_UNSUPPORTED',
      });
    }
    return res.status(500).json({ ok: false, error: msg || 'Erreur ingestion' });
  }
}
