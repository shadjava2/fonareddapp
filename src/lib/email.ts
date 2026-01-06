import nodemailer from 'nodemailer';

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'annotation.fonaredd@gmail.com',
    pass: 'Fnrdd@2025&annttN.',
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envoie un email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: 'annotation.fonaredd@gmail.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}

/**
 * Envoie une notification de demande de congé
 */
export async function sendCongeNotification(
  destinataires: Array<{ email: string | null; nom: string | null }>,
  demandeInfo: {
    demandeur: string;
    nbrjour: number;
    du: string;
    au: string;
    section?: string;
    typeConge?: string;
  },
  role: string
): Promise<boolean> {
  const dateDu = new Date(demandeInfo.du).toLocaleDateString('fr-FR');
  const dateAu = new Date(demandeInfo.au).toLocaleDateString('fr-FR');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { padding: 10px; text-align: center; color: #6b7280; font-size: 12px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Notification de Demande de Congé</h2>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Une nouvelle demande de congé a été soumise et nécessite votre attention.</p>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <div class="info-row">
              <span class="label">Demandeur :</span> ${demandeInfo.demandeur}
            </div>
            ${demandeInfo.typeConge ? `<div class="info-row"><span class="label">Type de congé :</span> ${demandeInfo.typeConge}</div>` : ''}
            ${demandeInfo.section ? `<div class="info-row"><span class="label">Section :</span> ${demandeInfo.section}</div>` : ''}
            <div class="info-row">
              <span class="label">Durée :</span> ${demandeInfo.nbrjour} jour(s)
            </div>
            <div class="info-row">
              <span class="label">Période :</span> Du ${dateDu} au ${dateAu}
            </div>
            <div class="info-row">
              <span class="label">Rôle concerné :</span> ${role}
            </div>
          </div>

          <p>Veuillez vous connecter à l'application pour traiter cette demande.</p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement par le système de gestion des congés Fonaredd.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Filtrer les destinataires qui ont un email valide
  const emails = destinataires
    .filter((d) => d.email && d.email.trim() !== '')
    .map((d) => d.email as string);

  if (emails.length === 0) {
    console.warn('⚠️ Aucun email valide pour envoyer la notification');
    return false;
  }

  return await sendEmail({
    to: emails,
    subject: `Demande de congé - ${demandeInfo.demandeur} - ${role}`,
    html,
  });
}
