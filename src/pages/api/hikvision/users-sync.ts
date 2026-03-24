import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

/**
 * Synchronise les utilisateurs depuis le lecteur Hikvision vers la base acs_users.
 * À appeler quand la liste est vide ou pour rafraîchir les personnes depuis l'appareil.
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

    const deviceUsers = await digestService.getUsers();

    let created = 0;
    let updated = 0;

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
        updated++;
      } else {
        await prisma.acs_users.create({
          data: payload,
        });
        created++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `${deviceUsers.length} personne(s) importée(s) depuis l'appareil`,
      imported: deviceUsers.length,
      created,
      updated,
    });
  } catch (error: any) {
    console.error('❌ Erreur import utilisateurs depuis l’appareil:', error);
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Erreur lors de l'import des personnes depuis l'appareil",
      error: error?.message,
    });
  }
}
