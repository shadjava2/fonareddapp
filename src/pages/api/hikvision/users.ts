import {
  formatSystemFullName,
  loadSystemUsersByIds,
} from '@/lib/hikvision/acs-system-user-resolve';
import {
  findAcsBySystemUserId,
  getAcsSystemUserIds,
  setAcsSystemUserId,
} from '@/lib/hikvision/acs-system-user-link-sql';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface HikvisionUser {
  device_ip: string;
  employee_no: string;
  name?: string;
  department?: string;
  raw: any;
}

type SysRow = NonNullable<
  Awaited<ReturnType<typeof loadSystemUsersByIds>> extends Map<string, infer V>
    ? V
    : never
>;

function mapAcsUser(
  user: {
    id: bigint;
    device_ip: string;
    employee_no: string;
    name: string | null;
    department: string | null;
    system_user_id: bigint | null;
    raw: unknown;
  },
  sys: SysRow | null
) {
  const raw = (user.raw as Record<string, unknown>) || {};
  const nameFromRaw = (raw.personName ??
    raw.name ??
    raw.employeeName ??
    raw.Name) as string | undefined;
  const name =
    (user.name ?? (nameFromRaw && String(nameFromRaw).trim())) || null;
  const departmentFromRaw = (raw.department ??
    raw.deptName ??
    raw.departmentName) as string | undefined;
  const department =
    (user.department && String(user.department).trim()) ||
    (departmentFromRaw && String(departmentFromRaw).trim()) ||
    null;

  const services = (sys?.droitsServices || [])
    .map((d) => (d.service?.designation || '').trim())
    .filter(Boolean);
  const servicesStr = services.length ? services.join(' · ') : null;
  const systemFullName = sys ? formatSystemFullName(sys) : null;

  return {
    id: user.id.toString(),
    device_ip: user.device_ip,
    employee_no: user.employee_no,
    name: name || undefined,
    department: department || undefined,
    system_user_id: user.system_user_id
      ? String(user.system_user_id)
      : null,
    system_user: sys
      ? {
          id: String(sys.id),
          label: systemFullName || sys.username,
          username: sys.username,
          fonction: sys.fonction?.nom?.trim() || null,
          role: sys.role?.nom?.trim() || null,
          services: servicesStr,
        }
      : null,
    raw: user.raw,
  };
}

async function enrichUsers(
  users: Array<{
    id: bigint;
    device_ip: string;
    employee_no: string;
    name: string | null;
    department: string | null;
    system_user_id?: bigint | null;
    raw: unknown;
  }>
) {
  const linkMap = await getAcsSystemUserIds(users.map((u) => u.id));
  const withLinks = users.map((u) => ({
    ...u,
    system_user_id: linkMap.get(String(u.id)) ?? null,
  }));
  const ids = [
    ...new Set(
      withLinks
        .map((u) => u.system_user_id)
        .filter((id): id is bigint => id != null)
    ),
  ];
  const sysMap = await loadSystemUsersByIds(ids);
  return withLinks.map((u) =>
    mapAcsUser(
      u,
      u.system_user_id != null
        ? sysMap.get(String(u.system_user_id)) ?? null
        : null
    )
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 Récupération des utilisateurs ACS...');

      const {
        page = 1,
        limit = 50,
        device_ip,
        employee_no,
        name: nameSearch,
        search,
      } = req.query;

      const whereClause: Record<string, unknown> = {};

      if (device_ip) {
        whereClause.device_ip = device_ip;
      }

      const searchStr =
        (search && String(search).trim()) ||
        (employee_no && String(employee_no).trim());
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
          orderBy: { employee_no: 'asc' },
          skip,
          take: Number(limit),
        }),
        prisma.acs_users.count({ where: whereClause }),
      ]);

      console.log(
        `🔍 ${users.length} utilisateurs ACS trouvés sur ${total} total`
      );

      return res.status(200).json({
        success: true,
        users: await enrichUsers(users),
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

  if (req.method === 'PATCH') {
    try {
      const { id, system_user_id } = req.body || {};
      const acsId = String(id || '').trim();
      if (!acsId || !/^\d+$/.test(acsId)) {
        return res.status(400).json({
          success: false,
          message: 'id ACS requis',
        });
      }

      const acsBig = BigInt(acsId);
      const existing = await prisma.acs_users.findUnique({
        where: { id: acsBig },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Agent ACS introuvable',
        });
      }

      let systemUserId: bigint | null = null;
      if (system_user_id != null && String(system_user_id).trim() !== '') {
        const sid = String(system_user_id).trim();
        if (!/^\d+$/.test(sid)) {
          return res.status(400).json({
            success: false,
            message: 'system_user_id invalide',
          });
        }
        const exists = await prisma.utilisateurs.findUnique({
          where: { id: BigInt(sid) },
          select: { id: true },
        });
        if (!exists) {
          return res.status(404).json({
            success: false,
            message: 'Utilisateur système introuvable',
          });
        }
        const other = await findAcsBySystemUserId(BigInt(sid), acsBig);
        if (other) {
          return res.status(409).json({
            success: false,
            message: `Cet utilisateur système est déjà lié à l’agent ${other.employee_no}`,
          });
        }
        systemUserId = BigInt(sid);
      }

      await setAcsSystemUserId(acsBig, systemUserId);

      const [enriched] = await enrichUsers([existing]);

      return res.status(200).json({
        success: true,
        message: systemUserId
          ? 'Liaison enregistrée'
          : 'Liaison dissociée',
        user: enriched,
      });
    } catch (error: any) {
      console.error('❌ Erreur liaison ACS ↔ système:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la liaison',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log("🔍 Création/mise à jour d'un utilisateur ACS...");

      const userData: HikvisionUser = req.body;

      if (!userData.device_ip || !userData.employee_no) {
        return res.status(400).json({
          success: false,
          message: 'Données manquantes: device_ip et employee_no sont requis',
        });
      }

      const existingUser = await prisma.acs_users.findFirst({
        where: {
          device_ip: userData.device_ip,
          employee_no: userData.employee_no,
        },
      });

      let result;
      if (existingUser) {
        result = await prisma.acs_users.update({
          where: { id: existingUser.id },
          data: {
            name: userData.name,
            department: userData.department,
            raw: userData.raw,
          },
        });
      } else {
        result = await prisma.acs_users.create({
          data: {
            device_ip: userData.device_ip,
            employee_no: userData.employee_no,
            name: userData.name,
            department: userData.department,
            raw: userData.raw,
          },
        });
      }

      const [enriched] = await enrichUsers([result]);

      return res.status(200).json({
        success: true,
        message: existingUser
          ? 'Utilisateur ACS mis à jour'
          : 'Utilisateur ACS créé',
        user: enriched,
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
