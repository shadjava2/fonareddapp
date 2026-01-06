import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface HistoriqueResponse {
  success: boolean;
  notifications?: any[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoriqueResponse>
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

  const model = (prisma as any).notifications;
  if (!model) {
    return res.status(500).json({
      success: false,
      message: 'Modèle notifications introuvable',
    });
  }

  try {
    const userIdParam = req.query.userId;
    const userId = userIdParam ? Number(userIdParam) : null;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requis',
      });
    }

    // Vérifier l'authentification
    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    // Pagination
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, parseInt(String(req.query.limit || '25'), 10));
    const skip = (page - 1) * limit;

    // Recherche
    const search = String(req.query.search || '').trim();

    // IMPORTANT: Filtrer strictement par fkUtilisateur = userId de l'utilisateur connecté
    // Construire la condition where
    const where: any = {
      fkUtilisateur: BigInt(userId), // Filtrer uniquement pour l'utilisateur connecté
    };

    if (search) {
      where.OR = [
        { sujet: { contains: search } },
        { contenu: { contains: search } },
        { adresse_destinataire: { contains: search } },
      ];
    }

    console.log(
      `📊 Historique: Chargement notifications pour l'utilisateur ${userId} (fkUtilisateur=${userId})`
    );

    // Récupérer les notifications
    const [notifications, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { datecreate: 'desc' },
      }),
      model.count({ where }),
    ]);

    console.log(
      `📊 Historique: ${notifications.length} notification(s) trouvée(s) sur ${total} total pour l'utilisateur ${userId}`
    );

    const totalPages = Math.ceil(total / limit);

    // Formater les notifications
    const formattedNotifications = notifications.map((n: any) => ({
      id: String(n.id),
      sujet: n.sujet,
      contenu: n.contenu,
      statut: n.statut,
      type_notification: n.type_notification,
      adresse_destinataire: n.adresse_destinataire,
      datecreate: n.datecreate?.toISOString(),
      date_envoi: n.date_envoi?.toISOString(),
      dateupdate: n.dateupdate?.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      notifications: formattedNotifications,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur API historique notifications:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
