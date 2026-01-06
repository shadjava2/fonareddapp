import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  roles?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    console.log('🔍 API Roles - Méthode:', req.method);

    // Mode développement : accès libre sans authentification
    switch (req.method) {
      case 'GET':
        return await getRoles(req, res);
      case 'POST':
        return await createRole(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API roles:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getRoles(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des rôles...');

    // Paramètres de pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const skip = (page - 1) * limit;

    // Paramètres de recherche
    const search = (req.query.search as string) || '';
    const searchFields = ['nom', 'description'];

    console.log('🔍 Paramètres de pagination:', { page, limit, skip });
    console.log('🔍 Paramètres de recherche:', { search });

    // Construire les conditions de recherche
    const whereClause = search
      ? {
          OR: searchFields.map((field) => ({
            [field]: {
              contains: search,
              mode: 'insensitive' as const,
            },
          })),
        }
      : {};

    // Compter le total avec recherche
    const total = await prisma.roles.count({
      where: whereClause,
    });
    console.log('🔍 Total des rôles:', total);

    const roles = await prisma.roles.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
      skip,
      take: limit,
    });

    console.log('🔍 Rôles trouvés:', roles.length);

    const rolesWithFormattedIds = roles.map((role) => ({
      id: role.id.toString(),
      nom: role.nom,
      description: role.description,
      datecreate: role.datecreate,
      dateupdate: role.dateupdate,
      usercreateid: role.usercreateid?.toString(),
      userupdateid: role.userupdateid?.toString(),
    }));

    console.log('🔍 Rôles mappés:', rolesWithFormattedIds.length);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      roles: rolesWithFormattedIds,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      message: `${total} rôles trouvés (page ${page}/${totalPages})`,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des rôles:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des rôles: ' + error.message,
    });
  }
}

async function createRole(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la création du rôle...');

    const { nom, description } = req.body;

    if (!nom || !description) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description sont requis',
      });
    }

    const role = await prisma.roles.create({
      data: {
        nom,
        description,
        usercreateid: 1, // Mode développement
      },
    });

    console.log('🔍 Rôle créé:', role);

    return res.status(201).json({
      success: true,
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
    console.error('❌ Erreur lors de la création du rôle:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du rôle: ' + error.message,
    });
  }
}
