import { prisma } from '@/lib/prisma';
import {
  canSendOtp,
  clearPendingReset,
  generateSixDigitOtp,
  recordOtpEmailSent,
  savePendingReset,
} from '@/lib/password-reset-otp';
import { isMailConfigured, sendPasswordResetOtp } from '@/lib/mail';
import type { NextApiRequest, NextApiResponse } from 'next';

type Body = { username?: string; mail?: string };

type ResponseData = {
  success: boolean;
  message: string;
};

/**
 * Envoie un code OTP par e-mail (SMTP) pour la réinitialisation du mot de passe.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Méthode non autorisée',
    });
  }

  if (!isMailConfigured()) {
    return res.status(503).json({
      success: false,
      message:
        "L'envoi d'e-mails n'est pas configuré sur le serveur (SMTP). Contactez l'administrateur.",
    });
  }

  try {
    const { username, mail } = req.body as Body;
    const u = typeof username === 'string' ? username.trim() : '';
    const email = typeof mail === 'string' ? mail.trim() : '';

    if (!u || u.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Indiquez un nom d'utilisateur valide (au moins 3 caractères).",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "L'adresse e-mail est requise.",
      });
    }

    const user = await prisma.utilisateurs.findFirst({
      where: { username: u, locked: false },
      select: { id: true, mail: true },
    });

    if (!user) {
      return res.status(200).json({
        success: false,
        message:
          "Aucun compte actif ne correspond à ce nom d'utilisateur. Vérifiez l'orthographe ou contactez l'administrateur.",
      });
    }

    if (!user.mail || !String(user.mail).trim()) {
      return res.status(200).json({
        success: false,
        message:
          "Ce compte n'a pas d'e-mail enregistré. Un administrateur doit réinitialiser votre mot de passe.",
      });
    }

    if (String(user.mail).trim().toLowerCase() !== email.toLowerCase()) {
      return res.status(200).json({
        success: false,
        message:
          "L'e-mail ne correspond pas à celui associé à ce compte. Vérifiez ou contactez l'administrateur.",
      });
    }

    if (!canSendOtp(u, email)) {
      return res.status(429).json({
        success: false,
        message:
          'Trop de demandes de code. Réessayez dans une heure ou contactez l’administrateur.',
      });
    }

    const otp = generateSixDigitOtp();
    const to = String(user.mail).trim();
    savePendingReset(u, email, user.id, otp);

    try {
      await sendPasswordResetOtp(to, otp);
    } catch (err) {
      console.error('[forgot-password/send-otp] SMTP:', err);
      clearPendingReset(u, email);
      const nodemailerErr = err as {
        responseCode?: number;
        response?: string;
        code?: string;
      };
      const resp = String(nodemailerErr.response || '');
      const is553 =
        nodemailerErr.responseCode === 553 ||
        resp.includes('553') ||
        /sender.*not allowed|relay/i.test(resp);
      const message = is553
        ? "Zoho refuse l'adresse d'expédition (From). Mettez EMAIL_FROM sur la même adresse que EMAIL_SERVER_USER (ex. contact@fonaredd.com), ou créez l'alias « noreply » dans l'admin Zoho Mail."
        : "L'e-mail n'a pas pu être envoyé. Vérifiez la configuration SMTP ou réessayez plus tard.";
      return res.status(502).json({
        success: false,
        message,
      });
    }

    recordOtpEmailSent(u, email);

    return res.status(200).json({
      success: true,
      message:
        'Un code de confirmation à 6 chiffres a été envoyé à votre adresse e-mail. Il est valable 15 minutes.',
    });
  } catch (e) {
    console.error('[forgot-password/send-otp]', e);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur. Réessayez plus tard ou contactez l’administrateur.',
    });
  }
}
