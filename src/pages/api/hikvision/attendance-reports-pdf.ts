import {
  fetchAttendanceReportRows,
  parseAttendanceSortField,
  parseAttendanceSortOrder,
  type AttendanceReportQuery,
} from '@/lib/hikvision/attendance-report-data';
import { AttendancePdfDocument } from '@/lib/reports/AttendancePdfDocument';
import { renderAttendancePdfBuffer } from '@/lib/reports/attendance-report-pdf-server';
import { getFonareddLogoSrcForPdf } from '@/lib/reports/fonaredd-pdf-logo';
import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';

const MAX_ROWS = 10_000;

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

  const scopeRaw = String(req.query.scope || 'collective').toLowerCase();
  const scope = scopeRaw === 'individual' ? 'individual' : 'collective';

  const {
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

  const emp = employee_no != null ? String(employee_no).trim() : '';

  if (scope === 'individual' && !emp) {
    return res.status(400).json({
      success: false,
      message:
        'Pour un PDF individuel, renseignez l’ID personne (employee_no) ou utilisez le bouton depuis l’écran avec l’ID rempli.',
    });
  }

  const pd = String(pointageDirection || '').toLowerCase();
  const pointageDir =
    pd === 'in' || pd === 'out' ? (pd as 'in' | 'out') : undefined;

  const query: AttendanceReportQuery = {
    startTime: startTime as string | undefined,
    endTime: endTime as string | undefined,
    department: department as string | undefined,
    name: name as string | undefined,
    employee_no: emp || undefined,
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

  try {
    const { rows, total, noMatchingEmployees } = await fetchAttendanceReportRows({
      query,
      skip: 0,
      take: MAX_ROWS,
    });

    if (noMatchingEmployees) {
      return res.status(404).json({
        success: false,
        message:
          'Aucun employé ACS ne correspond au département ou au nom indiqué — PDF vide.',
      });
    }

    const generatedStr = new Date().toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const periodParts: string[] = [];
    if (query.startTime)
      periodParts.push(`du ${new Date(query.startTime).toLocaleString('fr-FR')}`);
    if (query.endTime)
      periodParts.push(`au ${new Date(query.endTime).toLocaleString('fr-FR')}`);
    const periodLine =
      periodParts.length > 0
        ? `Période : ${periodParts.join(' ')}`
        : 'Période : non restreinte';

    const filterBits: string[] = [];
    if (query.department) filterBits.push(`Département : ${query.department}`);
    if (query.name) filterBits.push(`Nom (contient) : ${query.name}`);
    if (query.employee_no) filterBits.push(`ID personne : ${query.employee_no}`);
    if (query.pointageDirection === 'in')
      filterBits.push('Sens : entrée (Check-in)');
    if (query.pointageDirection === 'out')
      filterBits.push('Sens : sortie (Check-out)');
    if (query.deviceIpContains?.trim())
      filterBits.push(`Lecteur (IP contient) : ${query.deviceIpContains.trim()}`);
    if (query.checkpointContains?.trim())
      filterBits.push(
        `Point de contrôle (contient) : ${query.checkpointContains.trim()}`
      );
    const filtersLine =
      filterBits.length > 0 ? `Filtres : ${filterBits.join(' · ')}` : 'Filtres : aucun';

    const title =
      scope === 'individual'
        ? 'Rapport de pointage (individuel)'
        : 'Rapport de pointage (collectif)';

    const logoSrc = getFonareddLogoSrcForPdf();
    const buffer = await renderAttendancePdfBuffer(
      React.createElement(AttendancePdfDocument, {
        logoSrc,
        title,
        periodLine,
        filtersLine,
        generatedStr,
        rows,
        totalInDb: total,
        rowCountInPdf: rows.length,
      })
    );

    const day = new Date().toISOString().slice(0, 10);
    const fname =
      scope === 'individual'
        ? `pointage_individuel_${safeFilenameSegment(emp)}_${day}.pdf`
        : `pointage_collectif_${day}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fname}"; filename*=UTF-8''${encodeURIComponent(fname)}`
    );
    return res.status(200).send(buffer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur';
    console.error('attendance-reports-pdf:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du PDF',
      error: message,
    });
  }
}
