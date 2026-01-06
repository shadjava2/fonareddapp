import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  services?: any[];
  service?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    console.log('🔍 API Services - Méthode:', req.method);
    console.log('🔍 API Services - Headers:', req.headers);

    // Mode développement : accès libre sans authentification
    switch (req.method) {
      case 'GET':
        return await getServices(req, res);
      case 'POST':
        return await createService(req, res, null);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API services:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getServices(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des services...');

    // Requête optimisée avec include pour éviter les requêtes multiples
    const services = await prisma.services.findMany({
      include: {
        site: {
          select: {
            id: true,
            designation: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    console.log('🔍 Services trouvés:', services.length);

    // Mapper les services avec leurs sites
    const servicesWithSites = services.map((service) => ({
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
    }));

    console.log('🔍 Services mappés:', servicesWithSites.length);

    return res.status(200).json({
      success: true,
      services: servicesWithSites,
      total: servicesWithSites.length,
      message: `${servicesWithSites.length} service(s) chargé(s) avec succès`,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des services:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des services: ' + error.message,
    });
  }
}

async function createService(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user: any = null
) {
  try {
    // Mode développement : accès libre
    // const canCreate =
    //   user.permissions?.includes('SERVICES_ENREGISTRER') ||
    //   user.permissions?.includes('SERVICE_MANAGE');

    // if (!canCreate) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Permissions insuffisantes pour créer un service',
    //   });
    // }

    const { designation, fkSite } = req.body;

    if (!designation) {
      return res.status(400).json({
        success: false,
        message: 'La désignation du service est requise',
      });
    }

    const service = await prisma.services.create({
      data: {
        designation,
        fkSite: fkSite ? parseInt(fkSite) : null,
        usercreateid: user ? parseInt(user.id) : 1,
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

    return res.status(201).json({
      success: true,
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
    console.error('Erreur lors de la création du service:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du service',
    });
  }
}
