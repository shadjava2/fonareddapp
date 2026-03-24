import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  try {
    const {
      page = '1',
      limit = '50',
      startTime,
      endTime,
      department,
      name,
      employee_no,
    } = req.query;

    const whereClause: any = {};

    // Filtre par plage de dates
    if (startTime || endTime) {
      whereClause.event_time = {};
      if (startTime) {
        whereClause.event_time.gte = new Date(startTime as string);
      }
      if (endTime) {
        whereClause.event_time.lte = new Date(endTime as string);
      }
    }

    // Filtre par employé
    if (employee_no) {
      whereClause.employee_no = employee_no;
    }

    // Si filtre par département ou nom, d'abord récupérer les employee_no correspondants
    if (department || name) {
      const userWhere: any = {};
      if (department) userWhere.department = department;
      if (name) userWhere.name = { contains: name as string };

      const matchingUsers = await prisma.acs_users.findMany({
        where: userWhere,
        select: { employee_no: true },
      });
      const validEmployeeNos = matchingUsers.map((u) => u.employee_no);
      whereClause.employee_no = { in: validEmployeeNos };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      prisma.acs_events.findMany({
        where: whereClause,
        orderBy: { event_time: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.acs_events.count({ where: whereClause }),
    ]);

    const employeeNos = [
      ...new Set(events.map((e) => e.employee_no).filter(Boolean)),
    ] as string[];
    const users = employeeNos.length
      ? await prisma.acs_users.findMany({
          where: { employee_no: { in: employeeNos } },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.employee_no, u]));

    const records = events.map((event) => {
      const user = event.employee_no
        ? userMap.get(event.employee_no)
        : undefined;
      const direction = (event.direction || '').toLowerCase();
      const attendanceStatus =
        direction === 'in'
          ? 'Check-in'
          : direction === 'out'
            ? 'Check-out'
            : event.event_type;
      const customLabel =
        direction === 'in' ? 'Entrée' : direction === 'out' ? 'Sortie' : event.event_type;

      return {
        id: event.id.toString(),
        personId: event.employee_no || 'N/A',
        name: user?.name || event.employee_no || 'N/A',
        department: user?.department || 'fonaredd',
        time: event.event_time.toISOString(),
        attendanceStatus,
        attendanceCheckPoint: `${event.device_ip}${event.door_no ? `_Door${event.door_no}` : ''}`,
        custom: customLabel,
        eventType: event.event_type,
      };
    });

    return res.status(200).json({
      success: true,
      records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      message: `${records.length} pointages trouvés`,
    });
  } catch (error: any) {
    console.error(
      '❌ Erreur lors de la récupération des rapports de présence:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des rapports',
      error: error.message,
    });
  }
}
