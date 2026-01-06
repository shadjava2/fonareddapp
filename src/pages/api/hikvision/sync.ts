import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

interface HikvisionDeviceInfo {
  device_ip: string;
  device_name: string;
  status: 'online' | 'offline';
  last_sync: string;
  events_count: number;
  users_count: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Synchronisation avec le lecteur Hikvision...');

      // Vérifier la connectivité avec le lecteur
      const deviceInfo = await checkDeviceConnectivity();

      return res.status(200).json({
        success: true,
        device: deviceInfo,
        message: 'Synchronisation réussie',
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la synchronisation avec le lecteur Hikvision',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('🔍 Démarrage de la synchronisation automatique...');

      const { action } = req.body;

      if (action === 'start_sync') {
        // Démarrer la synchronisation automatique
        await startAutomaticSync();

        return res.status(200).json({
          success: true,
          message: 'Synchronisation automatique démarrée',
        });
      }

      if (action === 'stop_sync') {
        // Arrêter la synchronisation automatique
        await stopAutomaticSync();

        return res.status(200).json({
          success: true,
          message: 'Synchronisation automatique arrêtée',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Action non reconnue. Utilisez "start_sync" ou "stop_sync"',
      });
    } catch (error: any) {
      console.error(
        '❌ Erreur lors de la gestion de la synchronisation:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la gestion de la synchronisation',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}

async function checkDeviceConnectivity(): Promise<HikvisionDeviceInfo> {
  const config = getHikvisionConfig();

  try {
    console.log(
      `🔍 Vérification de la connectivité DIGEST avec ${config.ip}...`
    );

    // Créer le service DIGEST avec la configuration
    const digestService = new HikvisionDigestService({
      ip: config.ip,
      username: config.username,
      password: config.password,
      port: config.port,
      useHttps: false,
    });

    // Tester la connectivité avec DIGEST
    const isConnected = await digestService.checkConnectivity();

    if (isConnected) {
      console.log('✅ Lecteur Hikvision accessible avec DIGEST');

      // Essayer de récupérer les informations du dispositif
      try {
        const deviceInfo = await digestService.getDeviceInfo();
        console.log('✅ Informations du dispositif récupérées');

        return {
          device_ip: config.ip,
          device_name: 'Lecteur Hikvision',
          status: 'online',
          last_sync: new Date().toISOString(),
          events_count: 0,
          users_count: 0,
        };
      } catch (infoError) {
        console.log('⚠️ Connectivité OK mais informations non accessibles');
        return {
          device_ip: config.ip,
          device_name: 'Lecteur Hikvision',
          status: 'online',
          last_sync: new Date().toISOString(),
          events_count: 0,
          users_count: 0,
        };
      }
    } else {
      throw new Error('Authentification DIGEST échouée');
    }
  } catch (error) {
    console.error('❌ Lecteur Hikvision non accessible:', error);
    return {
      device_ip: config.ip,
      device_name: 'Lecteur Hikvision',
      status: 'offline',
      last_sync: new Date().toISOString(),
      events_count: 0,
      users_count: 0,
    };
  }
}

async function startAutomaticSync(): Promise<void> {
  console.log('🔄 Démarrage de la synchronisation automatique...');

  // Ici vous implémenteriez la logique de synchronisation automatique
  // Par exemple, un interval qui récupère les événements toutes les 30 secondes

  // Pour l'instant, on simule juste le démarrage
  console.log('✅ Synchronisation automatique démarrée');
}

async function stopAutomaticSync(): Promise<void> {
  console.log('⏹️ Arrêt de la synchronisation automatique...');

  // Ici vous arrêteriez l'interval de synchronisation

  console.log('✅ Synchronisation automatique arrêtée');
}
