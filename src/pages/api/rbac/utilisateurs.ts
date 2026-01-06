import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { createPaginatedResponse, getPaginationParams } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface UtilisateursResponse {
  success: boolean;
  data?: any[];
  pagination?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UtilisateursResponse>
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
  if (!user.permissions.includes('USER_MANAGE')) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    if (req.method === 'GET') {
      // Endpoint spécial pour l'autocomplete
      if (req.query.autocomplete === 'true') {
        const search = req.query.q as string || '';

        const utilisateurs = await prisma.utilisateurs.findMany({
          where: {
            locked: 0,
            OR: [
              { nom: { contains: search } },
              { prenom: { contains: search } },
              { username: { contains: search } },
            ],
          },
          select: {
            id: true,
            nom: true,
            prenom: true,
            username: true,
          },
          take: 20,
          orderBy: { nom: 'asc' },
        });

        return res.status(200).json(utilisateurs);
      }

      const { skip, take, page, size, search } = getPaginationParams(req.query);

      const where = search ? {
        OR: [
          { nom: { contains: search } },
          { prenom: { contains: search } },
          { username: { contains: search } },
          { mail: { contains: search } },
        ],
      } : {};

      const [utilisateurs, total] = await Promise.all([
        prisma.utilisateurs.findMany({
          where,
          skip,
          take,
          orderBy: { nom: 'asc' },
          include: {
            role: {
              select: {
                nom: true,
              },
            },
            site: {
              select: {
                nom: true,
              },
            },
            _count: {
              select: { droitsServices: true },
            },
          },
        }),
        prisma.utilisateurs.count({ where }),
      ]);

      // Retirer les mots de passe des données retournées
      const safeUtilisateurs = utilisateurs.map(u => ({
        ...u,
        mot_de_passe: undefined,
      }));

      const paginatedResponse = createPaginatedResponse(safeUtilisateurs, page, size, total);

      return res.status(200).json({
        success: true,
        ...paginatedResponse,
      });
    }

    if (req.method === 'POST') {
      const { nom, prenom, username, mail, phone, fkRole, fkSite } = req.body;

      if (!username || !fkRole) {
        return res.status(400).json({
          success: false,
          message: 'Le nom d\'utilisateur et le rôle sont requis',
        });
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.utilisateurs.findFirst({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Un utilisateur avec ce nom d\'utilisateur existe déjà',
        });
      }

      // Vérifier que le rôle existe
      const role = await prisma.roles.findUnique({
        where: { id: fkRole },
      });

      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Le rôle spécifié n\'existe pas',
        });
      }

      // Créer l'utilisateur avec un mot de passe par défaut
      const defaultPassword = 'password123'; // À changer en production
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      const utilisateur = await prisma.utilisateurs.create({
        data: {
          nom,
          prenom,
          username,
          mail,
          phone,
          fkRole,
          fkSite,
          mot_de_passe: hashedPassword,
          locked: 0,
          initPassword: 0, // L'utilisateur devra changer son mot de passe
        },
        include: {
          role: {
            select: {
              nom: true,
            },
          },
          site: {
            select: {
              nom: true,
            },
          },
          _count: {
            select: { droitsServices: true },
          },
        },
      });

      // Retirer le mot de passe des données retournées
      const safeUtilisateur = {
        ...utilisateur,
        mot_de_passe: undefined,
      };

      return res.status(201).json({
        success: true,
        data: [safeUtilisateur],
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API utilisateurs:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
