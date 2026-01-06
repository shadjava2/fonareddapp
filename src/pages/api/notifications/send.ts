import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface NotificationRequest {
  fkUser?: number;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  sujet: string;
  message: string;
  scheduledAt?: string;
}

interface NotificationResponse {
  success: boolean;
  message?: string;
  notificationId?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NotificationResponse>
) {
  // Vérifier l'authentification
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Méthode non autorisée',
      });
    }

    const { fkUser, type, sujet, message, scheduledAt }: NotificationRequest = req.body;

    if (!type || !sujet || !message) {
      return res.status(400).json({
        success: false,
        message: 'Type, sujet et message requis',
      });
    }

    const validTypes = ['EMAIL', 'SMS', 'PUSH'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type de notification invalide',
      });
    }

    // Si fkUser est spécifié, vérifier que l'utilisateur existe
    if (fkUser) {
      const targetUser = await prisma.utilisateurs.findUnique({
        where: { id: fkUser },
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur cible non trouvé',
        });
      }
    }

    // Parser la date de programmation si fournie
    let scheduledDate: Date | null = null;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Format de date de programmation invalide',
        });
      }
    }

    // Créer la notification
    const notification = await prisma.notifications.create({
      data: {
        fkUser: fkUser || null,
        type,
        sujet,
        message,
        scheduledAt: scheduledDate,
        statut: scheduledDate && scheduledDate > new Date() ? 'EN_ATTENTE' : 'EN_ATTENTE',
      },
    });

    // TODO: Ici, on pourrait déclencher l'envoi immédiat si pas de programmation
    // ou ajouter à une queue pour traitement différé
    // Pour l'instant, on se contente d'enregistrer

    return res.status(201).json({
      success: true,
      message: 'Notification créée avec succès',
      notificationId: notification.id,
    });
  } catch (error) {
    console.error('Erreur API notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
