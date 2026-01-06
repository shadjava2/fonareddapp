import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  role?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // Mode développement : authentification désactivée
    // const token = req.cookies.authToken;
    // if (!token) {
    //   return res
    //     .status(401)
    //     .json({ success: false, message: 'Non authentifié' });
    // }

    // const user = await verifyToken(token);
    // if (!user) {
    //   return res
    //     .status(401)
    //     .json({ success: false, message: 'Token invalide' });
    // }

    // Mode développement : accès libre
    // const hasPermission =
    //   user.permissions?.includes('ROLE_MANAGE') ||
    //   user.permissions?.includes('ADMIN');

    // if (!hasPermission) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Permissions insuffisantes pour accéder aux rôles',
    //   });
    // }

    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID du rôle requis',
      });
    }

    const roleId = parseInt(id);

    switch (req.method) {
      case 'GET':
        return await getRole(req, res, roleId);
      case 'PUT':
        return await updateRole(req, res, roleId, null);
      case 'DELETE':
        return await deleteRole(req, res, roleId);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API rôle:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getRole(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  roleId: number
) {
  try {
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { utilisateurs: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé',
      });
    }

    return res.status(200).json({
      success: true,
      role: {
        id: role.id.toString(),
        nom: role.nom,
        description: role.description,
        userCount: role._count.utilisateurs,
        datecreate: role.datecreate,
        dateupdate: role.dateupdate,
        usercreateid: role.usercreateid?.toString(),
        userupdateid: role.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du rôle',
    });
  }
}

async function updateRole(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  roleId: number,
  user: any = null
) {
  try {
    const { nom, description } = req.body;

    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du rôle est requis',
      });
    }

    // Vérifier si le rôle existe
    const existingRole = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé',
      });
    }

    // Vérifier si un autre rôle avec ce nom existe déjà
    const duplicateRole = await prisma.roles.findFirst({
      where: {
        nom,
        id: { not: roleId },
      },
    });

    if (duplicateRole) {
      return res.status(400).json({
        success: false,
        message: 'Un rôle avec ce nom existe déjà',
      });
    }

    const role = await prisma.roles.update({
      where: { id: roleId },
      data: {
        nom,
        description,
        userupdateid: user ? parseInt(user.id) : 1,
      },
      include: {
        _count: {
          select: { utilisateurs: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      role: {
        id: role.id.toString(),
        nom: role.nom,
        description: role.description,
        userCount: role._count.utilisateurs,
        datecreate: role.datecreate,
        dateupdate: role.dateupdate,
        usercreateid: role.usercreateid?.toString(),
        userupdateid: role.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du rôle',
    });
  }
}

async function deleteRole(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  roleId: number
) {
  try {
    // Vérifier si le rôle existe
    const existingRole = await prisma.roles.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { utilisateurs: true },
        },
      },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé',
      });
    }

    // Vérifier si le rôle a des utilisateurs associés
    if (existingRole._count.utilisateurs > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Impossible de supprimer un rôle qui a des utilisateurs associés',
      });
    }

    await prisma.roles.delete({
      where: { id: roleId },
    });

    return res.status(200).json({
      success: true,
      message: 'Rôle supprimé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du rôle',
    });
  }
}
