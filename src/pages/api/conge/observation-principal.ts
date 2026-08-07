import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import {
  ensureCongeSchemaAdditive,
  getSuperviseurPrincipalId,
} from '@/lib/conge/superviseur-principal';
import { prisma } from '@/lib/prisma';
import { hasAnyPermission, PERMISSIONS } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }
  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  if (!prisma) {
    return res.status(500).json({ success: false, message: 'Prisma non initialisé' });
  }

  await ensureCongeSchemaAdditive();

  try {
    if (req.method === 'GET') {
      const demandeId = Number(req.query.demandeId);
      if (!demandeId) {
        return res
          .status(400)
          .json({ success: false, message: 'demandeId requis' });
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, fkDemande, fkUtilisateur, observations, datecreate, dateupdate, usercreateid
         FROM conge_observation_principal
         WHERE fkDemande = ?
         ORDER BY datecreate DESC`,
        demandeId
      );
      return res.status(200).json({
        success: true,
        observations: (rows || []).map((r) => ({
          id: Number(r.id),
          fkDemande: Number(r.fkDemande),
          fkUtilisateur: Number(r.fkUtilisateur),
          observations: r.observations,
          datecreate: r.datecreate,
          dateupdate: r.dateupdate,
        })),
      });
    }

    if (req.method === 'POST') {
      if (
        !hasAnyPermission(user as any, [
          PERMISSIONS.CONGE_TRAITEMENT,
          PERMISSIONS.CONGE_TRAITEMENT_ACT,
          PERMISSIONS.MODULE_CONGE,
          PERMISSIONS.MODULE_ADMIN,
        ])
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Permissions insuffisantes' });
      }

      const { demandeId, observations } = req.body || {};
      const fkDemande = Number(demandeId);
      if (!fkDemande) {
        return res
          .status(400)
          .json({ success: false, message: 'demandeId requis' });
      }

      const principalId = await getSuperviseurPrincipalId();
      const userId = BigInt(user.id);
      if (!principalId || principalId !== userId) {
        return res.status(403).json({
          success: false,
          message:
            'Seuls le superviseur principal peut enregistrer une observation optionnelle',
        });
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO conge_observation_principal
          (fkDemande, fkUtilisateur, observations, usercreateid, userupdateid)
         VALUES (?, ?, ?, ?, ?)`,
        fkDemande,
        Number(userId),
        observations != null ? String(observations) : null,
        Number(userId),
        Number(userId)
      );

      return res.status(201).json({
        success: true,
        message: 'Observation enregistrée (non bloquante)',
      });
    }

    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  } catch (e: any) {
    console.error('observation-principal:', e);
    return res.status(500).json({
      success: false,
      message: e?.message || 'Erreur serveur',
    });
  }
}
