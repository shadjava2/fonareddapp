import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  service?: any;
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
      message: 'ID de service manquant ou invalide',
    });
  }

  try {
    console.log('🔍 API Service [id] - Méthode:', req.method);
    console.log('🔍 API Service [id] - ID:', id);

    switch (req.method) {
      case 'PUT':
        return await updateService(req, res, id);
      case 'DELETE':
        return await deleteService(req, res, id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API service [id]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function updateService(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la modification du service...');

    const { designation, fkSite } = req.body;

    if (!designation) {
      return res.status(400).json({
        success: false,
        message: 'La désignation du service est requise',
      });
    }

    // Vérifier si le service existe
    const existingService = await prisma.services.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé',
      });
    }

    // Vérifier si le site existe (si fourni)
    if (fkSite) {
      const site = await prisma.sites.findUnique({
        where: { id: BigInt(fkSite) },
      });

      if (!site) {
        return res.status(400).json({
          success: false,
          message: 'Site non trouvé',
        });
      }
    }

    const service = await prisma.services.update({
      where: { id: BigInt(id) },
      data: {
        designation,
        fkSite: fkSite ? BigInt(fkSite) : null,
        userupdateid: 1, // Mode développement
      },
      include: {
        site: {
          select: {
            id: true,
            designation: true,
          },
        },
      },
    });

    console.log('🔍 Service modifié:', service);

    return res.status(200).json({
      success: true,
      message: 'Service modifié avec succès',
      service: {
        id: service.id.toString(),
        designation: service.designation,
        fkSite: service.fkSite?.toString(),
        site: service.site
          ? {
              id: service.site.id.toString(),
              designation: service.site.designation,
            }
          : null,
        datecreate: service.datecreate,
        dateupdate: service.dateupdate,
        usercreateid: service.usercreateid?.toString(),
        userupdateid: service.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification du service:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du service: ' + error.message,
    });
  }
}

async function deleteService(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la suppression du service...');

    // Vérifier si le service existe
    const existingService = await prisma.services.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé',
      });
    }

    await prisma.services.delete({
      where: { id: BigInt(id) },
    });

    console.log('🔍 Service supprimé:', id);

    return res.status(200).json({
      success: true,
      message: 'Service supprimé avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression du service:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du service: ' + error.message,
    });
  }
}
