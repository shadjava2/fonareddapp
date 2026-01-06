import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { broadcastToUser } from './stream';

interface NotificationResponse {
  success: boolean;
  message?: string;
  notification?: any;
  count?: number;
}

/**
 * Créer une nouvelle notification
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotificationResponse>
) {
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
    if (req.method === 'POST') {
      // Créer une nouvelle notification
      const {
        userId,
        sujet,
        contenu,
        type_notification = 'TRAITEMENT',
        adresse_destinataire,
      } = req.body || {};

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis',
        });
      }

      // Vérifier l'authentification pour obtenir usercreateid
      const token = getTokenFromRequest(req);
      const currentUser = token ? await getUserFromToken(token) : null;

      const now = new Date();
      const notif = await model.create({
        data: {
          fkUtilisateur: BigInt(userId),
          type_notification: type_notification,
          statut: 'en_attente', // Utiliser l'enum existant
          sujet: sujet || null,
          contenu: contenu || null,
          adresse_destinataire: adresse_destinataire || '',
          date_programmee: now,
          date_envoi: now,
          datecreate: now,
          dateupdate: now,
          usercreateid: currentUser ? BigInt(currentUser.id) : null,
          userupdateid: currentUser ? BigInt(currentUser.id) : null,
        },
      });

      console.log(`✅ Notification créée pour l'utilisateur ${userId}`);

      // Envoyer via SSE
      await broadcastToUser(Number(userId), {
        type: 'NEW',
        item: {
          id: String(notif.id),
          fkUtilisateur: Number(userId), // Inclure fkUtilisateur pour vérification côté client
          sujet: notif.sujet,
          contenu: notif.contenu,
          statut: notif.statut,
          datecreate: notif.datecreate?.toISOString(),
        },
        increment: 1,
      });

      return res.status(201).json({
        success: true,
        message: 'Notification créée',
        notification: {
          id: String(notif.id),
          sujet: notif.sujet,
          contenu: notif.contenu,
          statut: notif.statut,
          datecreate: notif.datecreate?.toISOString(),
        },
      });
    }

    if (req.method === 'PATCH') {
      // Marquer une notification comme lue
      const { id, userId } = req.body || {};

      if (!id || !userId) {
        return res.status(400).json({
          success: false,
          message: 'id et userId requis',
        });
      }

      // Vérifier l'authentification
      const token = getTokenFromRequest(req);
      const currentUser = token ? await getUserFromToken(token) : null;

      const notif = await model.update({
        where: { id: BigInt(id) },
        data: {
          statut: 'envoy_e', // Utiliser l'enum existant (ou adapter selon votre logique)
          dateupdate: new Date(),
          userupdateid: currentUser ? BigInt(currentUser.id) : null,
        },
      });

      console.log(
        `✅ Notification ${id} marquée comme lue pour l'utilisateur ${userId}`
      );

      // Envoyer via SSE
      await broadcastToUser(Number(userId), {
        type: 'READ',
        id: String(notif.id),
        decrement: 1,
      });

      return res.status(200).json({
        success: true,
        message: 'Notification marquée comme lue',
      });
    }

    if (req.method === 'PUT') {
      // Marquer une notification comme lue (méthode PUT comme demandé)
      const { id, userId } = req.body || {};

      if (!id || !userId) {
        return res.status(400).json({
          success: false,
          message: 'id et userId requis',
        });
      }

      // Vérifier l'authentification
      const token = getTokenFromRequest(req);
      const currentUser = token ? await getUserFromToken(token) : null;

      // Vérifier que la notification appartient à l'utilisateur
      const existingNotif = await model.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existingNotif) {
        return res.status(404).json({
          success: false,
          message: 'Notification non trouvée',
        });
      }

      if (existingNotif.fkUtilisateur !== BigInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cette notification',
        });
      }

      const notif = await model.update({
        where: { id: BigInt(id) },
        data: {
          statut: 'envoy_e', // Utiliser l'enum existant
          dateupdate: new Date(),
          userupdateid: currentUser ? BigInt(currentUser.id) : null,
        },
      });

      console.log(
        `✅ Notification ${id} marquée comme lue pour l'utilisateur ${userId} (PUT)`
      );

      // Envoyer via SSE
      await broadcastToUser(Number(userId), {
        type: 'READ',
        id: String(notif.id),
        decrement: 1,
      });

      return res.status(200).json({
        success: true,
        message: 'Notification marquée comme lue',
      });
    }

    if (req.method === 'GET') {
      // Récupérer les notifications non lues pour un utilisateur
      const userIdParam = req.query.userId;
      const userId = userIdParam ? Number(userIdParam) : null;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId requis',
        });
      }

      // Compter les notifications avec contenu "Non Ouvert" (non lues)
      const notifs = await model.findMany({
        where: {
          fkUtilisateur: BigInt(userId),
          contenu: {
            contains: 'Non Ouvert', // Filtrer par contenu "Non Ouvert"
          },
        },
        orderBy: { datecreate: 'desc' },
        take: 50, // Limiter à 50 notifications
      });

      return res.status(200).json({
        success: true,
        count: notifs.length,
        notifications: notifs.map((n: any) => ({
          id: String(n.id),
          fkUtilisateur: Number(n.fkUtilisateur), // Inclure fkUtilisateur pour vérification côté client
          sujet: n.sujet,
          contenu: n.contenu,
          statut: n.statut,
          datecreate: n.datecreate?.toISOString(),
        })),
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ Erreur API notifications:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
