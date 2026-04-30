import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';

function isMissingHikvisionConfigTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    (error.meta as { table?: string } | undefined)?.table === 'hikvision_config'
  );
}

export interface HikvisionConfig {
  ip: string;
  username: string;
  password: string;
  port: number;
  timezone_offset_minutes?: number | null;
}

const DEFAULTS: HikvisionConfig = {
  ip: '192.168.10.50',
  username: 'admin',
  password: 'Fonaredd',
  port: 80,
  timezone_offset_minutes: null,
};

export async function getHikvisionConfig(): Promise<HikvisionConfig> {
  if (!prisma) throw new Error('Base de données non configurée (DATABASE_URL)');
  const row = await prisma.hikvision_config.findUnique({
    where: { id: 1 },
  });
  if (!row) return DEFAULTS;
  return {
    ip: row.ip,
    username: row.username,
    password: row.password,
    port: row.port,
    timezone_offset_minutes: row.timezone_offset_minutes ?? null,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const config = await getHikvisionConfig();
      return res.status(200).json({
        success: true,
        config,
        message: 'Configuration récupérée',
      });
    } catch (error: unknown) {
      console.error(
        '❌ Erreur lors de la récupération de la configuration:',
        error
      );
      if (isMissingHikvisionConfigTable(error)) {
        return res.status(503).json({
          success: false,
          code: 'TABLE_MISSING',
          message:
            'La table hikvision_config est absente. Sur le serveur : npx prisma migrate deploy',
        });
      }
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la configuration',
        error: msg,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      if (!prisma) {
        return res.status(503).json({
          success: false,
          message: 'Base de données non configurée (DATABASE_URL)',
        });
      }

      const { ip, username, password, port, timezone_offset_minutes } = req.body;

      if (!ip || !username) {
        return res.status(400).json({
          success: false,
          message: "IP et nom d'utilisateur sont requis",
        });
      }

      const tzOffset = timezone_offset_minutes !== undefined && timezone_offset_minutes !== null && timezone_offset_minutes !== ''
        ? Number(timezone_offset_minutes)
        : null;

      const existing = await prisma.hikvision_config.findUnique({
        where: { id: 1 },
      });

      const passwordToUse =
        password !== undefined && password !== null && String(password).trim() !== ''
          ? String(password)
          : existing?.password ?? '';

      if (!passwordToUse && !existing) {
        return res.status(400).json({
          success: false,
          message: "Mot de passe requis pour la première configuration",
        });
      }

      await prisma.hikvision_config.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          ip,
          username,
          password: passwordToUse,
          port: port ? Number(port) : 80,
          timezone_offset_minutes: tzOffset,
        },
        update: {
          ip,
          username,
          ...(passwordToUse ? { password: passwordToUse } : {}),
          port: port ? Number(port) : 80,
          timezone_offset_minutes: tzOffset,
        },
      });

      const config = await getHikvisionConfig();
      return res.status(200).json({
        success: true,
        config: {
          ip: config.ip,
          username: config.username,
          port: config.port,
          timezone_offset_minutes: config.timezone_offset_minutes,
        },
        message: 'Configuration mise à jour avec succès',
      });
    } catch (error: unknown) {
      console.error(
        '❌ Erreur lors de la mise à jour de la configuration:',
        error
      );
      if (isMissingHikvisionConfigTable(error)) {
        return res.status(503).json({
          success: false,
          code: 'TABLE_MISSING',
          message:
            'La table hikvision_config est absente. Sur le serveur : npx prisma migrate deploy',
        });
      }
      const msg = error instanceof Error ? error.message : '';
      const isMissingColumn =
        msg.includes('timezone_offset_minute') ||
        msg.includes('Unknown column') ||
        msg.includes('Column not found');
      return res.status(500).json({
        success: false,
        message: isMissingColumn
          ? 'Base de données à jour requise : exécutez les migrations Prisma (prisma/migrations).'
          : 'Erreur lors de la mise à jour de la configuration',
        error: msg,
        code: isMissingColumn ? 'MIGRATION_REQUIRED' : undefined,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}
