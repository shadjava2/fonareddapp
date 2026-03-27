import { authenticateUser, generateToken } from '@/lib/auth';
import { recordSuccessfulLogin } from '@/lib/login-security';
import type { NextApiRequest, NextApiResponse } from 'next';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
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
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez remplir tous les champs obligatoires',
      });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Le nom d'utilisateur doit contenir au moins 3 caractères",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Authentifier l'utilisateur
    const userProfile = await authenticateUser(username.trim(), password);

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message:
          "Nom d'utilisateur ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.",
      });
    }

    // Générer le token JWT
    const token = generateToken({
      uid: userProfile.id,
      roleId: userProfile.fkRole || '0',
    });

    await recordSuccessfulLogin(req, userProfile);

    return res.status(200).json({
      success: true,
      token,
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
    console.error('Erreur lors de la connexion:', error);

    // Gestion spécifique des erreurs
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message:
          'Service temporairement indisponible. Veuillez réessayer plus tard.',
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: "Délai d'attente dépassé. Veuillez réessayer.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Une erreur technique s'est produite. Veuillez contacter l'administrateur.",
    });
  }
}
