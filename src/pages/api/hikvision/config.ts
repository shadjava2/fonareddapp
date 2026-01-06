import { NextApiRequest, NextApiResponse } from 'next';

interface HikvisionConfig {
  ip: string;
  username: string;
  password: string;
  port: number;
}

// Configuration par défaut
let hikvisionConfig: HikvisionConfig = {
  ip: '192.168.10.50',
  username: 'admin',
  password: 'Fonaredd',
  port: 80,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération de la configuration Hikvision...');

      return res.status(200).json({
        success: true,
        config: hikvisionConfig,
        message: 'Configuration récupérée',
      });
    } catch (error: any) {
      console.error(
        '❌ Erreur lors de la récupération de la configuration:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la configuration',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('🔍 Mise à jour de la configuration Hikvision...');

      const { ip, username, password, port } = req.body;

      // Validation des données
      if (!ip || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "IP, nom d'utilisateur et mot de passe sont requis",
        });
      }

      // Mettre à jour la configuration
      hikvisionConfig = {
        ip: ip,
        username: username,
        password: password,
        port: port || 80,
      };

      console.log('✅ Configuration Hikvision mise à jour:', {
        ip: hikvisionConfig.ip,
        username: hikvisionConfig.username,
        port: hikvisionConfig.port,
      });

      return res.status(200).json({
        success: true,
        config: {
          ip: hikvisionConfig.ip,
          username: hikvisionConfig.username,
          port: hikvisionConfig.port,
          // Ne pas retourner le mot de passe
        },
        message: 'Configuration mise à jour avec succès',
      });
    } catch (error: any) {
      console.error(
        '❌ Erreur lors de la mise à jour de la configuration:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la configuration',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}

// Fonction pour obtenir la configuration actuelle
export function getHikvisionConfig(): HikvisionConfig {
  return hikvisionConfig;
}
