import {
  getFonareddLogoSrcForPdf,
  loadNonJustifieReportForAgent,
  renderNonJustifiePdfBuffer,
} from '@/lib/reports/non-justifie-report-server';
import { NonJustifiePdfDocument } from '@/lib/reports/NonJustifiePdfDocument';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';

function safeFilenameSegment(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 64) || 'agent';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  if (!prisma) {
    return res.status(500).json({ success: false, message: 'Serveur indisponible' });
  }

  const id = String(req.query.fkUtilisateur || '').trim();
  if (!id) {
    return res.status(400).json({ success: false, message: 'fkUtilisateur requis' });
  }

  let uid: bigint;
  try {
    uid = BigInt(id);
  } catch {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }

  try {
    const data = await loadNonJustifieReportForAgent(uid);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Agent introuvable' });
    }

    const logoSrc = getFonareddLogoSrcForPdf();

    const buffer = await renderNonJustifiePdfBuffer(
      React.createElement(NonJustifiePdfDocument, {
        logoSrc,
        agentLine: data.agentLine,
        username: data.username,
        plafondStr: data.plafondStr,
        soldeRestantStr: data.soldeRestantStr,
        generatedStr: data.generatedStr,
        rows: data.rows,
      })
    );

    const day = new Date().toISOString().slice(0, 10);
    const fname = `conges_non_justifies_${safeFilenameSegment(data.username)}_${day}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fname}"; filename*=UTF-8''${encodeURIComponent(fname)}`
    );
    res.status(200).send(buffer);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur PDF';
    console.error('non-justifie-retrait-pdf:', e);
    return res.status(500).json({ success: false, message: msg });
  }
}
