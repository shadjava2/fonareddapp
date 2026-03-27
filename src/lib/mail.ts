import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';

const LOGO_CONTENT_ID = 'fonaredd-logo@fonaredd';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getPublicSiteBase(): string {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.EMAIL_PUBLIC_BASE_URL?.trim() ||
    '';
  return raw.replace(/\/$/, '');
}

const LOGO_IMG_STYLE =
  'display:block;margin:0 auto 18px;max-width:220px;width:100%;height:auto;border:0;';

/** Logo e-mail : `public/logo.png` (recommandé), puis SVG, puis URL publique, puis texte. */
export function getTransactionalEmailBranding(): {
  attachments: Attachment[];
  headerBlock: string;
} {
  const cwd = process.cwd();
  const logoPng = path.join(cwd, 'public', 'logo.png');
  if (fs.existsSync(logoPng)) {
    return {
      attachments: [
        {
          filename: 'logo.png',
          path: logoPng,
          cid: LOGO_CONTENT_ID,
          contentDisposition: 'inline',
        },
      ],
      headerBlock: `
        <img src="cid:${LOGO_CONTENT_ID}" alt="Fond National REDD — Fonaredd" width="220"
          style="${LOGO_IMG_STYLE}" />`,
    };
  }

  const logoSvg = path.join(cwd, 'public', 'logo-fonaredd.svg');
  if (fs.existsSync(logoSvg)) {
    return {
      attachments: [
        {
          filename: 'logo-fonaredd.svg',
          path: logoSvg,
          cid: LOGO_CONTENT_ID,
          contentDisposition: 'inline',
        },
      ],
      headerBlock: `
        <img src="cid:${LOGO_CONTENT_ID}" alt="Fonaredd" width="64" height="64"
          style="display:block;margin:0 auto 16px;border-radius:14px;border:2px solid rgba(255,255,255,0.35);" />`,
    };
  }

  const base = getPublicSiteBase();
  if (base) {
    const srcPng = `${base}/logo.png`;
    return {
      attachments: [],
      headerBlock: `
        <img src="${srcPng}" alt="Fond National REDD — Fonaredd" width="220"
          style="${LOGO_IMG_STYLE}" />`,
    };
  }

  return {
    attachments: [],
    headerBlock: `
      <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.12em;margin:0 auto 12px;text-shadow:0 1px 2px rgba(0,0,0,0.15);">
        FONAREDD
      </div>`,
  };
}

function buildPasswordResetOtpHtml(otp: string, headerBlock: string): string {
  const safeOtp = otp.replaceAll(/\D/g, '').slice(0, 6);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>Code de confirmation Fonaredd</title>
</head>
<body style="margin:0;padding:0;background-color:#ecfdf5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#059669;background:linear-gradient(165deg,#047857 0%,#059669 42%,#10b981 100%);padding:36px 16px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:8px;">
              ${headerBlock}
              <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:700;line-height:1.25;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Fond National REDD
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Sécurité du compte — réinitialisation du mot de passe
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:18px;padding:32px 28px 28px;box-shadow:0 12px 40px rgba(0,0,0,0.14);border:1px solid rgba(255,255,255,0.6);">
              <p style="margin:0 0 6px;color:#374151;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Bonjour,
              </p>
              <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Utilisez le code ci-dessous pour confirmer la réinitialisation de votre mot de passe sur la plateforme <strong style="color:#047857;">Fonaredd</strong>.
              </p>
              <p style="margin:0 0 12px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Code à saisir
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:14px;border:2px solid #34d399;">
                <tr>
                  <td align="center" style="padding:22px 16px;">
                    <span style="font-size:34px;font-weight:800;letter-spacing:0.42em;color:#047857;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding-left:0.42em;">
                      ${safeOtp}
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;color:#6b7280;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Ce code est valable <strong style="color:#047857;">15 minutes</strong>. Ne le partagez avec personne.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:20px;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité — votre mot de passe ne sera pas modifié.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 12px 0;">
              <p style="margin:0;color:rgba(255,255,255,0.78);font-size:11px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Message automatique — merci de ne pas répondre à cette adresse.
              </p>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.55);font-size:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Fond National REDD · Plateforme Fonaredd
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildLoginNotificationHtml(
  headerBlock: string,
  params: {
    displayName: string;
    username: string;
    whenFormatted: string;
    ipLabel: string;
    userAgentLabel: string;
  }
): string {
  const displayName = escapeHtml(params.displayName);
  const username = escapeHtml(params.username);
  const whenFormatted = escapeHtml(params.whenFormatted);
  const ipLabel = escapeHtml(params.ipLabel);
  const userAgentLabel = escapeHtml(params.userAgentLabel);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nouvelle connexion — Fonaredd</title>
</head>
<body style="margin:0;padding:0;background-color:#ecfdf5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#059669;background:linear-gradient(165deg,#047857 0%,#059669 42%,#10b981 100%);padding:36px 16px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">
          <tr>
            <td align="center" style="padding-bottom:8px;">
              ${headerBlock}
              <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Alerte de sécurité
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Nouvelle connexion à votre compte Fonaredd
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:18px;padding:32px 28px 28px;box-shadow:0 12px 40px rgba(0,0,0,0.14);border:1px solid rgba(255,255,255,0.6);">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Bonjour <strong style="color:#047857;">${displayName}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Une connexion vient d’être enregistrée sur la plateforme <strong>Fonaredd</strong> avec le compte <strong>@${username}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #86efac;margin-bottom:20px;">
                <tr>
                  <td style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#374151;">
                    <p style="margin:0 0 8px;"><strong>Date et heure</strong><br/><span style="color:#047857;">${whenFormatted}</span></p>
                    <p style="margin:8px 0;"><strong>Adresse IP</strong><br/><span style="word-break:break-all;">${ipLabel}</span></p>
                    <p style="margin:8px 0 0;"><strong>Navigateur / appareil</strong><br/><span style="word-break:break-word;color:#6b7280;font-size:13px;">${userAgentLabel}</span></p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;border:1px solid #fdba74;">
                <tr>
                  <td style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#9a3412;line-height:1.55;">
                    <strong>vous ne reconnaissez pas cette connexion ?</strong><br/>
                    Changez immédiatement votre mot de passe depuis la plateforme et prévenez <strong>votre administrateur</strong> ou le support IT afin de signaler une utilisation frauduleuse possible de votre compte.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 12px 0;">
              <p style="margin:0;color:rgba(255,255,255,0.78);font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Message automatique — ne pas répondre à cette adresse.
              </p>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.55);font-size:10px;">Fond National REDD · Plateforme Fonaredd</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type LoginNotificationParams = {
  displayName: string;
  username: string;
  when: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function sendLoginNotificationEmail(
  to: string,
  params: LoginNotificationParams
): Promise<void> {
  if (!isMailConfigured()) return;

  const from = getMailFrom();
  const { attachments, headerBlock } = getTransactionalEmailBranding();
  const whenFormatted = params.when.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ipLabel = params.ipAddress?.trim() || 'Non disponible';
  const userAgentLabel =
    params.userAgent?.trim() || 'Non disponible';

  const html = buildLoginNotificationHtml(headerBlock, {
    displayName: params.displayName,
    username: params.username,
    whenFormatted,
    ipLabel,
    userAgentLabel,
  });

  const transport = createMailTransport();
  await transport.sendMail({
    from,
    to,
    subject: 'Nouvelle connexion à votre compte Fonaredd',
    text: [
      'Fond National REDD — Fonaredd',
      '',
      'Une nouvelle connexion a été enregistrée sur votre compte.',
      `Utilisateur : @${params.username}`,
      `Date : ${whenFormatted}`,
      `IP : ${ipLabel}`,
      '',
      "Si vous ne reconnaissez pas cette connexion, changez votre mot de passe et prévenez votre administrateur.",
    ].join('\n'),
    html,
    attachments: attachments.length ? attachments : undefined,
  });
}

/** Adresse « From » : Zoho exige souvent le même compte que EMAIL_SERVER_USER (ou un alias configuré). */
export function getMailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.EMAIL_SERVER_USER!.trim()
  );
}

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SERVER_HOST?.trim() &&
      process.env.EMAIL_SERVER_USER?.trim() &&
      process.env.EMAIL_SERVER_PASSWORD
  );
}

export function createMailTransport() {
  const host = process.env.EMAIL_SERVER_HOST!.trim();
  const port = parseInt(process.env.EMAIL_SERVER_PORT || '587', 10);
  const secure =
    process.env.EMAIL_SERVER_SECURE === 'true' ||
    process.env.EMAIL_SERVER_SECURE === '1' ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_SERVER_USER!.trim(),
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

export async function sendPasswordResetOtp(to: string, otp: string) {
  if (!isMailConfigured()) {
    throw new Error('SMTP non configuré');
  }
  const from = getMailFrom();
  const { attachments, headerBlock } = getTransactionalEmailBranding();
  const html = buildPasswordResetOtpHtml(otp, headerBlock);
  const transport = createMailTransport();
  await transport.sendMail({
    from,
    to,
    subject: 'Code de confirmation — réinitialisation mot de passe (Fonaredd)',
    text: [
      'Fond National REDD — Fonaredd',
      '',
      `Votre code de confirmation : ${otp}`,
      '',
      'Ce code est valable 15 minutes.',
      "Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.",
    ].join('\n'),
    html,
    attachments: attachments.length ? attachments : undefined,
  });
}
