import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { createPaginatedResponse, getPaginationParams } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ServicesResponse {
  success: boolean;
  data?: any[];
  pagination?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServicesResponse>
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
      // Endpoint spécial pour l'autocomplete
      if (req.query.autocomplete === 'true') {
        const search = req.query.q as string || '';

        const services = await prisma.services.findMany({
          where: {
            actif: 1,
            nom: {
              contains: search,
            },
          },
          select: {
            id: true,
            nom: true,
          },
          take: 20,
          orderBy: { nom: 'asc' },
        });

        return res.status(200).json(services);
      }

      const { skip, take, page, size, search } = getPaginationParams(req.query);

      const where = search ? {
        OR: [
          { nom: { contains: search } },
          { description: { contains: search } },
        ],
      } : {};

      const [services, total] = await Promise.all([
        prisma.services.findMany({
          where,
          skip,
          take,
          orderBy: { nom: 'asc' },
          include: {
            _count: {
              select: { droitsServices: true },
            },
          },
        }),
        prisma.services.count({ where }),
      ]);

      const paginatedResponse = createPaginatedResponse(services, page, size, total);

      return res.status(200).json({
        success: true,
        ...paginatedResponse,
      });
    }

    if (req.method === 'POST') {
      const { nom, description, actif = 1 } = req.body;

      if (!nom) {
        return res.status(400).json({
          success: false,
          message: 'Le nom du service est requis',
        });
      }

      // Vérifier si le service existe déjà
      const existingService = await prisma.services.findFirst({
        where: { nom },
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Un service avec ce nom existe déjà',
        });
      }

      const service = await prisma.services.create({
        data: {
          nom,
          description,
          actif,
        },
        include: {
          _count: {
            select: { droitsServices: true },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: [service],
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API services:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
