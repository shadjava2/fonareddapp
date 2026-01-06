import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { computeLeavePeriod } from '@/lib/calendrier';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ComputePeriodRequest {
  startDate: string;
  days: number;
}

interface ComputePeriodResponse {
  success: boolean;
  data?: {
    du: string;
    au: string;
    workingDays: number;
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComputePeriodResponse>
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
  if (!user.permissions.includes('CONGE_REQUEST')) {
    return res.status(403).json({ success: false, message: 'Permissions insuffisantes' });
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Méthode non autorisée',
      });
    }

    const { startDate, days }: ComputePeriodRequest = req.body;

    if (!startDate || !days || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Date de début et nombre de jours requis',
      });
    }

    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide',
      });
    }

    // Récupérer les données du calendrier pour la période de calcul
    // On récupère une plage large pour s'assurer d'avoir assez de données
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + (days * 2)); // Largeur de sécurité

    const calendarData = await prisma.calendrier.findMany({
      where: {
        d: {
          gte: startDateObj,
          lte: endDateObj,
        },
      },
      orderBy: { d: 'asc' },
    });

    // Si pas de données calendrier, utiliser la logique par défaut
    if (calendarData.length === 0) {
      // Calcul simple sans calendrier (jours de semaine uniquement)
      let currentDate = new Date(startDateObj);
      let workingDaysFound = 0;
      let endDate = new Date(startDateObj);

      while (workingDaysFound < days) {
        const dayOfWeek = currentDate.getDay();

        // Lundi à vendredi (1-5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workingDaysFound++;
          endDate = new Date(currentDate);
        }

        currentDate.setDate(currentDate.getDate() + 1);

        // Sécurité pour éviter les boucles infinies
        if (workingDaysFound === 0 && currentDate.getTime() - startDateObj.getTime() > 365 * 24 * 60 * 60 * 1000) {
          break;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          du: startDateObj.toISOString().split('T')[0],
          au: endDate.toISOString().split('T')[0],
          workingDays: workingDaysFound,
        },
      });
    }

    // Utiliser la fonction de calcul avec calendrier
    const result = computeLeavePeriod(startDateObj, days, calendarData);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erreur API compute-period:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
