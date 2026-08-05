import { applySoldeRecalibration } from '@/lib/conge/apply-solde-recalibration';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface SchedulerResponse {
  success: boolean;
  message: string;
  details?: {
    month: number;
    monthName: string;
    nbjourMois: number;
    monthsCounted: number;
    totalPrevuSansConso: number;
    utilisateursTraites: number;
    resetYear: boolean;
    plafondNonJustifie?: number;
  };
}

/**
 * Recalibrage automatique des soldes — à lancer au **début** de chaque mois.
 *
 * - Fév–oct : restant = (mois clos × nbjourMois) − consommé
 * - Novembre : double anticipé (nov+déc) → 12 × nbjourMois − consommé
 * - Décembre : maintient 12 × nbjourMois − consommé
 * - Janvier : solde + consommé → 0 ; plafond NJ réinitialisé
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

    const config = await prisma.congeconfig.findFirst({
      orderBy: { dateupdate: 'desc' },
    });

    if (!config || !config.nbjourMois) {
      return res.status(400).json({
        success: false,
        message:
          "Configuration de congé introuvable. Veuillez configurer nbjourMois d'abord.",
      });
    }

    const nbjourMois = Number(config.nbjourMois) || 0;
    if (nbjourMois <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre de jours par mois doit être supérieur à 0',
      });
    }

    const plafondNJRaw = config.congenonjustifie;
    const plafondNJ =
      plafondNJRaw != null && Number.isFinite(Number(plafondNJRaw))
        ? Math.max(0, Number(plafondNJRaw))
        : 0;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    console.log(
      `📅 Scheduler congé (recalibrage début de mois) — mois ${currentMonth}`
    );

    const result = await applySoldeRecalibration({
      nbjourMois,
      currentMonth,
      plafondNonJustifie: plafondNJ,
    });

    const message = result.resetYear
      ? `Janvier : ${result.updated} solde(s) remis à zéro (NJ plafond ${plafondNJ}).`
      : `Recalibrage ${result.monthName} : ${result.updated} agent(s) — ${result.monthsCounted} mois × ${nbjourMois} j. (− consommé).`;

    return res.status(200).json({
      success: true,
      message,
      details: {
        month: result.currentMonth,
        monthName: result.monthName,
        nbjourMois,
        monthsCounted: result.monthsCounted,
        totalPrevuSansConso: result.totalPrevuSansConso,
        utilisateursTraites: result.updated,
        resetYear: result.resetYear,
        plafondNonJustifie: plafondNJ,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erreur scheduler congé:', error);
    return res.status(500).json({
      success: false,
      message: msg || 'Erreur serveur lors de la mise à jour mensuelle',
    });
  }
}
