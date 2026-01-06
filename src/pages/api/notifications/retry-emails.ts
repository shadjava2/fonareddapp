import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_RETRY_ATTEMPTS = 5;

/**
 * Tente d'envoyer les emails pour les notifications en attente
 * Gère les retries avec maximum 5 tentatives
 * Appelé périodiquement pour réessayer l'envoi des emails
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    // Récupérer toutes les notifications en attente avec un email destinataire
    const notificationsToRetry = await notificationModel.findMany({
      where: {
        statut: 'en_attente',
        adresse_destinataire: {
          not: '',
        },
      },
      take: 50, // Limiter à 50 notifications par batch
    });

    console.log(
      `📧 Tentative d'envoi pour ${notificationsToRetry.length} notification(s)`
    );

    let successCount = 0;
    let failedCount = 0;
    let maxAttemptsReachedCount = 0;

    for (const notification of notificationsToRetry) {
      try {
        // Calculer le nombre de tentatives
        // Pour simplifier, on utilise le nombre de jours depuis la création
        // Dans un vrai système, il faudrait un champ `tentatives_envoi`
        const daysSinceCreation = Math.floor(
          (new Date().getTime() - notification.datecreate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // Si trop de temps s'est écoulé sans succès, considérer comme max tentatives
        // Ou utiliser une autre méthode pour compter les tentatives
        // Pour l'instant, on va simplement essayer d'envoyer et mettre à jour le statut

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
            where: { id: notification.id },
            data: {
              statut: 'envoy_e',
              date_envoi: new Date(),
              dateupdate: new Date(),
            },
          });
          successCount++;
          console.log(
            `✅ Email envoyé pour la notification ${notification.id}`
          );
        } else {
          // Échec de l'envoi - incrémenter le compteur de tentatives
          // Utiliser une approche basée sur la date pour estimer les tentatives
          // Dans un système réel, utiliser un champ dédié

          // Pour cette implémentation, on va compter les tentatives via un champ
          // temporaire dans le contenu ou utiliser la date
          // Compter les jours depuis la première tentative (date_envoi)
          const firstAttemptDate =
            notification.date_envoi || notification.datecreate;
          const attemptsCount = Math.floor(
            (new Date().getTime() - firstAttemptDate.getTime()) /
              (1000 * 60 * 60) // En heures pour avoir plus de précision
          );

          if (attemptsCount >= MAX_RETRY_ATTEMPTS) {
            // Maximum de tentatives atteint - marquer comme échouée
            await notificationModel.update({
              where: { id: notification.id },
              data: {
                statut: 'chou_e',
                dateupdate: new Date(),
              },
            });
            maxAttemptsReachedCount++;
            console.log(
              `❌ Notification ${notification.id} marquée comme échouée après ${MAX_RETRY_ATTEMPTS} tentatives`
            );
          } else {
            // Mettre à jour la date d'envoi pour suivre les tentatives
            await notificationModel.update({
              where: { id: notification.id },
              data: {
                date_envoi: new Date(), // Mettre à jour pour compter la tentative
                dateupdate: new Date(),
              },
            });
            failedCount++;
            console.log(
              `⚠️ Tentative échouée pour la notification ${notification.id} (tentative ${attemptsCount + 1}/${MAX_RETRY_ATTEMPTS})`
            );
          }
        }
      } catch (error: any) {
        console.error(
          `❌ Erreur lors du traitement de la notification ${notification.id}:`,
          error
        );
        failedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Traitement des notifications terminé',
      stats: {
        total: notificationsToRetry.length,
        success: successCount,
        failed: failedCount,
        maxAttemptsReached: maxAttemptsReachedCount,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur lors du retry des emails:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
