import { prisma } from '@/lib/prisma';
import DigestFetch from 'digest-fetch';
import https from 'https';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

type Data = {
  ok: boolean;
  inserted?: number;
  skipped?: number;
  error?: string;
  window?: { beginISO: string; endISO: string };
};

function resolveDeviceHost(): { baseUrl: string; deviceIp: string } {
  const config = getHikvisionConfig();
  const protocol = config.port === 443 ? 'https' : 'http';
  const baseUrl = `${protocol}://${config.ip}:${config.port}`;
  return { baseUrl, deviceIp: config.ip };
}

async function fetchEvents(
  beginISO?: string,
  endISO?: string,
  maxResults = 500
) {
  const { baseUrl } = resolveDeviceHost();
  const config = getHikvisionConfig();

  console.log('🔍 Connexion à Hikvision:', {
    baseUrl,
    username: config.username,
    beginISO,
    endISO,
  });

  const client = new DigestFetch(config.username, config.password, {
    basic: false,
    algorithm: 'MD5',
  });

  const u = new URL(`${baseUrl}/ISAPI/AccessControl/AcsEvent`);
  u.searchParams.set('format', 'json');
  if (beginISO) u.searchParams.set('beginTime', beginISO);
  if (endISO) u.searchParams.set('endTime', endISO);
  u.searchParams.set('maxResults', String(maxResults));

  const agent =
    u.protocol === 'https:'
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

  try {
    const res = await client.fetch(u.toString(), {
      method: 'GET',
      agent: agent as any,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Erreur Hikvision API:', res.status, errorText);
      throw new Error(`HIK event fetch failed: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    console.log('🔍 Réponse Hikvision reçue:', {
      hasData: !!data,
      keys: data ? Object.keys(data) : [],
      hasAcsEvent: !!data?.AcsEvent,
      hasInfoList: !!data?.AcsEvent?.InfoList,
    });

    return data;
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des événements:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  try {
    console.log("🔍 Début de l'ingestion des événements Hikvision...");

    const { deviceIp } = resolveDeviceHost();

    // Récupérer le dernier événement pour ce device
    const lastEvent = await prisma.acs_events.findFirst({
      where: {
        device_ip: deviceIp,
      },
      orderBy: {
        event_time: 'desc',
      },
    });

    const lastTime = lastEvent?.event_time
      ? new Date(lastEvent.event_time).toISOString()
      : '1970-01-01T00:00:00Z';

    const beginISO = new Date(
      new Date(lastTime).getTime() + 1000
    ).toISOString();
    const endISO = new Date().toISOString();

    console.log('🔍 Fenêtre de recherche:', { beginISO, endISO });

    const data = await fetchEvents(beginISO, endISO, 500);

    // Gérer différents formats de réponse Hikvision
    let events: any[] = [];
    if (data?.AcsEvent?.InfoList) {
      events = Array.isArray(data.AcsEvent.InfoList)
        ? data.AcsEvent.InfoList
        : [data.AcsEvent.InfoList];
    } else if (data?.AcsEvent) {
      events = Array.isArray(data.AcsEvent) ? data.AcsEvent : [data.AcsEvent];
    } else if (Array.isArray(data)) {
      events = data;
    }

    console.log('🔍 Événements récupérés depuis Hikvision:', events.length);
    if (events.length === 0) {
      console.log(
        '⚠️ Aucun événement trouvé. Données reçues:',
        JSON.stringify(data).substring(0, 500)
      );
    }

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
        // Vérifier si l'événement existe déjà
        const existing = await prisma.acs_events.findFirst({
          where: {
            device_ip: deviceIp,
            event_index: BigInt(eventIndex),
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Créer le nouvel événement
        await prisma.acs_events.create({
          data: {
            device_ip: deviceIp,
            event_index: BigInt(eventIndex),
            event_time: new Date(eventTime),
            event_type: eventType,
            door_no: doorNo,
            direction: direction,
            card_no: cardNo,
            employee_no: employeeNo,
            raw: e as any, // JSON object
          },
        });
        inserted++;
      } catch (error: any) {
        // Ignorer les erreurs de duplication ou validation
        console.log('⚠️ Événement ignoré:', error.message);
        skipped++;
      }
    }

    console.log(
      `✅ Ingestion terminée: ${inserted} insérés, ${skipped} ignorés`
    );

    return res.status(200).json({
      ok: true,
      inserted,
      skipped,
      window: { beginISO, endISO },
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de l'ingestion:", error);
    return res
      .status(500)
      .json({ ok: false, error: error?.message || 'Erreur ingestion' });
  }
}
