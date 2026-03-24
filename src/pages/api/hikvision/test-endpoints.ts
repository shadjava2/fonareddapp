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

      const pad = (n: number) => String(n).padStart(2, '0');
      const toHikDate = (d: Date) => {
        const tz = -d.getTimezoneOffset();
        const sign = tz >= 0 ? '+' : '-';
        const tzH = Math.floor(Math.abs(tz) / 60);
        const tzM = Math.abs(tz) % 60;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(tzH)}:${pad(tzM)}`;
      };
      const now = new Date();
      const startStr = toHikDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const endStr = toHikDate(now);
      const acsEventBody = {
        AcsEventCond: {
          searchID: '1',
          searchResultPosition: 0,
          maxResults: 100,
          major: 0,
          minor: 0,
          startTime: startStr,
          endTime: endStr,
          timeReverseOrder: true,
        },
      };

      // Endpoints en GET
      const getEndpoints = [
        { name: 'Informations du dispositif', path: '/ISAPI/System/deviceInfo', description: 'Informations de base du lecteur' },
        { name: 'Statut du système', path: '/ISAPI/System/status', description: 'Statut du système' },
        { name: 'Utilisateurs ACS', path: '/ISAPI/AccessControl/UserInfo/Search', description: "Recherche d'utilisateurs" },
        { name: "Flux d'alertes", path: '/ISAPI/Event/notification/alertStream', description: "Flux d'événements (souvent 404 sur DS-K1T)" },
      ];

      for (const endpoint of getEndpoints) {
        try {
          console.log(`🔍 Test GET: ${endpoint.name}`);
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
        } catch (error: any) {
          results.push({
            name: endpoint.name,
            path: endpoint.path,
            description: endpoint.description,
            success: false,
            error: error.message,
            status: 'ERROR',
          });
        }
      }

      // AcsEvent en POST (DS-K1T321MFWX n'accepte pas GET)
      try {
        console.log('🔍 Test POST: Événements ACS');
        const data = await digestService.hikPostJSON('/ISAPI/AccessControl/AcsEvent?format=json', acsEventBody);
        const text = JSON.stringify(data);
        results.push({
          name: 'Événements ACS (POST)',
          path: '/ISAPI/AccessControl/AcsEvent?format=json',
          description: "Événements d'accès (POST obligatoire sur DS-K1T)",
          success: true,
          status: 200,
          statusText: 'OK',
          contentType: 'application/json',
          dataLength: text.length,
          dataPreview: text.substring(0, 200),
          fullData: text,
        });
      } catch (error: any) {
        results.push({
          name: 'Événements ACS (POST)',
          path: '/ISAPI/AccessControl/AcsEvent?format=json',
          description: "Événements d'accès (POST obligatoire sur DS-K1T)",
          success: false,
          error: error.message,
          status: 'ERROR',
        });
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



