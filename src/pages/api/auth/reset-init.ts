import { updateUserPassword } from '@/lib/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ResetInitRequest {
  username: string;
  password: string;
}

interface ResetInitResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResetInitResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    const { username, password }: ResetInitRequest = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur et mot de passe requis",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Mettre à jour le mot de passe
    const success = await updateUserPassword(username, password);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du mot de passe',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
    });
  }
}
