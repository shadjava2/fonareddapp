import type { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromRequest, getUserFromToken, type UserProfile } from './auth';
import { hasAnyPermission } from './rbac';

type ApiMsg = { success: boolean; message?: string };

export async function requireApiUser(
  req: NextApiRequest,
  res: NextApiResponse<ApiMsg>
): Promise<UserProfile | null> {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Non authentifié' });
    return null;
  }
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ success: false, message: 'Session invalide ou expirée' });
    return null;
  }
  return user;
}

/** Au moins une permission requise (codes `permissions.nom`). */
export async function requireApiPermissions(
  req: NextApiRequest,
  res: NextApiResponse<ApiMsg>,
  anyOf: string[]
): Promise<UserProfile | null> {
  const user = await requireApiUser(req, res);
  if (!user) return null;
  if (!hasAnyPermission(user, anyOf)) {
    res.status(403).json({
      success: false,
      message: 'Accès refusé : droits insuffisants',
    });
    return null;
  }
  return user;
}
