import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

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
 * Convertit un objet avec BigInt en objet sérialisable pour JSON.stringify
 */
function serializeForLog(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return String(obj);
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForLog);
  }
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeForLog(obj[key]);
    }
    return serialized;
  }
  return obj;
}

/**
 * Récupère les utilisateurs ayant un rôle spécifique
 */
async function getUsersByRole(fkRole: number) {
  if (!prisma) return [];
  return await prisma.utilisateurs.findMany({
    where: {
      fkRole: BigInt(fkRole),
      locked: false,
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      mail: true,
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!prisma) {
    return res.status(500).json({
      success: false,
      message: 'Prisma non initialisé',
    });
  }

  const model = (prisma as any).congedemande;
  if (!model) {
    console.error('❌ Modèle congedemande introuvable dans Prisma');
    return res.status(500).json({
      success: false,
      message: 'Modèle congedemande introuvable. Exécutez: npx prisma generate',
    });
  }

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.max(1, parseInt(String(req.query.limit || '25'), 10));
      const skip = (page - 1) * limit;
      const search = String(req.query.search || '').trim();

      const where: any = search
        ? {
            OR: [
              { section: { contains: search } },
              { demandeur: { contains: search } },
              { nomsremplacant: { contains: search } },
            ],
          }
        : {};

      const [rows, total] = await Promise.all([
        model.findMany({
          where,
          skip,
          take: limit,
          orderBy: { datecreate: 'desc' },
        }),
        model.count({ where }),
      ]);

      // Récupérer idSuperviseur depuis congetraitements (phase 3) pour chaque demande
      const traitementModel = prisma?.congetraitements;
      const data = await Promise.all(
        rows.map(async (row) => {
          const formatted = formatRow(row);

          // Récupérer le superviseur depuis congetraitements (phase 3)
          if (traitementModel) {
            try {
              const traitementPhase3 = await traitementModel.findFirst({
                where: {
                  fkDemande: row.id,
                  fkPhase: BigInt(3),
                },
              });

              if (traitementPhase3?.userupdateid) {
                formatted.idSuperviseur = Number(traitementPhase3.userupdateid);
              }
            } catch (error) {
              console.error(
                'Erreur lors de la récupération du superviseur:',
                error
              );
            }
          }

          return formatted;
        })
      );
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        success: true,
        demandes: data,
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
      // Vérifier l'authentification pour obtenir usercreateid
      const token = getTokenFromRequest(req);
      const currentUser = token ? await getUserFromToken(token) : null;

      const {
        fkTypeConge,
        du,
        au,
        nbrjour,
        soldeconge,
        section,
        demandeur,
        remiseetreprise,
        nomsremplacant,
        idremplacant,
        statut,
        niveau,
        fkSoldes,
        idSuperviseur,
      } = req.body || {};

      // Validations obligatoires
      if (!fkTypeConge) {
        return res.status(400).json({
          success: false,
          message: 'Le type de congé est obligatoire',
        });
      }

      if (!nbrjour || nbrjour <= 0) {
        return res.status(400).json({
          success: false,
          message:
            'Le nombre de jours est obligatoire et doit être supérieur à 0',
        });
      }

      if (!du || !au) {
        return res.status(400).json({
          success: false,
          message: 'Date de début et date de fin requises',
        });
      }

      if (!section || section.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'La section est obligatoire',
        });
      }

      if (!demandeur || demandeur.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Le demandeur est obligatoire',
        });
      }

      if (
        !idremplacant ||
        idremplacant === null ||
        idremplacant === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Le remplaçant est obligatoire',
        });
      }

      if (
        !idSuperviseur ||
        idSuperviseur === null ||
        idSuperviseur === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Le superviseur est obligatoire',
        });
      }

      const dateDu = new Date(du);
      const dateAu = new Date(au);
      if (isNaN(dateDu.getTime()) || isNaN(dateAu.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Format de date invalide',
        });
      }

      if (dateDu >= dateAu) {
        return res.status(400).json({
          success: false,
          message: 'La date de début doit être antérieure à la date de fin',
        });
      }

      dateDu.setHours(0, 0, 0, 0);
      dateAu.setHours(0, 0, 0, 0);

      // Extraire l'ID du demandeur depuis le champ demandeur (format: "ID | nom prenom")
      let demandeurId: number | null = null;
      if (demandeur && typeof demandeur === 'string') {
        const demandeurStr = demandeur.trim();
        if (demandeurStr.includes('|')) {
          const parts = demandeurStr.split('|').map((p) => p.trim());
          const idPart = parts[0];
          const parsedId = parseInt(idPart, 10);
          if (!isNaN(parsedId) && parsedId > 0) {
            demandeurId = parsedId;
          }
        }
      }

      // VALIDATION 1: Vérifier qu'il n'existe pas déjà une demande en cours pour le demandeur
      if (demandeurId) {
        try {
          const existingDemande = await model.findFirst({
            where: {
              usercreateid: BigInt(demandeurId),
              statut: {
                notIn: ['APPROUVEE', 'REFUSEE', 'ANNULEE'],
              },
            },
          });

          if (existingDemande) {
            console.warn(
              `⚠️ Demande en cours trouvée pour l'utilisateur ${demandeurId}, ID demande: ${existingDemande.id}, Statut: ${existingDemande.statut}`
            );
            return res.status(400).json({
              success: false,
              message:
                'Impossible de créer une nouvelle demande : il existe déjà une demande en cours pour ce demandeur. Veuillez attendre que celle-ci soit approuvée, refusée ou annulée.',
            });
          }
        } catch (checkError: any) {
          console.error(
            '❌ Erreur lors de la vérification des demandes existantes:',
            checkError
          );
          // Ne pas bloquer si la vérification échoue, mais logger l'erreur
        }
      }

      // VALIDATION 2: Vérifier que le nombre de jours ne dépasse pas le solde disponible
      if (demandeurId && fkSoldes) {
        try {
          const soldeModel = (prisma as any).congesolde;
          if (soldeModel) {
            // Récupérer le solde depuis congesolde avec fkSoldes (ID du congesolde)
            const solde = await soldeModel.findUnique({
              where: {
                id: BigInt(fkSoldes),
              },
              select: {
                solde: true,
                soldeConsomme: true,
                fkUtilisateur: true,
              },
            });

            if (solde) {
              // Vérifier que le solde appartient bien au demandeur
              const soldeUserId = Number(solde.fkUtilisateur);
              if (soldeUserId === demandeurId) {
                const soldeTotal = Number(solde.solde) || 0;

                // Calculer le solde réellement consommé : somme des jours des demandes APPROUVEE uniquement
                // fkSoldes dans congedemande est un String, donc on compare avec String(fkSoldes)
                const fkSoldesStr = String(fkSoldes);
                const demandesApprouvees = await model.findMany({
                  where: {
                    usercreateid: BigInt(demandeurId),
                    statut: 'APPROUVEE',
                    fkSoldes: fkSoldesStr, // Utiliser le même fkSoldes (String)
                  },
                  select: {
                    nbrjour: true,
                  },
                });

                const totalConsommeApprouve = demandesApprouvees.reduce(
                  (sum, d) => sum + (Number(d.nbrjour) || 0),
                  0
                );

                // Le solde disponible = solde total (congesolde.solde) - demandes approuvées seulement
                // On utilise congesolde.solde comme base, pas soldeConsomme
                const soldeDisponible = soldeTotal - totalConsommeApprouve;
                const nbrjourNum = parseFloat(nbrjour);

                console.log(
                  `📊 Validation solde pour utilisateur ${demandeurId}: soldeTotal=${soldeTotal}, totalConsommeApprouve=${totalConsommeApprouve}, soldeDisponible=${soldeDisponible}, nbrjour=${nbrjourNum}`
                );

                if (nbrjourNum > soldeDisponible) {
                  console.warn(
                    `⚠️ Nombre de jours (${nbrjourNum}) supérieur au solde disponible (${soldeDisponible}) pour utilisateur ${demandeurId}`
                  );
                  return res.status(400).json({
                    success: false,
                    message: `Impossible de créer la demande : le nombre de jours demandés (${nbrjourNum}) est supérieur au solde disponible (${soldeDisponible} jour${soldeDisponible > 1 ? 's' : ''}). Solde total: ${soldeTotal} jours, déjà consommé (approuvé): ${totalConsommeApprouve} jours.`,
                  });
                }
              } else {
                console.warn(
                  `⚠️ Le solde (fkSoldes=${fkSoldes}) n'appartient pas au demandeur (${demandeurId}) mais à l'utilisateur ${soldeUserId}`
                );
                return res.status(400).json({
                  success: false,
                  message:
                    'Le solde de congé sélectionné ne correspond pas au demandeur.',
                });
              }
            } else {
              console.warn(`⚠️ Solde non trouvé pour fkSoldes=${fkSoldes}`);
              return res.status(400).json({
                success: false,
                message: 'Solde de congé non trouvé.',
              });
            }
          }
        } catch (soldeError: any) {
          console.error(
            '❌ Erreur lors de la vérification du solde:',
            soldeError
          );
          return res.status(400).json({
            success: false,
            message: 'Erreur lors de la vérification du solde de congé.',
          });
        }
      } else if (!fkSoldes) {
        // Si fkSoldes n'est pas fourni mais que demandeurId existe, avertir
        console.warn(
          `⚠️ fkSoldes non fourni pour la validation du solde (demandeurId=${demandeurId})`
        );
      }

      const dataToCreate: any = {
        du: dateDu,
        au: dateAu,
        statut: statut || 'BROUILLON',
        niveau: 0, // Toujours 0
        fkTypeConge: BigInt(fkTypeConge), // Obligatoire
        nbrjour: parseFloat(nbrjour), // Obligatoire
        section: section, // Obligatoire
        demandeur: demandeur, // Obligatoire
        idremplacant: BigInt(idremplacant), // Obligatoire (déjà validé)
        userupdateid: BigInt(idSuperviseur), // ID du superviseur (obligatoire, déjà validé)
      };

      // Utiliser l'ID du demandeur pour usercreateid (pour permettre la validation des demandes existantes)
      if (demandeurId) {
        dataToCreate.usercreateid = BigInt(demandeurId);
      } else if (currentUser) {
        // Fallback si on ne peut pas extraire l'ID du demandeur
        dataToCreate.usercreateid = BigInt(currentUser.id);
      }

      // Champs optionnels
      if (soldeconge !== undefined)
        dataToCreate.soldeconge = parseFloat(soldeconge);
      if (remiseetreprise) dataToCreate.remiseetreprise = remiseetreprise;
      if (nomsremplacant) dataToCreate.nomsremplacant = nomsremplacant;
      // fkSoldes doit être un String (selon le schéma Prisma)
      if (fkSoldes !== undefined && fkSoldes !== null && fkSoldes !== '') {
        dataToCreate.fkSoldes = String(fkSoldes);
      }

      console.log(
        '📤 Données à créer:',
        JSON.stringify(serializeForLog(dataToCreate), null, 2)
      );
      console.log('✅ Création de la demande en cours...');

      let created;
      try {
        // Validation finale avant insertion
        if (
          !dataToCreate.fkTypeConge ||
          !dataToCreate.du ||
          !dataToCreate.au ||
          !dataToCreate.nbrjour ||
          !dataToCreate.section ||
          !dataToCreate.demandeur ||
          !dataToCreate.idremplacant ||
          !dataToCreate.userupdateid
        ) {
          throw new Error('Champs obligatoires manquants');
        }

        created = await model.create({
          data: dataToCreate,
        });
        console.log('✅ Demande créée avec succès, ID:', created.id);
      } catch (createError: any) {
        console.error(
          '❌ Erreur lors de la création de la demande:',
          createError
        );
        console.error('❌ Message:', createError?.message);
        console.error('❌ Code:', createError?.code);
        console.error('❌ Stack:', createError?.stack);

        // Message d'erreur plus spécifique selon le type d'erreur
        let errorMessage = 'Erreur lors de la création de la demande';
        if (createError?.code === 'P2002') {
          errorMessage = 'Une demande avec ces informations existe déjà';
        } else if (createError?.code === 'P2003') {
          errorMessage = "Erreur de référence: une relation n'existe pas";
        } else if (createError?.message) {
          errorMessage = createError.message;
        }

        return res.status(500).json({
          success: false,
          message: errorMessage,
          error:
            process.env.NODE_ENV === 'development'
              ? createError?.message || 'Erreur inconnue'
              : undefined,
        });
      }

      const formatted = formatRow(created);
      console.log('📊 Données formatées retournées');

      return res.status(201).json({
        success: true,
        message: 'Demande de congé créée',
        demande: formatted,
        data: formatted,
      });
    }

    if (req.method === 'PUT') {
      const id = String(req.query.id || '');
      console.log('🔄 PUT /api/conge/demandes - ID:', id);
      console.log(
        '📦 Body reçu:',
        JSON.stringify(serializeForLog(req.body), null, 2)
      );

      if (!id) {
        console.error('❌ Erreur: ID manquant');
        return res.status(400).json({
          success: false,
          message: 'ID requis',
        });
      }

      const {
        fkTypeConge,
        du,
        au,
        nbrjour,
        soldeconge,
        section,
        demandeur,
        remiseetreprise,
        nomsremplacant,
        idremplacant,
        statut,
        niveau,
        fkSoldes,
      } = req.body || {};

      console.log('📋 Données extraites:', {
        fkTypeConge,
        du,
        au,
        nbrjour,
        statut,
      });

      const updateData: any = {};

      if (du) {
        const dateDu = new Date(du);
        if (isNaN(dateDu.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Format de date de début invalide',
          });
        }
        dateDu.setHours(0, 0, 0, 0);
        updateData.du = dateDu;
      }

      if (au) {
        const dateAu = new Date(au);
        if (isNaN(dateAu.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Format de date de fin invalide',
          });
        }
        dateAu.setHours(0, 0, 0, 0);
        updateData.au = dateAu;
      }

      if (updateData.du && updateData.au && updateData.du >= updateData.au) {
        return res.status(400).json({
          success: false,
          message: 'La date de début doit être antérieure à la date de fin',
        });
      }

      if (typeof fkTypeConge !== 'undefined') {
        updateData.fkTypeConge = fkTypeConge ? BigInt(fkTypeConge) : null;
      }
      if (typeof nbrjour !== 'undefined')
        updateData.nbrjour = nbrjour ? parseFloat(nbrjour) : null;
      if (typeof soldeconge !== 'undefined')
        updateData.soldeconge = soldeconge ? parseFloat(soldeconge) : null;
      if (typeof section !== 'undefined') updateData.section = section || null;
      if (typeof demandeur !== 'undefined')
        updateData.demandeur = demandeur || null;
      if (typeof remiseetreprise !== 'undefined')
        updateData.remiseetreprise = remiseetreprise || null;
      if (typeof nomsremplacant !== 'undefined')
        updateData.nomsremplacant = nomsremplacant || null;
      if (typeof idremplacant !== 'undefined') {
        updateData.idremplacant = idremplacant ? BigInt(idremplacant) : null;
      }
      // Gérer le statut explicitement - même si c'est null ou vide, on doit l'accepter si fourni
      if (typeof statut !== 'undefined') {
        // S'assurer que le statut ANNULEE est bien appliqué
        if (statut === 'ANNULEE') {
          updateData.statut = 'ANNULEE';
          console.log('✅ Statut ANNULEE détecté et appliqué');
        } else if (statut) {
          updateData.statut = statut;
        } else {
          updateData.statut = statut; // Permettre null ou vide si explicitement fourni
        }
      }
      if (typeof niveau !== 'undefined') updateData.niveau = niveau || 0;
      if (typeof fkSoldes !== 'undefined') {
        if (fkSoldes !== null && fkSoldes !== '' && fkSoldes !== undefined) {
          // fkSoldes doit être un String (selon le schéma Prisma)
          updateData.fkSoldes = String(fkSoldes);
        } else {
          updateData.fkSoldes = null;
        }
      }

      // Ajouter userupdateid si l'utilisateur est authentifié
      const token = getTokenFromRequest(req);
      const currentUser = token ? await getUserFromToken(token) : null;
      if (currentUser) {
        updateData.userupdateid = BigInt(currentUser.id);
        console.log(
          '👤 Utilisateur connecté pour mise à jour:',
          currentUser.id
        );
      }

      // Note: idSuperviseur n'existe pas dans le modèle Prisma congedemande
      // Il est seulement utilisé pour créer les traitements, pas stocké dans la demande

      console.log(
        '📤 Données à mettre à jour:',
        JSON.stringify(serializeForLog(updateData), null, 2)
      );
      console.log('🔍 Mise à jour de la demande avec ID:', id);

      // Récupérer l'ancien statut de la demande avant la mise à jour
      const existingDemande = await model.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existingDemande) {
        console.error('❌ Demande non trouvée avec ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Demande de congé non trouvée',
        });
      }

      const oldStatut = existingDemande.statut;
      const newStatut = updateData.statut || statut; // Prendre le statut depuis updateData ou directement depuis le body

      // S'assurer que le statut dans updateData est bien défini si fourni dans le body
      if (statut && !updateData.statut) {
        updateData.statut = statut;
      }

      console.log(
        '📊 Statut - Ancien:',
        oldStatut,
        'Nouveau:',
        newStatut,
        'updateData.statut:',
        updateData.statut
      );

      // Vérifier si la demande est annulée (statut passe à 'ANNULEE')
      const finalNewStatut = updateData.statut || newStatut;
      const isBeingAnnulled =
        finalNewStatut === 'ANNULEE' && oldStatut !== 'ANNULEE';

      if (isBeingAnnulled) {
        console.log(
          '🔄 Annulation détectée: passage de',
          oldStatut,
          'à ANNULEE'
        );
      }

      // Tenter la mise à jour directement - si elle échoue avec erreur 1442 (trigger),
      // on utilisera une approche alternative
      try {
        const updated = await model.update({
          where: { id: BigInt(id) },
          data: updateData,
        });

        // Si la demande est annulée, mettre à jour tous les traitements liés
        if (isBeingAnnulled) {
          console.log(
            '🔄 Annulation détectée, mise à jour des traitements associés...'
          );
          const traitementModel = (prisma as any).congetraitements;
          if (traitementModel) {
            const updatedCount = await traitementModel.updateMany({
              where: { fkDemande: BigInt(id) },
              data: {
                observations: 'ANNULEE',
                conformite: false,
                approbation: false,
                dateupdate: new Date(),
              },
            });
            console.log(
              `✅ ${updatedCount.count} traitement(s) mis à jour avec le statut ANNULEE`
            );
          } else {
            console.warn('⚠️ Modèle congetraitements introuvable');
          }
        }

        console.log('✅ Demande mise à jour avec succès');
        const formatted = formatRow(updated);
        console.log('📊 Données formatées retournées');

        return res.status(200).json({
          success: true,
          message: 'Demande de congé mise à jour',
          demande: formatted,
          data: formatted,
        });
      } catch (updateError: any) {
        // Si l'erreur est due à un trigger MySQL, essayer avec SQL brut
        if (
          updateError?.message?.includes('trigger') ||
          updateError?.message?.includes('1442') ||
          updateError?.code === '1442'
        ) {
          console.warn(
            '⚠️ Erreur de trigger détectée, tentative avec SQL brut...'
          );
          console.warn(
            '⚠️ Cette erreur est généralement due à un trigger MySQL sur la table congedemande'
          );

          // On a déjà existingDemande et isBeingAnnulled définis avant le try

          // Construire la requête SQL UPDATE manuellement
          const setClauses: string[] = [];
          const params: any[] = [];

          // Toujours inclure le statut s'il est défini dans updateData ou dans le body
          const statutToUse = updateData.statut || statut;
          if (statutToUse) {
            setClauses.push('statut = ?');
            params.push(statutToUse);
            console.log('✅ Statut inclus dans SQL brut:', statutToUse);
          }
          if (updateData.userupdateid !== undefined) {
            setClauses.push('userupdateid = ?');
            params.push(Number(updateData.userupdateid));
          }
          if (updateData.fkTypeConge !== undefined) {
            setClauses.push('fkTypeConge = ?');
            params.push(
              updateData.fkTypeConge ? Number(updateData.fkTypeConge) : null
            );
          }
          if (updateData.nbrjour !== undefined) {
            setClauses.push('nbrjour = ?');
            params.push(updateData.nbrjour);
          }
          if (updateData.soldeconge !== undefined) {
            setClauses.push('soldeconge = ?');
            params.push(updateData.soldeconge);
          }
          if (updateData.section !== undefined) {
            setClauses.push('section = ?');
            params.push(updateData.section);
          }
          if (updateData.demandeur !== undefined) {
            setClauses.push('demandeur = ?');
            params.push(updateData.demandeur);
          }
          if (updateData.remiseetreprise !== undefined) {
            setClauses.push('remiseetreprise = ?');
            params.push(updateData.remiseetreprise);
          }
          if (updateData.nomsremplacant !== undefined) {
            setClauses.push('nomsremplacant = ?');
            params.push(updateData.nomsremplacant);
          }
          if (updateData.idremplacant !== undefined) {
            setClauses.push('idremplacant = ?');
            params.push(
              updateData.idremplacant ? Number(updateData.idremplacant) : null
            );
          }
          if (updateData.niveau !== undefined) {
            setClauses.push('niveau = ?');
            params.push(updateData.niveau);
          }
          if (updateData.fkSoldes !== undefined) {
            setClauses.push('fkSoldes = ?');
            params.push(updateData.fkSoldes);
          }
          if (updateData.du !== undefined) {
            setClauses.push('du = ?');
            params.push(updateData.du);
          }
          if (updateData.au !== undefined) {
            setClauses.push('au = ?');
            params.push(updateData.au);
          }

          params.push(Number(id));

          if (setClauses.length === 0) {
            throw new Error('Aucune donnée à mettre à jour');
          }

          const sql = `UPDATE congedemande SET ${setClauses.join(', ')}, dateupdate = NOW() WHERE id = ?`;
          console.log('🔧 Exécution SQL brut:', sql);
          console.log('📋 Paramètres:', params);

          // Utiliser $executeRawUnsafe avec Prisma pour exécuter la requête SQL brute
          await (prisma as any).$executeRawUnsafe(sql, ...params);

          // Si la demande est annulée, mettre à jour tous les traitements liés
          if (isBeingAnnulled) {
            console.log(
              '🔄 Annulation détectée, mise à jour des traitements associés...'
            );
            const traitementModel = (prisma as any).congetraitements;
            if (traitementModel) {
              try {
                const updatedCount = await traitementModel.updateMany({
                  where: { fkDemande: BigInt(id) },
                  data: {
                    observations: 'ANNULEE',
                    conformite: false,
                    approbation: false,
                    dateupdate: new Date(),
                  },
                });
                console.log(
                  `✅ ${updatedCount.count} traitement(s) mis à jour avec le statut ANNULEE`
                );
              } catch (traitementError: any) {
                console.error(
                  '❌ Erreur lors de la mise à jour des traitements:',
                  traitementError?.message
                );
                // Ne pas bloquer la réponse si la mise à jour des traitements échoue
              }
            } else {
              console.warn('⚠️ Modèle congetraitements introuvable');
            }
          }

          // Récupérer la demande mise à jour
          const updated = await model.findUnique({
            where: { id: BigInt(id) },
          });

          if (!updated) {
            throw new Error(
              'Impossible de récupérer la demande après mise à jour'
            );
          }

          console.log('✅ Demande mise à jour avec succès (SQL brut)');
          const formatted = formatRow(updated);

          return res.status(200).json({
            success: true,
            message: 'Demande de congé mise à jour',
            demande: formatted,
            data: formatted,
          });
        }
        throw updateError;
      }
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID requis',
        });
      }

      await model.delete({
        where: { id: BigInt(id) },
      });

      return res.status(200).json({
        success: true,
        message: 'Demande de congé supprimée',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ API demandes congé erreur:', error);
    console.error('❌ Message:', error?.message);
    console.error('❌ Code:', error?.code);
    console.error('❌ Stack:', error?.stack);
    console.error('❌ Méthode:', req.method);
    console.error('❌ URL:', req.url);
    console.error('❌ Query:', req.query);
    if (req.body) {
      console.error(
        '❌ Body:',
        JSON.stringify(serializeForLog(req.body), null, 2)
      );
    }

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
