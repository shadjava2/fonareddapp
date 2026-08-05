import { requireApiPermissions } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/rbac';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import type { NextApiRequest, NextApiResponse } from 'next';

const AUTH = [
  PERMISSIONS.CONGE_CONFIG,
  PERMISSIONS.CONGE_TRAITEMENT,
  PERMISSIONS.MODULE_CONGE,
  PERMISSIONS.MODULE_ADMIN,
];

export type HistoriqueCongeKind =
  | 'processus_normal'
  | 'saisie_manuelle'
  | 'non_justifie';

export type HistoriqueCongeItem = {
  id: string;
  kind: HistoriqueCongeKind;
  label: string;
  du: string | null;
  au: string | null;
  nbrjour: number;
  statut: string | null;
  section: string | null;
  commentaire: string | null;
  datecreate: string | null;
  typeConge: string | null;
};

function ymd(d: Date | null | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yearOf(d: Date | null | undefined, fallback?: Date | null): number | null {
  const src = d || fallback;
  if (!src) return null;
  return src.getFullYear();
}

function stripHtml(raw: string): string {
  return raw
    .split('<')
    .map((part, i) => (i === 0 ? part : part.includes('>') ? part.slice(part.indexOf('>') + 1) : part))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function isSaisieManuelle(section: string | null | undefined): boolean {
  const s = String(section || '');
  return s === 'Saisie manuelle' || s.startsWith('Saisie manuelle');
}

/**
 * Historique des congés d'un agent (processus normal, saisie manuelle, NJ)
 * + statistiques annuelles et liste des années disponibles.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ success: false, message: 'Méthode non autorisée' });
  }

  const authUser = await requireApiPermissions(req, res, AUTH);
  if (!authUser) return;

  try {
    const uidRaw = String(req.query.utilisateurId || '').trim();
    if (!uidRaw) {
      return res.status(400).json({
        success: false,
        message: 'utilisateurId est requis',
      });
    }

    const uid = BigInt(uidRaw);
    const nowYear = new Date().getFullYear();
    const yearParam = String(req.query.year || '').trim();
    const year = yearParam
      ? Number.parseInt(yearParam, 10)
      : nowYear;
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Année invalide',
      });
    }

    const user = await prisma.utilisateurs.findUnique({
      where: { id: uid },
      select: {
        id: true,
        nom: true,
        prenom: true,
        postnom: true,
        username: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      });
    }

    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const [demandes, njRows, types, allDemandesLite, allNjLite] =
      await Promise.all([
        prisma.congedemande.findMany({
          where: {
            usercreateid: uid,
            statut: 'APPROUVEE',
            OR: [
              { du: { gte: yearStart, lte: yearEnd } },
              {
                AND: [
                  { du: null },
                  { datecreate: { gte: yearStart, lte: yearEnd } },
                ],
              },
            ],
          },
          orderBy: [{ du: 'desc' }, { datecreate: 'desc' }],
          take: 500,
        }),
        prisma.congeNonJustifieRetrait.findMany({
          where: {
            fkUtilisateur: uid,
            OR: [
              { dateDebut: { gte: yearStart, lte: yearEnd } },
              {
                AND: [
                  { dateDebut: null },
                  { datecreate: { gte: yearStart, lte: yearEnd } },
                ],
              },
            ],
          },
          orderBy: [{ dateDebut: 'desc' }, { datecreate: 'desc' }],
          take: 500,
        }),
        prisma.congetypes.findMany({
          select: { id: true, nom: true },
          take: 500,
        }),
        prisma.congedemande.findMany({
          where: { usercreateid: uid, statut: 'APPROUVEE' },
          select: { du: true, datecreate: true },
          take: 5000,
        }),
        prisma.congeNonJustifieRetrait.findMany({
          where: { fkUtilisateur: uid },
          select: { dateDebut: true, datecreate: true },
          take: 5000,
        }),
      ]);

    const typeMap = new Map(
      types.map((t) => [String(t.id), t.nom || `Type #${t.id}`])
    );

    const items: HistoriqueCongeItem[] = [];

    for (const d of demandes) {
      const saisie = isSaisieManuelle(d.section);
      items.push({
        id: `d-${d.id}`,
        kind: saisie ? 'saisie_manuelle' : 'processus_normal',
        label: saisie ? 'Saisie manuelle' : 'Processus normal',
        du: ymd(d.du),
        au: ymd(d.au),
        nbrjour: Number(d.nbrjour) || 0,
        statut: d.statut || null,
        section: d.section || null,
        commentaire: d.remiseetreprise
          ? stripHtml(String(d.remiseetreprise))
          : null,
        datecreate: d.datecreate ? d.datecreate.toISOString() : null,
        typeConge: d.fkTypeConge
          ? typeMap.get(String(d.fkTypeConge)) || null
          : null,
      });
    }

    for (const n of njRows) {
      items.push({
        id: `nj-${n.id}`,
        kind: 'non_justifie',
        label: 'Congé non justifié',
        du: ymd(n.dateDebut),
        au: ymd(n.dateFin),
        nbrjour: Number(n.nbrjours) || 0,
        statut: null,
        section: null,
        commentaire: n.commentaire || null,
        datecreate: n.datecreate ? n.datecreate.toISOString() : null,
        typeConge: null,
      });
    }

    items.sort((a, b) => {
      const da = a.du || a.datecreate || '';
      const db = b.du || b.datecreate || '';
      return db.localeCompare(da);
    });

    const yearsSet = new Set<number>([nowYear]);
    for (const d of allDemandesLite) {
      const y = yearOf(d.du, d.datecreate);
      if (y) yearsSet.add(y);
    }
    for (const n of allNjLite) {
      const y = yearOf(n.dateDebut, n.datecreate);
      if (y) yearsSet.add(y);
    }
    // Inclure quelques années antérieures même sans données
    for (let y = nowYear; y >= nowYear - 5; y--) yearsSet.add(y);
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const stats = {
      year,
      totalJours: 0,
      processusNormal: { count: 0, jours: 0 },
      saisieManuelle: { count: 0, jours: 0 },
      nonJustifie: { count: 0, jours: 0 },
    };

    for (const it of items) {
      stats.totalJours += it.nbrjour;
      if (it.kind === 'processus_normal') {
        stats.processusNormal.count += 1;
        stats.processusNormal.jours += it.nbrjour;
      } else if (it.kind === 'saisie_manuelle') {
        stats.saisieManuelle.count += 1;
        stats.saisieManuelle.jours += it.nbrjour;
      } else {
        stats.nonJustifie.count += 1;
        stats.nonJustifie.jours += it.nbrjour;
      }
    }

    // Arrondi affichage
    stats.totalJours = Math.round(stats.totalJours * 1000) / 1000;
    stats.processusNormal.jours =
      Math.round(stats.processusNormal.jours * 1000) / 1000;
    stats.saisieManuelle.jours =
      Math.round(stats.saisieManuelle.jours * 1000) / 1000;
    stats.nonJustifie.jours =
      Math.round(stats.nonJustifie.jours * 1000) / 1000;

    return res.status(200).json({
      success: true,
      agent: {
        id: String(user.id),
        label: formatPersonDisplayName(user) || user.username,
        username: user.username,
      },
      year,
      years,
      stats,
      items,
    });
  } catch (e: unknown) {
    console.error('historique-conges:', e);
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : 'Erreur serveur',
    });
  }
}
