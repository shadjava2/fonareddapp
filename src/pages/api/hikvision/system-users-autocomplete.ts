import { prisma } from '@/lib/prisma';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Autocomplete utilisateurs système pour liaison ACS (module personnel).
 * Libellés : Prénom NOM POST-NOM
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, users: [] });
  }

  try {
    const search = String(req.query.q || '').trim();
    const limit = Math.min(
      500,
      Math.max(1, Number(req.query.limit) || 500)
    );

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { postnom: { contains: search } },
        { username: { contains: search } },
        { mail: { contains: search } },
      ];
    }

    const users = await prisma.utilisateurs.findMany({
      where,
      select: {
        id: true,
        nom: true,
        prenom: true,
        postnom: true,
        username: true,
        fonction: { select: { nom: true } },
      },
      take: limit,
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      users: users.map((u) => {
        const fullName = formatPersonDisplayName(u);
        const label = fullName
          ? `${fullName} (${u.username})`
          : u.username;
        return {
          id: String(u.id),
          value: String(u.id),
          label,
          username: u.username,
          fonction: u.fonction?.nom || null,
        };
      }),
    });
  } catch (error: unknown) {
    console.error('system-users-autocomplete:', error);
    return res.status(500).json({
      success: false,
      users: [],
      message: error instanceof Error ? error.message : 'Erreur',
    });
  }
}
