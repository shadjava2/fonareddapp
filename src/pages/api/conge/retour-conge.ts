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

interface RetourCongeResponse {
  success: boolean;
  message?: string;
  retourConge?: any;
  retourConges?: any[];
}

/**
 * GET /api/conge/retour-conge
 * Récupère tous les retours de congé ou un retour spécifique
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<RetourCongeResponse>
) {
  try {
    if (!prisma) {
      console.error('❌ Prisma non initialisé');
      return res.status(500).json({
        success: false,
        message: 'Prisma non initialisé',
      });
    }

    const model = (prisma as any).retourconge;
    if (!model) {
      const availableModels = Object.keys(prisma || {}).filter(
        (key) => !key.startsWith('$') && !key.startsWith('_')
      );
      console.error(
        '❌ Modèle retourconge introuvable. Modèles disponibles:',
        availableModels
      );
      return res.status(500).json({
        success: false,
        message:
          'Modèle retourconge introuvable. Exécutez: npx prisma generate puis redémarrez le serveur',
      });
    }

    const { id } = req.query;

    if (id) {
      // Récupérer un retour spécifique
      const retour = await model.findUnique({
        where: {
          id: BigInt(id as string),
        },
      });

      if (!retour) {
        return res.status(404).json({
          success: false,
          message: 'Retour de congé non trouvé',
        });
      }

      return res.status(200).json({
        success: true,
        retourConge: formatRow(retour),
      });
    } else {
      // Récupérer tous les retours
      const retours = await model.findMany({
        orderBy: {
          datecreate: 'desc',
        },
      });

      return res.status(200).json({
        success: true,
        retourConges: retours.map(formatRow),
      });
    }
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la récupération des retours de congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

/**
 * POST /api/conge/retour-conge
 * Crée un nouveau retour de congé
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<RetourCongeResponse>
) {
  try {
    if (!prisma) {
      return res.status(500).json({
        success: false,
        message: 'Prisma non initialisé',
      });
    }

    const model = (prisma as any).retourconge;
    if (!model) {
      console.error('❌ Modèle retourconge introuvable dans POST');
      return res.status(500).json({
        success: false,
        message:
          'Modèle retourconge introuvable. Exécutez: npx prisma generate puis redémarrez le serveur',
      });
    }

    // Vérifier l'authentification
    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    const { fkDemande, fkSoldes, observations, nbrjour } = req.body;

    // Validation
    if (!fkDemande) {
      return res.status(400).json({
        success: false,
        message: 'La demande de congé est obligatoire',
      });
    }

    // Vérifier que la demande existe et est approuvée
    const demandeModel = (prisma as any).congedemande;
    if (demandeModel) {
      const demande = await demandeModel.findUnique({
        where: {
          id: BigInt(fkDemande),
        },
        select: {
          statut: true,
        },
      });

      if (!demande) {
        return res.status(400).json({
          success: false,
          message: "La demande de congé spécifiée n'existe pas",
        });
      }

      if (demande.statut !== 'APPROUVEE') {
        return res.status(400).json({
          success: false,
          message:
            'Seules les demandes approuvées peuvent avoir un retour de congé',
        });
      }
    }

    // Validation fkSoldes
    if (!fkSoldes) {
      return res.status(400).json({
        success: false,
        message: 'Le solde de congé (fkSoldes) est obligatoire',
      });
    }

    // Créer le retour
    const dataToCreate: any = {
      fkDemande: BigInt(fkDemande),
      fkSoldes: BigInt(fkSoldes),
      usercreateid: BigInt(currentUser.id),
    };

    if (
      observations !== undefined &&
      observations !== null &&
      observations !== ''
    ) {
      dataToCreate.observations = String(observations);
    }

    if (nbrjour !== undefined && nbrjour !== null && nbrjour !== '') {
      const nbrjourNum = parseInt(String(nbrjour), 10);
      if (!isNaN(nbrjourNum) && nbrjourNum >= 0) {
        dataToCreate.nbrjour = nbrjourNum;
      }
    }

    const nouveauRetour = await model.create({
      data: dataToCreate,
    });

    console.log(
      '✅ Retour de congé créé avec succès:',
      formatRow(nouveauRetour)
    );

    // Appeler la procédure stockée pour mettre à jour le solde (si elle existe)
    // Vérifier si nbrjour est fourni et > 0 avant d'appeler la procédure
    if (nbrjour && parseInt(String(nbrjour), 10) > 0) {
      try {
        const retourId = Number(nouveauRetour.id);
        const fkSoldesNum = Number(fkSoldes);
        const nbrjourNum = parseInt(String(nbrjour), 10);

        // Appeler la procédure stockée pour mettre à jour le solde après l'insert
        // La procédure stockée doit s'appeler : update_solde_retour_conge
        // Paramètres : p_retour_id, p_fk_soldes, p_nbrjour
        await (prisma as any).$executeRawUnsafe(
          `CALL update_solde_retour_conge(?, ?, ?)`,
          retourId,
          fkSoldesNum,
          nbrjourNum
        );

        console.log(
          `✅ Procédure stockée appelée pour mettre à jour le solde: retourId=${retourId}, fkSoldes=${fkSoldesNum}, nbrjour=${nbrjourNum}`
        );
      } catch (procError: any) {
        // Si la procédure n'existe pas (code 1305), c'est normal - elle sera créée plus tard
        const errorMessage = procError?.message || '';
        if (
          errorMessage.includes('1305') ||
          errorMessage.includes('does not exist')
        ) {
          console.warn(
            "⚠️ Procédure stockée 'update_solde_retour_conge' n'existe pas encore. Créez-la avec le fichier sql/procedures/update_solde_retour_conge.sql"
          );
        } else {
          console.error(
            "⚠️ Erreur lors de l'appel de la procédure stockée (non bloquant):",
            procError?.message || procError
          );
        }
        // Ne pas bloquer si la procédure échoue
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Retour de congé créé avec succès',
      retourConge: formatRow(nouveauRetour),
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la création du retour de congé:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

/**
 * PUT /api/conge/retour-conge
 * Met à jour un retour de congé existant
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<RetourCongeResponse>
) {
  try {
    if (!prisma) {
      return res.status(500).json({
        success: false,
        message: 'Prisma non initialisé',
      });
    }

    const model = (prisma as any).retourconge;
    if (!model) {
      console.error('❌ Modèle retourconge introuvable dans PUT');
      return res.status(500).json({
        success: false,
        message:
          'Modèle retourconge introuvable. Exécutez: npx prisma generate puis redémarrez le serveur',
      });
    }

    // Vérifier l'authentification
    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    const { id, fkDemande, fkSoldes, observations, nbrjour } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du retour de congé requis',
      });
    }

    // Vérifier que le retour existe
    const retourExistant = await model.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!retourExistant) {
      return res.status(404).json({
        success: false,
        message: 'Retour de congé non trouvé',
      });
    }

    // Vérifier que la demande est approuvée si fkDemande est fourni
    if (fkDemande) {
      const demandeModel = (prisma as any).congedemande;
      if (demandeModel) {
        const demande = await demandeModel.findUnique({
          where: {
            id: BigInt(fkDemande),
          },
          select: {
            statut: true,
          },
        });

        if (!demande) {
          return res.status(400).json({
            success: false,
            message: "La demande de congé spécifiée n'existe pas",
          });
        }

        if (demande.statut !== 'APPROUVEE') {
          return res.status(400).json({
            success: false,
            message:
              'Seules les demandes approuvées peuvent avoir un retour de congé',
          });
        }
      }
    }

    // Préparer les données de mise à jour
    const dataToUpdate: any = {
      userupdateid: BigInt(currentUser.id),
    };

    if (fkDemande !== undefined && fkDemande !== null) {
      dataToUpdate.fkDemande = BigInt(fkDemande);
    }

    if (fkSoldes !== undefined && fkSoldes !== null) {
      dataToUpdate.fkSoldes = BigInt(fkSoldes);
    }

    if (observations !== undefined) {
      if (observations === null || observations === '') {
        dataToUpdate.observations = null;
      } else {
        dataToUpdate.observations = String(observations);
      }
    }

    if (nbrjour !== undefined) {
      if (nbrjour === null || nbrjour === '') {
        dataToUpdate.nbrjour = null;
      } else {
        const nbrjourNum = parseInt(String(nbrjour), 10);
        if (!isNaN(nbrjourNum) && nbrjourNum >= 0) {
          dataToUpdate.nbrjour = nbrjourNum;
        }
      }
    }

    const retourModifie = await model.update({
      where: {
        id: BigInt(id),
      },
      data: dataToUpdate,
    });

    console.log(
      '✅ Retour de congé modifié avec succès:',
      formatRow(retourModifie)
    );

    return res.status(200).json({
      success: true,
      message: 'Retour de congé modifié avec succès',
      retourConge: formatRow(retourModifie),
    });
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la modification du retour de congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

/**
 * DELETE /api/conge/retour-conge
 * Supprime un retour de congé
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<RetourCongeResponse>
) {
  try {
    if (!prisma) {
      return res.status(500).json({
        success: false,
        message: 'Prisma non initialisé',
      });
    }

    const model = (prisma as any).retourconge;
    if (!model) {
      console.error('❌ Modèle retourconge introuvable dans DELETE');
      return res.status(500).json({
        success: false,
        message:
          'Modèle retourconge introuvable. Exécutez: npx prisma generate puis redémarrez le serveur',
      });
    }

    // Vérifier l'authentification
    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID du retour de congé requis',
      });
    }

    // Vérifier que le retour existe
    const retourExistant = await model.findUnique({
      where: {
        id: BigInt(id as string),
      },
    });

    if (!retourExistant) {
      return res.status(404).json({
        success: false,
        message: 'Retour de congé non trouvé',
      });
    }

    // Supprimer le retour
    await model.delete({
      where: {
        id: BigInt(id as string),
      },
    });

    console.log(`✅ Retour de congé ${id} supprimé avec succès`);

    return res.status(200).json({
      success: true,
      message: 'Retour de congé supprimé avec succès',
    });
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la suppression du retour de congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RetourCongeResponse>
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur dans le handler retour-conge:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
