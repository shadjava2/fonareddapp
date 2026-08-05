import { prisma } from '@/lib/prisma';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/hikvision/sync-ivms-photos
 * Copie docs/hikvision/enrlFace + export_pic → public/uploads/acs/faces
 * et met à jour acs_users.face_path quand employee_no = Person ID numérique.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  try {
    if (!prisma) {
      return res
        .status(500)
        .json({ ok: false, error: 'Prisma non initialisé' });
    }

    const root = process.cwd();
    const docs = path.join(root, 'docs', 'hikvision');
    const outDir = path.join(root, 'public', 'uploads', 'acs', 'faces');
    await fs.mkdir(outDir, { recursive: true });

    const sources = [
      path.join(docs, 'enrlFace', '0'),
      path.join(docs, 'export_pic'),
    ];

    let copied = 0;
    let linked = 0;
    const errors: string[] = [];

    for (const dir of sources) {
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const name of entries) {
        if (!/\.jpe?g$/i.test(name)) continue;
        const m = name.match(/(\d+)/);
        if (!m) continue;
        const personId = String(Number(m[1])); // 0000000003 → "3"
        const destName = `${personId}.jpg`;
        const src = path.join(dir, name);
        const dest = path.join(outDir, destName);
        try {
          await fs.copyFile(src, dest);
          copied += 1;
          const face_path = `/uploads/acs/faces/${destName}`;
          const updated = await prisma.acs_users.updateMany({
            where: { employee_no: personId },
            data: { face_path },
          });
          linked += updated.count;
        } catch (e: unknown) {
          errors.push(
            `${name}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }

    return res.status(200).json({
      ok: true,
      copied,
      linked,
      outDir: '/uploads/acs/faces',
      errors: errors.slice(0, 20),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[sync-ivms-photos]', message);
    return res.status(500).json({ ok: false, error: message });
  }
}
