import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'ID rôle permission requis',
    });
  }

  if (req.method === 'PUT') {
    try {
      console.log('🔍 API Roles Permissions PUT - ID:', id);
      console.log('🔍 Données reçues:', req.body);

      const { fkRole, fkPermission } = req.body;

      // Validation des données
      if (!fkRole || !fkPermission) {
        return res.status(400).json({
          success: false,
          message: 'Le rôle et la permission sont requis',
        });
      }

      // Vérifier si le rôle permission existe
      const existingRolePermission = await prisma.roles_permissions.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existingRolePermission) {
        return res.status(404).json({
          success: false,
          message: 'Rôle permission non trouvé',
        });
      }

      // Vérifier si une autre combinaison existe déjà
      const duplicateRolePermission = await prisma.roles_permissions.findFirst({
        where: {
          AND: [
            { id: { not: BigInt(id) } },
            { fkRole: BigInt(fkRole) },
            { fkPermission: BigInt(fkPermission) },
          ],
        },
      });

      if (duplicateRolePermission) {
        return res.status(400).json({
          success: false,
          message: 'Cette combinaison rôle-permission existe déjà',
        });
      }

      const updatedRolePermission = await prisma.roles_permissions.update({
        where: { id: BigInt(id) },
        data: {
          fkRole: BigInt(fkRole),
          fkPermission: BigInt(fkPermission),
          userupdateid: BigInt(1), // Utilisateur fictif pour le développement
        },
        include: {
          role: {
            select: {
              id: true,
              nom: true,
            },
          },
          permission: {
            select: {
              id: true,
              nom: true,
              description: true,
            },
          },
        },
      });

      console.log('🔍 Rôle permission modifié:', updatedRolePermission);

      res.status(200).json({
        success: true,
        message: 'Rôle permission modifié avec succès',
        rolePermission: {
          id: updatedRolePermission.id.toString(),
          fkRole: updatedRolePermission.fkRole.toString(),
          fkPermission: updatedRolePermission.fkPermission.toString(),
          role: updatedRolePermission.role
            ? {
                id: updatedRolePermission.role.id.toString(),
                nom: updatedRolePermission.role.nom,
              }
            : null,
          permission: updatedRolePermission.permission
            ? {
                id: updatedRolePermission.permission.id.toString(),
                nom: updatedRolePermission.permission.nom,
                description: updatedRolePermission.permission.description,
              }
            : null,
          datecreate: updatedRolePermission.datecreate.toISOString(),
          dateupdate: updatedRolePermission.dateupdate.toISOString(),
        },
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la modification du rôle permission:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la modification du rôle permission',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log('🔍 API Roles Permissions DELETE - ID:', id);

      // Vérifier si le rôle permission existe
      const existingRolePermission = await prisma.roles_permissions.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existingRolePermission) {
        return res.status(404).json({
          success: false,
          message: 'Rôle permission non trouvé',
        });
      }

      await prisma.roles_permissions.delete({
        where: { id: BigInt(id) },
      });

      console.log('🔍 Rôle permission supprimé:', id);

      res.status(200).json({
        success: true,
        message: 'Rôle permission supprimé avec succès',
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la suppression du rôle permission:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du rôle permission',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  }
}



