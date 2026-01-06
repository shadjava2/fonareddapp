import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  fonctions?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    console.log('🔍 API Fonctions - Méthode:', req.method);

    switch (req.method) {
      case 'GET':
        return await getFonctions(req, res);
      case 'POST':
        return await createFonction(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API fonctions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getFonctions(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des fonctions...');

    const fonctions = await prisma.fonctions.findMany({
      orderBy: { id: 'asc' },
    });

    console.log('🔍 Fonctions trouvées:', fonctions.length);

    const fonctionsWithFormattedIds = fonctions.map((fonction) => ({
      id: fonction.id.toString(),
      nom: fonction.nom,
      description: fonction.description,
      datecreate: fonction.datecreate,
      dateupdate: fonction.dateupdate,
      usercreateid: fonction.usercreateid?.toString(),
      userupdateid: fonction.userupdateid?.toString(),
    }));

    console.log('🔍 Fonctions mappées:', fonctionsWithFormattedIds.length);

    return res.status(200).json({
      success: true,
      fonctions: fonctionsWithFormattedIds,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des fonctions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des fonctions: ' + error.message,
    });
  }
}

async function createFonction(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la création de la fonction...');

    const { nom, description } = req.body;

    if (!nom || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description sont requis',
      });
    }

    const fonction = await prisma.fonctions.create({
      data: {
        nom,
        description,
        usercreateid: 1,
      },
    });

    console.log('🔍 Fonction créée:', fonction);

    return res.status(201).json({
      success: true,
      fonction: {
        id: fonction.id.toString(),
        nom: fonction.nom,
        description: fonction.description,
        datecreate: fonction.datecreate,
        dateupdate: fonction.dateupdate,
        usercreateid: fonction.usercreateid?.toString(),
        userupdateid: fonction.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la création de la fonction:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la fonction: ' + error.message,
    });
  }
}
