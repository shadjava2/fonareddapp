import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface DroitsServicesResponse {
  success: boolean;
  data?: any[];
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DroitsServicesResponse>
) {
  // Vérifier l'authentification
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  // Vérifier les permissions
  if (!user.permissions.includes('SERVICE_MANAGE')) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    if (req.method === 'GET') {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur requis',
        });
      }

      // Récupérer les droits de services pour l'utilisateur
      const droitsServices = await prisma.droits_services.findMany({
        where: { fkUser: parseInt(userId) },
        include: {
          service: {
            select: {
              id: true,
              nom: true,
              description: true,
              actif: true,
            },
          },
        },
        orderBy: {
          service: {
            nom: 'asc',
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: droitsServices,
      });
    }

    if (req.method === 'POST') {
      const { userId, serviceIds } = req.body;

      if (!userId || !Array.isArray(serviceIds)) {
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur et liste des services requis',
        });
      }

      // Vérifier que l'utilisateur existe
      const utilisateur = await prisma.utilisateurs.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      // Vérifier que tous les services existent
      const services = await prisma.services.findMany({
        where: {
          id: { in: serviceIds.map(id => parseInt(id)) },
        },
      });

      if (services.length !== serviceIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Un ou plusieurs services n\'existent pas',
        });
      }

      // Supprimer les anciens droits
      await prisma.droits_services.deleteMany({
        where: { fkUser: parseInt(userId) },
      });

      // Créer les nouveaux droits
      const newDroits = serviceIds.map(serviceId => ({
        fkUser: parseInt(userId),
        fkService: parseInt(serviceId),
      }));

      await prisma.droits_services.createMany({
        data: newDroits,
      });

      // Récupérer les droits mis à jour
      const updatedDroits = await prisma.droits_services.findMany({
        where: { fkUser: parseInt(userId) },
        include: {
          service: {
            select: {
              id: true,
              nom: true,
              description: true,
              actif: true,
            },
          },
        },
        orderBy: {
          service: {
            nom: 'asc',
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: updatedDroits,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API droits-services:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
