import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface UpdateProfileRequest {
  nom: string;
  prenom: string;
  mail?: string | null;
  phone?: string | null;
}

interface UpdateProfileResponse {
  success: boolean;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateProfileResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification manquant",
      });
    }

    const userProfile = await getUserFromToken(token);

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou utilisateur non trouvé',
      });
    }

    const { nom, prenom, mail, phone }: UpdateProfileRequest = req.body;

    if (!nom || !prenom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et le prénom sont requis',
      });
    }

    // Mettre à jour le profil
    await prisma.utilisateurs.update({
      where: { id: parseInt(userProfile.id) },
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        mail: mail?.trim() || null,
        phone: phone?.trim() || null,
        dateupdate: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
    });
  }
}
