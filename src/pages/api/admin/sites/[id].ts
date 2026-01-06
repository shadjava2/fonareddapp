import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface Data {
  success: boolean;
  site?: any;
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
      message: 'ID de site manquant ou invalide',
    });
  }

  try {
    console.log('🔍 API Site [id] - Méthode:', req.method);
    console.log('🔍 API Site [id] - ID:', id);

    switch (req.method) {
      case 'PUT':
        return await updateSite(req, res, id);
      case 'DELETE':
        return await deleteSite(req, res, id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('❌ Erreur API site [id]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function updateSite(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la modification du site...');

    const { designation, abbreviation, adresse } = req.body;

    if (!designation) {
      return res.status(400).json({
        success: false,
        message: 'La désignation du site est requise',
      });
    }

    // Vérifier si le site existe
    const existingSite = await prisma.sites.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingSite) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }

    const site = await prisma.sites.update({
      where: { id: BigInt(id) },
      data: {
        designation,
        abbreviation: abbreviation || null,
        adresse: adresse || null,
        userupdateid: 1, // Mode développement
      },
    });

    console.log('🔍 Site modifié:', site);

    return res.status(200).json({
      success: true,
      message: 'Site modifié avec succès',
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
    console.error('❌ Erreur lors de la modification du site:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du site: ' + error.message,
    });
  }
}

async function deleteSite(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    console.log('🔍 Début de la suppression du site...');

    // Vérifier si le site existe
    const existingSite = await prisma.sites.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingSite) {
      return res.status(404).json({
        success: false,
        message: 'Site non trouvé',
      });
    }

    await prisma.sites.delete({
      where: { id: BigInt(id) },
    });

    console.log('🔍 Site supprimé:', id);

    return res.status(200).json({
      success: true,
      message: 'Site supprimé avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression du site:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du site: ' + error.message,
    });
  }
}
