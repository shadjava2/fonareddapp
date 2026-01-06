import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 API Permissions - Méthode: GET');
      console.log('🔍 Début de la récupération des permissions...');

      const permissions = await prisma.permissions.findMany({
        orderBy: {
          datecreate: 'desc',
        },
      });

      console.log('🔍 Permissions trouvées:', permissions.length);

      const mappedPermissions = permissions.map((permission) => ({
        id: permission.id.toString(),
        nom: permission.nom,
        description: permission.description,
        datecreate: permission.datecreate.toISOString(),
        dateupdate: permission.dateupdate.toISOString(),
        usercreateid: permission.usercreateid?.toString(),
        userupdateid: permission.userupdateid?.toString(),
      }));

      console.log('🔍 Permissions mappées:', mappedPermissions.length);

      res.status(200).json({
        success: true,
        permissions: mappedPermissions,
        total: mappedPermissions.length,
        message: `${mappedPermissions.length} permissions trouvées`,
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des permissions:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des permissions',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`,
    });
  }
}



