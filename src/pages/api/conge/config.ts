import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ConfigResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfigResponse>
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
  if (!user.permissions.includes('CONGE_MANAGE')) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    if (req.method === 'GET') {
      // Récupérer la dernière configuration de congé
      const config = await prisma.congeconfig.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      // Si aucune config n'existe, créer une config par défaut
      if (!config) {
        const defaultConfig = await prisma.congeconfig.create({
          data: {
            nbjourMois: 2.5, // 2.5 jours par mois par défaut
          },
        });

        return res.status(200).json({
          success: true,
          data: defaultConfig,
        });
      }

      return res.status(200).json({
        success: true,
        data: config,
      });
    }

    if (req.method === 'PUT') {
      const { nbjourMois } = req.body;

      if (nbjourMois === undefined || nbjourMois < 0) {
        return res.status(400).json({
          success: false,
          message: 'Le nombre de jours par mois doit être un nombre positif',
        });
      }

      // Récupérer la dernière configuration
      const existingConfig = await prisma.congeconfig.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      let updatedConfig;

      if (existingConfig) {
        // Mettre à jour la configuration existante
        updatedConfig = await prisma.congeconfig.update({
          where: { id: existingConfig.id },
          data: { nbjourMois },
        });
      } else {
        // Créer une nouvelle configuration
        updatedConfig = await prisma.congeconfig.create({
          data: { nbjourMois },
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedConfig,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API config congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
