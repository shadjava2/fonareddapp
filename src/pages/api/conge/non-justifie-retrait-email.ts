import {
  createMailTransport,
  getMailFrom,
  getTransactionalEmailBranding,
  isMailConfigured,
} from '@/lib/mail';
import {
  getFonareddLogoSrcForPdf,
  loadNonJustifieReportForAgent,
  renderNonJustifiePdfBuffer,
} from '@/lib/reports/non-justifie-report-server';
import { NonJustifiePdfDocument } from '@/lib/reports/NonJustifiePdfDocument';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeFilenameSegment(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 64) || 'agent';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  if (!prisma) {
    return res.status(500).json({ success: false, message: 'Serveur indisponible' });
  }

  if (!isMailConfigured()) {
    return res.status(503).json({
      success: false,
      message:
        'Envoi d’e-mails non configuré (variables SMTP : EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD).',
    });
  }

  const { fkUtilisateur, to } = req.body || {};
  const toNorm = typeof to === 'string' ? to.trim() : '';

  if (!fkUtilisateur) {
    return res.status(400).json({ success: false, message: 'fkUtilisateur requis' });
  }
  if (!toNorm || !EMAIL_RE.test(toNorm)) {
    return res.status(400).json({
      success: false,
      message: 'Adresse e-mail destinataire invalide.',
    });
  }

  let uid: bigint;
  try {
    uid = BigInt(String(fkUtilisateur));
  } catch {
    return res.status(400).json({ success: false, message: 'ID agent invalide' });
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
    const pdfName = `conges_non_justifies_${safeFilenameSegment(data.username)}_${day}.pdf`;

    const from = getMailFrom();
    const { attachments: brandAtt, headerBlock } = getTransactionalEmailBranding();

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(165deg,#ecfdf5 0%,#f3f4f6 100%);padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #a7f3d0;box-shadow:0 8px 30px rgba(4,120,87,0.12);">
    <div style="background:linear-gradient(135deg,#047857 0%,#059669 50%,#10b981 100%);padding:22px 24px 20px;">
      ${headerBlock}
      <h1 style="font-size:17px;color:#ffffff;margin:4px 0 4px;font-weight:700;">Rapport congés non justifiés</h1>
      <p style="color:rgba(255,255,255,0.9);font-size:13px;margin:0;">Fond National REDD — Fonaredd</p>
    </div>
    <div style="padding:24px 26px 28px;">
      <p style="color:#374151;font-size:14px;line-height:1.55;margin:0 0 14px;">
        Vous trouverez en <strong style="color:#047857;">pièce jointe (PDF)</strong> l’historique des retraits pour l’agent
        <strong>${escapeHtml(data.agentLine)}</strong> (<span style="color:#059669;">@${escapeHtml(data.username)}</span>).
      </p>
      <p style="color:#6b7280;font-size:12px;margin:0;border-top:1px solid #e5e7eb;padding-top:14px;">
        Généré le ${escapeHtml(data.generatedStr)} — Module Congé Fonaredd.
      </p>
    </div>
  </div>
</body>
</html>`;

    const transport = createMailTransport();
    await transport.sendMail({
      from,
      to: toNorm,
      subject: `[Fonaredd] Congés non justifiés — ${data.agentLine} (${data.username})`,
      text: [
        'Fond National REDD — Fonaredd',
        '',
        `Rapport congés non justifiés pour ${data.agentLine} (@${data.username}).`,
        'Le détail est en pièce jointe (PDF).',
        '',
        `Généré le ${data.generatedStr}.`,
      ].join('\n'),
      html,
      attachments: [
        ...brandAtt,
        {
          filename: pdfName,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return res.status(200).json({ success: true, message: 'E-mail envoyé.' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur envoi';
    console.error('non-justifie-retrait-email:', e);
    return res.status(500).json({ success: false, message: msg });
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
