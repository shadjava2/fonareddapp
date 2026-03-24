import { prisma } from '@/lib/prisma';
import DigestFetch from 'digest-fetch';
import https from 'node:https';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

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
  error?: string;
  window?: { beginISO: string; endISO: string };
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

function parseEventsFromResponse(data: any): any[] {
  if (!data) return [];
  if (data?.AcsEvent?.InfoList) {
    const l = data.AcsEvent.InfoList;
    return Array.isArray(l) ? l : [l];
  }
  if (data?.AcsEvent) {
    const l = data.AcsEvent;
    return Array.isArray(l) ? l : [l];
  }
  return Array.isArray(data) ? data : [];
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
    const eventIndex = Number(e?.eventIndex ?? e?.eventId ?? 0);
    const eventTime = e?.time ?? e?.eventTime ?? new Date().toISOString();
    const eventType = e?.eventType ?? e?.name ?? 'Unknown';
    const doorNo = e?.doorNo ? Number(e.doorNo) : null;
    const direction = e?.entryDirection ?? e?.doorAction ?? null;
    const cardNo = e?.cardNo ?? e?.cardNumber ?? null;
    const employeeNo = e?.employeeNoString ?? e?.employeeNo ?? null;
    try {
      const existing = await prisma.acs_events.findFirst({
        where: { device_ip: deviceIp, event_index: BigInt(eventIndex) },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.acs_events.create({
        data: {
          device_ip: deviceIp,
          event_index: BigInt(eventIndex),
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

/** Import complet : une fenêtre 2010 → maintenant, pagination par searchResultPosition (max 100 par requête). */
export async function runFullEventImport(): Promise<{
  inserted: number;
  skipped: number;
  batches: number;
}> {
  const { deviceIp } = await resolveDeviceHost();
  const maxResults = 100;
  const config = await getHikvisionConfig();
  const tzOffset = config.timezone_offset_minutes ?? null;
  const beginISO = formatHikvisionDate(new Date('2025-01-01T00:00:00'), tzOffset);
  const endISO = formatHikvisionDate(new Date(), tzOffset);
  let totalInserted = 0;
  let totalSkipped = 0;
  let batches = 0;
  let searchResultPosition = 0;

  for (;;) {
    const data = await fetchEvents(beginISO, endISO, maxResults, searchResultPosition);
    const events = parseEventsFromResponse(data);
    if (events.length === 0) break;

    const { inserted, skipped } = await insertEventBatch(deviceIp, events);
    totalInserted += inserted;
    totalSkipped += skipped;
    batches++;

    if (events.length < maxResults) break;
    searchResultPosition += events.length;
  }

  return { inserted: totalInserted, skipped: totalSkipped, batches };
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
  const useCustomPeriod = Boolean(startTimeParam || endTimeParam);

  try {
    const { deviceIp } = await resolveDeviceHost();

    if (full) {
      console.log("🔍 Import complet des événements (mode full)...");
      const result = await runFullEventImport();
      return res.status(200).json({
        ok: true,
        inserted: result.inserted,
        skipped: result.skipped,
        full: true,
        batches: result.batches,
      });
    }

    const config = await getHikvisionConfig();
    const tzOffset = config.timezone_offset_minutes ?? null;

    let beginISO: string;
    let endISO: string;

    if (useCustomPeriod) {
      console.log("🔍 Ingestion des événements Hikvision (période choisie)...");
      const startDate = startTimeParam ? new Date(startTimeParam) : new Date('2010-01-01T00:00:00');
      const endDate = endTimeParam ? new Date(endTimeParam) : new Date(Date.now() - 60 * 1000);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({
          ok: false,
          error: 'Dates startTime/endTime invalides (format ISO attendu)',
        });
      }
      beginISO = formatHikvisionDate(startDate, tzOffset);
      endISO = formatHikvisionDate(endDate, tzOffset);
    } else {
      console.log("🔍 Début de l'ingestion des événements Hikvision (incrémental)...");
      const lastEvent = await prisma.acs_events.findFirst({
        where: { device_ip: deviceIp },
        orderBy: { event_time: 'desc' },
      });
      const lastTime = lastEvent?.event_time
        ? new Date(lastEvent.event_time)
        : new Date('2025-01-01T00:00:00');
      beginISO = formatHikvisionDate(new Date(lastTime.getTime() + 1000), tzOffset);
      const endDate = new Date(Date.now() - 60 * 1000);
      endISO = formatHikvisionDate(endDate, tzOffset);
    }

    const maxResults = 100;
    let searchResultPosition = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (;;) {
      const data = await fetchEvents(beginISO, endISO, maxResults, searchResultPosition);
      const events = parseEventsFromResponse(data);
      if (events.length === 0) break;

      const { inserted, skipped } = await insertEventBatch(deviceIp, events);
      totalInserted += inserted;
      totalSkipped += skipped;

      if (events.length < maxResults) break;
      searchResultPosition += events.length;
    }

    console.log(`✅ Ingestion terminée: ${totalInserted} insérés, ${totalSkipped} ignorés`);

    return res.status(200).json({
      ok: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      window: { beginISO, endISO },
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de l'ingestion:", error);
    const msg = error?.message ?? '';
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
    return res
      .status(500)
      .json({ ok: false, error: error?.message || 'Erreur ingestion' });
  }
}
