import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  permissions?: any[];
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
    //   user.permissions?.includes('PERMISSION_MANAGE') ||
    //   user.permissions?.includes('ADMIN');

    // if (!hasPermission) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Permissions insuffisantes pour accéder aux permissions',
    //   });
    // }

    switch (req.method) {
      case 'GET':
        return await getPermissions(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API permissions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getPermissions(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des permissions...');

    // Récupérer toutes les permissions
    const permissions = await prisma.permissions.findMany({
      orderBy: { nom: 'asc' },
    });

    console.log('🔍 Permissions trouvées:', permissions.length);
    console.log('🔍 Première permission:', permissions[0]);

    // Mapper les permissions
    const permissionsMapped = permissions.map((permission) => ({
      id: permission.id.toString(),
      nom: permission.nom,
      description: permission.description,
      datecreate: permission.datecreate,
      dateupdate: permission.dateupdate,
      usercreateid: permission.usercreateid?.toString(),
      userupdateid: permission.userupdateid?.toString(),
    }));

    console.log('🔍 Permissions mappées:', permissionsMapped.length);

    return res.status(200).json({
      success: true,
      permissions: permissionsMapped,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des permissions:', error);
    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la récupération des permissions: ' + error.message,
    });
  }
}
