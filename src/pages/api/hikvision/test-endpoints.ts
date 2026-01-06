import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Test des endpoints Hikvision...');

      const config = getHikvisionConfig();

      // Créer le service DIGEST
      const digestService = new HikvisionDigestService({
        ip: config.ip,
        username: config.username,
        password: config.password,
        port: config.port,
        useHttps: false,
      });

      const results = [];

      // Test des endpoints principaux
      const endpoints = [
        {
          name: 'Informations du dispositif',
          path: '/ISAPI/System/deviceInfo',
          description: 'Informations de base du lecteur',
        },
        {
          name: 'Statut du système',
          path: '/ISAPI/System/status',
          description: 'Statut du système',
        },
        {
          name: 'Événements ACS (JSON)',
          path: '/ISAPI/AccessControl/AcsEvent?format=json',
          description: "Événements d'accès en JSON",
        },
        {
          name: 'Événements ACS (XML)',
          path: '/ISAPI/AccessControl/AcsEvent',
          description: "Événements d'accès en XML",
        },
        {
          name: 'Utilisateurs ACS',
          path: '/ISAPI/AccessControl/UserInfo/Search',
          description: "Recherche d'utilisateurs",
        },
        {
          name: "Flux d'alertes",
          path: '/ISAPI/Event/notification/alertStream',
          description: "Flux d'événements en temps réel",
        },
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Test: ${endpoint.name}`);

          const response = await digestService.hikGet(endpoint.path);
          const text = await response.text();

          results.push({
            name: endpoint.name,
            path: endpoint.path,
            description: endpoint.description,
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            dataLength: text.length,
            dataPreview: text.substring(0, 200),
            fullData: text,
          });

          console.log(
            `✅ ${endpoint.name}: ${response.status} (${text.length} chars)`
          );
        } catch (error: any) {
          results.push({
            name: endpoint.name,
            path: endpoint.path,
            description: endpoint.description,
            success: false,
            error: error.message,
            status: 'ERROR',
          });

          console.log(`❌ ${endpoint.name}: ${error.message}`);
        }
      }

      console.log('✅ Test des endpoints terminé');

      return res.status(200).json({
        success: true,
        results,
        message: 'Test des endpoints terminé',
      });
    } catch (error: any) {
      console.error('❌ Erreur lors du test des endpoints:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du test des endpoints',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



