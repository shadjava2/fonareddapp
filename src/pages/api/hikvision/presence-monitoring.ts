import { requireApiPermissions } from '@/lib/api-auth';
import { normalizeEmployeeNo } from '@/lib/presence/attendance-performance';
import {
  buildPresenceMonitoring,
  type MonitoringActionCode,
  type MonitoringRuleCode,
} from '@/lib/presence/presence-monitoring';
import {
  ensurePresenceMonitoringTable,
  findPresenceActionUnique,
  upsertPresenceAction,
} from '@/lib/presence/presence-monitoring-store';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/rbac';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    responseLimit: false,
  },
};

const AUTH = [
  PERMISSIONS.PRESENCE_MANAGE,
  PERMISSIONS.PRESENCE_VIEW,
  PERMISSIONS.MODULE_PERSONNEL,
  PERMISSIONS.MODULE_ADMIN,
];

const ACTIONS = new Set<MonitoringActionCode>([
  'pending',
  'observation',
  'explication_demandee',
  'blame_declenche',
  'revocation_proposee',
  'retrait_conge_fait',
  'justification_recue',
]);

const RULES = new Set<MonitoringRuleCode>([
  'ABS_CONSEC_2',
  'ABS_GT_3',
  'NJ_EPUISE_ABS',
  'MALADIE_GT_2',
  'RETARD_ENTREE_8',
  'RETARD_SORTIE',
]);

async function debitLeaveForEmployee(params: {
  employeeNo: string;
  jours: number;
  actorId: bigint;
  alreadyDebited: boolean;
}): Promise<{ debited: boolean; jours: number; message?: string }> {
  if (params.alreadyDebited) {
    return { debited: false, jours: 0, message: 'Déjà débité pour ce cas.' };
  }
  const jours = Math.round(Math.max(0, params.jours) * 1000) / 1000;
  if (jours <= 0) {
    return { debited: false, jours: 0, message: 'Aucun jour à débiter.' };
  }
  if (!prisma) {
    return { debited: false, jours: 0, message: 'Prisma non initialisé.' };
  }

  const emp = normalizeEmployeeNo(params.employeeNo);
  const acs = await prisma.acs_users.findFirst({
    where: {
      OR: [{ employee_no: emp }, { employee_no: `'${emp}` }],
      system_user_id: { not: null },
    },
    select: { system_user_id: true },
  });
  if (!acs?.system_user_id) {
    return {
      debited: false,
      jours: 0,
      message:
        'Agent ACS non lié à un utilisateur système — débit solde impossible.',
    };
  }

  const solde = await prisma.congesolde.findFirst({
    where: { fkUtilisateur: acs.system_user_id },
    orderBy: { datecreate: 'desc' },
  });
  if (!solde) {
    return {
      debited: false,
      jours: 0,
      message: 'Aucun solde de congé pour cet agent.',
    };
  }

  const restant = Number(solde.solde) || 0;
  const debit = Math.min(jours, restant);
  const nouveau = Math.round((restant - debit) * 1000) / 1000;
  const consomme =
    Math.round(((Number(solde.soldeConsomme) || 0) + debit) * 1000) / 1000;

  await prisma.congesolde.update({
    where: { id: solde.id },
    data: {
      solde: nouveau,
      soldeConsomme: consomme,
      userupdateid: params.actorId,
    },
  });

  return { debited: debit > 0, jours: debit };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authUser = await requireApiPermissions(req, res, AUTH);
  if (!authUser) return;

  try {
    await ensurePresenceMonitoringTable();

    if (req.method === 'GET') {
      const now = new Date();
      const year = Number(req.query.year) || now.getFullYear();
      const month = Number(req.query.month) || now.getMonth() + 1;
      if (
        !Number.isFinite(year) ||
        year < 2000 ||
        year > 2100 ||
        !Number.isFinite(month) ||
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message: 'year / month invalides',
        });
      }

      const scopeRaw = String(req.query.scope || 'month').toLowerCase();
      const scope = scopeRaw === 'ytd' ? 'ytd' : 'month';

      const data = await buildPresenceMonitoring({ year, month, scope });
      return res.status(200).json({ success: true, ...data });
    }

    if (req.method === 'POST') {
      const employeeNo = normalizeEmployeeNo(
        String(req.body?.employeeNo || '')
      );
      const year = Number(req.body?.year);
      const month = Number(req.body?.month);
      const ruleCode = String(req.body?.ruleCode || '') as MonitoringRuleCode;
      const action = String(req.body?.action || '') as MonitoringActionCode;
      const notes =
        typeof req.body?.notes === 'string'
          ? req.body.notes.trim().slice(0, 500)
          : null;
      const joursRetrait = Number(req.body?.joursRetrait) || 0;
      const metricValue =
        req.body?.metricValue != null &&
        Number.isFinite(Number(req.body.metricValue))
          ? Number(req.body.metricValue)
          : null;
      let detailObj: Record<string, unknown> = {};
      if (typeof req.body?.detail === 'string' && req.body.detail) {
        try {
          detailObj = JSON.parse(req.body.detail);
        } catch {
          detailObj = {};
        }
      } else if (req.body?.detail && typeof req.body.detail === 'object') {
        detailObj = req.body.detail as Record<string, unknown>;
      }

      if (!employeeNo) {
        return res.status(400).json({
          success: false,
          message: 'employeeNo requis',
        });
      }
      if (
        !Number.isFinite(year) ||
        year < 2000 ||
        !Number.isFinite(month) ||
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message: 'year / month invalides',
        });
      }
      if (!RULES.has(ruleCode)) {
        return res.status(400).json({
          success: false,
          message: 'ruleCode invalide',
        });
      }
      if (!ACTIONS.has(action)) {
        return res.status(400).json({
          success: false,
          message: 'action invalide',
        });
      }

      const existing = await findPresenceActionUnique({
        employeeNo,
        year,
        month,
        ruleCode,
      });

      let alreadyDebited = false;
      if (existing?.detail) {
        try {
          const prev = JSON.parse(existing.detail) as {
            soldeDebite?: boolean;
          };
          alreadyDebited = Boolean(prev.soldeDebite);
        } catch {
          alreadyDebited = false;
        }
      }

      let debitInfo: {
        debited: boolean;
        jours: number;
        message?: string;
      } | null = null;

      if (action === 'retrait_conge_fait') {
        debitInfo = await debitLeaveForEmployee({
          employeeNo,
          jours: joursRetrait,
          actorId: BigInt(authUser.id),
          alreadyDebited,
        });
        if (debitInfo.debited) {
          detailObj = {
            ...detailObj,
            soldeDebite: true,
            joursDebites: debitInfo.jours,
            debiteAt: new Date().toISOString(),
          };
        } else if (alreadyDebited) {
          detailObj = { ...detailObj, soldeDebite: true };
        }
      }

      const detailStr = JSON.stringify(detailObj);
      const actor = BigInt(authUser.id);

      const saved = await upsertPresenceAction({
        employeeNo,
        year,
        month,
        ruleCode,
        action,
        notes,
        metricValue,
        detail: detailStr,
        actorId: actor,
      });

      let message = 'Action enregistrée.';
      if (action === 'retrait_conge_fait' && debitInfo) {
        message = debitInfo.debited
          ? `Action enregistrée. Solde débité de ${debitInfo.jours} j.`
          : `Action enregistrée. ${debitInfo.message || ''}`.trim();
      }

      return res.status(200).json({
        success: true,
        message,
        action: {
          id: String(saved.id),
          employeeNo: saved.employee_no,
          year: saved.year,
          month: saved.month,
          ruleCode: saved.rule_code,
          action: saved.action,
          notes: saved.notes,
          metricValue: saved.metric_value,
          detail: saved.detail,
        },
        debit: debitInfo,
      });
    }

    return res
      .status(405)
      .json({ success: false, message: 'Méthode non autorisée' });
  } catch (e: unknown) {
    console.error('presence-monitoring:', e);
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : 'Erreur serveur',
    });
  }
}
