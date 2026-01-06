import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface AutocompleteUser {
  id: string;
  nom: string;
  prenom: string;
  postnom?: string | null;
  username: string;
  label: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AutocompleteUser[]>
) {
  if (req.method !== 'GET') {
    return res.status(405).json([]);
  }

  try {
    const search = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;

    console.log(
      '🔍 Autocomplete utilisateurs - Recherche:',
      search,
      'Limit:',
      limit
    );

    // Construire la condition de recherche
    const where: any = {};

    // Pour le moment, on retourne tous les utilisateurs (sans filtre locked)
    // pour s'assurer que les données sont chargées
    // TODO: Réactiver le filtre locked si nécessaire
    // where.locked = false;

    if (search && search.trim()) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { postnom: { contains: search } },
        { username: { contains: search } },
        { mail: { contains: search } },
      ];
    }

    console.log('🔍 Condition WHERE:', JSON.stringify(where, null, 2));

    const users = await prisma.utilisateurs.findMany({
      where,
      select: {
        id: true,
        nom: true,
        prenom: true,
        postnom: true,
        username: true,
      },
      take: limit,
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    console.log('🔍 Utilisateurs trouvés dans la DB:', users.length);
    if (users.length > 0) {
      console.log('🔍 Premier utilisateur exemple:', {
        id: users[0].id.toString(),
        nom: users[0].nom,
        prenom: users[0].prenom,
        postnom: users[0].postnom,
        username: users[0].username,
      });
    }

    const formattedUsers: AutocompleteUser[] = users.map((user) => {
      // Construire le label avec nom, postnom, prenom
      const parts = [
        user.nom || '',
        user.postnom || '',
        user.prenom || '',
      ].filter((p) => p && p.trim());
      const fullName = parts.join(' ').trim() || user.username || '';

      return {
        id: user.id.toString(),
        nom: user.nom || '',
        prenom: user.prenom || '',
        postnom: user.postnom || null,
        username: user.username || '',
        label: fullName,
      };
    });

    console.log('✅ Utilisateurs formatés:', formattedUsers.length);
    if (formattedUsers.length > 0) {
      console.log('🔍 Premier utilisateur formaté:', formattedUsers[0]);
    }

    return res.status(200).json(formattedUsers);
  } catch (error: any) {
    console.error('❌ Erreur autocomplete utilisateurs:', error);
    return res.status(500).json([]);
  }
}
