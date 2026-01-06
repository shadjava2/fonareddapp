import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { sendCongeNotification } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

function formatRow(row: any) {
  const result: any = {};
  for (const key in row) {
    const val = row[key];
    if (typeof val === 'bigint') {
      result[key] = String(val);
    } else if (val instanceof Date) {
      result[key] = val.toISOString();
    } else {
      result[key] = val;
    }
  }
  return result;
}

interface CreateTraitementsRequest {
  fkDemande: number;
  idremplacant?: number;
  idSuperviseur?: number;
}

/**
 * Récupère les utilisateurs ayant un rôle spécifique
 */
async function getUsersByRole(fkRole: number) {
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

/**
 * Crée les 5 phases de traitement pour une demande de congé
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vérifier l'authentification
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Non authentifié',
    });
  }

  const currentUser = await getUserFromToken(token);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide',
    });
  }

  if (!prisma) {
    return res.status(500).json({
      success: false,
      message: 'Prisma non initialisé',
    });
  }

  const traitementModel = (prisma as any).congetraitements;
  const demandeModel = (prisma as any).congedemande;
  const utilisateurModel = (prisma as any).utilisateurs;

  if (!traitementModel || !demandeModel || !utilisateurModel) {
    return res.status(500).json({
      success: false,
      message: 'Modèles Prisma introuvables',
    });
  }

  try {
    if (req.method === 'POST') {
      const { fkDemande, idremplacant, idSuperviseur } =
        req.body as CreateTraitementsRequest;

      if (!fkDemande) {
        return res.status(400).json({
          success: false,
          message: 'ID de demande requis',
        });
      }

      // Récupérer la demande pour obtenir les informations
      const demande = await demandeModel.findUnique({
        where: { id: BigInt(fkDemande) },
      });

      if (!demande) {
        return res.status(404).json({
          success: false,
          message: 'Demande de congé non trouvée',
        });
      }

      const userCreateId = BigInt(currentUser.id);
      const traitements = [];
      const destinatairesEmails: Array<{
        email: string | null;
        nom: string | null;
      }> = [];

      // Phase 1 : REMPLACANT(E) - idremplacant
      if (idremplacant) {
        const remplacant = await utilisateurModel.findUnique({
          where: { id: BigInt(idremplacant) },
          select: { id: true, nom: true, prenom: true, mail: true },
        });

        if (remplacant) {
          const traitement1 = await traitementModel.create({
            data: {
              fkDemande: BigInt(fkDemande),
              fkPhase: BigInt(1),
              usercreateid: userCreateId,
              userupdateid: BigInt(idremplacant),
              approbation: null,
              conformite: null,
            },
          });
          traitements.push(traitement1);

          if (remplacant.mail) {
            destinatairesEmails.push({
              email: remplacant.mail,
              nom: `${remplacant.nom || ''} ${remplacant.prenom || ''}`.trim(),
            });
          }
        }
      }

      // Phase 2 : Utilisateur avec role 5
      const usersRole5 = await getUsersByRole(5);
      if (usersRole5.length > 0) {
        // Créer un traitement pour chaque utilisateur avec role 5
        for (const userRole5 of usersRole5) {
          const traitement2 = await traitementModel.create({
            data: {
              fkDemande: BigInt(fkDemande),
              fkPhase: BigInt(2),
              usercreateid: userCreateId,
              userupdateid: BigInt(userRole5.id),
              approbation: null,
              conformite: null,
            },
          });
          traitements.push(traitement2);

          if (userRole5.mail) {
            destinatairesEmails.push({
              email: userRole5.mail,
              nom: `${userRole5.nom || ''} ${userRole5.prenom || ''}`.trim(),
            });
          }
        }
      }

      // Phase 3 : SUPERVISEUR - idSuperviseur
      if (idSuperviseur) {
        const superviseur = await utilisateurModel.findUnique({
          where: { id: BigInt(idSuperviseur) },
          select: { id: true, nom: true, prenom: true, mail: true },
        });

        if (superviseur) {
          const traitement3 = await traitementModel.create({
            data: {
              fkDemande: BigInt(fkDemande),
              fkPhase: BigInt(3),
              usercreateid: userCreateId,
              userupdateid: BigInt(idSuperviseur),
              approbation: null,
              conformite: null,
            },
          });
          traitements.push(traitement3);

          if (superviseur.mail) {
            destinatairesEmails.push({
              email: superviseur.mail,
              nom: `${superviseur.nom || ''} ${superviseur.prenom || ''}`.trim(),
            });
          }
        }
      }

      // Phase 4 : APPROBATION COORDINATEUR 1 - role 11
      const usersRole11 = await getUsersByRole(11);
      if (usersRole11.length > 0) {
        for (const userRole11 of usersRole11) {
          const traitement4 = await traitementModel.create({
            data: {
              fkDemande: BigInt(fkDemande),
              fkPhase: BigInt(4),
              usercreateid: userCreateId,
              userupdateid: BigInt(userRole11.id),
              approbation: null,
              conformite: null,
            },
          });
          traitements.push(traitement4);

          if (userRole11.mail) {
            destinatairesEmails.push({
              email: userRole11.mail,
              nom: `${userRole11.nom || ''} ${userRole11.prenom || ''}`.trim(),
            });
          }
        }
      }

      // Phase 5 : APPROBATION COORDINATEUR 2 - role 1
      const usersRole1 = await getUsersByRole(1);
      if (usersRole1.length > 0) {
        for (const userRole1 of usersRole1) {
          const traitement5 = await traitementModel.create({
            data: {
              fkDemande: BigInt(fkDemande),
              fkPhase: BigInt(5),
              usercreateid: userCreateId,
              userupdateid: BigInt(userRole1.id),
              approbation: null,
              conformite: null,
            },
          });
          traitements.push(traitement5);

          if (userRole1.mail) {
            destinatairesEmails.push({
              email: userRole1.mail,
              nom: `${userRole1.nom || ''} ${userRole1.prenom || ''}`.trim(),
            });
          }
        }
      }

      // Ajouter le demandeur aux destinataires
      if (demande.demandeur) {
        // Chercher l'utilisateur par nom
        const demandeurUser = await utilisateurModel.findFirst({
          where: {
            OR: [
              { nom: { contains: demande.demandeur } },
              {
                AND: [
                  { nom: { contains: demande.demandeur.split(' ')[0] } },
                  { prenom: { contains: demande.demandeur.split(' ')[1] } },
                ],
              },
            ],
          },
          select: { id: true, nom: true, prenom: true, mail: true },
        });

        if (demandeurUser?.mail) {
          destinatairesEmails.push({
            email: demandeurUser.mail,
            nom: `${demandeurUser.nom || ''} ${demandeurUser.prenom || ''}`.trim(),
          });
        }
      }

      // Récupérer le type de congé si disponible
      let typeCongeNom = '';
      if (demande.fkTypeConge) {
        const typeConge = await (prisma as any).congetypes.findUnique({
          where: { id: demande.fkTypeConge },
          select: { nom: true },
        });
        typeCongeNom = typeConge?.nom || '';
      }

      // Envoyer les emails de notification
      try {
        // Récupérer tous les utilisateurs concernés avec leurs emails
        const allUserIds = new Set<bigint>();

        // Récupérer les IDs depuis les traitements
        traitements.forEach((t) => {
          if (t.userupdateid) {
            allUserIds.add(BigInt(t.userupdateid));
          }
        });

        // Récupérer les informations utilisateurs avec emails
        const allUsers = await Promise.all(
          Array.from(allUserIds).map(async (userId) => {
            const user = await utilisateurModel.findUnique({
              where: { id: userId },
              select: { id: true, nom: true, prenom: true, mail: true },
            });
            return user;
          })
        );

        const allDestinataires = allUsers
          .filter((u) => u && u.mail)
          .map((u) => ({
            email: u!.mail as string,
            nom: `${u!.nom || ''} ${u!.prenom || ''}`.trim() || 'Utilisateur',
          }));

        // Ajouter le demandeur
        if (demande.demandeur) {
          const demandeurUser = await utilisateurModel.findFirst({
            where: {
              OR: [
                { nom: { contains: demande.demandeur } },
                {
                  AND: [
                    {
                      nom: { contains: demande.demandeur.split(' ')[0] || '' },
                    },
                    {
                      prenom: {
                        contains: demande.demandeur.split(' ')[1] || '',
                      },
                    },
                  ],
                },
              ],
            },
            select: { id: true, nom: true, prenom: true, mail: true },
          });

          if (demandeurUser?.mail) {
            allDestinataires.push({
              email: demandeurUser.mail,
              nom:
                `${demandeurUser.nom || ''} ${demandeurUser.prenom || ''}`.trim() ||
                demande.demandeur,
            });
          }
        }

        // Enlever les doublons
        const uniqueDestinataires = Array.from(
          new Map(allDestinataires.map((d) => [d.email, d])).values()
        );

        // Envoyer un email à tous les destinataires
        if (uniqueDestinataires.length > 0) {
          await sendCongeNotification(
            uniqueDestinataires,
            {
              demandeur: demande.demandeur || 'Inconnu',
              nbrjour: demande.nbrjour || 0,
              du: demande.du.toISOString(),
              au: demande.au.toISOString(),
              section: demande.section || undefined,
              typeConge: typeCongeNom || undefined,
            },
            'TOUS LES CONCERNÉS'
          );
        }
      } catch (emailError) {
        console.error('❌ Erreur envoi email:', emailError);
        // Ne pas bloquer la création des traitements si l'email échoue
      }

      return res.status(201).json({
        success: true,
        message: 'Traitements créés avec succès',
        traitements: traitements.map(formatRow),
        count: traitements.length,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error: any) {
    console.error('❌ API traitements erreur:', error);
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
