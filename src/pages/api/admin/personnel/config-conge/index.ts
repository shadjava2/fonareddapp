import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  configConge?: any;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getConfigConge(req, res);
      case 'POST':
        return await createConfigConge(req, res, null);
      case 'PUT':
        return await updateConfigConge(req, res, null);
      default:
        return res.status(405).json({
          success: false,
          message: 'Méthode non autorisée',
        });
    }
  } catch (error: any) {
    console.error('Erreur API config congé:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}

async function getConfigConge(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    console.log('🔍 Début de la récupération de la configuration congé...');

    // Récupérer la première configuration (il ne devrait y en avoir qu'une)
    const configConge = await prisma.congeconfig.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!configConge) {
      return res.status(200).json({
        success: true,
        configConge: null,
      });
    }

    const configCongeMapped = {
      id: configConge.id.toString(),
      nbjourMois: configConge.nbjourMois,
      datecreate: configConge.datecreate,
      dateupdate: configConge.dateupdate,
      usercreateid: configConge.usercreateid?.toString(),
      userupdateid: configConge.userupdateid?.toString(),
    };

    console.log('🔍 Configuration congé trouvée:', configCongeMapped);

    return res.status(200).json({
      success: true,
      configConge: configCongeMapped,
    });
  } catch (error: any) {
    console.error(
      'Erreur lors de la récupération de la configuration congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration congé',
    });
  }
}

async function createConfigConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user: any = null
) {
  try {
    const { nbjourMois } = req.body;

    if (!nbjourMois || isNaN(parseFloat(nbjourMois))) {
      return res.status(400).json({
        success: false,
        message:
          'Le nombre de jours par mois est requis et doit être un nombre valide',
      });
    }

    const nbjourMoisFloat = parseFloat(nbjourMois);

    if (nbjourMoisFloat <= 0 || nbjourMoisFloat > 31) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre de jours par mois doit être entre 1 et 31',
      });
    }

    // Vérifier s'il existe déjà une configuration
    const existingConfig = await prisma.congeconfig.findFirst();

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message:
          'Une configuration de congé existe déjà. Utilisez la modification pour la mettre à jour.',
      });
    }

    const configConge = await prisma.congeconfig.create({
      data: {
        nbjourMois: nbjourMoisFloat,
        usercreateid: user ? parseInt(user.id) : 1,
      },
    });

    return res.status(201).json({
      success: true,
      configConge: {
        id: configConge.id.toString(),
        nbjourMois: configConge.nbjourMois,
        datecreate: configConge.datecreate,
        dateupdate: configConge.dateupdate,
        usercreateid: configConge.usercreateid?.toString(),
        userupdateid: configConge.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error(
      'Erreur lors de la création de la configuration congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la configuration congé',
    });
  }
}

async function updateConfigConge(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  user: any = null
) {
  try {
    const { nbjourMois } = req.body;

    if (!nbjourMois || isNaN(parseFloat(nbjourMois))) {
      return res.status(400).json({
        success: false,
        message:
          'Le nombre de jours par mois est requis et doit être un nombre valide',
      });
    }

    const nbjourMoisFloat = parseFloat(nbjourMois);

    if (nbjourMoisFloat <= 0 || nbjourMoisFloat > 31) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre de jours par mois doit être entre 1 et 31',
      });
    }

    // Récupérer la configuration existante
    const existingConfig = await prisma.congeconfig.findFirst();

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message:
          "Aucune configuration de congé trouvée. Créez d'abord une configuration.",
      });
    }

    const configConge = await prisma.congeconfig.update({
      where: { id: existingConfig.id },
      data: {
        nbjourMois: nbjourMoisFloat,
        userupdateid: user ? parseInt(user.id) : 1,
      },
    });

    return res.status(200).json({
      success: true,
      configConge: {
        id: configConge.id.toString(),
        nbjourMois: configConge.nbjourMois,
        datecreate: configConge.datecreate,
        dateupdate: configConge.dateupdate,
        usercreateid: configConge.usercreateid?.toString(),
        userupdateid: configConge.userupdateid?.toString(),
      },
    });
  } catch (error: any) {
    console.error(
      'Erreur lors de la modification de la configuration congé:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la configuration congé',
    });
  }
}
