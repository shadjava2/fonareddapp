import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { API_ADMIN } from '@/lib/rbac';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  sites?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const authUser = await requireApiPermissions(req, res, [
      ...API_ADMIN.sites,
    ]);
    if (!authUser) return;

    console.log('🔍 API Sites - Méthode:', req.method);

    switch (req.method) {
      case 'GET':
        return await getSites(req, res);
      case 'POST':
        return await createSite(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API sites:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getSites(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération des sites...');

    const sites = await prisma.sites.findMany({
      orderBy: { id: 'asc' },
    });

    console.log('🔍 Sites trouvés:', sites.length);

    const sitesWithFormattedIds = sites.map((site) => ({
      id: site.id.toString(),
      designation: site.designation,
      abbreviation: site.abbreviation,
      adresse: site.adresse,
      datecreate: site.datecreate,
      dateupdate: site.dateupdate,
      usercreateid: site.usercreateid?.toString(),
      userupdateid: site.userupdateid?.toString(),
    }));

    console.log('🔍 Sites mappés:', sitesWithFormattedIds.length);

    return res.status(200).json({
      success: true,
      sites: sitesWithFormattedIds,
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des sites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sites: ' + error.message,
    });
  }
}

async function createSite(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la création du site...');

    const { designation, abbreviation, adresse } = req.body;

    if (!designation) {
      return res.status(400).json({
        success: false,
        message: 'La désignation du site est requise',
      });
    }

    const site = await prisma.sites.create({
      data: {
        designation,
        abbreviation: abbreviation || null,
        adresse: adresse || null,
        usercreateid: 1, // Mode développement
      },
    });

    console.log('🔍 Site créé:', site);

    return res.status(201).json({
      success: true,
      site: {
        id: site.id.toString(),
        designation: site.designation,
        abbreviation: site.abbreviation,
        adresse: site.adresse,
        datecreate: site.datecreate,
        dateupdate: site.dateupdate,
        usercreateid: site.usercreateid?.toString(),
        userupdateid: site.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la création du site:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du site: ' + error.message,
    });
  }
}
