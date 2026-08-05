import {
  computePerformanceReports,
  listEmployeesForPerformance,
} from '@/lib/presence/attendance-performance';
import type { NextApiRequest, NextApiResponse } from 'next';

function monthBounds(year: number, month: number): { from: string; to: string } {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function resolvePeriod(query: NextApiRequest['query']): {
  from: string;
  to: string;
} | null {
  const fromQ = String(query.from || '').trim().slice(0, 10);
  const toQ = String(query.to || '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromQ) && /^\d{4}-\d{2}-\d{2}$/.test(toQ)) {
    if (fromQ > toQ) return null;
    return { from: fromQ, to: toQ };
  }

  const year = Number(query.year);
  const month = Number(query.month);
  if (
    Number.isFinite(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isFinite(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return monthBounds(year, month);
  }

  const now = new Date();
  return monthBounds(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

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

  const period = resolvePeriod(req.query);
  if (!period) {
    return res.status(400).json({
      success: false,
      message:
        'Période invalide. Utilisez from/to (YYYY-MM-DD) ou year + month.',
    });
  }

  const employeeNo = String(req.query.employee_no || '').trim() || undefined;
  const department = String(req.query.department || '').trim() || undefined;
  const idsOnly =
    String(req.query.ids_only || '').trim() === '1' ||
    String(req.query.ids_only || '').toLowerCase() === 'true';

  try {
    // Liste légère pour export dossier (sans cotation complète)
    if (idsOnly) {
      const employees = await listEmployeesForPerformance({
        from: period.from,
        to: period.to,
        employeeNo,
        department,
      });
      return res.status(200).json({
        success: true,
        from: period.from,
        to: period.to,
        count: employees.length,
        employees,
        message:
          employees.length === 0
            ? 'Aucun agent / pointage pour cette période.'
            : `${employees.length} agent(s) à exporter`,
      });
    }

    const result = await computePerformanceReports({
      from: period.from,
      to: period.to,
      employeeNo,
      department,
    });

    return res.status(200).json({
      success: true,
      from: result.from,
      to: result.to,
      rules: result.rules,
      count: result.reports.length,
      reports: result.reports,
      message:
        result.reports.length === 0
          ? 'Aucune donnée de pointage pour cette période / ce filtre.'
          : `${result.reports.length} agent(s) — calcul automatique Timetable`,
    });
  } catch (error: unknown) {
    console.error('attendance-performance:', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul de performance',
      error: msg,
    });
  }
}
