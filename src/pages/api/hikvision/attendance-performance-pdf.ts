import { computePerformanceReports } from '@/lib/presence/attendance-performance';
import { renderMonthlyPresencePdfBuffer } from '@/lib/reports/attendance-report-pdf-server';
import { getFonareddLogoSrcForPdf } from '@/lib/reports/fonaredd-pdf-logo';
import { MonthlyPerformancePdfDocument } from '@/lib/reports/MonthlyPerformancePdfDocument';
import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';

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

function safeFilenameSegment(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 64) || 'rapport';
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
      message: 'Période invalide (from/to ou year/month).',
    });
  }

  const employeeNo = String(req.query.employee_no || '').trim() || undefined;
  const department = String(req.query.department || '').trim() || undefined;

  try {
    const result = await computePerformanceReports({
      from: period.from,
      to: period.to,
      employeeNo,
      department,
    });

    if (result.reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun agent / pointage pour cette période — PDF vide.',
      });
    }

    const generatedStr = new Date().toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const element = React.createElement(MonthlyPerformancePdfDocument, {
      logoSrc: getFonareddLogoSrcForPdf(),
      generatedStr,
      reports: result.reports,
      rules: result.rules,
    });

    const buffer = await renderMonthlyPresencePdfBuffer(element);

    const scope = employeeNo
      ? `individuel_${safeFilenameSegment(employeeNo)}`
      : 'global';
    const filename = `performance_presence_${scope}_${period.from}_${period.to}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error('attendance-performance-pdf:', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return res.status(500).json({
      success: false,
      message: 'Erreur génération PDF performance',
      error: msg,
    });
  }
}
