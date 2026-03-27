import type { UserProfile } from '@/lib/auth';
import { sendLoginNotificationEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest } from 'next';

export function getClientIp(req: NextApiRequest): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0]?.trim() || null;
  }
  if (Array.isArray(xff) && xff[0]) {
    return xff[0].split(',')[0]?.trim() || null;
  }
  const raw = req.socket?.remoteAddress;
  if (!raw) return null;
  if (raw === '::1') return '127.0.0.1 (local)';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
}

export function getClientUserAgent(req: NextApiRequest): string | null {
  const ua = req.headers['user-agent'];
  if (typeof ua !== 'string' || !ua.trim()) return null;
  return ua.trim().slice(0, 512);
}

/**
 * Enregistre la connexion réussie et envoie un e-mail d’alerte si SMTP + e-mail utilisateur.
 * N’interrompt pas la connexion en cas d’échec (journal ou mail).
 */
export async function recordSuccessfulLogin(
  req: NextApiRequest,
  profile: UserProfile
): Promise<void> {
  const userId = BigInt(profile.id);
  const ip = getClientIp(req);
  const ua = getClientUserAgent(req);

  try {
    await prisma.connexionHistorique.create({
      data: {
        fkUtilisateur: userId,
        ipAddress: ip,
        userAgent: ua,
      },
    });
  } catch (e) {
    console.warn(
      '[login-security] impossible d’enregistrer l’historique (migration appliquée ?):',
      e
    );
  }

  if (
    process.env.DISABLE_LOGIN_ALERT_EMAIL === 'true' ||
    process.env.DISABLE_LOGIN_ALERT_EMAIL === '1'
  ) {
    return;
  }

  const mail = profile.mail?.trim();
  if (!mail) return;

  const displayName =
    [profile.prenom, profile.nom].filter(Boolean).join(' ').trim() ||
    profile.username;

  void sendLoginNotificationEmail(mail, {
    displayName,
    username: profile.username,
    when: new Date(),
    ipAddress: ip,
    userAgent: ua,
  }).catch((e) =>
    console.error('[login-security] envoi e-mail alerte connexion:', e)
  );
}
