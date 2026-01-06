import { HikvisionDigestService } from '@/lib/hikvision-digest';
import { NextApiRequest, NextApiResponse } from 'next';
import { getHikvisionConfig } from './config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération des événements avec DIGEST...');

      const config = getHikvisionConfig();

      // Créer le service DIGEST
      const digestService = new HikvisionDigestService({
        ip: config.ip,
        username: config.username,
        password: config.password,
        port: config.port,
        useHttps: false,
      });

      // Récupérer les événements
      const events = await digestService.getEvents();

      console.log(`✅ ${events.length} événements récupérés avec DIGEST`);

      return res.status(200).json({
        success: true,
        events: events,
        message: `${events.length} événements récupérés`,
      });
    } catch (error: any) {
      console.error(
        '❌ Erreur lors de la récupération des événements DIGEST:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des événements',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



