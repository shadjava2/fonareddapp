import type { UserProfile } from '@/lib/auth';
import { sendLoginNotificationEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import type { NextApiRequest } from 'next';

/** Affichage lisible pour connexions locales (dev : navigateur → localhost). */
function normalizeClientIpForDisplay(ip: string | null): string | null {
  if (!ip) return null;
  const t = ip.trim();
  if (t === '::1' || t === '::ffff:127.0.0.1' || t === '127.0.0.1') {
    return '127.0.0.1 (ordinateur local — développement)';
  }
  if (t.startsWith('::ffff:')) return t.slice(7);
  return t;
}

export function getClientIp(req: NextApiRequest): string | null {
  const xff = req.headers['x-forwarded-for'];
  let candidate: string | null = null;
  if (typeof xff === 'string' && xff.trim()) {
    candidate = xff.split(',')[0]?.trim() || null;
  } else if (Array.isArray(xff) && xff[0]) {
    candidate = xff[0].split(',')[0]?.trim() || null;
  }
  if (!candidate) {
    candidate = req.socket?.remoteAddress || null;
  }
  return normalizeClientIpForDisplay(candidate);
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
    formatPersonDisplayName(profile) || profile.username;

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
