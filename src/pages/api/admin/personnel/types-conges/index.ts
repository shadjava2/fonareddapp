import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  typesConges?: any[];
  typeConge?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // Mode développement : authentification désactivée
    switch (req.method) {
      case 'GET':
        return await getTypesConges(req, res);
      case 'POST':
        return await createTypeConge(req, res, null);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API types congés:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getTypesConges(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des types de congés...');

    const typesConges = await prisma.congetypes.findMany({
      orderBy: { nom: 'asc' },
    });

    console.log('🔍 Types de congés trouvés:', typesConges.length);

    const typesCongesMapped = typesConges.map((type) => ({
      id: type.id.toString(),
      nom: type.nom,
      description: type.description,
      datecreate: type.datecreate,
      dateupdate: type.dateupdate,
      usercreateid: type.usercreateid?.toString(),
      userupdateid: type.userupdateid?.toString(),
    }));

    console.log('🔍 Types de congés mappés:', typesCongesMapped.length);

    return res.status(200).json({
      success: true,
      typesConges: typesCongesMapped,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des types de congés:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des types de congés',
    });
  }
}

async function createTypeConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
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

    // Vérifier si le type existe déjà
    const existingType = await prisma.congetypes.findUnique({
      where: { nom },
    });

    if (existingType) {
      return res.status(400).json({
        success: false,
        message: 'Un type de congé avec ce nom existe déjà',
      });
    }

    const typeConge = await prisma.congetypes.create({
      data: {
        nom,
        description: description || null,
        usercreateid: user ? parseInt(user.id) : 1,
      },
    });

    return res.status(201).json({
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
    console.error('Erreur lors de la création du type de congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du type de congé',
    });
  }
}
