import { NextApiRequest, NextApiResponse } from 'next';
import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { getHikvisionConfig } from './config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération des événements réels via interface web...');

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

      // Essayer différentes approches pour récupérer les événements
      const approaches = [
        {
          name: 'Approche 1: Event Search avec XML',
          method: async () => {
            const response = await digestService.hikGet('/ISAPI/Event/notification/alertStream', {
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
</EventNotificationAlert>`
            });
            return await response.text();
          }
        },
        {
          name: 'Approche 2: Event Search avec JSON',
          method: async () => {
            const response = await digestService.hikGet('/ISAPI/Event/notification/alertStream', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                searchID: '1',
                searchResultPosition: 0,
                maxResults: 100
              })
            });
            return await response.text();
          }
        },
        {
          name: 'Approche 3: Access Control Events',
          method: async () => {
            const response = await digestService.hikGet('/ISAPI/AccessControl/AcsEvent');
            return await response.text();
          }
        },
        {
          name: 'Approche 4: Event Search GET',
          method: async () => {
            const response = await digestService.hikGet('/ISAPI/Event/notification/alertStream?searchID=1&maxResults=100');
            return await response.text();
          }
        },
        {
          name: 'Approche 5: Event Search avec filtres',
          method: async () => {
            const response = await digestService.hikGet('/ISAPI/Event/notification/alertStream', {
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
      <eventType>Access Control Event</eventType>
      <startTime>2025-10-24 00:00:00</startTime>
      <endTime>2025-10-24 23:59:59</endTime>
    </searchResultItem>
  </searchResultList>
</EventNotificationAlert>`
            });
            return await response.text();
          }
        }
      ];

      const results = [];

      for (const approach of approaches) {
        try {
          console.log(`🔍 Test: ${approach.name}`);

          const data = await approach.method();

          // Analyser les données pour extraire les événements
          let events = [];
          let eventCount = 0;

          // Compter les événements dans les données
          if (data.includes('Employee ID') || data.includes('employeeID')) {
            eventCount = (data.match(/Employee ID|employeeID/g) || []).length;
          } else if (data.includes('EventNotificationAlert')) {
            eventCount = (data.match(/EventNotificationAlert/g) || []).length;
          } else if (data.includes('AcsEvent')) {
            eventCount = (data.match(/AcsEvent/g) || []).length;
          }

          results.push({
            name: approach.name,
            success: true,
            dataLength: data.length,
            eventCount: eventCount,
            dataPreview: data.substring(0, 500),
            hasEvents: eventCount > 0,
            fullData: data
          });

          console.log(`✅ ${approach.name}: ${data.length} chars, ${eventCount} événements détectés`);

          // Si on trouve des événements, on peut s'arrêter ici
          if (eventCount > 0) {
            console.log(`🎉 Événements trouvés avec ${approach.name} !`);
            break;
          }
        } catch (error: any) {
          results.push({
            name: approach.name,
            success: false,
            error: error.message,
            hasEvents: false
          });

          console.log(`❌ ${approach.name}: ${error.message}`);
        }
      }

      // Analyser les résultats pour trouver la meilleure approche
      const successfulApproaches = results.filter(r => r.success && r.hasEvents);
      const bestApproach = successfulApproaches.length > 0 ? successfulApproaches[0] : null;

      console.log('✅ Test des approches terminé');

      return res.status(200).json({
        success: true,
        results,
        bestApproach: bestApproach,
        totalEvents: bestApproach ? bestApproach.eventCount : 0,
        message: bestApproach
          ? `Meilleure approche trouvée: ${bestApproach.name} (${bestApproach.eventCount} événements)`
          : 'Aucune approche n\'a trouvé d\'événements'
      });
    } catch (error: any) {
      console.error('❌ Erreur lors du test des approches:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du test des approches',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



