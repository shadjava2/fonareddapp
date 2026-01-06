import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Diagnostic complet du lecteur Hikvision...');

      const config = getHikvisionConfig();

      // Créer le service DIGEST
      const digestService = new HikvisionDigestService({
        ip: config.ip,
        username: config.username,
        password: config.password,
        port: config.port,
        useHttps: false,
      });

      const diagnostic = {
        config: {
          ip: config.ip,
          username: config.username,
          port: config.port,
        },
        tests: [] as any[],
        summary: {
          connectivity: false,
          deviceInfo: false,
          events: false,
          users: false,
        },
      };

      // Test 1: Connectivité de base
      try {
        console.log('🔍 Test 1: Connectivité de base...');
        const isConnected = await digestService.checkConnectivity();
        diagnostic.tests.push({
          name: 'Connectivité de base',
          success: isConnected,
          message: isConnected ? 'Connectivité OK' : 'Connectivité échouée',
        });
        diagnostic.summary.connectivity = isConnected;
      } catch (error: any) {
        diagnostic.tests.push({
          name: 'Connectivité de base',
          success: false,
          error: error.message,
        });
      }

      // Test 2: Informations du dispositif
      try {
        console.log('🔍 Test 2: Informations du dispositif...');
        const deviceInfo = await digestService.getDeviceInfo();
        diagnostic.tests.push({
          name: 'Informations du dispositif',
          success: true,
          message: 'Informations récupérées',
          data: deviceInfo,
        });
        diagnostic.summary.deviceInfo = true;
      } catch (error: any) {
        diagnostic.tests.push({
          name: 'Informations du dispositif',
          success: false,
          error: error.message,
        });
      }

      // Test 3: Événements d'accès
      try {
        console.log("🔍 Test 3: Événements d'accès...");
        const events = await digestService.getEvents();
        diagnostic.tests.push({
          name: "Événements d'accès",
          success: true,
          message: `${events.length} événements trouvés`,
          count: events.length,
          data: events.slice(0, 3), // Premiers 3 événements pour debug
        });
        diagnostic.summary.events = events.length > 0;
      } catch (error: any) {
        diagnostic.tests.push({
          name: "Événements d'accès",
          success: false,
          error: error.message,
        });
      }

      // Test 4: Utilisateurs ACS
      try {
        console.log('🔍 Test 4: Utilisateurs ACS...');
        const users = await digestService.getUsers();
        diagnostic.tests.push({
          name: 'Utilisateurs ACS',
          success: true,
          message: `${users.length} utilisateurs trouvés`,
          count: users.length,
          data: users.slice(0, 3), // Premiers 3 utilisateurs pour debug
        });
        diagnostic.summary.users = users.length > 0;
      } catch (error: any) {
        diagnostic.tests.push({
          name: 'Utilisateurs ACS',
          success: false,
          error: error.message,
        });
      }

      // Test 5: Endpoints alternatifs pour les événements
      const eventEndpoints = [
        '/ISAPI/AccessControl/AcsEvent',
        '/ISAPI/AccessControl/AcsEvent?format=json',
        '/ISAPI/AccessControl/AcsEvent?format=xml',
        '/ISAPI/Event/notification/alertStream',
        '/ISAPI/System/status',
      ];

      for (const endpoint of eventEndpoints) {
        try {
          console.log(`🔍 Test endpoint: ${endpoint}`);
          const response = await digestService.hikGet(endpoint);
          const text = await response.text();

          diagnostic.tests.push({
            name: `Endpoint ${endpoint}`,
            success: response.ok,
            status: response.status,
            message: response.ok
              ? 'Endpoint accessible'
              : 'Endpoint non accessible',
            data: text.substring(0, 200), // Premiers 200 caractères
          });
        } catch (error: any) {
          diagnostic.tests.push({
            name: `Endpoint ${endpoint}`,
            success: false,
            error: error.message,
          });
        }
      }

      console.log('✅ Diagnostic terminé');

      return res.status(200).json({
        success: true,
        diagnostic,
        message: 'Diagnostic complet effectué',
      });
    } catch (error: any) {
      console.error('❌ Erreur lors du diagnostic:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du diagnostic',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



