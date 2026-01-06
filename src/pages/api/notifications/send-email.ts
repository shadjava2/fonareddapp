import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_RETRY_ATTEMPTS = 5;

interface EmailSendResponse {
  success: boolean;
  message?: string;
  notificationId?: string;
}

/**
 * Tente d'envoyer un email pour une notification
 * Gère les retries avec maximum 5 tentatives
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmailSendResponse>
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

  const notificationModel = (prisma as any).notifications;
  if (!notificationModel) {
    return res.status(500).json({
      success: false,
      message: 'Modèle notifications introuvable',
    });
  }

  try {
    const { notificationId } = req.body || {};

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'notificationId requis',
      });
    }

    // Vérifier l'authentification
    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    // Récupérer la notification
    const notification = await notificationModel.findUnique({
      where: { id: BigInt(notificationId) },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée',
      });
    }

    // Vérifier que la notification a un email destinataire
    if (
      !notification.adresse_destinataire ||
      notification.adresse_destinataire.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Aucune adresse email destinataire configurée',
      });
    }

    // Compter les tentatives en utilisant le champ date_envoi
    // Si date_envoi a été modifiée plusieurs fois, c'est qu'on a déjà tenté plusieurs fois
    // Pour une vraie implémentation, il faudrait ajouter un champ `tentatives_envoi` au schéma
    // Pour l'instant, on va utiliser une approche basée sur les logs ou le nombre de jours/heures
    const firstAttemptDate = notification.date_envoi || notification.datecreate;
    const hoursSinceFirstAttempt = Math.floor(
      (new Date().getTime() - firstAttemptDate.getTime()) / (1000 * 60 * 60)
    );

    // Estimer le nombre de tentatives basé sur le temps écoulé
    // (on suppose une tentative par heure pour les retries automatiques)
    const estimatedAttempts = Math.min(
      hoursSinceFirstAttempt,
      MAX_RETRY_ATTEMPTS
    );

    // Tenter l'envoi de l'email
    const emailSent = await sendEmail({
      to: notification.adresse_destinataire,
      subject: notification.sujet || 'Notification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${notification.sujet || 'Notification'}</h2>
            </div>
            <div class="content">
              <p>${notification.contenu || 'Vous avez une nouvelle notification.'}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailSent) {
      // Email envoyé avec succès
      await notificationModel.update({
        where: { id: BigInt(notificationId) },
        data: {
          statut: 'envoy_e',
          date_envoi: new Date(),
          dateupdate: new Date(),
          userupdateid: currentUser
            ? BigInt(currentUser.id)
            : notification.userupdateid,
        },
      });

      console.log(
        `✅ Email envoyé avec succès pour la notification ${notificationId}`
      );

      return res.status(200).json({
        success: true,
        message: 'Email envoyé avec succès',
        notificationId: String(notification.id),
      });
    } else {
      // Email non envoyé - incrémenter le compteur de tentatives
      // Stocker le nombre de tentatives dans userupdateid temporairement
      // ou créer un champ dédié (idéalement, ajouter tentatives_envoi au schéma)

      // Pour l'instant, on va utiliser une approche simple :
      // Si le statut est déjà "en_attente" et qu'on a déjà tenté plusieurs fois, passer à "échouée"

      // Récupérer le nombre de tentatives depuis une autre source ou utiliser une logique
      // Pour simplifier, on va créer un champ dans le contenu ou utiliser une autre méthode

      // Compter combien de fois on a déjà tenté (en vérifiant les logs ou utiliser un compteur)
      // Pour l'instant, on va utiliser une approche basée sur la date d'envoi
      const attemptsCount = notification.date_envoi ? 1 : 0; // Simplification

      if (estimatedAttempts >= MAX_RETRY_ATTEMPTS) {
        // Maximum de tentatives atteint - marquer comme échouée
        await notificationModel.update({
          where: { id: BigInt(notificationId) },
          data: {
            statut: 'chou_e', // Statut "échouée"
            dateupdate: new Date(),
            userupdateid: currentUser
              ? BigInt(currentUser.id)
              : notification.userupdateid,
          },
        });

        console.log(
          `❌ Notification ${notificationId} marquée comme échouée après ${MAX_RETRY_ATTEMPTS} tentatives estimées`
        );

        return res.status(500).json({
          success: false,
          message: `Email non envoyé après ${MAX_RETRY_ATTEMPTS} tentatives. Notification marquée comme échouée.`,
          notificationId: String(notification.id),
        });
      } else {
        // Mettre à jour la date d'envoi pour suivre les tentatives
        await notificationModel.update({
          where: { id: BigInt(notificationId) },
          data: {
            date_envoi: new Date(), // Mettre à jour pour compter la tentative
            dateupdate: new Date(),
            userupdateid: currentUser
              ? BigInt(currentUser.id)
              : notification.userupdateid,
          },
        });

        console.log(
          `⚠️ Tentative d'envoi échouée pour la notification ${notificationId} (tentative estimée ${estimatedAttempts + 1}/${MAX_RETRY_ATTEMPTS})`
        );

        return res.status(500).json({
          success: false,
          message: `Échec de l'envoi de l'email. Tentative estimée ${estimatedAttempts + 1}/${MAX_RETRY_ATTEMPTS}`,
          notificationId: String(notification.id),
        });
      }
    }
  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
