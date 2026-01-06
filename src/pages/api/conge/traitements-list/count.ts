import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface CountResponse {
  success: boolean;
  count?: number;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CountResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  if (!prisma) {
    return res.status(500).json({
      success: false,
      message: 'Prisma non initialisé',
    });
  }

  const model = (prisma as any).congetraitements;
  if (!model) {
    return res.status(500).json({
      success: false,
      message: 'Modèle traitements introuvable',
    });
  }

  try {
    // Vérifier l'authentification
    const token = getTokenFromRequest(req);
    let currentUser = null;
    if (token) {
      currentUser = await getUserFromToken(token);
    }

    // En mode développement, permettre de continuer sans token
    if (!currentUser && process.env.NODE_ENV === 'development') {
      currentUser = {
        id: 1,
        nom: 'Admin',
        prenom: 'Dev',
        username: 'admin',
        permissions: ['*'],
        services: ['*'],
      } as any;
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    // Récupérer le userId depuis la query string ou utiliser l'utilisateur connecté
    const userIdParam = req.query.userId;
    const userId = userIdParam ? Number(userIdParam) : currentUser.id;

    // Compter les traitements non traités assignés à cet utilisateur
    // Un traitement est "non traité" si :
    // - observations est null (pas encore commencé)
    // OU
    // - observations existe mais approbation ET conformite sont tous les deux null
    const where: any = {
      userupdateid: BigInt(userId),
      OR: [
        // Traitements sans observations (pas encore commencés)
        { observations: null },
        // Traitements avec observations mais sans décision finale (les deux null)
        {
          AND: [
            { observations: { not: null } },
            { approbation: null },
            { conformite: null },
          ],
        },
      ],
    };

    const count = await model.count({ where });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error('❌ Erreur API count traitements:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
