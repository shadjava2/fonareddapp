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
  };
}

/**
 * API pour mettre à jour les soldes de congé à la fin de chaque mois
 *
 * Règles :
 * - Janvier à octobre : ajouter nbjourMois au solde de chaque utilisateur
 * - Novembre : ajouter nbjourMois * 2 (car rien n'a été ajouté en janvier)
 * - Décembre : remettre tous les soldes à 0
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SchedulerResponse>
) {
  // Vérifier que c'est une requête POST (pour sécurité, peut être appelée par un cron job)
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée. Utilisez POST.',
    });
  }

  // Vérifier une clé secrète pour sécuriser l'endpoint (optionnel mais recommandé)
  // Permettre aussi l'accès sans secret en développement
  const { secret } = req.body || req.query || {};
  const expectedSecret =
    process.env.SCHEDULER_SECRET || 'default-secret-change-me';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // En production, exiger le secret ; en développement, le secret est optionnel
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

    const configModel = (prisma as any).congeconfig;
    const soldeModel = (prisma as any).congesolde;
    const utilisateurModel = (prisma as any).utilisateurs;

    if (!configModel || !soldeModel || !utilisateurModel) {
      return res.status(500).json({
        success: false,
        message: 'Modèles Prisma introuvables',
      });
    }

    // Récupérer la configuration (nbjourMois)
    const config = await configModel.findFirst({
      orderBy: {
        dateupdate: 'desc',
      },
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

    // Obtenir la date actuelle
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12 (janvier = 1, décembre = 12)
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
      `📅 Traitement du scheduler pour le mois ${currentMonth} (${monthNames[currentMonth - 1]})`
    );

    // Récupérer tous les utilisateurs actifs
    const utilisateurs = await utilisateurModel.findMany({
      where: {
        locked: false, // Seulement les utilisateurs non bloqués
      },
      select: {
        id: true,
      },
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
        },
      });
    }

    let joursAjoutes = 0;
    let utilisateursTraites = 0;
    let totalSoldesResets = 0;

    // Logique selon le mois
    if (currentMonth === 12) {
      // DÉCEMBRE : Remettre tous les soldes à 0
      console.log('🔄 Décembre : Remise à zéro de tous les soldes');

      for (const utilisateur of utilisateurs) {
        const userId = BigInt(utilisateur.id);

        try {
          // Trouver ou créer le solde pour cet utilisateur
          const soldeExistant = await soldeModel.findFirst({
            where: {
              fkUtilisateur: userId,
            },
          });

          if (soldeExistant) {
            await soldeModel.update({
              where: {
                id: soldeExistant.id,
              },
              data: {
                solde: 0,
                soldeConsomme: 0,
                dateupdate: now,
              },
            });
            totalSoldesResets++;
          } else {
            // Créer un solde initialisé à 0 si n'existe pas
            await soldeModel.create({
              data: {
                fkUtilisateur: userId,
                solde: 0,
                soldeConsomme: 0,
                usercreateid: userId,
                userupdateid: userId,
              },
            });
            totalSoldesResets++;
          }
        } catch (error: any) {
          console.error(
            `❌ Erreur lors de la remise à zéro du solde pour l'utilisateur ${utilisateur.id}:`,
            error?.message || error
          );
          // Continue avec les autres utilisateurs même en cas d'erreur
        }
      }

      utilisateursTraites = utilisateurs.length;

      console.log(
        `✅ ${totalSoldesResets} solde(s) remis à zéro pour décembre`
      );

      return res.status(200).json({
        success: true,
        message: `Tous les soldes ont été remis à zéro pour décembre`,
        details: {
          month: currentMonth,
          monthName: monthNames[currentMonth - 1],
          nbjourMois: nbjourMois,
          joursAjoutes: 0,
          utilisateursTraites: utilisateursTraites,
          totalSoldesResets: totalSoldesResets,
        },
      });
    } else if (currentMonth === 1) {
      // JANVIER : Ne rien ajouter
      console.log('📊 Janvier : Aucun ajout de jours (règle spéciale)');

      return res.status(200).json({
        success: true,
        message: 'Janvier : Aucun jour ajouté (sera compensé en novembre)',
        details: {
          month: currentMonth,
          monthName: monthNames[currentMonth - 1],
          nbjourMois: nbjourMois,
          joursAjoutes: 0,
          utilisateursTraites: utilisateurs.length,
        },
      });
    } else {
      // FÉVRIER à OCTOBRE : Ajouter nbjourMois
      // NOVEMBRE : Ajouter nbjourMois * 2 (car rien en janvier)

      let joursAAjouter = nbjourMois;
      if (currentMonth === 11) {
        // Novembre : ajouter le double (janvier manqué)
        joursAAjouter = nbjourMois * 2;
        console.log(
          `📊 Novembre : Ajout de ${joursAAjouter} jours (${nbjourMois} * 2) à chaque utilisateur`
        );
      } else {
        console.log(
          `📊 ${monthNames[currentMonth - 1]} : Ajout de ${joursAAjouter} jours à chaque utilisateur`
        );
      }

      for (const utilisateur of utilisateurs) {
        const userId = BigInt(utilisateur.id);

        try {
          // Trouver ou créer le solde pour cet utilisateur
          const soldeExistant = await soldeModel.findFirst({
            where: {
              fkUtilisateur: userId,
            },
          });

          if (soldeExistant) {
            // Mettre à jour le solde existant
            const soldeActuel = Number(soldeExistant.solde) || 0;
            const nouveauSolde = soldeActuel + joursAAjouter;

            await soldeModel.update({
              where: {
                id: soldeExistant.id,
              },
              data: {
                solde: nouveauSolde,
                dateupdate: now,
              },
            });

            joursAjoutes += joursAAjouter;
            utilisateursTraites++;
          } else {
            // Créer un nouveau solde si n'existe pas
            await soldeModel.create({
              data: {
                fkUtilisateur: userId,
                solde: joursAAjouter,
                soldeConsomme: 0,
                usercreateid: userId,
                userupdateid: userId,
              },
            });

            joursAjoutes += joursAAjouter;
            utilisateursTraites++;
          }
        } catch (error: any) {
          console.error(
            `❌ Erreur lors de la mise à jour du solde pour l'utilisateur ${utilisateur.id}:`,
            error?.message || error
          );
          // Continue avec les autres utilisateurs même en cas d'erreur
        }
      }

      console.log(
        `✅ ${utilisateursTraites} utilisateur(s) traité(s). Total de ${joursAjoutes} jour(s) ajouté(s) pour ${monthNames[currentMonth - 1]}`
      );

      return res.status(200).json({
        success: true,
        message: `${joursAjoutes} jour(s) ajouté(s) à ${utilisateursTraites} utilisateur(s) pour ${monthNames[currentMonth - 1]}`,
        details: {
          month: currentMonth,
          monthName: monthNames[currentMonth - 1],
          nbjourMois: nbjourMois,
          joursAjoutes: joursAjoutes,
          utilisateursTraites: utilisateursTraites,
        },
      });
    }
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la mise à jour mensuelle des soldes:',
      error
    );
    return res.status(500).json({
      success: false,
      message:
        error?.message || 'Erreur serveur lors de la mise à jour mensuelle',
    });
  }
}
