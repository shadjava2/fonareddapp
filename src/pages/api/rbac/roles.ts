import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  roles?: any[];
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

    switch (req.method) {
      case 'GET':
        return await getRoles(req, res);
      case 'POST':
        return await createRole(req, res, null);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API rôles:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getRoles(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des rôles...');

    // Requête simplifiée d'abord pour tester
    const roles = await prisma.roles.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { utilisateurs: true },
        },
      },
    });

    console.log('🔍 Rôles trouvés:', roles.length);
    console.log('🔍 Premier rôle:', roles[0]);

    // Mapper les rôles avec le nombre d'utilisateurs
    const rolesWithUserCount = roles.map((role) => ({
      id: role.id.toString(),
      nom: role.nom,
      description: role.description,
      userCount: role._count.utilisateurs,
      datecreate: role.datecreate,
      dateupdate: role.dateupdate,
      usercreateid: role.usercreateid?.toString(),
      userupdateid: role.userupdateid?.toString(),
    }));

    console.log('🔍 Rôles mappés:', rolesWithUserCount.length);

    return res.status(200).json({
      success: true,
      roles: rolesWithUserCount,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des rôles:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des rôles: ' + error.message,
    });
  }
}

async function createRole(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user: any = null
) {
  try {
    // Mode développement : accès libre
    // const canCreate =
    //   user.permissions?.includes('ROLE_MANAGE') ||
    //   user.permissions?.includes('ADMIN');

    // if (!canCreate) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Permissions insuffisantes pour créer un rôle',
    //   });
    // }

    const { nom, description } = req.body;

    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du rôle est requis',
      });
    }

    // Vérifier si le rôle existe déjà
    const existingRole = await prisma.roles.findFirst({
      where: { nom },
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Un rôle avec ce nom existe déjà',
      });
    }

    const role = await prisma.roles.create({
      data: {
        nom,
        description,
        usercreateid: user ? parseInt(user.id) : 1,
      },
      include: {
        _count: {
          select: { utilisateurs: true },
        },
      },
    });

    return res.status(201).json({
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
    console.error('Erreur lors de la création du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du rôle',
    });
  }
}
