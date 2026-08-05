import {
  fetchAttendanceReportRows,
  parseAttendanceSortField,
  parseAttendanceSortOrder,
  type AttendanceReportQuery,
} from '@/lib/hikvision/attendance-report-data';
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
      pointageDirection,
      deviceIp,
      checkpoint,
      sortBy,
      sortOrder,
    } = req.query;

    const pd = String(pointageDirection || '').toLowerCase();
    const pointageDir =
      pd === 'in' || pd === 'out' ? (pd as 'in' | 'out') : undefined;

    const query: AttendanceReportQuery = {
      startTime: startTime as string | undefined,
      endTime: endTime as string | undefined,
      department: department as string | undefined,
      name: name as string | undefined,
      employee_no: employee_no as string | undefined,
      pointageDirection: pointageDir,
      deviceIpContains:
        deviceIp != null && String(deviceIp).trim()
          ? String(deviceIp).trim()
          : undefined,
      checkpointContains:
        checkpoint != null && String(checkpoint).trim()
          ? String(checkpoint).trim()
          : undefined,
      sortBy: parseAttendanceSortField(sortBy as string | undefined),
      sortOrder: parseAttendanceSortOrder(sortOrder as string | undefined),
    };

    const skip = (Number(page) - 1) * Number(limit);

    const { rows, total, noMatchingEmployees } = await fetchAttendanceReportRows({
      query,
      skip,
      take: Number(limit),
    });

    if (noMatchingEmployees) {
      return res.status(200).json({
        success: true,
        records: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        },
        message:
          'Aucun employé ACS ne correspond au département ou au nom indiqué',
      });
    }

    return res.status(200).json({
      success: true,
      records: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      message: `${rows.length} pointages trouvés`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur';
    console.error(
      '❌ Erreur lors de la récupération des rapports de présence:',
      error
    );
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des rapports',
      error: message,
    });
  }
}
