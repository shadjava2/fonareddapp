import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 API Roles Permissions - Méthode: GET');
      console.log('🔍 Début de la récupération des rôles permissions...');

      // Paramètres de pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50; // Augmenté à 50
      const skip = (page - 1) * limit;

      // Si all=true, charger toutes les données
      const loadAll = req.query.all === 'true';

      console.log('🔍 Paramètres de pagination:', { page, limit, skip });

      // Compter le total
      const total = await prisma.roles_permissions.count();
      console.log('🔍 Total des rôles permissions:', total);

      const rolesPermissions = await prisma.roles_permissions.findMany({
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
        orderBy: {
          datecreate: 'desc',
        },
        ...(loadAll ? {} : { skip, take: limit }),
      });

      console.log('🔍 Rôles permissions trouvés:', rolesPermissions.length);

      const mappedRolesPermissions = rolesPermissions.map((rp) => ({
        id: rp.id.toString(),
        fkRole: rp.fkRole.toString(),
        fkPermission: rp.fkPermission.toString(),
        role: rp.role
          ? {
              id: rp.role.id.toString(),
              nom: rp.role.nom,
            }
          : null,
        permission: rp.permission
          ? {
              id: rp.permission.id.toString(),
              nom: rp.permission.nom,
              description: rp.permission.description,
            }
          : null,
        datecreate: rp.datecreate.toISOString(),
        dateupdate: rp.dateupdate.toISOString(),
        usercreateid: rp.usercreateid?.toString(),
        userupdateid: rp.userupdateid?.toString(),
      }));

      console.log(
        '🔍 Rôles permissions mappés:',
        mappedRolesPermissions.length
      );

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        success: true,
        rolesPermissions: mappedRolesPermissions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        message: `${mappedRolesPermissions.length} rôles permissions trouvés (page ${page}/${totalPages})`,
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des rôles permissions:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des rôles permissions',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('🔍 API Roles Permissions - Méthode: POST');
      console.log('🔍 Données reçues:', req.body);

      const { fkRole, fkPermission } = req.body;

      console.log(
        '🔍 Données reçues - fkRole:',
        fkRole,
        'fkPermission:',
        fkPermission
      );
      console.log(
        '🔍 Types - fkRole:',
        typeof fkRole,
        'fkPermission:',
        typeof fkPermission
      );

      // Validation des données
      if (
        !fkRole ||
        fkRole === 0 ||
        fkRole === '0' ||
        fkRole === null ||
        fkRole === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Le rôle est requis et doit être valide',
        });
      }

      if (
        !fkPermission ||
        fkPermission === 0 ||
        fkPermission === '0' ||
        fkPermission === null ||
        fkPermission === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'La permission est requise et doit être valide',
        });
      }

      // Vérifier si la combinaison existe déjà
      const existingRolePermission = await prisma.roles_permissions.findFirst({
        where: {
          fkRole: BigInt(fkRole),
          fkPermission: BigInt(fkPermission),
        },
      });

      if (existingRolePermission) {
        return res.status(400).json({
          success: false,
          message: 'Cette combinaison rôle-permission existe déjà',
        });
      }

      const newRolePermission = await prisma.roles_permissions.create({
        data: {
          fkRole: BigInt(fkRole),
          fkPermission: BigInt(fkPermission),
          usercreateid: BigInt(1), // Utilisateur fictif pour le développement
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

      console.log('🔍 Rôle permission créé:', newRolePermission);

      res.status(201).json({
        success: true,
        message: 'Rôle permission créé avec succès',
        rolePermission: {
          id: newRolePermission.id.toString(),
          fkRole: newRolePermission.fkRole.toString(),
          fkPermission: newRolePermission.fkPermission.toString(),
          role: newRolePermission.role
            ? {
                id: newRolePermission.role.id.toString(),
                nom: newRolePermission.role.nom,
              }
            : null,
          permission: newRolePermission.permission
            ? {
                id: newRolePermission.permission.id.toString(),
                nom: newRolePermission.permission.nom,
                description: newRolePermission.permission.description,
              }
            : null,
          datecreate: newRolePermission.datecreate.toISOString(),
          dateupdate: newRolePermission.dateupdate.toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Erreur lors de la création du rôle permission:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du rôle permission',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  }
}
