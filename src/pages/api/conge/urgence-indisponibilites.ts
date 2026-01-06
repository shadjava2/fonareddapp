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

interface UrgenceIndisponibiliteResponse {
  success: boolean;
  message?: string;
  indisponibilite?: any;
  indisponibilites?: any[];
}

/**
 * GET /api/conge/urgence-indisponibilites
 * Récupère toutes les indisponibilités d'urgence ou une spécifique
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<UrgenceIndisponibiliteResponse>
) {
  try {
    if (!prisma) {
      return res.status(500).json({
        success: false,
        message: 'Prisma non initialisé',
      });
    }

    const model = (prisma as any).urgenceindisponibilites;
    if (!model) {
      console.error(
        '❌ Modèle urgenceindisponibilites introuvable. Exécutez: npx prisma generate'
      );
      return res.status(500).json({
        success: false,
        message:
          'Modèle urgenceindisponibilites introuvable. Exécutez: npx prisma generate',
      });
    }

    const { id } = req.query;

    if (id) {
      const indispo = await model.findUnique({
        where: {
          id: BigInt(id as string),
        },
      });

      if (!indispo) {
        return res.status(404).json({
          success: false,
          message: "Indisponibilité d'urgence non trouvée",
        });
      }

      return res.status(200).json({
        success: true,
        indisponibilite: formatRow(indispo),
      });
    } else {
      const indispos = await model.findMany({
        orderBy: {
          datecreate: 'desc',
        },
      });

      return res.status(200).json({
        success: true,
        indisponibilites: indispos.map(formatRow),
      });
    }
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la récupération des indisponibilités:',
      error
    );
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

/**
 * POST /api/conge/urgence-indisponibilites
 * Crée une nouvelle indisponibilité d'urgence
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<UrgenceIndisponibiliteResponse>
) {
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

    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    const { fkUtilisateur1, fkUtilisateur2, observations, du, au, statut } =
      req.body;

    // Validation: date début obligatoire
    if (!du) {
      return res.status(400).json({
        success: false,
        message: 'La date de début est obligatoire',
      });
    }

    // Validation: utilisateur 1 (agent) obligatoire
    if (!fkUtilisateur1) {
      return res.status(400).json({
        success: false,
        message: "L'agent (utilisateur 1) est obligatoire",
      });
    }

    // Si date fin est définie, vérifier qu'elle est après la date début
    if (au && du) {
      const dateDebut = new Date(du);
      const dateFin = new Date(au);
      if (dateFin < dateDebut) {
        return res.status(400).json({
          success: false,
          message:
            'La date de fin doit être supérieure ou égale à la date de début',
        });
      }
    }

    // Si date fin n'est pas définie, statut par défaut = indisponible
    // Si date fin est définie, statut = indisponible (sera changé automatiquement par scheduler)
    const statutFinal = statut || 'indisponible';

    const dataToCreate: any = {
      fkUtilisateur1: BigInt(fkUtilisateur1),
      du: new Date(du),
      statut: statutFinal,
      usercreateid: BigInt(currentUser.id),
    };

    if (fkUtilisateur2) {
      dataToCreate.fkUtilisateur2 = BigInt(fkUtilisateur2);
    }

    if (au) {
      dataToCreate.au = new Date(au);
    }

    if (
      observations !== undefined &&
      observations !== null &&
      observations !== ''
    ) {
      dataToCreate.observations = String(observations);
    }

    const nouvelleIndispo = await model.create({
      data: dataToCreate,
    });

    console.log(
      "✅ Indisponibilité d'urgence créée:",
      formatRow(nouvelleIndispo)
    );

    return res.status(201).json({
      success: true,
      message: "Indisponibilité d'urgence créée avec succès",
      indisponibilite: formatRow(nouvelleIndispo),
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de la création de l'indisponibilité:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

/**
 * PUT /api/conge/urgence-indisponibilites
 * Met à jour une indisponibilité d'urgence
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<UrgenceIndisponibiliteResponse>
) {
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

    const token = getTokenFromRequest(req);
    const currentUser = token ? await getUserFromToken(token) : null;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié',
      });
    }

    const { id, fkUtilisateur1, fkUtilisateur2, observations, du, au, statut } =
      req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID de l'indisponibilité requis",
      });
    }

    const indispoExistant = await model.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!indispoExistant) {
      return res.status(404).json({
        success: false,
        message: "Indisponibilité d'urgence non trouvée",
      });
    }

    const dataToUpdate: any = {
      userupdateid: BigInt(currentUser.id),
    };

    if (fkUtilisateur1 !== undefined && fkUtilisateur1 !== null) {
      dataToUpdate.fkUtilisateur1 = BigInt(fkUtilisateur1);
    }

    if (fkUtilisateur2 !== undefined) {
      dataToUpdate.fkUtilisateur2 = fkUtilisateur2
        ? BigInt(fkUtilisateur2)
        : null;
    }

    if (du !== undefined && du !== null) {
      dataToUpdate.du = new Date(du);
    }

    if (au !== undefined) {
      // Logique spéciale : si on définit la date fin et qu'elle n'existait pas avant
      const ancienneDateFin = indispoExistant.au;
      if (au && !ancienneDateFin) {
        // Date fin définie pour la première fois -> statut reste indisponible
        // Le scheduler passera à disponible une fois la date passée
        dataToUpdate.au = new Date(au);
        // Ne pas changer le statut ici, le scheduler s'en chargera
      } else if (au) {
        dataToUpdate.au = new Date(au);
      } else {
        dataToUpdate.au = null;
      }

      // Si on supprime la date fin, on peut laisser l'utilisateur changer le statut manuellement
    }

    if (observations !== undefined) {
      dataToUpdate.observations =
        observations === null || observations === ''
          ? null
          : String(observations);
    }

    // Permettre la modification manuelle du statut seulement si date fin n'est pas définie
    // ou si on est en train de modifier la date fin
    if (statut !== undefined && statut !== null) {
      // Vérifier si date fin existe après mise à jour
      const nouvelleDateFin =
        dataToUpdate.au !== undefined ? dataToUpdate.au : indispoExistant.au;

      if (!nouvelleDateFin) {
        // Pas de date fin définie -> permettre le changement de statut
        dataToUpdate.statut = statut;
      } else {
        // Date fin définie -> ne pas permettre le changement manuel, le scheduler s'en charge
        // Sauf si on passe explicitement à disponible manuellement (pour forcer)
        console.warn(
          '⚠️ Tentative de changement de statut alors que date fin est définie. Statut sera géré par scheduler.'
        );
      }
    }

    // Vérifier que date fin >= date début
    const dateDebut = dataToUpdate.du || indispoExistant.du;
    const dateFin =
      dataToUpdate.au !== undefined ? dataToUpdate.au : indispoExistant.au;
    if (dateFin && dateDebut && new Date(dateFin) < new Date(dateDebut)) {
      return res.status(400).json({
        success: false,
        message:
          'La date de fin doit être supérieure ou égale à la date de début',
      });
    }

    const indispoModifiee = await model.update({
      where: {
        id: BigInt(id),
      },
      data: dataToUpdate,
    });

    console.log('✅ Indisponibilité modifiée:', formatRow(indispoModifiee));

    return res.status(200).json({
      success: true,
      message: "Indisponibilité d'urgence modifiée avec succès",
      indisponibilite: formatRow(indispoModifiee),
    });
  } catch (error: any) {
    console.error(
      "❌ Erreur lors de la modification de l'indisponibilité:",
      error
    );
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}

/**
 * DELETE /api/conge/urgence-indisponibilites
 * Supprime une indisponibilité d'urgence
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<UrgenceIndisponibiliteResponse>
) {
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
        message: "ID de l'indisponibilité requis",
      });
    }

    const indispoExistant = await model.findUnique({
      where: {
        id: BigInt(id as string),
      },
    });

    if (!indispoExistant) {
      return res.status(404).json({
        success: false,
        message: "Indisponibilité d'urgence non trouvée",
      });
    }

    await model.delete({
      where: {
        id: BigInt(id as string),
      },
    });

    console.log(`✅ Indisponibilité ${id} supprimée`);

    return res.status(200).json({
      success: true,
      message: "Indisponibilité d'urgence supprimée avec succès",
    });
  } catch (error: any) {
    console.error(
      "❌ Erreur lors de la suppression de l'indisponibilité:",
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
  res: NextApiResponse<UrgenceIndisponibiliteResponse>
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
    console.error('❌ Erreur dans le handler urgence-indisponibilites:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erreur serveur',
    });
  }
}
