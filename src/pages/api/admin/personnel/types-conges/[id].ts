import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  typeConge?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'ID du type de congé requis',
      });
    }

    const typeCongeId = parseInt(id);
    if (isNaN(typeCongeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID du type de congé invalide',
      });
    }

    switch (req.method) {
      case 'GET':
        return await getTypeConge(req, res, typeCongeId, null);
      case 'PUT':
        return await updateTypeConge(req, res, typeCongeId, null);
      case 'DELETE':
        return await deleteTypeConge(req, res, typeCongeId, null);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API type congé:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getTypeConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  typeCongeId: number,
  user: any = null
) {
  try {
    const typeConge = await prisma.congetypes.findUnique({
      where: { id: typeCongeId },
    });

    if (!typeConge) {
      return res.status(404).json({
        success: false,
        message: 'Type de congé non trouvé',
      });
    }

    return res.status(200).json({
      success: true,
      typeConge: {
        id: typeConge.id.toString(),
        nom: typeConge.nom,
        description: typeConge.description,
        datecreate: typeConge.datecreate,
        dateupdate: typeConge.dateupdate,
        usercreateid: typeConge.usercreateid?.toString(),
        userupdateid: typeConge.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du type de congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du type de congé',
    });
  }
}

async function updateTypeConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  typeCongeId: number,
  user: any = null
) {
  try {
    const { nom, description } = req.body;

    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du type de congé est requis',
      });
    }

    // Vérifier que le type existe
    const existingType = await prisma.congetypes.findUnique({
      where: { id: typeCongeId },
    });

    if (!existingType) {
      return res.status(404).json({
        success: false,
        message: 'Type de congé non trouvé',
      });
    }

    // Vérifier si un autre type avec ce nom existe
    const duplicateType = await prisma.congetypes.findFirst({
      where: {
        nom,
        id: { not: typeCongeId },
      },
    });

    if (duplicateType) {
      return res.status(400).json({
        success: false,
        message: 'Un autre type de congé avec ce nom existe déjà',
      });
    }

    const typeConge = await prisma.congetypes.update({
      where: { id: typeCongeId },
      data: {
        nom,
        description: description || null,
        userupdateid: user ? parseInt(user.id) : 1,
      },
    });

    return res.status(200).json({
      success: true,
      typeConge: {
        id: typeConge.id.toString(),
        nom: typeConge.nom,
        description: typeConge.description,
        datecreate: typeConge.datecreate,
        dateupdate: typeConge.dateupdate,
        usercreateid: typeConge.usercreateid?.toString(),
        userupdateid: typeConge.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la modification du type de congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du type de congé',
    });
  }
}

async function deleteTypeConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  typeCongeId: number,
  user: any = null
) {
  try {
    // Vérifier si le type est lié à des demandes de congé
    const demandesCount = await prisma.congedemande.count({
      where: { fkTypeConge: typeCongeId },
    });

    if (demandesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer le type de congé car ${demandesCount} demande(s) y sont associée(s).`,
      });
    }

    await prisma.congetypes.delete({
      where: { id: typeCongeId },
    });

    return res.status(200).json({
      success: true,
      message: 'Type de congé supprimé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du type de congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du type de congé',
    });
  }
}
