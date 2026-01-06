import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface RolesPermissionsResponse {
  success: boolean;
  data?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RolesPermissionsResponse>
) {
  // Vérifier l'authentification
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  // Vérifier les permissions
  if (!user.permissions.includes('ROLE_MANAGE')) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    if (req.method === 'GET') {
      const roleId = req.query.roleId as string;

      if (!roleId) {
        return res.status(400).json({
          success: false,
          message: 'ID rôle requis',
        });
      }

      // Récupérer les permissions pour le rôle
      const rolesPermissions = await prisma.roles_permissions.findMany({
        where: { fkRole: parseInt(roleId) },
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              nom: true,
              description: true,
            },
          },
        },
        orderBy: {
          permission: {
            code: 'asc',
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: rolesPermissions,
      });
    }

    if (req.method === 'POST') {
      const { roleId, permissionIds } = req.body;

      if (!roleId || !Array.isArray(permissionIds)) {
        return res.status(400).json({
          success: false,
          message: 'ID rôle et liste des permissions requis',
        });
      }

      // Vérifier que le rôle existe
      const role = await prisma.roles.findUnique({
        where: { id: parseInt(roleId) },
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Rôle non trouvé',
        });
      }

      // Vérifier que toutes les permissions existent
      const permissions = await prisma.permissions.findMany({
        where: {
          id: { in: permissionIds.map(id => parseInt(id)) },
        },
      });

      if (permissions.length !== permissionIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs permissions n\'existent pas',
        });
      }

      // Supprimer les anciennes permissions du rôle
      await prisma.roles_permissions.deleteMany({
        where: { fkRole: parseInt(roleId) },
      });

      // Créer les nouvelles permissions
      const newPermissions = permissionIds.map(permissionId => ({
        fkRole: parseInt(roleId),
        fkPermission: parseInt(permissionId),
      }));

      await prisma.roles_permissions.createMany({
        data: newPermissions,
      });

      // Récupérer les permissions mises à jour
      const updatedPermissions = await prisma.roles_permissions.findMany({
        where: { fkRole: parseInt(roleId) },
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              nom: true,
              description: true,
            },
          },
        },
        orderBy: {
          permission: {
            code: 'asc',
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: updatedPermissions,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API roles-permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
