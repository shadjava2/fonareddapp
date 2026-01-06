import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface SchedulerResponse {
  success: boolean;
  message: string;
  details?: {
    indisponibilitesMisesAJour: number;
  };
}

/**
 * API pour mettre à jour automatiquement le statut des indisponibilités d'urgence
 *
 * Règle :
 * - Si la date fin (au) est définie et que cette date est passée,
 *   le statut passe automatiquement à "disponible"
 *
 * À appeler quotidiennement via un cron job
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SchedulerResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée. Utilisez POST.',
    });
  }

  // Vérifier une clé secrète pour sécuriser l'endpoint
  const { secret } = req.body || req.query || {};
  const expectedSecret =
    process.env.SCHEDULER_SECRET || 'default-secret-change-me';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment && secret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Clé secrète invalide',
    });
  }

  try {
    if (!prisma) {
      return res.status(500).json({
        success: false,
        message: 'Prisma non initialisé',
      });
    }

    const model = (prisma as any).urgenceindisponibilites;
    if (!model) {
      return res.status(500).json({
        success: false,
        message: 'Modèle urgenceindisponibilites introuvable',
      });
    }

    const maintenant = new Date();
    maintenant.setHours(0, 0, 0, 0); // Début de la journée

    console.log(
      '📅 Traitement du scheduler pour mettre à jour les indisponibilités'
    );

    // Trouver toutes les indisponibilités qui ont une date fin définie
    // et qui est passée, avec statut "indisponible"
    const indisposAMettreAJour = await model.findMany({
      where: {
        statut: 'indisponible',
        au: {
          not: null,
          lte: maintenant, // Date fin <= maintenant
        },
      },
    });

    console.log(
      `📊 ${indisposAMettreAJour.length} indisponibilité(s) à mettre à jour (date fin passée)`
    );

    let misesAJour = 0;

    for (const indispo of indisposAMettreAJour) {
      try {
        await model.update({
          where: {
            id: indispo.id,
          },
          data: {
            statut: 'disponible',
            dateupdate: new Date(),
          },
        });

        misesAJour++;
        console.log(
          `✅ Indisponibilité ${Number(indispo.id)} passée à "disponible" (date fin: ${indispo.au})`
        );
      } catch (error: any) {
        console.error(
          `❌ Erreur lors de la mise à jour de l'indisponibilité ${Number(indispo.id)}:`,
          error?.message || error
        );
      }
    }

    console.log(`✅ ${misesAJour} indisponibilité(s) mise(s) à jour`);

    return res.status(200).json({
      success: true,
      message: `${misesAJour} indisponibilité(s) mise(s) à jour (statut: disponible)`,
      details: {
        indisponibilitesMisesAJour: misesAJour,
      },
    });
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la mise à jour des indisponibilités:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
