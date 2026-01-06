import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface DashboardData {
  success: boolean;
  data?: {
    services: any[];
    roles: any[];
    sites: any[];
    users: any[];
    stats: {
      totalServices: number;
      totalRoles: number;
      totalSites: number;
      totalUsers: number;
      servicesWithSite: number;
      servicesWithoutSite: number;
    };
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardData>
) {
  try {
    console.log('🔍 API Dashboard - Méthode:', req.method);

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        message: 'Méthode non autorisée',
      });
    }

    console.log('🔍 Chargement de toutes les données...');

    // Charger toutes les données en parallèle
    const [services, roles, sites, users] = await Promise.all([
      prisma.services.findMany({
        include: {
          site: {
            select: {
              id: true,
              designation: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.roles.findMany({
        orderBy: { id: 'asc' },
      }),
      prisma.sites.findMany({
        orderBy: { id: 'asc' },
      }),
      prisma.utilisateurs.findMany({
        include: {
          role: {
            select: {
              id: true,
              nom: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    console.log('🔍 Données chargées:', {
      services: services.length,
      roles: roles.length,
      sites: sites.length,
      users: users.length,
    });

    // Mapper les services
    const servicesMapped = services.map((service) => ({
      id: service.id.toString(),
      designation: service.designation,
      fkSite: service.fkSite?.toString(),
      site: service.site
        ? {
            id: service.site.id.toString(),
            designation: service.site.designation,
          }
        : null,
      datecreate: service.datecreate,
      dateupdate: service.dateupdate,
      usercreateid: service.usercreateid?.toString(),
      userupdateid: service.userupdateid?.toString(),
    }));

    // Mapper les rôles
    const rolesMapped = roles.map((role) => ({
      id: role.id.toString(),
      nom: role.nom,
      description: role.description,
      datecreate: role.datecreate,
      dateupdate: role.dateupdate,
      usercreateid: role.usercreateid?.toString(),
      userupdateid: role.userupdateid?.toString(),
    }));

    // Mapper les sites
    const sitesMapped = sites.map((site) => ({
      id: site.id.toString(),
      designation: site.designation,
      abbreviation: site.abbreviation,
      datecreate: site.datecreate,
      dateupdate: site.dateupdate,
      usercreateid: site.usercreateid?.toString(),
      userupdateid: site.userupdateid?.toString(),
    }));

    // Mapper les utilisateurs
    const usersMapped = users.map((user) => ({
      id: user.id.toString(),
      nom: user.nom,
      prenom: user.prenom,
      username: user.username,
      mail: user.mail,
      phone: user.phone,
      locked: user.locked,
      fkRole: user.fkRole?.toString(),
      role: user.role
        ? {
            id: user.role.id.toString(),
            nom: user.role.nom,
          }
        : null,
      datecreate: user.datecreate,
      dateupdate: user.dateupdate,
    }));

    // Calculer les statistiques
    const servicesWithSite = servicesMapped.filter((s) => s.site).length;
    const servicesWithoutSite = servicesMapped.length - servicesWithSite;

    const stats = {
      totalServices: servicesMapped.length,
      totalRoles: rolesMapped.length,
      totalSites: sitesMapped.length,
      totalUsers: usersMapped.length,
      servicesWithSite,
      servicesWithoutSite,
    };

    console.log('🔍 Statistiques calculées:', stats);

    return res.status(200).json({
      success: true,
      data: {
        services: servicesMapped,
        roles: rolesMapped,
        sites: sitesMapped,
        users: usersMapped,
        stats,
      },
      message: 'Toutes les données chargées avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur API dashboard:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur',
    });
  }
}
