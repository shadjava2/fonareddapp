import { requireApiPermissions } from '@/lib/api-auth';
import { applySoldeRecalibration } from '@/lib/conge/apply-solde-recalibration';
import { recalibrateSoldeForMonth } from '@/lib/conge/solde-recalibration';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/rbac';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const AUTH = [
  PERMISSIONS.CONGE_CONFIG,
  PERMISSIONS.CONGE_TRAITEMENT,
  PERMISSIONS.MODULE_CONGE,
  PERMISSIONS.MODULE_ADMIN,
];

type AgentRow = {
  id: string;
  label: string;
  username: string;
  soldeId: string | null;
  solde: number;
  soldeConsomme: number;
  soldeRestant: number;
  totalPrevu: number;
  monthsCounted: number;
  needsCorrection: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authUser = await requireApiPermissions(req, res, AUTH);
  if (!authUser) return;

  try {
    const configRow = await prisma.congeconfig.findFirst({
      orderBy: { dateupdate: 'desc' },
    });
    const nbjourMois = Number(configRow?.nbjourMois) || 0;
    if (nbjourMois <= 0) {
      return res.status(400).json({
        success: false,
        message:
          'Configuration nbjourMois introuvable. Renseignez Config Congé d’abord.',
      });
    }

    const plafondNJRaw = configRow?.congenonjustifie;
    const plafondNJ =
      plafondNJRaw != null && Number.isFinite(Number(plafondNJRaw))
        ? Math.max(0, Number(plafondNJRaw))
        : 0;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    if (req.method === 'GET') {
      const users = await prisma.utilisateurs.findMany({
        where: { locked: false },
        select: {
          id: true,
          nom: true,
          prenom: true,
          postnom: true,
          username: true,
        },
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        take: 2000,
      });

      const soldes = await prisma.congesolde.findMany({
        where: {
          fkUtilisateur: { in: users.map((u) => u.id) },
        },
        orderBy: { datecreate: 'desc' },
      });

      const soldeByUser = new Map<string, (typeof soldes)[0]>();
      for (const s of soldes) {
        if (s.fkUtilisateur == null) continue;
        const key = String(s.fkUtilisateur);
        if (!soldeByUser.has(key)) soldeByUser.set(key, s);
      }

      const agents: AgentRow[] = users.map((u) => {
        const s = soldeByUser.get(String(u.id));
        const consommeActuel = Number(s?.soldeConsomme) || 0;
        const restantActuel = Number(s?.solde) || 0;
        const calc = recalibrateSoldeForMonth({
          currentMonth,
          nbjourMois,
          soldeConsomme: consommeActuel,
        });
        const needsCorrection =
          !s ||
          Math.abs(restantActuel - calc.restant) > 0.001 ||
          (calc.resetYear && consommeActuel > 0);

        return {
          id: String(u.id),
          label: formatPersonDisplayName(u) || u.username,
          username: u.username,
          soldeId: s ? String(s.id) : null,
          solde: restantActuel,
          soldeConsomme: consommeActuel,
          soldeRestant: restantActuel,
          totalPrevu: calc.totalPrevu,
          monthsCounted: calc.monthsCounted,
          needsCorrection,
        };
      });

      return res.status(200).json({
        success: true,
        nbjourMois,
        currentMonth: calcMonthMeta(currentMonth, nbjourMois),
        agents,
      });
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || 'correct-all');
      const onlyUserId = req.body?.utilisateurId
        ? String(req.body.utilisateurId).trim()
        : null;

      const result = await applySoldeRecalibration({
        nbjourMois,
        currentMonth,
        utilisateurId: onlyUserId ? BigInt(onlyUserId) : null,
        actorUserId: BigInt(authUser.id),
        plafondNonJustifie: plafondNJ,
      });

      const msg =
        result.resetYear
          ? `Janvier : ${result.updated} solde(s) remis à zéro.`
          : action === 'correct-one' && onlyUserId
            ? `Solde recalibré (${result.monthsCounted} mois × ${nbjourMois} − consommé).`
            : `${result.updated} agent(s) recalibré(s) : ${result.monthsCounted} mois × ${nbjourMois} j. (− consommé).`;

      return res.status(200).json({
        success: true,
        message: msg,
        updated: result.updated,
        currentMonth: {
          month: result.currentMonth,
          monthName: result.monthName,
          monthsCounted: result.monthsCounted,
          nbjourMois: result.nbjourMois,
          totalPrevuSansConso: result.totalPrevuSansConso,
          resetYear: result.resetYear,
        },
      });
    }

    return res
      .status(405)
      .json({ success: false, message: 'Méthode non autorisée' });
  } catch (e: unknown) {
    console.error('repertoire-personnel:', e);
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : 'Erreur serveur',
    });
  }
}

function calcMonthMeta(currentMonth: number, nbjourMois: number) {
  const calc = recalibrateSoldeForMonth({
    currentMonth,
    nbjourMois,
    soldeConsomme: 0,
  });
  return {
    month: calc.currentMonth,
    monthName: calc.monthName,
    monthsCounted: calc.monthsCounted,
    nbjourMois: calc.nbjourMois,
    totalPrevuSansConso: calc.totalPrevu,
    resetYear: calc.resetYear,
  };
}
