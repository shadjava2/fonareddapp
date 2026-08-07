import fs from 'fs/promises';
import path from 'path';

/**
 * Racine writable pour les uploads congé (Docker standalone + local).
 */
export function getCongeUploadsRoot(): string {
  const candidates = [
    path.join(process.cwd(), 'public', 'uploads', 'conge'),
    path.join(process.cwd(), 'uploads', 'conge'),
    path.join(process.cwd(), '..', '..', 'public', 'uploads', 'conge'),
  ];
  // Préférer le chemin public à côté de server.js (standalone)
  return candidates[0];
}

export function absolutePathFromChemin(chemin: string): string {
  const rel = String(chemin || '').replace(/^\//, '');
  // /uploads/conge/... → public/uploads/conge/... sous cwd standalone
  if (rel.startsWith('uploads/')) {
    return path.join(process.cwd(), 'public', rel);
  }
  return path.join(process.cwd(), 'public', rel);
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}
