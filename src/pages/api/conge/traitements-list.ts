import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { broadcastToUser } from '../notifications/stream';

function formatRow(row: any) {
  const result: any = {};
  for (const key in row) {
    const val = row[key];
    if (typeof val === 'bigint') {
      result[key] = String(val);
    } else if (val instanceof Date) {
      result[key] = val.toISOString().split('T')[0];
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Crée une notification pour un utilisateur et la diffuse via SSE
 */
async function createAndBroadcastNotification(
  userId: number,
  sujet: string,
  contenu: string,
  type_notification: string = 'TRAITEMENT'
): Promise<void> {
  try {
    if (!prisma) return;

    const notificationModel = (prisma as any).notifications;
    if (!notificationModel) {
      console.warn('⚠️ Modèle notifications introuvable');
      return;
    }

    const now = new Date();
    const notif = await notificationModel.create({
      data: {
        fkUtilisateur: BigInt(userId),
        type_notification: type_notification,
        statut: 'en_attente',
        sujet: sujet,
        contenu: contenu,
        adresse_destinataire: '',
        date_programmee: now,
        date_envoi: now,
        datecreate: now,
        dateupdate: now,
      },
    });

    console.log(`🔔 Notification créée pour l'utilisateur ${userId}:`, sujet);

    // Diffuser via SSE
    await broadcastToUser(userId, {
      type: 'NEW',
      item: {
        id: String(notif.id),
        fkUtilisateur: userId, // Inclure fkUtilisateur pour vérification côté client
        sujet: notif.sujet,
        contenu: notif.contenu,
        statut: notif.statut,
        datecreate: notif.datecreate?.toISOString(),
      },
      increment: 1,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la notification:', error);
    // Ne pas bloquer la réponse si la notification échoue
  }
}

/**
 * Récupère le label d'une phase par son ID
 */
async function getPhaseLabel(phaseId: number): Promise<string> {
  try {
    if (!prisma) {
      // Fallback si Prisma n'est pas disponible
      const designationMap: Record<number, string> = {
        1: 'REMPLACANT(E)',
        2: 'ADMINISTRATION',
        3: 'VISA SUPERVISEUR',
        4: 'APPROBATION COORDINA',
        5: 'APPROBATION COORDINA',
      };
      return designationMap[phaseId] || `Phase ${phaseId}`;
    }

    const phaseModel = (prisma as any).congephase;
    if (phaseModel) {
      const phase = await phaseModel.findUnique({
        where: { id: BigInt(phaseId) },
      });
      if (phase?.designation) {
        return phase.designation;
      }
    }

    // Fallback
    const designationMap: Record<number, string> = {
      1: 'REMPLACANT(E)',
      2: 'ADMINISTRATION',
      3: 'VISA SUPERVISEUR',
      4: 'APPROBATION COORDINA',
      5: 'APPROBATION COORDINA',
    };
    return designationMap[phaseId] || `Phase ${phaseId}`;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la phase:', error);
    return `Phase ${phaseId}`;
  }
}

/**
 * Vérifie si une phase peut être traitée selon les règles de traitement
 * - Les niveaux supérieurs ne peuvent pas traiter si les niveaux inférieurs n'ont pas été traités
 * - Les inférieurs ne peuvent pas traiter si les supérieurs sont déjà traités
 * - Exception : niveaux 4 et 5 peuvent traiter quand on arrive au niveau 4
 * @param currentPhase Phase à traiter
 * @param allTraitements Tous les traitements de la demande
 * @returns {canProcess: boolean, message?: string}
 */
async function canProcessPhase(
  currentPhase: number,
  fkDemande: bigint,
  model: any
): Promise<{ canProcess: boolean; message?: string }> {
  // Récupérer tous les traitements de cette demande
  const allTraitements = await model.findMany({
    where: {
      fkDemande: fkDemande,
    },
  });

  // Trouver le traitement de la phase courante
  const currentTraitement = allTraitements.find(
    (t: any) => t.fkPhase && Number(t.fkPhase) === currentPhase
  );

  // Exception pour les phases 4 et 5 : elles peuvent traiter quand on arrive au niveau 4
  // C'est-à-dire quand la phase 3 est traitée, soit la phase 4, soit la phase 5 peut traiter
  if (currentPhase === 4 || currentPhase === 5) {
    // Vérifier que toutes les phases précédentes (1,2,3) sont traitées
    for (let phase = 1; phase < 4; phase++) {
      const traitement = allTraitements.find(
        (t: any) => t.fkPhase && Number(t.fkPhase) === phase
      );
      if (!traitement || !traitement.observations) {
        return {
          canProcess: false,
          message: `La phase ${phase} doit être traitée avant de pouvoir traiter la phase ${currentPhase}`,
        };
      }
    }

    // Vérifier que l'autre phase (4 ou 5) n'est pas déjà traitée
    const otherPhase = currentPhase === 4 ? 5 : 4;
    const otherPhaseTraitement = allTraitements.find(
      (t: any) => t.fkPhase && Number(t.fkPhase) === otherPhase
    );
    if (otherPhaseTraitement && otherPhaseTraitement.observations) {
      return {
        canProcess: false,
        message: `La phase ${otherPhase} a déjà été traitée. Vous ne pouvez pas traiter la phase ${currentPhase}`,
      };
    }

    return { canProcess: true };
  }

  // Pour les autres phases : vérifier que toutes les phases inférieures sont traitées
  if (currentPhase > 1) {
    for (let phase = 1; phase < currentPhase; phase++) {
      const traitement = allTraitements.find(
        (t: any) => t.fkPhase && Number(t.fkPhase) === phase
      );
      if (!traitement || !traitement.observations) {
        return {
          canProcess: false,
          message: `La phase ${phase} doit être traitée avant de pouvoir traiter la phase ${currentPhase}`,
        };
      }
    }
  }

  // Vérifier qu'aucune phase supérieure n'est déjà traitée
  const maxPhase = 5;
  for (let phase = currentPhase + 1; phase <= maxPhase; phase++) {
    const traitement = allTraitements.find(
      (t: any) => t.fkPhase && Number(t.fkPhase) === phase
    );
    if (traitement && traitement.observations) {
      return {
        canProcess: false,
        message: `La phase ${phase} a déjà été traitée. Vous ne pouvez pas modifier la phase ${currentPhase}`,
      };
    }
  }

  return { canProcess: true };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier l'authentification
  const token = getTokenFromRequest(req);

  // En mode développement, permettre de continuer sans token
  let currentUser = null;
  if (token) {
    currentUser = await getUserFromToken(token);
  }

  // Si pas de token en dev, utiliser un utilisateur par défaut
  if (!currentUser && process.env.NODE_ENV === 'development') {
    currentUser = {
      id: 1,
      nom: 'Admin',
      prenom: 'Dev',
      username: 'admin',
      permissions: ['*'],
      services: ['*'],
    } as any;
  }

  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Non authentifié',
    });
  }

  if (!prisma) {
    return res.status(500).json({
      success: false,
      message: 'Prisma non initialisé',
    });
  }

  const model = (prisma as any).congetraitements;
  if (!model) {
    return res.status(500).json({
      success: false,
      message:
        'Modèle congetraitements introuvable. Exécutez: npx prisma generate',
    });
  }

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.max(1, parseInt(String(req.query.limit || '25'), 10));
      const skip = (page - 1) * limit;
      const search = String(req.query.search || '').trim();
      const demandeId = req.query.demandeId
        ? parseInt(String(req.query.demandeId), 10)
        : null;

      const where: any = {};

      // Si demandeId est fourni, récupérer UNIQUEMENT les traitements de cette demande (pas de filtre userupdateid)
      if (demandeId && !isNaN(demandeId)) {
        where.fkDemande = BigInt(demandeId);
        // Pour une demande spécifique, on veut TOUS les traitements, donc pas de pagination
        // et on trie par fkPhase pour avoir un ordre logique
        const [rows, total] = await Promise.all([
          model.findMany({
            where,
            orderBy: { fkPhase: 'asc' }, // Trier par phase pour un ordre logique
          }),
          model.count({ where }),
        ]);

        // Récupérer les informations utilisateur pour chaque traitement
        const userIds = new Set<bigint>();
        rows.forEach((row: any) => {
          if (row.userupdateid) userIds.add(BigInt(row.userupdateid));
          if (row.usercreateid) userIds.add(BigInt(row.usercreateid));
        });

        const usersMap = new Map();
        if (userIds.size > 0 && prisma) {
          try {
            const usersModel = (prisma as any).utilisateurs;
            if (usersModel) {
              const users = await usersModel.findMany({
                where: {
                  id: { in: Array.from(userIds) },
                },
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  postnom: true,
                  username: true,
                  fonction: {
                    select: {
                      nom: true,
                      description: true,
                    },
                  },
                },
              });
              users.forEach((u: any) => {
                usersMap.set(String(u.id), {
                  id: String(u.id),
                  nom: u.nom || '',
                  prenom: u.prenom || '',
                  postnom: u.postnom || '',
                  username: u.username || '',
                  fonction: u.fonction?.nom || 'N/A',
                });
              });
            }
          } catch (err) {
            console.error(
              '❌ Erreur lors de la récupération des utilisateurs:',
              err
            );
          }
        }

        // Enrichir les données avec les informations utilisateur
        const data = rows.map((row: any) => {
          const formatted = formatRow(row);
          // S'assurer que fkDemande et fkPhase sont bien en format number pour la comparaison
          if (row.fkDemande !== null && row.fkDemande !== undefined) {
            formatted.fkDemande = Number(row.fkDemande);
          } else {
            formatted.fkDemande = null;
          }
          if (row.fkPhase !== null && row.fkPhase !== undefined) {
            formatted.fkPhase = Number(row.fkPhase);
          } else {
            formatted.fkPhase = null;
          }

          // Préserver les valeurs null pour observations, conformite, approbation
          formatted.observations = row.observations ?? null;
          formatted.conformite = row.conformite ?? null;
          formatted.approbation = row.approbation ?? null;

          // Préserver les dates complètes (pas seulement la date)
          if (row.datecreate)
            formatted.datecreate = row.datecreate.toISOString();
          if (row.dateupdate)
            formatted.dateupdate = row.dateupdate.toISOString();

          if (row.userupdateid) {
            const user = usersMap.get(String(row.userupdateid));
            if (user) {
              formatted.userupdate = {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                postnom: user.postnom,
                username: user.username,
                fonction: user.fonction,
                fullName:
                  `${user.nom || ''} ${user.postnom || ''} ${user.prenom || ''}`.trim() ||
                  user.username,
              };
            } else {
              console.warn(
                `⚠️ Utilisateur ${row.userupdateid} non trouvé pour le traitement ${row.id}`
              );
            }
          }
          if (row.usercreateid) {
            const user = usersMap.get(String(row.usercreateid));
            if (user) {
              formatted.usercreate = {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                postnom: user.postnom,
                username: user.username,
                fonction: user.fonction,
                fullName:
                  `${user.nom || ''} ${user.postnom || ''} ${user.prenom || ''}`.trim() ||
                  user.username,
              };
            }
          }
          return formatted;
        });

        console.log(
          `✅ ${data.length} traitements trouvés pour la demande ${demandeId}`
        );
        if (data.length > 0) {
          console.log(
            `🔍 Exemple de traitement:`,
            JSON.stringify(data[0], null, 2)
          );
        }

        return res.status(200).json({
          success: true,
          traitements: data,
          data: data,
          pagination: {
            page: 1,
            limit: total,
            total,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });
      } else {
        // Sinon, filtrer par userupdateid = ID de l'utilisateur connecté (pour l'affichage normal)
        const userId = BigInt(currentUser.id);
        where.userupdateid = userId;

        // Ajouter la recherche si présente (seulement si pas de demandeId)
        if (search) {
          where.observations = { contains: search };
        }
      }

      const [rows, total] = await Promise.all([
        model.findMany({
          where,
          skip,
          take: limit,
          orderBy: { datecreate: 'desc' },
        }),
        model.count({ where }),
      ]);

      // Récupérer les informations utilisateur pour chaque traitement
      const userIds = new Set<bigint>();
      rows.forEach((row: any) => {
        if (row.userupdateid) userIds.add(BigInt(row.userupdateid));
        if (row.usercreateid) userIds.add(BigInt(row.usercreateid));
      });

      const usersMap = new Map();
      if (userIds.size > 0 && prisma) {
        try {
          const usersModel = (prisma as any).utilisateurs;
          if (usersModel) {
            const users = await usersModel.findMany({
              where: {
                id: { in: Array.from(userIds) },
              },
              select: {
                id: true,
                nom: true,
                prenom: true,
                postnom: true,
                username: true,
                fonction: {
                  select: {
                    nom: true,
                    description: true,
                  },
                },
              },
            });
            users.forEach((u: any) => {
              usersMap.set(String(u.id), {
                id: String(u.id),
                nom: u.nom || '',
                prenom: u.prenom || '',
                postnom: u.postnom || '',
                username: u.username || '',
                fonction: u.fonction?.nom || 'N/A',
              });
            });
          }
        } catch (err) {
          console.error(
            '❌ Erreur lors de la récupération des utilisateurs:',
            err
          );
        }
      }

      // Enrichir les données avec les informations utilisateur
      const data = rows.map((row: any) => {
        const formatted = formatRow(row);
        if (row.userupdateid) {
          const user = usersMap.get(String(row.userupdateid));
          if (user) {
            formatted.userupdate = {
              id: user.id,
              nom: user.nom,
              prenom: user.prenom,
              postnom: user.postnom,
              username: user.username,
              fonction: user.fonction,
              fullName:
                `${user.nom || ''} ${user.postnom || ''} ${user.prenom || ''}`.trim() ||
                user.username,
            };
          }
        }
        if (row.usercreateid) {
          const user = usersMap.get(String(row.usercreateid));
          if (user) {
            formatted.usercreate = {
              id: user.id,
              nom: user.nom,
              prenom: user.prenom,
              postnom: user.postnom,
              username: user.username,
              fonction: user.fonction,
              fullName:
                `${user.nom || ''} ${user.postnom || ''} ${user.prenom || ''}`.trim() ||
                user.username,
            };
          }
        }
        return formatted;
      });
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        success: true,
        traitements: data,
        data: data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    if (req.method === 'POST') {
      const { fkDemande, fkPhase, observations, conformite, approbation } =
        req.body || {};

      if (!fkDemande) {
        return res.status(400).json({
          success: false,
          message: 'ID de demande requis',
        });
      }

      const dataToCreate: any = {
        fkDemande: fkDemande ? BigInt(fkDemande) : BigInt(0),
        fkPhase: fkPhase ? BigInt(fkPhase) : BigInt(0),
        usercreateid: BigInt(currentUser.id),
        userupdateid: BigInt(currentUser.id), // L'utilisateur connecté
      };

      if (observations) dataToCreate.observations = observations;
      if (typeof conformite === 'boolean') dataToCreate.conformite = conformite;
      if (typeof approbation === 'boolean')
        dataToCreate.approbation = approbation;

      const created = await model.create({
        data: dataToCreate,
      });

      console.log('✅ Traitement créé avec succès');

      // Créer une notification pour l'utilisateur assigné au traitement
      try {
        const phaseIdCreated = fkPhase ? Number(fkPhase) : null;
        const phaseLabel = phaseIdCreated
          ? await getPhaseLabel(phaseIdCreated)
          : 'Phase inconnue';
        const demandeModel = (prisma as any).congedemande;
        let demandeInfo = '';

        if (demandeModel && fkDemande) {
          const demande = await demandeModel.findUnique({
            where: { id: BigInt(fkDemande) },
            select: { id: true, demandeur: true, du: true, au: true },
          });
          if (demande) {
            demandeInfo = ` - Demande #${Number(demande.id)}`;
            if (demande.demandeur) {
              demandeInfo += ` (${demande.demandeur})`;
            }
          }
        }

        // IMPORTANT: userIdToNotify = userupdateid du traitement créé (l'utilisateur assigné au traitement)
        // C'est cet utilisateur qui doit recevoir la notification ET faire sonner l'alarme
        // userupdateid dans dataToCreate = currentUser.id (l'utilisateur connecté qui crée = celui assigné)
        const userIdToNotify = Number(dataToCreate.userupdateid); // L'utilisateur assigné (currentUser.id)
        const sujet = `Nouveau traitement ${phaseLabel}`;
        const contenu = `Non Ouvert`; // Marquer comme "Non Ouvert" pour déclencher l'alarme

        await createAndBroadcastNotification(
          userIdToNotify, // Notification uniquement pour l'utilisateur assigné
          sujet,
          contenu,
          'TRAITEMENT'
        );
        console.log(
          `🔔 Notification créée pour l'utilisateur ${userIdToNotify} (assigned to traitement)`
        );
      } catch (notifError) {
        console.error(
          '❌ Erreur lors de la création de la notification:',
          notifError
        );
        // Ne pas bloquer la réponse
      }

      return res.status(201).json({
        success: true,
        message: 'Traitement créé',
        traitement: formatRow(created),
        data: formatRow(created),
      });
    }

    if (req.method === 'PUT') {
      const id = String(req.query.id || '');
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID requis',
        });
      }

      const { fkDemande, fkPhase, observations, conformite, approbation } =
        req.body || {};

      // Vérifier que le traitement appartient à l'utilisateur connecté
      const existing = await model.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Traitement non trouvé',
        });
      }

      if (existing.userupdateid !== BigInt(currentUser.id)) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez modifier que vos propres traitements',
        });
      }

      // Récupérer fkDemande et fkPhase depuis le traitement existant si non fournis
      const demandeId =
        existing.fkDemande || (fkDemande ? BigInt(fkDemande) : null);
      const phaseId = existing.fkPhase
        ? Number(existing.fkPhase)
        : fkPhase
          ? fkPhase
          : null;

      if (!demandeId || !phaseId) {
        return res.status(400).json({
          success: false,
          message: 'Demande ou phase manquante',
        });
      }

      // Vérifier si la phase peut être traitée selon les règles
      const validation = await canProcessPhase(phaseId, demandeId, model);
      if (!validation.canProcess) {
        return res.status(400).json({
          success: false,
          message: validation.message || 'Traitement non autorisé',
        });
      }

      const updateData: any = {};

      // Ne pas permettre de modifier fkDemande et fkPhase
      // if (typeof fkDemande !== 'undefined') {
      //   updateData.fkDemande = fkDemande ? BigInt(fkDemande) : BigInt(0);
      // }
      // if (typeof fkPhase !== 'undefined') {
      //   updateData.fkPhase = fkPhase ? BigInt(fkPhase) : BigInt(0);
      // }

      // Si observation est fournie mais vide, mettre "-"
      if (typeof observations !== 'undefined') {
        updateData.observations =
          observations && observations.trim() !== ''
            ? observations.trim()
            : '-';
      }
      if (typeof conformite !== 'undefined') {
        updateData.conformite = conformite;
      }
      if (typeof approbation !== 'undefined') {
        updateData.approbation = approbation;
      }

      console.log('📤 Mise à jour du traitement ID:', id);
      console.log(
        '📦 Données à mettre à jour:',
        JSON.stringify(updateData, null, 2)
      );

      // Vérifier si le traitement vient d'être complété (observations passait de null à non-null)
      const wasJustCompleted =
        !existing.observations && updateData.observations;

      const updated = await model.update({
        where: { id: BigInt(id) },
        data: updateData,
      });

      console.log('✅ Traitement mis à jour avec succès');
      const formatted = formatRow(updated);
      console.log('📊 Données formatées retournées');

      // Créer des notifications
      try {
        const phaseLabel = await getPhaseLabel(phaseId);
        const demandeModel = (prisma as any).congedemande;
        let demandeInfo = '';

        if (demandeModel && demandeId) {
          const demande = await demandeModel.findUnique({
            where: { id: demandeId },
            select: { id: true, demandeur: true, du: true, au: true },
          });
          if (demande) {
            demandeInfo = ` - Demande #${Number(demande.id)}`;
            if (demande.demandeur) {
              demandeInfo += ` (${demande.demandeur})`;
            }
          }
        }

        // Notification pour l'utilisateur qui a effectué le traitement
        const sujet = `Traitement ${phaseLabel} effectué`;
        const contenu = `Vous avez traité la phase "${phaseLabel}"${demandeInfo}. Le traitement a été enregistré avec succès.`;

        await createAndBroadcastNotification(
          Number(currentUser.id),
          sujet,
          contenu,
          'TRAITEMENT'
        );
        console.log(
          `🔔 Notification créée pour l'utilisateur ${currentUser.id}`
        );

        // Si le traitement vient d'être complété, notifier les utilisateurs de la phase suivante
        if (wasJustCompleted) {
          // Récupérer tous les traitements de cette demande pour identifier la phase suivante
          const allTraitements = await model.findMany({
            where: { fkDemande: demandeId },
          });

          // Déterminer quelle phase suivante doit être notifiée
          let nextPhasesToNotify: number[] = [];

          if (phaseId === 1 || phaseId === 2) {
            // Après phase 1 ou 2, notifier phase suivante
            nextPhasesToNotify.push(phaseId + 1);
          } else if (phaseId === 3) {
            // Après phase 3, notifier phases 4 ET 5 (les deux peuvent traiter)
            nextPhasesToNotify = [4, 5];
          } else if (phaseId === 4 || phaseId === 5) {
            // Après phase 4 ou 5, c'est terminé - pas de phase suivante
            // Mais on pourrait notifier un admin ou le demandeur
          }

          // Notifier chaque utilisateur assigné à la phase suivante
          for (const nextPhaseId of nextPhasesToNotify) {
            const nextPhaseTraitements = allTraitements.filter(
              (t: any) => t.fkPhase && Number(t.fkPhase) === nextPhaseId
            );

            for (const nextTraitement of nextPhaseTraitements) {
              if (nextTraitement.userupdateid) {
                const nextPhaseLabel = await getPhaseLabel(nextPhaseId);
                const nextSujet = `Nouveau traitement ${nextPhaseLabel} à traiter`;
                const nextContenu = `La phase "${phaseLabel}" a été complétée${demandeInfo}. Vous pouvez maintenant traiter la phase "${nextPhaseLabel}".`;

                await createAndBroadcastNotification(
                  Number(nextTraitement.userupdateid),
                  nextSujet,
                  nextContenu,
                  'TRAITEMENT'
                );
                console.log(
                  `🔔 Notification envoyée à l'utilisateur ${nextTraitement.userupdateid} pour la phase ${nextPhaseId}`
                );
              }
            }
          }
        }
      } catch (notifError) {
        console.error(
          '❌ Erreur lors de la création de la notification:',
          notifError
        );
        // Ne pas bloquer la réponse
      }

      return res.status(200).json({
        success: true,
        message: 'Traitement mis à jour',
        traitement: formatted,
        data: formatted,
      });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID requis',
        });
      }

      // Vérifier que le traitement appartient à l'utilisateur connecté
      const existing = await model.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Traitement non trouvé',
        });
      }

      if (existing.userupdateid !== BigInt(currentUser.id)) {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez supprimer que vos propres traitements',
        });
      }

      await model.delete({
        where: { id: BigInt(id) },
      });

      return res.status(200).json({
        success: true,
        message: 'Traitement supprimé',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ API traitements erreur:', error);
    console.error('❌ Message:', error?.message);
    console.error('❌ Code:', error?.code);

    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error:
        process.env.NODE_ENV === 'development'
          ? `${error?.message || 'Erreur inconnue'}`
          : undefined,
    });
  }
}
