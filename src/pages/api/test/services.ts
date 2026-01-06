import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

type Data = {
  success: boolean;
  services?: any[];
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Ajouter les headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔍 Test API - Début de la récupération des services...');

    // Requête simplifiée pour tester
    const services = await prisma.services.findMany({
      orderBy: { id: 'asc' },
    });

    console.log('🔍 Test API - Services trouvés:', services.length);
    console.log('🔍 Test API - Premier service:', services[0]);

    const servicesFormatted = services.map((service) => ({
      id: service.id.toString(),
      designation: service.designation,
      fkSite: service.fkSite?.toString(),
      datecreate: service.datecreate,
      dateupdate: service.dateupdate,
    }));

    console.log('🔍 Test API - Services formatés:', servicesFormatted.length);

    return res.status(200).json({
      success: true,
      services: servicesFormatted,
    });
  } catch (error: any) {
    console.error('❌ Test API - Erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur: ' + error.message,
    });
  }
}
