import {
  comparePassword,
  getTokenFromRequest,
  getUserFromToken,
  hashPassword,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChangePasswordResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    console.log('🔍 Headers cookies:', req.headers.cookie);
    const token = getTokenFromRequest(req);
    console.log('🔑 Token extrait:', token ? 'PRÉSENT' : 'MANQUANT');

    if (!token) {
      console.log('❌ Token manquant');
      return res.status(401).json({
        success: false,
        message: "Token d'authentification manquant",
      });
    }

    console.log('👤 Vérification du token...');
    const userProfile = await getUserFromToken(token);
    console.log('👤 Utilisateur trouvé:', userProfile ? 'OUI' : 'NON');

    if (!userProfile) {
      console.log('❌ Token invalide ou utilisateur non trouvé');
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou utilisateur non trouvé',
      });
    }

    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          'Le mot de passe actuel et le nouveau mot de passe sont requis',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Récupérer l'utilisateur avec le mot de passe actuel
    const user = await prisma.utilisateurs.findUnique({
      where: { id: parseInt(userProfile.id) },
      select: { mot_de_passe: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier le mot de passe actuel
    const isValidCurrentPassword = await comparePassword(
      currentPassword,
      user.mot_de_passe
    );
    if (!isValidCurrentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe actuel est incorrect',
      });
    }

    // Vérifier que le nouveau mot de passe est différent
    const isSamePassword = await comparePassword(
      newPassword,
      user.mot_de_passe
    );
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit être différent de l'actuel",
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await prisma.utilisateurs.update({
      where: { id: parseInt(userProfile.id) },
      data: {
        mot_de_passe: hashedNewPassword,
        dateupdate: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Mot de passe changé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
    });
  }
}
