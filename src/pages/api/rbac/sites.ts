import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { createPaginatedResponse, getPaginationParams } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface SitesResponse {
  success: boolean;
  data?: any[];
  pagination?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SitesResponse>
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
  if (!user.permissions.includes('SITE_MANAGE')) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    if (req.method === 'GET') {
      // Endpoint spécial pour l'autocomplete
      if (req.query.autocomplete === 'true') {
        const search = req.query.q as string || '';

        const sites = await prisma.sites.findMany({
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

        return res.status(200).json(sites);
      }

      const { skip, take, page, size, search } = getPaginationParams(req.query);

      const where = search ? {
        OR: [
          { nom: { contains: search } },
          { adresse: { contains: search } },
        ],
      } : {};

      const [sites, total] = await Promise.all([
        prisma.sites.findMany({
          where,
          skip,
          take,
          orderBy: { nom: 'asc' },
          include: {
            _count: {
              select: { utilisateurs: true },
            },
          },
        }),
        prisma.sites.count({ where }),
      ]);

      const paginatedResponse = createPaginatedResponse(sites, page, size, total);

      return res.status(200).json({
        success: true,
        ...paginatedResponse,
      });
    }

    if (req.method === 'POST') {
      const { nom, adresse, actif = 1 } = req.body;

      if (!nom) {
        return res.status(400).json({
          success: false,
          message: 'Le nom du site est requis',
        });
      }

      // Vérifier si le site existe déjà
      const existingSite = await prisma.sites.findFirst({
        where: { nom },
      });

      if (existingSite) {
        return res.status(400).json({
          success: false,
          message: 'Un site avec ce nom existe déjà',
        });
      }

      const site = await prisma.sites.create({
        data: {
          nom,
          adresse,
          actif,
        },
        include: {
          _count: {
            select: { utilisateurs: true },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: [site],
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API sites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
