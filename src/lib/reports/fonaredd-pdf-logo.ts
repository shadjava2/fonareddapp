import fs from 'node:fs';
import path from 'node:path';

/**
 * Logo d’en-tête PDF : `public/logo.png` (data URI pour @react-pdf).
 * Module autonome (sans Prisma) pour éviter les soucis de résolution côté routes API.
 */
export function getFonareddLogoSrcForPdf(): string | undefined {
  const png = path.join(process.cwd(), 'public', 'logo.png');
  if (!fs.existsSync(png)) return undefined;
  const buf = fs.readFileSync(png);
  return `data:image/png;base64,${buf.toString('base64')}`;
}
