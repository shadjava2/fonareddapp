import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface HikvisionEvent {
  device_ip: string;
  event_index: number;
  event_time: string;
  event_type: string;
  door_no?: number;
  direction?: string;
  card_no?: string;
  employee_no?: string;
  raw: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération des événements Hikvision...');

      const { page = 1, limit = 50, device_ip, employee_no } = req.query;

      const whereClause: any = {};

      if (device_ip) {
        whereClause.device_ip = device_ip;
      }

      if (employee_no) {
        whereClause.employee_no = employee_no;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [events, total] = await Promise.all([
        prisma.acs_events.findMany({
          where: whereClause,
          orderBy: {
            event_time: 'desc',
          },
          skip,
          take: Number(limit),
        }),
        prisma.acs_events.count({
          where: whereClause,
        }),
      ]);

      console.log(`🔍 ${events.length} événements trouvés sur ${total} total`);

      const formattedEvents = events.map((event) => ({
        id: event.id.toString(),
        device_ip: event.device_ip,
        event_index: event.event_index.toString(),
        event_time: event.event_time.toISOString(),
        event_type: event.event_type,
        door_no: event.door_no,
        direction: event.direction,
        card_no: event.card_no,
        employee_no: event.employee_no,
        raw: event.raw,
      }));

      return res.status(200).json({
        success: true,
        events: formattedEvents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        message: `${total} événements trouvés`,
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des événements:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des événements',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log("🔍 Réception d'un nouvel événement Hikvision...");

      const eventData: HikvisionEvent = req.body;

      console.log('🔍 Données reçues:', eventData);

      // Validation des données requises
      if (
        !eventData.device_ip ||
        !eventData.event_index ||
        !eventData.event_time ||
        !eventData.event_type
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Données manquantes: device_ip, event_index, event_time, event_type sont requis',
        });
      }

      // Vérifier si l'événement existe déjà
      const existingEvent = await prisma.acs_events.findFirst({
        where: {
          device_ip: eventData.device_ip,
          event_index: eventData.event_index,
        },
      });

      if (existingEvent) {
        console.log('🔍 Événement déjà existant, ignoré');
        return res.status(200).json({
          success: true,
          message: 'Événement déjà enregistré',
          event: existingEvent,
        });
      }

      // Créer le nouvel événement
      const newEvent = await prisma.acs_events.create({
        data: {
          device_ip: eventData.device_ip,
          event_index: BigInt(eventData.event_index),
          event_time: new Date(eventData.event_time),
          event_type: eventData.event_type,
          door_no: eventData.door_no,
          direction: eventData.direction,
          card_no: eventData.card_no,
          employee_no: eventData.employee_no,
          raw: eventData.raw,
        },
      });

      console.log('✅ Événement créé avec succès:', newEvent.id);

      return res.status(201).json({
        success: true,
        message: 'Événement enregistré avec succès',
        event: {
          id: newEvent.id.toString(),
          device_ip: newEvent.device_ip,
          event_index: newEvent.event_index.toString(),
          event_time: newEvent.event_time.toISOString(),
          event_type: newEvent.event_type,
          door_no: newEvent.door_no,
          direction: newEvent.direction,
          card_no: newEvent.card_no,
          employee_no: newEvent.employee_no,
        },
      });
    } catch (error: any) {
      console.error(
        "❌ Erreur lors de l'enregistrement de l'événement:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'enregistrement de l'événement",
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



