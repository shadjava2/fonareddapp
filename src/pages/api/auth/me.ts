import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

interface MeResponse {
  success: boolean;
  user?: {
    id: number;
    nom: string | null;
    prenom: string | null;
    username: string;
    mail: string | null;
    phone: string | null;
    fkRole: number;
    initPassword: number;
    permissions: string[];
    services: number[];
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    // Extraire le token depuis les cookies
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(200).json({
        success: false,
        message: "Token d'authentification manquant",
      });
    }

    // Récupérer le profil utilisateur
    const userProfile = await getUserFromToken(token);

    if (!userProfile) {
      return res.status(200).json({
        success: false,
        message: 'Token invalide ou utilisateur non trouvé',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: parseInt(userProfile.id),
        nom: userProfile.nom,
        prenom: userProfile.prenom,
        username: userProfile.username,
        mail: userProfile.mail,
        phone: userProfile.phone,
        fkRole: parseInt(userProfile.fkRole || '0'),
        initPassword: userProfile.initPassword ? 1 : 0,
        permissions: userProfile.permissions,
        services: userProfile.services.map((s) => parseInt(s)),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return res.status(200).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
