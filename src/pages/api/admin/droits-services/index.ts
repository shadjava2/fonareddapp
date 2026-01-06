import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 API Droits Services - Méthode: GET');
      console.log('🔍 Début de la récupération des droits services...');

      // Paramètres de pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50; // Augmenté à 50
      const skip = (page - 1) * limit;

      // Si all=true, charger toutes les données
      const loadAll = req.query.all === 'true';

      console.log('🔍 Paramètres de pagination:', { page, limit, skip });

      // Compter le total
      const total = await prisma.droits_services.count();
      console.log('🔍 Total des droits services:', total);

      const droitsServices = await prisma.droits_services.findMany({
        include: {
          utilisateur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              username: true,
            },
          },
          service: {
            select: {
              id: true,
              designation: true,
              site: {
                select: {
                  id: true,
                  designation: true,
                },
              },
            },
          },
        },
        orderBy: {
          datecreate: 'desc',
        },
        ...(loadAll ? {} : { skip, take: limit }),
      });

      console.log('🔍 Droits services trouvés:', droitsServices.length);

      const mappedDroitsServices = droitsServices.map((droit) => ({
        id: droit.id.toString(),
        fkUtilisateur: droit.fkUtilisateur?.toString(),
        fkService: droit.fkService?.toString(),
        utilisateur: droit.utilisateur,
        service: droit.service,
        datecreate: droit.datecreate.toISOString(),
        usercreateid: droit.usercreateid?.toString(),
      }));

      console.log('🔍 Droits services mappés:', mappedDroitsServices.length);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        success: true,
        droitsServices: mappedDroitsServices,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        message: `${mappedDroitsServices.length} droits services trouvés (page ${page}/${totalPages})`,
      });
    } catch (error) {
      console.error(
        '❌ Erreur lors de la récupération des droits services:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des droits services',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('🔍 API Droits Services - Méthode: POST');
      console.log('🔍 Données reçues:', req.body);

      const { fkUtilisateur, fkService } = req.body;

      console.log(
        '🔍 Données extraites - fkUtilisateur:',
        fkUtilisateur,
        'fkService:',
        fkService
      );
      console.log(
        '🔍 Types - fkUtilisateur:',
        typeof fkUtilisateur,
        'fkService:',
        typeof fkService
      );

      // Validation des données
      if (
        !fkUtilisateur ||
        fkUtilisateur === 0 ||
        fkUtilisateur === '0' ||
        fkUtilisateur === null ||
        fkUtilisateur === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "L'utilisateur est requis et doit être valide",
        });
      }

      if (
        !fkService ||
        fkService === 0 ||
        fkService === '0' ||
        fkService === null ||
        fkService === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Le service est requis et doit être valide',
        });
      }

      // Vérifier si la combinaison existe déjà
      const existingDroit = await prisma.droits_services.findFirst({
        where: {
          fkUtilisateur: BigInt(fkUtilisateur),
          fkService: BigInt(fkService),
        },
      });

      if (existingDroit) {
        return res.status(400).json({
          success: false,
          message: 'Ce droit service existe déjà',
        });
      }

      const newDroit = await prisma.droits_services.create({
        data: {
          fkUtilisateur: BigInt(fkUtilisateur),
          fkService: BigInt(fkService),
          usercreateid: BigInt(1), // Utilisateur fictif pour le développement
        },
        include: {
          utilisateur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              username: true,
            },
          },
          service: {
            select: {
              id: true,
              designation: true,
              site: {
                select: {
                  id: true,
                  designation: true,
                },
              },
            },
          },
        },
      });

      console.log('🔍 Droit service créé:', newDroit);

      res.status(201).json({
        success: true,
        message: 'Droit service créé avec succès',
        droitsService: {
          id: newDroit.id.toString(),
          fkUtilisateur: newDroit.fkUtilisateur?.toString(),
          fkService: newDroit.fkService?.toString(),
          utilisateur: newDroit.utilisateur,
          service: newDroit.service,
          datecreate: newDroit.datecreate.toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Erreur lors de la création du droit service:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du droit service',
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
