import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';
import { ensureCongeSchemaAdditive } from '@/lib/conge/superviseur-principal';
import { prisma } from '@/lib/prisma';
import { hasAnyPermission, PERMISSIONS } from '@/lib/rbac';
import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);
const MAX_BYTES = 5 * 1024 * 1024;

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

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
      if (
        !hasAnyPermission(user as any, [
          PERMISSIONS.CONGE_ATTACHMENT_VIEW,
          PERMISSIONS.CONGE_REQUEST,
          PERMISSIONS.CONGE_TRAITEMENT,
          PERMISSIONS.MODULE_CONGE,
          PERMISSIONS.MODULE_ADMIN,
        ])
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Permissions insuffisantes' });
      }
      const demandeId = Number(req.query.demandeId);
      if (!demandeId) {
        return res
          .status(400)
          .json({ success: false, message: 'demandeId requis' });
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, fkDemande, nom_original, chemin, mime, taille, datecreate, usercreateid
         FROM congedemande_fichier
         WHERE fkDemande = ?
         ORDER BY id ASC`,
        demandeId
      );
      return res.status(200).json({
        success: true,
        fichiers: (rows || []).map((r) => ({
          id: Number(r.id),
          fkDemande: Number(r.fkDemande),
          nom_original: r.nom_original,
          chemin: r.chemin,
          mime: r.mime,
          taille: r.taille != null ? Number(r.taille) : null,
          datecreate: r.datecreate,
          url: r.chemin?.startsWith('/') ? r.chemin : `/${r.chemin}`,
        })),
      });
    }

    if (req.method === 'POST') {
      if (
        !hasAnyPermission(user as any, [
          PERMISSIONS.CONGE_ATTACHMENT_UPLOAD,
          PERMISSIONS.CONGE_REQUEST,
          PERMISSIONS.CONGE_REQUEST_CREATE,
          PERMISSIONS.MODULE_CONGE,
          PERMISSIONS.MODULE_ADMIN,
        ])
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Permissions insuffisantes' });
      }

      const { demandeId, files } = req.body || {};
      const fkDemande = Number(demandeId);
      if (!fkDemande || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'demandeId et files[] requis',
        });
      }

      const uploadDir = path.join(
        process.cwd(),
        'public',
        'uploads',
        'conge',
        String(fkDemande)
      );
      await fs.mkdir(uploadDir, { recursive: true });

      const saved: any[] = [];
      for (const file of files.slice(0, 10)) {
        const nom = String(file.nom || file.name || 'fichier');
        const mime = String(file.mime || file.type || '').toLowerCase();
        const b64 = String(file.contentBase64 || file.data || '');
        if (!ALLOWED_MIME.has(mime)) {
          return res.status(400).json({
            success: false,
            message: `Type non autorisé: ${mime || nom} (PDF/JPG/PNG)`,
          });
        }
        const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64');
        if (buf.length === 0 || buf.length > MAX_BYTES) {
          return res.status(400).json({
            success: false,
            message: `Fichier trop volumineux ou vide: ${nom} (max 5 Mo)`,
          });
        }
        const filename = `${randomUUID()}-${safeName(nom)}`;
        const abs = path.join(uploadDir, filename);
        await fs.writeFile(abs, buf);
        const chemin = `/uploads/conge/${fkDemande}/${filename}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO congedemande_fichier
            (fkDemande, nom_original, chemin, mime, taille, usercreateid)
           VALUES (?, ?, ?, ?, ?, ?)`,
          fkDemande,
          nom.slice(0, 255),
          chemin,
          mime,
          buf.length,
          Number(user.id)
        );
        saved.push({ nom_original: nom, chemin, mime, taille: buf.length });
      }

      return res.status(201).json({
        success: true,
        message: `${saved.length} fichier(s) enregistré(s)`,
        fichiers: saved,
      });
    }

    if (req.method === 'DELETE') {
      if (
        !hasAnyPermission(user as any, [
          PERMISSIONS.CONGE_ATTACHMENT_UPLOAD,
          PERMISSIONS.CONGE_REQUEST_EDIT,
          PERMISSIONS.CONGE_REQUEST,
          PERMISSIONS.MODULE_ADMIN,
        ])
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Permissions insuffisantes' });
      }
      const id = Number(req.query.id);
      if (!id) {
        return res.status(400).json({ success: false, message: 'id requis' });
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, chemin FROM congedemande_fichier WHERE id = ? LIMIT 1`,
        id
      );
      const row = rows?.[0];
      if (!row) {
        return res.status(404).json({ success: false, message: 'Fichier introuvable' });
      }
      try {
        if (row.chemin) {
          const abs = path.join(
            process.cwd(),
            'public',
            String(row.chemin).replace(/^\//, '')
          );
          await fs.unlink(abs).catch(() => undefined);
        }
      } catch {
        /* ignore missing file */
      }
      await prisma.$executeRawUnsafe(
        `DELETE FROM congedemande_fichier WHERE id = ?`,
        id
      );
      return res.status(200).json({ success: true, message: 'Fichier supprimé' });
    }

    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  } catch (e: any) {
    console.error('demande-fichiers:', e);
    return res.status(500).json({
      success: false,
      message: e?.message || 'Erreur serveur',
    });
  }
}
