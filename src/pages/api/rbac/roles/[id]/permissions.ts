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
    console.log('🔍 ===== HANDLER PERMISSIONS RÔLE =====');
    console.log('🔍 URL complète:', req.url);
    console.log('🔍 Méthode:', req.method);

    // Mode développement : authentification désactivée
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID du rôle requis',
      });
    }

    const roleId = parseInt(id);

    console.log('🔍 Méthode HTTP:', req.method);
    console.log('🔍 URL:', req.url);
    console.log('🔍 Query params:', req.query);
    console.log('🔍 RoleId extrait:', roleId);

    switch (req.method) {
      case 'GET':
        console.log('🔍 Appel de getRolePermissions');
        return await getRolePermissions(req, res, roleId);
      case 'POST':
        console.log('🔍 Appel de assignPermission');
        return await assignPermission(req, res, roleId);
      case 'DELETE':
        console.log('🔍 Appel de removePermission');
        return await removePermission(req, res, roleId);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API permissions de rôle:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getRolePermissions(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  roleId: number
) {
  try {
    console.log('🔍 ===== DÉBUT getRolePermissions =====');
    console.log('🔍 Début de la récupération des permissions du rôle:', roleId);
    console.log('🔍 Type de roleId:', typeof roleId);

    // Vérifier que le rôle existe
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé',
      });
    }

    // Récupérer les permissions du rôle
    console.log('🔍 Recherche des permissions pour le rôle:', roleId);

    // Test direct de la table roles_permissions
    const directTest = await prisma.roles_permissions.findMany({
      where: { fkRole: roleId },
    });
    console.log('🔍 Test direct - permissions trouvées:', directTest.length);
    console.log('🔍 Test direct - première permission:', directTest[0]);

    // Test avec BigInt
    const directTestBigInt = await prisma.roles_permissions.findMany({
      where: { fkRole: BigInt(roleId) },
    });
    console.log(
      '🔍 Test direct BigInt - permissions trouvées:',
      directTestBigInt.length
    );

    // Test de toutes les permissions pour voir s'il y en a
    const allPermissions = await prisma.roles_permissions.findMany({
      take: 5,
    });
    console.log(
      '🔍 Test général - toutes les permissions (5 premières):',
      allPermissions.length
    );
    console.log('🔍 Première permission générale:', allPermissions[0]);

    // Requête directe pour récupérer les permissions du rôle (sans include pour éviter les relations cassées)
    const rolePermissions = await prisma.roles_permissions.findMany({
      where: { fkRole: roleId },
    });

    console.log(
      '🔍 Permissions trouvées dans la base:',
      rolePermissions.length
    );
    console.log('🔍 Première permission trouvée:', rolePermissions[0]);

    // Si aucune permission trouvée, retourner un tableau vide
    if (rolePermissions.length === 0) {
      console.log('🔍 Aucune permission trouvée pour ce rôle');
      return res.status(200).json({
        success: true,
        permissions: [],
      });
    }

    // Récupérer les détails des permissions séparément pour éviter les relations cassées
    const permissionIds = rolePermissions.map((rp) => rp.fkPermission);
    console.log('🔍 IDs des permissions à récupérer:', permissionIds);

    const permissions = await prisma.permissions.findMany({
      where: { id: { in: permissionIds } },
      select: {
        id: true,
        nom: true,
        description: true,
      },
    });

    console.log('🔍 Permissions valides trouvées:', permissions.length);
    console.log('🔍 Première permission valide:', permissions[0]);

    // Mapper les permissions en utilisant les données récupérées séparément
    const permissionsMapped = permissions.map((permission) => ({
      id: permission.id.toString(),
      nom: permission.nom,
      description: permission.description,
      rolePermissionId:
        rolePermissions
          .find((rp) => rp.fkPermission === permission.id)
          ?.id.toString() || '',
      datecreate: rolePermissions.find(
        (rp) => rp.fkPermission === permission.id
      )?.datecreate,
      dateupdate: rolePermissions.find(
        (rp) => rp.fkPermission === permission.id
      )?.dateupdate,
    }));

    console.log('🔍 Permissions mappées:', permissionsMapped.length);
    console.log('🔍 Première permission mappée:', permissionsMapped[0]);
    console.log('🔍 ===== FIN getRolePermissions - RETOUR =====');
    console.log("🔍 Retour de l'API:", {
      success: true,
      permissions: permissionsMapped,
    });

    return res.status(200).json({
      success: true,
      permissions: permissionsMapped,
    });
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la récupération des permissions du rôle:',
      error
    );

    // Si c'est une erreur de relation cassée, retourner un tableau vide
    if (
      error.message &&
      error.message.includes(
        'Field permission is required to return data, got `null`'
      )
    ) {
      console.log("🔧 Relations cassées détectées, retour d'un tableau vide");
      return res.status(200).json({
        success: true,
        permissions: [],
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la récupération des permissions du rôle: ' +
        error.message,
    });
  }
}

async function assignPermission(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  roleId: number
) {
  try {
    console.log(
      "🔍 Début de l'assignation de permission pour le rôle:",
      roleId
    );
    console.log('🔍 Body reçu:', req.body);
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Raw body:', JSON.stringify(req.body, null, 2));

    // Vérifier que le body existe et n'est pas vide
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('❌ Body manquant ou vide');
      console.log('❌ Body keys:', Object.keys(req.body || {}));
      return res.status(400).json({
        success: false,
        message: 'Données manquantes',
      });
    }

    const { permissionId } = req.body;

    console.log('🔍 Permission ID extrait:', permissionId);
    console.log('🔍 Type de permissionId:', typeof permissionId);

    // Vérifier si permissionId existe et n'est pas vide
    if (
      !permissionId ||
      permissionId === '' ||
      permissionId === null ||
      permissionId === undefined
    ) {
      console.log('❌ Permission ID manquant ou vide');
      console.log('❌ Body complet:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        message: 'ID de la permission requis',
      });
    }

    // Convertir en number si c'est une string
    const permissionIdNum = parseInt(permissionId.toString());
    if (isNaN(permissionIdNum)) {
      console.log('❌ Permission ID invalide (pas un nombre)');
      return res.status(400).json({
        success: false,
        message: 'ID de la permission invalide',
      });
    }

    // Vérifier que le rôle existe
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé',
      });
    }

    // Vérifier que la permission existe
    console.log('🔍 Recherche de la permission avec ID:', permissionIdNum);

    const permission = await prisma.permissions.findUnique({
      where: { id: permissionIdNum },
    });

    console.log('🔍 Permission trouvée:', permission);

    if (!permission) {
      console.log('❌ Permission non trouvée');
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée',
      });
    }

    // Vérifier si la permission n'est pas déjà assignée au rôle
    const existingRolePermission = await prisma.roles_permissions.findFirst({
      where: {
        fkRole: roleId,
        fkPermission: permissionIdNum,
      },
    });

    if (existingRolePermission) {
      return res.status(409).json({
        success: false,
        message: 'Cette permission est déjà assignée à ce rôle',
      });
    }

    // Assigner la permission au rôle
    const rolePermission = await prisma.roles_permissions.create({
      data: {
        fkRole: roleId,
        fkPermission: permissionIdNum,
        usercreateid: 1, // Mode développement
      },
      include: {
        permission: {
          select: {
            id: true,
            nom: true,
            description: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      permissions: [
        {
          id: rolePermission.permission.id.toString(),
          nom: rolePermission.permission.nom,
          description: rolePermission.permission.description,
          rolePermissionId: rolePermission.id.toString(),
          datecreate: rolePermission.datecreate,
          dateupdate: rolePermission.dateupdate,
        },
      ],
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de l'assignation de la permission:", error);

    // Gérer l'erreur de contrainte d'unicité Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Cette permission est déjà assignée à ce rôle',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de l'assignation de la permission: " + error.message,
    });
  }
}

async function removePermission(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  roleId: number
) {
  try {
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({
        success: false,
        message: 'ID de la permission requis',
      });
    }

    // Vérifier que le rôle existe
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rôle non trouvé',
      });
    }

    // Supprimer la permission du rôle
    const deletedRolePermission = await prisma.roles_permissions.deleteMany({
      where: {
        fkRole: roleId,
        fkPermission: parseInt(permissionId),
      },
    });

    if (deletedRolePermission.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permission non trouvée pour ce rôle',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Permission supprimée avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression de la permission:', error);
    return res.status(500).json({
      success: false,
      message:
        'Erreur lors de la suppression de la permission: ' + error.message,
    });
  }
}
