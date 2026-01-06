import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  fonction?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'ID de la fonction requis',
    });
  }

  try {
    console.log('🔍 API Fonction - Méthode:', req.method, 'ID:', id);

    switch (req.method) {
      case 'PUT':
        return await updateFonction(req, res, id);
      case 'DELETE':
        return await deleteFonction(req, res, id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API fonction:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function updateFonction(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la modification de la fonction...');

    const { nom, description } = req.body;

    if (!nom || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description sont requis',
      });
    }

    const fonction = await prisma.fonctions.update({
      where: { id: BigInt(id) },
      data: {
        nom,
        description,
        userupdateid: 1,
      },
    });

    console.log('🔍 Fonction modifiée:', fonction);

    return res.status(200).json({
      success: true,
      message: 'Fonction modifiée avec succès',
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
    console.error('❌ Erreur lors de la modification de la fonction:', error);
    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la modification de la fonction: ' + error.message,
    });
  }
}

async function deleteFonction(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la suppression de la fonction...');

    await prisma.fonctions.delete({
      where: { id: BigInt(id) },
    });

    console.log('🔍 Fonction supprimée:', id);

    return res.status(200).json({
      success: true,
      message: 'Fonction supprimée avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression de la fonction:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la fonction: ' + error.message,
    });
  }
}
