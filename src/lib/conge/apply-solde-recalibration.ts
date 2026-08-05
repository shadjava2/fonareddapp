import { recalibrateSoldeForMonth } from '@/lib/conge/solde-recalibration';
import { prisma } from '@/lib/prisma';

export type RecalibrationApplyResult = {
  updated: number;
  currentMonth: number;
  monthName: string;
  monthsCounted: number;
  nbjourMois: number;
  totalPrevuSansConso: number;
  resetYear: boolean;
};

/**
 * Recalibre les soldes de tous les agents actifs (ou un seul).
 * Optimisé : charge en lot puis met à jour par lots parallèles.
 */
export async function applySoldeRecalibration(params: {
  nbjourMois: number;
  currentMonth?: number;
  utilisateurId?: bigint | null;
  actorUserId?: bigint | null;
  /** Plafond NJ à poser en janvier (optionnel) */
  plafondNonJustifie?: number | null;
}): Promise<RecalibrationApplyResult> {
  const now = new Date();
  const currentMonth = params.currentMonth ?? now.getMonth() + 1;
  const nbjourMois = Number(params.nbjourMois) || 0;
  const actor = params.actorUserId ?? null;
  const plafondNJ =
    params.plafondNonJustifie != null &&
    Number.isFinite(Number(params.plafondNonJustifie))
      ? Math.max(0, Number(params.plafondNonJustifie))
      : null;

  const users = await prisma.utilisateurs.findMany({
    where: {
      locked: false,
      ...(params.utilisateurId ? { id: params.utilisateurId } : {}),
    },
    select: { id: true },
    take: params.utilisateurId ? 1 : 5000,
  });

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    const empty = recalibrateSoldeForMonth({
      currentMonth,
      nbjourMois,
      soldeConsomme: 0,
    });
    return {
      updated: 0,
      currentMonth: empty.currentMonth,
      monthName: empty.monthName,
      monthsCounted: empty.monthsCounted,
      nbjourMois,
      totalPrevuSansConso: empty.totalPrevu,
      resetYear: empty.resetYear,
    };
  }

  const soldes = await prisma.congesolde.findMany({
    where: { fkUtilisateur: { in: userIds } },
    orderBy: { datecreate: 'desc' },
  });

  const soldeByUser = new Map<string, (typeof soldes)[0]>();
  for (const s of soldes) {
    if (s.fkUtilisateur == null) continue;
    const key = String(s.fkUtilisateur);
    if (!soldeByUser.has(key)) soldeByUser.set(key, s);
  }

  const meta = recalibrateSoldeForMonth({
    currentMonth,
    nbjourMois,
    soldeConsomme: 0,
  });

  const CHUNK = 25;
  let updated = 0;

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async (uid) => {
        const existing = soldeByUser.get(String(uid));
        const calc = recalibrateSoldeForMonth({
          currentMonth,
          nbjourMois,
          soldeConsomme: Number(existing?.soldeConsomme) || 0,
        });

        const njPatch =
          calc.resetYear && plafondNJ != null
            ? { congenonjustifie: plafondNJ }
            : {};

        if (existing) {
          await prisma.congesolde.update({
            where: { id: existing.id },
            data: {
              solde: calc.restant,
              soldeConsomme: calc.consomme,
              ...njPatch,
              ...(actor != null ? { userupdateid: actor } : {}),
              dateupdate: now,
            },
          });
        } else {
          await prisma.congesolde.create({
            data: {
              fkUtilisateur: uid,
              solde: calc.restant,
              soldeConsomme: calc.consomme,
              congenonjustifie: plafondNJ ?? 0,
              usercreateid: actor ?? uid,
              userupdateid: actor ?? uid,
            },
          });
        }
        return 1;
      })
    );
    updated += results.reduce((a, b) => a + b, 0);
  }

  return {
    updated,
    currentMonth: meta.currentMonth,
    monthName: meta.monthName,
    monthsCounted: meta.monthsCounted,
    nbjourMois,
    totalPrevuSansConso: meta.totalPrevu,
    resetYear: meta.resetYear,
  };
}
