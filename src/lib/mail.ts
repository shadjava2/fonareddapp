import nodemailer from 'nodemailer';

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SERVER_HOST?.trim() &&
      process.env.EMAIL_SERVER_USER?.trim() &&
      process.env.EMAIL_SERVER_PASSWORD &&
      process.env.EMAIL_FROM?.trim()
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
  const from = process.env.EMAIL_FROM!.trim();
  const transport = createMailTransport();
  await transport.sendMail({
    from,
    to,
    subject: 'Code de confirmation — réinitialisation mot de passe (Fonaredd)',
    text: [
      `Votre code de confirmation : ${otp}`,
      '',
      'Ce code est valable 15 minutes.',
      "Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.",
    ].join('\n'),
    html: `<p>Votre code de confirmation :</p><p style="font-size:1.35rem;letter-spacing:0.25em;font-weight:700">${otp}</p><p style="color:#555">Valable 15 minutes.</p><p style="color:#888;font-size:0.85rem">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
  });
}
