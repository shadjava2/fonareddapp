import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { broadcastToUser } from './stream';

interface MarkAllReadResponse {
  success: boolean;
  message?: string;
  count?: number;
}

/**
 * Marquer toutes les notifications non lues comme lues pour un utilisateur
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarkAllReadResponse>
) {
  if (req.method !== 'POST') {
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
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requis',
      });
    }

    // Valider que userId est un nombre valide
    const userIdNum = Number(userId);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'userId invalide',
      });
    }

    // Vérifier l'authentification (ne pas bloquer si échoue)
    let currentUser = null;
    try {
      const token = getTokenFromRequest(req);
      currentUser = token ? await getUserFromToken(token) : null;
    } catch (authError: any) {
      console.warn(
        '⚠️ Erreur auth lors du marquage (non bloquant):',
        authError?.message
      );
      // Continue même si l'auth échoue
    }

    let countBefore = 0;
    try {
      // Compter les notifications "Non Ouvert" avant la mise à jour
      countBefore = await model.count({
        where: {
          fkUtilisateur: BigInt(userIdNum),
          contenu: {
            contains: 'Non Ouvert',
          },
        },
      });
    } catch (countError: any) {
      console.error(
        '❌ Erreur lors du comptage des notifications:',
        countError
      );
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du comptage des notifications',
      });
    }

    // Si aucune notification à mettre à jour, retourner immédiatement
    if (countBefore === 0) {
      return res.status(200).json({
        success: true,
        message: '0 notification(s) marquée(s) comme lue(s)',
        count: 0,
      });
    }

    try {
      // Mettre à jour toutes les notifications "Non Ouvert" en "Ouvert"
      await model.updateMany({
        where: {
          fkUtilisateur: BigInt(userIdNum),
          contenu: {
            contains: 'Non Ouvert',
          },
        },
        data: {
          contenu: 'Ouvert', // Mettre à jour le contenu de "Non Ouvert" à "Ouvert"
          dateupdate: new Date(),
          userupdateid: currentUser ? BigInt(currentUser.id) : null,
        },
      });

      console.log(
        `✅ ${countBefore} notification(s) marquée(s) comme lue(s) pour l'utilisateur ${userIdNum}`
      );

      // Envoyer via SSE (ne pas bloquer si échoue)
      try {
        await broadcastToUser(userIdNum, {
          type: 'READ',
          decrement: countBefore,
        });
      } catch (sseError: any) {
        console.warn(
          '⚠️ Erreur SSE lors du marquage (non bloquant):',
          sseError?.message
        );
        // Continue même si SSE échoue
      }

      return res.status(200).json({
        success: true,
        message: `${countBefore} notification(s) marquée(s) comme lue(s)`,
        count: countBefore,
      });
    } catch (updateError: any) {
      console.error(
        '❌ Erreur lors de la mise à jour des notifications:',
        updateError
      );
      return res.status(500).json({
        success: false,
        message: updateError?.message || 'Erreur lors de la mise à jour',
      });
    }
  } catch (error: any) {
    console.error('❌ Erreur lors du marquage des notifications:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
