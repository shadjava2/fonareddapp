import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface SchedulerResponse {
  success: boolean;
  message: string;
  details?: {
    month: number;
    monthName: string;
    nbjourMois: number;
    joursAjoutes: number;
    utilisateursTraites: number;
    totalSoldesResets?: number;
    plafondNonJustifie?: number;
  };
}

/**
 * Mise à jour des soldes de congé (fin de mois, via cron / POST sécurisé).
 *
 * Solde congé classique :
 * - Janvier : pas d’ajout de jours (compensé en novembre)
 * - Février à octobre : +nbjourMois
 * - Novembre : +nbjourMois × 2
 * - Décembre : solde et soldeConsomme → 0 ; congenonjustifie (non justifié) → 0
 *
 * Congés non justifiés (congesolde.congenonjustifie = jours restants) :
 * - Janvier : réinitialisation au plafond congeconfig.congenonjustifie pour chaque utilisateur
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
    const monthNames = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];

    console.log(
      `📅 Scheduler congé — mois ${currentMonth} (${monthNames[currentMonth - 1]})`
    );

    const utilisateurs = await prisma.utilisateurs.findMany({
      where: { locked: false },
      select: { id: true },
    });

    if (utilisateurs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucun utilisateur actif trouvé',
        details: {
          month: currentMonth,
          monthName: monthNames[currentMonth - 1],
          nbjourMois: nbjourMois,
          joursAjoutes: 0,
          utilisateursTraites: 0,
          plafondNonJustifie: plafondNJ,
        },
      });
    }

    let joursAjoutes = 0;
    let utilisateursTraites = 0;
    let totalSoldesResets = 0;

    if (currentMonth === 12) {
      console.log('🔄 Décembre : soldes congé à 0 + reset jours non justifiés');

      for (const utilisateur of utilisateurs) {
        const userId = utilisateur.id;

        try {
          const soldeExistant = await prisma.congesolde.findFirst({
            where: { fkUtilisateur: userId },
          });

          if (soldeExistant) {
            await prisma.congesolde.update({
              where: { id: soldeExistant.id },
              data: {
                solde: 0,
                soldeConsomme: 0,
                congenonjustifie: 0,
                dateupdate: now,
              },
            });
            totalSoldesResets++;
          } else {
            await prisma.congesolde.create({
              data: {
                fkUtilisateur: userId,
                solde: 0,
                soldeConsomme: 0,
                congenonjustifie: 0,
                usercreateid: userId,
                userupdateid: userId,
              },
            });
            totalSoldesResets++;
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Erreur solde utilisateur ${utilisateur.id}:`,
            msg
          );
        }
      }

      utilisateursTraites = utilisateurs.length;

      return res.status(200).json({
        success: true,
        message: `Décembre : soldes remis à zéro et jours non justifiés à 0`,
        details: {
          month: currentMonth,
          monthName: monthNames[currentMonth - 1],
          nbjourMois: nbjourMois,
          joursAjoutes: 0,
          utilisateursTraites,
          totalSoldesResets,
          plafondNonJustifie: plafondNJ,
        },
      });
    }

    if (currentMonth === 1) {
      console.log(
        `📊 Janvier : plafond congés non justifiés = ${plafondNJ} (pas d’ajout de jours de congé)`
      );

      for (const utilisateur of utilisateurs) {
        const userId = utilisateur.id;

        try {
          const soldeExistant = await prisma.congesolde.findFirst({
            where: { fkUtilisateur: userId },
          });

          if (soldeExistant) {
            await prisma.congesolde.update({
              where: { id: soldeExistant.id },
              data: {
                congenonjustifie: plafondNJ,
                dateupdate: now,
              },
            });
          } else {
            await prisma.congesolde.create({
              data: {
                fkUtilisateur: userId,
                solde: 0,
                soldeConsomme: 0,
                congenonjustifie: plafondNJ,
                usercreateid: userId,
                userupdateid: userId,
              },
            });
          }
          utilisateursTraites++;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Erreur reset NJ utilisateur ${utilisateur.id}:`,
            msg
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: `Janvier : plafond jours non justifiés réinitialisé (${plafondNJ} j.) ; aucun jour de congé ajouté`,
        details: {
          month: currentMonth,
          monthName: monthNames[currentMonth - 1],
          nbjourMois: nbjourMois,
          joursAjoutes: 0,
          utilisateursTraites,
          plafondNonJustifie: plafondNJ,
        },
      });
    }

    let joursAAjouter = nbjourMois;
    if (currentMonth === 11) {
      joursAAjouter = nbjourMois * 2;
      console.log(
        `📊 Novembre : +${joursAAjouter} j. / utilisateur (${nbjourMois} × 2)`
      );
    } else {
      console.log(
        `📊 ${monthNames[currentMonth - 1]} : +${joursAAjouter} j. / utilisateur`
      );
    }

    for (const utilisateur of utilisateurs) {
      const userId = utilisateur.id;

      try {
        const soldeExistant = await prisma.congesolde.findFirst({
          where: { fkUtilisateur: userId },
        });

        if (soldeExistant) {
          const soldeActuel = Number(soldeExistant.solde) || 0;
          const nouveauSolde = soldeActuel + joursAAjouter;

          await prisma.congesolde.update({
            where: { id: soldeExistant.id },
            data: {
              solde: nouveauSolde,
              dateupdate: now,
            },
          });

          joursAjoutes += joursAAjouter;
          utilisateursTraites++;
        } else {
          await prisma.congesolde.create({
            data: {
              fkUtilisateur: userId,
              solde: joursAAjouter,
              soldeConsomme: 0,
              congenonjustifie: plafondNJ,
              usercreateid: userId,
              userupdateid: userId,
            },
          });

          joursAjoutes += joursAAjouter;
          utilisateursTraites++;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ Erreur mise à jour solde utilisateur ${utilisateur.id}:`,
          msg
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `${joursAjoutes} jour(s) ajouté(s) à ${utilisateursTraites} utilisateur(s) — ${monthNames[currentMonth - 1]}`,
      details: {
        month: currentMonth,
        monthName: monthNames[currentMonth - 1],
        nbjourMois: nbjourMois,
        joursAjoutes,
        utilisateursTraites,
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
