import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface HikvisionUser {
  device_ip: string;
  employee_no: string;
  name?: string;
  department?: string;
  raw: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération des utilisateurs ACS...');

      const { page = 1, limit = 50, device_ip, employee_no, name: nameSearch, search } = req.query;

      const whereClause: any = {};

      if (device_ip) {
        whereClause.device_ip = device_ip;
      }

      const searchStr = (search && String(search).trim()) || (employee_no && String(employee_no).trim());
      if (searchStr) {
        whereClause.OR = [
          { employee_no: { contains: searchStr } },
          { name: { contains: searchStr } },
        ];
      } else if (employee_no) {
        whereClause.employee_no = { contains: String(employee_no) };
      } else if (nameSearch && String(nameSearch).trim()) {
        whereClause.name = { contains: String(nameSearch).trim() };
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [users, total] = await Promise.all([
        prisma.acs_users.findMany({
          where: whereClause,
          orderBy: {
            employee_no: 'asc',
          },
          skip,
          take: Number(limit),
        }),
        prisma.acs_users.count({
          where: whereClause,
        }),
      ]);

      console.log(
        `🔍 ${users.length} utilisateurs ACS trouvés sur ${total} total`
      );

      const formattedUsers = users.map((user) => {
        const raw = (user.raw as Record<string, unknown>) || {};
        const nameFromRaw =
          (raw.personName ?? raw.name ?? raw.employeeName ?? raw.Name) as string | undefined;
        const name = (user.name ?? (nameFromRaw && String(nameFromRaw).trim())) || null;
        const departmentFromRaw =
          (raw.department ?? raw.deptName ?? raw.departmentName) as string | undefined;
        const department =
          (user.department && String(user.department).trim()) ||
          (departmentFromRaw && String(departmentFromRaw).trim()) ||
          null;
        return {
          id: user.id.toString(),
          device_ip: user.device_ip,
          employee_no: user.employee_no,
          name: name || undefined,
          department: department || undefined,
          raw: user.raw,
        };
      });

      return res.status(200).json({
        success: true,
        users: formattedUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        message: `${total} utilisateurs ACS trouvés`,
      });
    } catch (error: any) {
      console.error(
        '❌ Erreur lors de la récupération des utilisateurs ACS:',
        error
      );
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des utilisateurs ACS',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log("🔍 Création/mise à jour d'un utilisateur ACS...");

      const userData: HikvisionUser = req.body;

      console.log('🔍 Données utilisateur reçues:', userData);

      // Validation des données requises
      if (!userData.device_ip || !userData.employee_no) {
        return res.status(400).json({
          success: false,
          message: 'Données manquantes: device_ip et employee_no sont requis',
        });
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.acs_users.findFirst({
        where: {
          device_ip: userData.device_ip,
          employee_no: userData.employee_no,
        },
      });

      let result;
      if (existingUser) {
        // Mettre à jour l'utilisateur existant
        result = await prisma.acs_users.update({
          where: { id: existingUser.id },
          data: {
            name: userData.name,
            department: userData.department,
            raw: userData.raw,
          },
        });
        console.log('✅ Utilisateur ACS mis à jour:', result.id);
      } else {
        // Créer un nouvel utilisateur
        result = await prisma.acs_users.create({
          data: {
            device_ip: userData.device_ip,
            employee_no: userData.employee_no,
            name: userData.name,
            department: userData.department,
            raw: userData.raw,
          },
        });
        console.log('✅ Utilisateur ACS créé:', result.id);
      }

      return res.status(200).json({
        success: true,
        message: existingUser
          ? 'Utilisateur ACS mis à jour'
          : 'Utilisateur ACS créé',
        user: {
          id: result.id.toString(),
          device_ip: result.device_ip,
          employee_no: result.employee_no,
          name: result.name,
          department: result.department,
        },
      });
    } catch (error: any) {
      console.error(
        "❌ Erreur lors de la gestion de l'utilisateur ACS:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la gestion de l'utilisateur ACS",
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée',
  });
}



