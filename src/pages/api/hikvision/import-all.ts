import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';
import { runFullEventImport } from './ingest';

/**
 * Import complet : personnes (depuis le lecteur) + tous les événements (par fenêtres).
 * POST /api/hikvision/import-all
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée. Utilisez POST.',
    });
  }

  try {
    const config = await getHikvisionConfig();
    const digestService = new HikvisionDigestService({
      ip: config.ip,
      username: config.username,
      password: config.password,
      port: config.port,
      useHttps: false,
      timezone_offset_minutes: config.timezone_offset_minutes ?? undefined,
    });

    // 1) Import des personnes depuis l'appareil
    const deviceUsers = await digestService.getUsers();
    let usersCreated = 0;
    let usersUpdated = 0;

    for (const u of deviceUsers) {
      const existing = await prisma.acs_users.findFirst({
        where: {
          device_ip: u.device_ip,
          employee_no: String(u.employee_no || '').trim() || 'N/A',
        },
      });

      const payload = {
        device_ip: u.device_ip,
        employee_no: String(u.employee_no || '').trim() || 'N/A',
        name: u.name ?? null,
        department: u.department ?? null,
        raw: (u.raw ?? {}) as object,
      };

      if (existing) {
        await prisma.acs_users.update({
          where: { id: existing.id },
          data: {
            name: payload.name,
            department: payload.department,
            raw: payload.raw,
          },
        });
        usersUpdated++;
      } else {
        await prisma.acs_users.create({ data: payload });
        usersCreated++;
      }
    }

    // 2) Import complet des événements (si l'appareil le supporte)
    let eventResult = { inserted: 0, skipped: 0, batches: 0 };
    let eventsError: string | undefined;
    try {
      eventResult = await runFullEventImport();
    } catch (err: any) {
      eventsError = err?.message ?? 'Appareil non compatible (ex. DS-K1T sans API AcsEvent)';
      console.warn('⚠️ Import événements ignoré:', eventsError);
    }

    return res.status(200).json({
      success: true,
      message: eventsError
        ? `Import terminé : ${deviceUsers.length} personne(s). Événements : ${eventsError}`
        : 'Import complet terminé (personnes + événements)',
      users: {
        imported: deviceUsers.length,
        created: usersCreated,
        updated: usersUpdated,
      },
      events: {
        inserted: eventResult.inserted,
        skipped: eventResult.skipped,
        batches: eventResult.batches,
        ...(eventsError && { error: eventsError }),
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur import complet:', error);
    return res.status(500).json({
      success: false,
      message: error?.message ?? "Erreur lors de l'import complet",
      error: error?.message,
    });
  }
}
