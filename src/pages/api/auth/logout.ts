import type { NextApiRequest, NextApiResponse } from 'next';

interface LogoutResponse {
  success: boolean;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    // Nettoyer le cookie côté serveur
    res.setHeader(
      'Set-Cookie',
      'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict'
    );

    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error: any) {
    console.error('Erreur lors de la déconnexion:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
}
