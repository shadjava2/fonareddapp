import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import type { NonJustifiePdfRow } from '@/lib/reports/NonJustifiePdfDocument';
import type { ReactElement } from 'react';

/**
 * Logo officiel d’en-tête : `public/logo.png` à la racine du projet Next (data URI pour @react-pdf).
 */
export function getFonareddLogoSrcForPdf(): string | undefined {
  const png = path.join(process.cwd(), 'public', 'logo.png');
  if (!fs.existsSync(png)) return undefined;
  const buf = fs.readFileSync(png);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

export type NonJustifieReportPayload = {
  agentLine: string;
  username: string;
  mail: string | null;
  plafondStr: string;
  soldeRestantStr: string;
  generatedStr: string;
  rows: NonJustifiePdfRow[];
};

export async function loadNonJustifieReportForAgent(
  fkUtilisateur: bigint
): Promise<NonJustifieReportPayload | null> {
  const agent = await prisma.utilisateurs.findUnique({
    where: { id: fkUtilisateur },
    select: {
      id: true,
      nom: true,
      prenom: true,
      username: true,
      mail: true,
    },
  });

  if (!agent) {
    return null;
  }

  const [retraits, config, solde] = await Promise.all([
    prisma.congeNonJustifieRetrait.findMany({
      where: { fkUtilisateur },
      orderBy: { datecreate: 'desc' },
      take: 500,
    }),
    prisma.congeconfig.findFirst({ orderBy: { dateupdate: 'desc' } }),
    prisma.congesolde.findFirst({
      where: { fkUtilisateur },
      orderBy: { datecreate: 'desc' },
    }),
  ]);

  const agentLine =
    [agent.prenom, agent.nom].filter((p) => p && String(p).trim()).join(' ').trim() ||
    agent.username;

  const plafond = config?.congenonjustifie;
  const plafondStr =
    plafond != null && Number.isFinite(Number(plafond))
      ? `${Number(plafond)} j.`
      : '—';

  const sr = solde?.congenonjustifie;
  const soldeRestantStr =
    sr != null && Number.isFinite(Number(sr)) ? `${Number(sr)} j.` : '—';

  const rows: NonJustifiePdfRow[] = retraits.map((r) => ({
    id: r.id.toString(),
    dateStr: new Date(r.datecreate).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
    joursStr: String(r.nbrjours),
    resteStr: r.resteApres != null ? String(r.resteApres) : '—',
    commentaire: (r.commentaire?.trim() || '—')
      .replaceAll(/\s+/g, ' ')
      .slice(0, 400),
  }));

  const generatedStr = new Date().toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return {
    agentLine,
    username: agent.username,
    mail: agent.mail,
    plafondStr,
    soldeRestantStr,
    generatedStr,
    rows,
  };
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function renderNonJustifiePdfBuffer(
  element: ReactElement
): Promise<Buffer> {
  const { pdf } = await import('@react-pdf/renderer');
  const instance = pdf(element);
  const fileStream = await instance.toBuffer();
  return streamToBuffer(fileStream);
}
