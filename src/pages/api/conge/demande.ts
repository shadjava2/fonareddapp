import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { createPaginatedResponse, getPaginationParams } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface DemandeResponse {
  success: boolean;
  data?: any[];
  pagination?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DemandeResponse>
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

  try {
    if (req.method === 'GET') {
      // Vérifier les permissions pour voir toutes les demandes
      const canViewAll = user.permissions.includes('CONGE_MANAGE');

      const { skip, take, page, size, search } = getPaginationParams(req.query);

      // Construire la condition where
      let where: any = {};

      if (search) {
        where.OR = [
          { motif: { contains: search } },
          { statut: { contains: search } },
          { user: { nom: { contains: search } } },
          { user: { prenom: { contains: search } } },
        ];
      }

      // Si l'utilisateur ne peut pas voir toutes les demandes, filtrer par son ID
      if (!canViewAll) {
        where.fkUser = user.id;
      }

      const [demandes, total] = await Promise.all([
        prisma.congedemande.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                username: true,
              },
            },
          },
        }),
        prisma.congedemande.count({ where }),
      ]);

      const paginatedResponse = createPaginatedResponse(demandes, page, size, total);

      return res.status(200).json({
        success: true,
        ...paginatedResponse,
      });
    }

    if (req.method === 'POST') {
      // Vérifier les permissions pour créer une demande
      if (!user.permissions.includes('CONGE_REQUEST')) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes pour créer une demande',
        });
      }

      const { nbrjour, dateDebut, dateFin, motif } = req.body;

      if (!nbrjour || !dateDebut || !dateFin) {
        return res.status(400).json({
          success: false,
          message: 'Nombre de jours, date de début et date de fin requis',
        });
      }

      const debutDate = new Date(dateDebut);
      const finDate = new Date(dateFin);

      if (isNaN(debutDate.getTime()) || isNaN(finDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Format de date invalide',
        });
      }

      if (debutDate >= finDate) {
        return res.status(400).json({
          success: false,
          message: 'La date de début doit être antérieure à la date de fin',
        });
      }

      // Vérifier le solde de congé de l'utilisateur
      const currentYear = new Date().getFullYear();
      const solde = await prisma.congesolde.findFirst({
        where: {
          fkUser: user.id,
          annee: currentYear,
        },
      });

      if (!solde) {
        return res.status(400).json({
          success: false,
          message: 'Solde de congé non trouvé pour l\'année en cours',
        });
      }

      const soldeRestant = solde.solde - solde.consommé;
      if (soldeRestant < nbrjour) {
        return res.status(400).json({
          success: false,
          message: `Solde insuffisant. Solde disponible: ${soldeRestant} jours`,
        });
      }

      // Vérifier s'il y a des conflits avec d'autres demandes
      const conflits = await prisma.congedemande.findMany({
        where: {
          fkUser: user.id,
          statut: {
            in: ['EN_ATTENTE', 'APPROUVEE'],
          },
          OR: [
            {
              AND: [
                { dateDebut: { lte: finDate } },
                { dateFin: { gte: debutDate } },
              ],
            },
          ],
        },
      });

      if (conflits.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Conflit avec une autre demande de congé existante',
        });
      }

      const demande = await prisma.congedemande.create({
        data: {
          fkUser: user.id,
          nbrjour: parseInt(nbrjour),
          dateDebut: debutDate,
          dateFin: finDate,
          motif,
          statut: 'EN_ATTENTE',
        },
        include: {
          user: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              username: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: [demande],
      });
    }

    if (req.method === 'PUT') {
      // Vérifier les permissions pour modifier une demande
      if (!user.permissions.includes('CONGE_MANAGE')) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes pour modifier une demande',
        });
      }

      const { id, statut } = req.body;

      if (!id || !statut) {
        return res.status(400).json({
          success: false,
          message: 'ID et statut requis',
        });
      }

      const validStatuses = ['EN_ATTENTE', 'APPROUVEE', 'REJETEE'];
      if (!validStatuses.includes(statut)) {
        return res.status(400).json({
          success: false,
          message: 'Statut invalide',
        });
      }

      const existingDemande = await prisma.congedemande.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: true,
        },
      });

      if (!existingDemande) {
        return res.status(404).json({
          success: false,
          message: 'Demande non trouvée',
        });
      }

      const updatedDemande = await prisma.congedemande.update({
        where: { id: parseInt(id) },
        data: { statut },
        include: {
          user: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              username: true,
            },
          },
        },
      });

      // Si la demande est approuvée, mettre à jour le solde
      if (statut === 'APPROUVEE' && existingDemande.statut !== 'APPROUVEE') {
        const currentYear = new Date().getFullYear();
        await prisma.congesolde.upsert({
          where: {
            fkUser_annee: {
              fkUser: existingDemande.fkUser,
              annee: currentYear,
            },
          },
          update: {
            consommé: {
              increment: existingDemande.nbrjour,
            },
          },
          create: {
            fkUser: existingDemande.fkUser,
            annee: currentYear,
            solde: 0,
            consommé: existingDemande.nbrjour,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: [updatedDemande],
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  } catch (error) {
    console.error('Erreur API demande congé:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
