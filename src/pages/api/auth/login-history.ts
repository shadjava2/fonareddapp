import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import type { LoginHistoryEntry } from '@/lib/login-history-types';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_ROWS = 50;

type ResponseData = {
  success: boolean;
  entries?: LoginHistoryEntry[];
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    const profile = await getUserFromToken(token);
    if (!profile) {
      return res.status(401).json({
        success: false,
        message: 'Session invalide',
      });
    }

    const userId = BigInt(profile.id);

    const rows = await prisma.connexionHistorique.findMany({
      where: { fkUtilisateur: userId },
      orderBy: { datecreate: 'desc' },
      take: MAX_ROWS,
      select: {
        id: true,
        datecreate: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    const entries: LoginHistoryEntry[] = rows.map((r) => ({
      id: r.id.toString(),
      datecreate: r.datecreate.toISOString(),
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
    }));

    return res.status(200).json({ success: true, entries });
  } catch (e) {
    console.error('[login-history]', e);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}
