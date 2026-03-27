import { hashPassword } from '@/lib/auth';
import { consumeOtp } from '@/lib/password-reset-otp';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

type Body = {
  username?: string;
  mail?: string;
  otp?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
};

type ResponseData = {
  success: boolean;
  message: string;
};

/**
 * Après vérification du code OTP reçu par e-mail, définit le nouveau mot de passe.
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

  try {
    const { username, mail, otp, newPassword, newPasswordConfirm } =
      req.body as Body;
    const u = typeof username === 'string' ? username.trim() : '';
    const email = typeof mail === 'string' ? mail.trim() : '';
    const code = typeof otp === 'string' ? otp.trim().replace(/\s/g, '') : '';
    const pwd =
      typeof newPassword === 'string' ? newPassword : '';
    const pwd2 =
      typeof newPasswordConfirm === 'string' ? newPasswordConfirm : '';

    if (!u || u.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur invalide.",
      });
    }
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "L'adresse e-mail est requise.",
      });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Le code doit contenir exactement 6 chiffres.',
      });
    }
    if (!pwd || pwd.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
      });
    }
    if (pwd !== pwd2) {
      return res.status(400).json({
        success: false,
        message: 'Les deux mots de passe ne correspondent pas.',
      });
    }

    const userId = consumeOtp(u, email, code);
    if (userId === null) {
      return res.status(400).json({
        success: false,
        message:
          'Code incorrect ou expiré. Demandez un nouveau code ou vérifiez les informations saisies.',
      });
    }

    const user = await prisma.utilisateurs.findFirst({
      where: { id: userId, locked: false },
      select: { id: true, mail: true, username: true },
    });

    if (!user?.mail) {
      return res.status(400).json({
        success: false,
        message: 'Compte introuvable ou verrouillé.',
      });
    }

    if (user.username !== u) {
      return res.status(400).json({
        success: false,
        message: "Le nom d'utilisateur ne correspond pas à la demande en cours.",
      });
    }

    if (String(user.mail).trim().toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "L'e-mail ne correspond pas au compte.",
      });
    }

    const hashedPassword = await hashPassword(pwd);

    await prisma.utilisateurs.update({
      where: { id: user.id },
      data: {
        mot_de_passe: hashedPassword,
        initPassword: true,
        userupdateid: BigInt(1),
      },
    });

    return res.status(200).json({
      success: true,
      message:
        'Votre mot de passe a été mis à jour. Vous pouvez vous connecter avec le nouveau mot de passe.',
    });
  } catch (e) {
    console.error('[forgot-password/confirm]', e);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur. Réessayez plus tard ou contactez l’administrateur.',
    });
  }
}
