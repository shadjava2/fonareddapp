import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const TRAITEMENT_VIEW_ALL_ROLE_IDS = new Set(['11', '12', '17']);

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

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    // Récupérer le userId depuis la query string ou utiliser l'utilisateur connecté
    const userIdParam = req.query.userId;
    const userId = userIdParam ? Number(userIdParam) : currentUser.id;

    const roleId = String((currentUser as any).fkRole ?? '');
    const canViewAllTraitements = TRAITEMENT_VIEW_ALL_ROLE_IDS.has(roleId);

    // Compter les traitements non traités (globaux pour rôles coordonnateurs, sinon assignés à l'utilisateur)
    // Un traitement est "non traité" si :
    // - observations est null (pas encore commencé)
    // OU
    // - observations existe mais approbation ET conformite sont tous les deux null
    const where: any = {
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
    if (!canViewAllTraitements) {
      where.userupdateid = BigInt(userId);
    }

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
