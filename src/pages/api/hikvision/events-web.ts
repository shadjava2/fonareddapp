import { NextApiRequest, NextApiResponse } from 'next';
import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { getHikvisionConfig } from './config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération des événements via interface web Hikvision...');

      const config = await getHikvisionConfig();

      // Créer le service DIGEST
      const digestService = new HikvisionDigestService({
        ip: config.ip,
        username: config.username,
        password: config.password,
        port: config.port,
        useHttps: false,
        timezone_offset_minutes: config.timezone_offset_minutes ?? undefined,
      });

      const results = [];

      // Endpoints spécifiques utilisés par l'interface web Hikvision
      const webEndpoints = [
        {
          name: 'Event Search (POST)',
          method: 'POST',
          path: '/ISAPI/Event/notification/alertStream',
          body: {
            searchID: '1',
            searchResultPosition: 0,
            maxResults: 100,
            searchResultList: {
              searchResultItem: []
            }
          }
        },
        {
          name: 'Event Search (GET)',
          method: 'GET',
          path: '/ISAPI/Event/notification/alertStream'
        },
        {
          name: 'Access Control Events',
          method: 'GET',
          path: '/ISAPI/AccessControl/AcsEvent'
        },
        {
          name: 'Event Search avec paramètres',
          method: 'GET',
          path: '/ISAPI/Event/notification/alertStream?searchID=1&maxResults=100'
        },
        {
          name: 'Event Search XML',
          method: 'POST',
          path: '/ISAPI/Event/notification/alertStream',
          body: `<?xml version="1.0" encoding="UTF-8"?>
<EventNotificationAlert>
  <searchID>1</searchID>
  <searchResultPosition>0</searchResultPosition>
  <maxResults>100</maxResults>
</EventNotificationAlert>`
        }
      ];

      for (const endpoint of webEndpoints) {
        try {
          console.log(`🔍 Test: ${endpoint.name}`);

          let response;
          if (endpoint.method === 'POST') {
            response = await digestService.hikGet(endpoint.path, {
              method: 'POST',
              headers: {
                'Content-Type': endpoint.body && typeof endpoint.body === 'string'
                  ? 'application/xml'
                  : 'application/json',
              },
              body: typeof endpoint.body === 'string'
                ? endpoint.body
                : JSON.stringify(endpoint.body)
            });
          } else {
            response = await digestService.hikGet(endpoint.path);
          }

          const text = await response.text();

          results.push({
            name: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            dataLength: text.length,
            dataPreview: text.substring(0, 500),
            fullData: text
          });

          console.log(`✅ ${endpoint.name}: ${response.status} (${text.length} chars)`);
        } catch (error: any) {
          results.push({
            name: endpoint.name,
            path: endpoint.path,
            method: endpoint.method,
            success: false,
            error: error.message,
            status: 'ERROR'
          });

          console.log(`❌ ${endpoint.name}: ${error.message}`);
        }
      }

      // Test spécial pour récupérer les événements comme l'interface web
      try {
        console.log('🔍 Test spécial: Recherche d\'événements avec paramètres web...');

        // Essayer de simuler la requête de l'interface web
        const searchResponse = await digestService.hikGet('/ISAPI/Event/notification/alertStream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml',
          },
          body: `<?xml version="1.0" encoding="UTF-8"?>
<EventNotificationAlert>
  <searchID>1</searchID>
  <searchResultPosition>0</searchResultPosition>
  <maxResults>100</maxResults>
  <searchResultList>
    <searchResultItem>
      <employeeID></employeeID>
      <name></name>
      <cardNo></cardNo>
      <eventType>Access Control Event</eventType>
      <startTime>2025-10-24 00:00:00</startTime>
      <endTime>2025-10-24 23:59:59</endTime>
    </searchResultItem>
  </searchResultList>
</EventNotificationAlert>`
        });

        const searchText = await searchResponse.text();

        results.push({
          name: 'Recherche d\'événements (simulation interface web)',
          path: '/ISAPI/Event/notification/alertStream',
          method: 'POST',
          success: searchResponse.ok,
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          contentType: searchResponse.headers.get('content-type'),
          dataLength: searchText.length,
          dataPreview: searchText.substring(0, 1000),
          fullData: searchText
        });

        console.log(`✅ Recherche d'événements: ${searchResponse.status} (${searchText.length} chars)`);
      } catch (error: any) {
        results.push({
          name: 'Recherche d\'événements (simulation interface web)',
          path: '/ISAPI/Event/notification/alertStream',
          method: 'POST',
          success: false,
          error: error.message,
          status: 'ERROR'
        });

        console.log(`❌ Recherche d'événements: ${error.message}`);
      }

      console.log('✅ Test des endpoints web terminé');

      return res.status(200).json({
        success: true,
        results,
        message: 'Test des endpoints web terminé'
      });
    } catch (error: any) {
      console.error('❌ Erreur lors du test des endpoints web:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du test des endpoints web',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



