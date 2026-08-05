import { requireApiPermissions } from '@/lib/api-auth';
import { buildPresenceMonitoring } from '@/lib/presence/presence-monitoring';
import { renderMonthlyPresencePdfBuffer } from '@/lib/reports/attendance-report-pdf-server';
import { getFonareddLogoSrcForPdf } from '@/lib/reports/fonaredd-pdf-logo';
import { PresenceMonitoringPdfDocument } from '@/lib/reports/PresenceMonitoringPdfDocument';
import { PERMISSIONS } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';

const AUTH = [
  PERMISSIONS.PRESENCE_MANAGE,
  PERMISSIONS.PRESENCE_VIEW,
  PERMISSIONS.MODULE_PERSONNEL,
  PERMISSIONS.MODULE_ADMIN,
];

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

  const authUser = await requireApiPermissions(req, res, AUTH);
  if (!authUser) return;

  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const pendingOnly =
    String(req.query.pendingOnly || '1') !== '0' &&
    String(req.query.pendingOnly || '').toLowerCase() !== 'false';
  const scopeRaw = String(req.query.scope || 'month').toLowerCase();
  const scope = scopeRaw === 'ytd' ? 'ytd' : 'month';

  if (
    !Number.isFinite(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return res.status(400).json({
      success: false,
      message: 'year / month invalides',
    });
  }

  try {
    const data = await buildPresenceMonitoring({ year, month, scope });
    const logoSrc = getFonareddLogoSrcForPdf();
    const buffer = await renderMonthlyPresencePdfBuffer(
      React.createElement(PresenceMonitoringPdfDocument, {
        data,
        logoSrc,
        pendingOnly,
      })
    );

    const filename = `monitoring_presence_${year}_${String(month).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    return res.status(200).send(buffer);
  } catch (e: unknown) {
    console.error('presence-monitoring-pdf:', e);
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : 'Erreur PDF',
    });
  }
}
