import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  role?: any;
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
      message: 'ID du rôle requis',
    });
  }

  try {
    console.log('🔍 API Role - Méthode:', req.method, 'ID:', id);

    switch (req.method) {
      case 'PUT':
        return await updateRole(req, res, id);
      case 'DELETE':
        return await deleteRole(req, res, id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API role:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function updateRole(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la modification du rôle...');

    const { nom, description } = req.body;

    if (!nom || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description sont requis',
      });
    }

    const role = await prisma.roles.update({
      where: { id: BigInt(id) },
      data: {
        nom,
        description,
        userupdateid: 1, // Mode développement
      },
    });

    console.log('🔍 Rôle modifié:', role);

    return res.status(200).json({
      success: true,
      message: 'Rôle modifié avec succès',
      role: {
        id: role.id.toString(),
        nom: role.nom,
        description: role.description,
        datecreate: role.datecreate,
        dateupdate: role.dateupdate,
        usercreateid: role.usercreateid?.toString(),
        userupdateid: role.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du rôle: ' + error.message,
    });
  }
}

async function deleteRole(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la suppression du rôle...');

    await prisma.roles.delete({
      where: { id: BigInt(id) },
    });

    console.log('🔍 Rôle supprimé:', id);

    return res.status(200).json({
      success: true,
      message: 'Rôle supprimé avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du rôle: ' + error.message,
    });
  }
}
