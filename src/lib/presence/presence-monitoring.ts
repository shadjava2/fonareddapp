import {
  computePerformanceReports,
  normalizeEmployeeNo,
  type DayPerformanceRow,
  type EmployeePerformanceReport,
} from '@/lib/presence/attendance-performance';
import {
  ensurePresenceMonitoringTable,
  findPresenceActionsByYearRange,
} from '@/lib/presence/presence-monitoring-store';
import { prisma } from '@/lib/prisma';

export type MonitoringActionCode =
  | 'pending'
  | 'observation'
  | 'explication_demandee'
  | 'blame_declenche'
  | 'revocation_proposee'
  | 'retrait_conge_fait'
  | 'justification_recue';

export type MonitoringRuleCode =
  | 'ABS_CONSEC_2'
  | 'ABS_GT_3'
  | 'NJ_EPUISE_ABS'
  | 'MALADIE_GT_2'
  | 'RETARD_ENTREE_8'
  | 'RETARD_SORTIE';

export type MonitoringCase = {
  employeeNo: string;
  employeeName: string;
  department: string;
  year: number;
  month: number;
  ruleCode: MonitoringRuleCode;
  ruleLabel: string;
  suggestedAction: string;
  section:
    | 'blame'
    | 'explication'
    | 'absences'
    | 'retards_entree'
    | 'retards_sortie';
  metricValue: number;
  metricLabel: string;
  detail: Record<string, unknown>;
  action: MonitoringActionCode;
  notes: string | null;
  actionId: string | null;
  joursRetraitSuggeres: number;
};

export type MonitoringRankingRow = {
  employeeNo: string;
  employeeName: string;
  department: string;
  lateEntry: number;
  earlyLeave: number;
  lateExit: number;
  absent: number;
};

export type PresenceMonitoringScope = 'month' | 'ytd';

export type PresenceMonitoringResult = {
  year: number;
  month: number;
  /** month = un mois ; ytd = janvier → month (inclus) */
  scope: PresenceMonitoringScope;
  monthLabel: string;
  from: string;
  to: string;
  months: number[];
  njPlafond: number;
  rulesLegend: Array<{ code: MonitoringRuleCode; label: string; suggestion: string }>;
  kpis: {
    pendingTotal: number;
    pendingBlame: number;
    pendingExplication: number;
    pendingAbsences: number;
    pendingRetardsEntree: number;
    pendingRetardsSortie: number;
    treatedTotal: number;
  };
  cases: MonitoringCase[];
  rankingsYear: {
    lateEntry: MonitoringRankingRow[];
    lateExit: MonitoringRankingRow[];
    earlyLeave: MonitoringRankingRow[];
  };
};

const RULE_META: Record<
  MonitoringRuleCode,
  { label: string; suggestion: string; section: MonitoringCase['section'] }
> = {
  ABS_CONSEC_2: {
    label: '≥ 2 absences consécutives (mois)',
    suggestion: 'Retrait jours de congé',
    section: 'absences',
  },
  ABS_GT_3: {
    label: '> 3 absences / mois',
    suggestion: 'Justification + demande d’explication + retrait',
    section: 'explication',
  },
  NJ_EPUISE_ABS: {
    label: 'Solde NJ épuisé + ≥ 2 absences',
    suggestion: 'Sanction / blâme',
    section: 'blame',
  },
  MALADIE_GT_2: {
    label: '> 2 absences maladie / mois',
    suggestion: 'Demande d’explication',
    section: 'explication',
  },
  RETARD_ENTREE_8: {
    label: '≥ 8 retards d’entrée / mois',
    suggestion: 'Blâme / révocation',
    section: 'retards_entree',
  },
  RETARD_SORTIE: {
    label: '≥ 8 sorties anticipées ou tardives / mois',
    suggestion: 'Observation / blâme',
    section: 'retards_sortie',
  },
};

function monthBounds(year: number, month: number): { from: string; to: string } {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function monthLabelFr(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function eachDateKeyInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** Plus longue série d’absences ouvrées consécutives + dates de la 1re série ≥ 2 */
function findConsecutiveAbsences(days: DayPerformanceRow[]): {
  maxStreak: number;
  firstStreakDates: string[];
} {
  let maxStreak = 0;
  let cur = 0;
  let curDates: string[] = [];
  let firstStreakDates: string[] = [];

  for (const d of days) {
    if (!d.isWorkingDay) continue;
    if (d.arrivalStatus === 'absent') {
      cur += 1;
      curDates.push(d.date);
      if (cur > maxStreak) maxStreak = cur;
      if (cur >= 2 && firstStreakDates.length === 0) {
        firstStreakDates = [...curDates];
      }
    } else {
      cur = 0;
      curDates = [];
    }
  }
  return { maxStreak, firstStreakDates };
}

async function loadMaladieDaysByEmployee(
  from: string,
  to: string
): Promise<Map<string, string[]>> {
  const fromD = new Date(`${from}T00:00:00.000Z`);
  const toD = new Date(`${to}T23:59:59.999Z`);

  const types = await prisma.congetypes.findMany({
    select: { id: true, nom: true },
    take: 500,
  });
  const maladieTypeIds = types
    .filter((t) => /malad/i.test(String(t.nom || '')))
    .map((t) => t.id);

  const out = new Map<string, string[]>();
  if (maladieTypeIds.length === 0) return out;

  const demandes = await prisma.congedemande.findMany({
    where: {
      statut: 'APPROUVEE',
      fkTypeConge: { in: maladieTypeIds },
      du: { not: null, lte: toD },
      au: { not: null, gte: fromD },
      usercreateid: { not: null },
    },
    select: {
      usercreateid: true,
      du: true,
      au: true,
    },
    take: 20_000,
  });

  const userIds = [
    ...new Set(
      demandes
        .map((d) => d.usercreateid)
        .filter((id): id is bigint => id != null)
    ),
  ];
  if (userIds.length === 0) return out;

  const acsUsers = await prisma.acs_users.findMany({
    where: { system_user_id: { in: userIds } },
    select: { system_user_id: true, employee_no: true },
  });
  const empByUser = new Map<string, string[]>();
  for (const u of acsUsers) {
    if (u.system_user_id == null) continue;
    const emp = normalizeEmployeeNo(u.employee_no);
    if (!emp) continue;
    const key = String(u.system_user_id);
    const list = empByUser.get(key) || [];
    if (!list.includes(emp)) list.push(emp);
    empByUser.set(key, list);
  }

  for (const d of demandes) {
    if (!d.usercreateid || !d.du || !d.au) continue;
    const emps = empByUser.get(String(d.usercreateid)) || [];
    if (emps.length === 0) continue;
    const du = d.du.toISOString().slice(0, 10);
    const au = d.au.toISOString().slice(0, 10);
    const rangeFrom = du < from ? from : du;
    const rangeTo = au > to ? to : au;
    const days = eachDateKeyInclusive(rangeFrom, rangeTo);
    for (const emp of emps) {
      const list = out.get(emp) || [];
      for (const day of days) {
        if (!list.includes(day)) list.push(day);
      }
      out.set(emp, list);
    }
  }

  return out;
}

async function loadNjSoldeByEmployeeNo(
  employeeNos: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (employeeNos.length === 0) return map;

  const variants = [
    ...new Set(
      employeeNos.flatMap((n) => {
        const e = normalizeEmployeeNo(n);
        return e ? [e, `'${e}`] : [];
      })
    ),
  ];

  const acsUsers = await prisma.acs_users.findMany({
    where: { employee_no: { in: variants } },
    select: { employee_no: true, system_user_id: true },
  });

  const systemIds = [
    ...new Set(
      acsUsers
        .map((u) => u.system_user_id)
        .filter((id): id is bigint => id != null)
    ),
  ];
  if (systemIds.length === 0) return map;

  const soldes = await prisma.congesolde.findMany({
    where: { fkUtilisateur: { in: systemIds } },
    orderBy: { datecreate: 'desc' },
  });
  const soldeByUser = new Map<string, number>();
  for (const s of soldes) {
    if (s.fkUtilisateur == null) continue;
    const key = String(s.fkUtilisateur);
    if (!soldeByUser.has(key)) {
      soldeByUser.set(key, Number(s.congenonjustifie) || 0);
    }
  }

  for (const u of acsUsers) {
    const emp = normalizeEmployeeNo(u.employee_no);
    if (!emp || u.system_user_id == null) continue;
    const nj = soldeByUser.get(String(u.system_user_id));
    if (nj != null) map.set(emp, nj);
  }
  return map;
}

async function loadActions(
  year: number,
  monthFrom: number,
  monthTo: number
): Promise<
  Map<
    string,
    {
      id: bigint;
      action: string;
      notes: string | null;
      detail: string | null;
      metric_value: number | null;
    }
  >
> {
  await ensurePresenceMonitoringTable();
  const rows = await findPresenceActionsByYearRange(year, monthFrom, monthTo);
  const map = new Map<
    string,
    {
      id: bigint;
      action: string;
      notes: string | null;
      detail: string | null;
      metric_value: number | null;
    }
  >();
  for (const r of rows) {
    const emp = normalizeEmployeeNo(r.employee_no);
    map.set(`${emp}|${r.month}|${r.rule_code}`, {
      id: r.id,
      action: r.action,
      notes: r.notes,
      detail: r.detail,
      metric_value: r.metric_value,
    });
  }
  return map;
}

function pickMonth(
  report: EmployeePerformanceReport,
  year: number,
  month: number
) {
  return report.months.find((m) => m.year === year && m.month === month);
}

function pushCase(
  cases: MonitoringCase[],
  params: Omit<MonitoringCase, 'ruleLabel' | 'suggestedAction' | 'section'> & {
    ruleCode: MonitoringRuleCode;
  }
) {
  const meta = RULE_META[params.ruleCode];
  cases.push({
    ...params,
    ruleLabel: meta.label,
    suggestedAction: meta.suggestion,
    section: meta.section,
  });
}

type ActionsMap = Map<
  string,
  {
    id: bigint;
    action: string;
    notes: string | null;
    detail: string | null;
    metric_value: number | null;
  }
>;

function pushCasesForMonth(params: {
  cases: MonitoringCase[];
  report: EmployeePerformanceReport;
  year: number;
  month: number;
  from: string;
  to: string;
  maladieDaysAll: string[];
  njRestant: number | undefined;
  njKnown: boolean;
  njPlafond: number;
  actionsMap: ActionsMap;
}): void {
  const {
    cases,
    report,
    year,
    month,
    from,
    to,
    maladieDaysAll,
    njRestant,
    njKnown,
    njPlafond,
    actionsMap,
  } = params;

  const m = pickMonth(report, year, month);
  if (!m) return;

  const absentDays = m.days.filter(
    (d) => d.isWorkingDay && d.arrivalStatus === 'absent'
  );
  const lateDays = m.days.filter((d) => d.arrivalStatus === 'en_retard');
  const earlyLeaveDays = m.days.filter(
    (d) => d.departureStatus === 'sortie_anticipee'
  );
  const lateExitDays = m.days.filter(
    (d) => d.departureStatus === 'sortie_tardive'
  );

  const { maxStreak, firstStreakDates } = findConsecutiveAbsences(m.days);
  const maladieDays = maladieDaysAll.filter((d) => d >= from && d <= to);

  const base = {
    employeeNo: report.employeeNo,
    employeeName: report.employeeName,
    department: report.department,
    year,
    month,
  };

  const attachAction = (ruleCode: MonitoringRuleCode) => {
    const saved = actionsMap.get(`${report.employeeNo}|${month}|${ruleCode}`);
    return {
      action: (saved?.action as MonitoringActionCode) || 'pending',
      notes: saved?.notes ?? null,
      actionId: saved ? String(saved.id) : null,
    };
  };

  if (maxStreak >= 2) {
    const ruleCode: MonitoringRuleCode = 'ABS_CONSEC_2';
    pushCase(cases, {
      ...base,
      ruleCode,
      metricValue: maxStreak,
      metricLabel: `${maxStreak} j. consécutifs`,
      detail: { dates: firstStreakDates, maxStreak },
      joursRetraitSuggeres: Math.min(2, firstStreakDates.length || 2),
      ...attachAction(ruleCode),
    });
  }

  if (absentDays.length > 3) {
    const ruleCode: MonitoringRuleCode = 'ABS_GT_3';
    pushCase(cases, {
      ...base,
      ruleCode,
      metricValue: absentDays.length,
      metricLabel: `${absentDays.length} absences`,
      detail: { dates: absentDays.map((d) => d.date) },
      joursRetraitSuggeres: absentDays.length - 3,
      ...attachAction(ruleCode),
    });
  }

  if (njKnown && (njRestant ?? 0) <= 0 && absentDays.length >= 2) {
    const ruleCode: MonitoringRuleCode = 'NJ_EPUISE_ABS';
    pushCase(cases, {
      ...base,
      ruleCode,
      metricValue: absentDays.length,
      metricLabel: `${absentDays.length} abs. (NJ=0)`,
      detail: {
        dates: absentDays.map((d) => d.date),
        njRestant: 0,
        njPlafond,
      },
      joursRetraitSuggeres: 0,
      ...attachAction(ruleCode),
    });
  }

  if (maladieDays.length > 2) {
    const ruleCode: MonitoringRuleCode = 'MALADIE_GT_2';
    pushCase(cases, {
      ...base,
      ruleCode,
      metricValue: maladieDays.length,
      metricLabel: `${maladieDays.length} j. maladie`,
      detail: { dates: maladieDays },
      joursRetraitSuggeres: 0,
      ...attachAction(ruleCode),
    });
  }

  if (lateDays.length >= 8) {
    const ruleCode: MonitoringRuleCode = 'RETARD_ENTREE_8';
    pushCase(cases, {
      ...base,
      ruleCode,
      metricValue: lateDays.length,
      metricLabel: `${lateDays.length} retards entrée`,
      detail: { dates: lateDays.map((d) => d.date) },
      joursRetraitSuggeres: 0,
      ...attachAction(ruleCode),
    });
  }

  const sortieProblem = Math.max(earlyLeaveDays.length, lateExitDays.length);
  if (earlyLeaveDays.length >= 8 || lateExitDays.length >= 8) {
    const ruleCode: MonitoringRuleCode = 'RETARD_SORTIE';
    pushCase(cases, {
      ...base,
      ruleCode,
      metricValue: sortieProblem,
      metricLabel: `${earlyLeaveDays.length} anticip. / ${lateExitDays.length} tardives`,
      detail: {
        earlyLeaveDates: earlyLeaveDays.map((d) => d.date),
        lateExitDates: lateExitDays.map((d) => d.date),
      },
      joursRetraitSuggeres: 0,
      ...attachAction(ruleCode),
    });
  }
}

const MONTHS_SHORT = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Construit le monitoring de présence pour un mois, ou le cumul janv. → mois.
 */
export async function buildPresenceMonitoring(params: {
  year: number;
  month: number;
  scope?: PresenceMonitoringScope;
}): Promise<PresenceMonitoringResult> {
  const { year, month } = params;
  const scope: PresenceMonitoringScope =
    params.scope === 'ytd' ? 'ytd' : 'month';
  const months =
    scope === 'ytd'
      ? Array.from({ length: month }, (_, i) => i + 1)
      : [month];
  const monthFrom = months[0];
  const monthTo = months[months.length - 1];
  const rangeFrom = monthBounds(year, monthFrom).from;
  const rangeTo = monthBounds(year, monthTo).to;
  const yearFrom = `${year}-01-01`;
  const yearTo = `${year}-12-31`;

  const config = await prisma.congeconfig.findFirst({
    orderBy: { dateupdate: 'desc' },
    select: { congenonjustifie: true },
  });
  const njPlafond =
    config?.congenonjustifie != null &&
    Number.isFinite(Number(config.congenonjustifie))
      ? Math.max(0, Number(config.congenonjustifie))
      : 3;

  const [yearPerf, maladieMap, actionsMap] = await Promise.all([
    computePerformanceReports({ from: yearFrom, to: yearTo }),
    loadMaladieDaysByEmployee(rangeFrom, rangeTo),
    loadActions(year, monthFrom, monthTo),
  ]);

  const employeeNos = yearPerf.reports.map((r) => r.employeeNo);
  const njMap = await loadNjSoldeByEmployeeNo(employeeNos);

  const cases: MonitoringCase[] = [];

  for (const report of yearPerf.reports) {
    const njRestant = njMap.get(report.employeeNo);
    const njKnown = njMap.has(report.employeeNo);
    const maladieDaysAll = maladieMap.get(report.employeeNo) || [];

    for (const m of months) {
      const bounds = monthBounds(year, m);
      pushCasesForMonth({
        cases,
        report,
        year,
        month: m,
        from: bounds.from,
        to: bounds.to,
        maladieDaysAll,
        njRestant,
        njKnown,
        njPlafond,
        actionsMap,
      });
    }
  }

  const yearRows: MonitoringRankingRow[] = yearPerf.reports.map((r) => ({
    employeeNo: r.employeeNo,
    employeeName: r.employeeName,
    department: r.department,
    lateEntry: r.totals.late,
    earlyLeave: r.totals.earlyLeave,
    lateExit: r.totals.lateExit,
    absent: r.totals.absent,
  }));

  const rankingsYear = {
    lateEntry: [...yearRows]
      .sort((a, b) => b.lateEntry - a.lateEntry)
      .filter((r) => r.lateEntry > 0)
      .slice(0, 15),
    lateExit: [...yearRows]
      .sort((a, b) => b.lateExit - a.lateExit)
      .filter((r) => r.lateExit > 0)
      .slice(0, 15),
    earlyLeave: [...yearRows]
      .sort((a, b) => b.earlyLeave - a.earlyLeave)
      .filter((r) => r.earlyLeave > 0)
      .slice(0, 15),
  };

  const pending = cases.filter((c) => c.action === 'pending');
  const treated = cases.filter((c) => c.action !== 'pending');

  const kpis = {
    pendingTotal: pending.length,
    pendingBlame: pending.filter((c) => c.section === 'blame').length,
    pendingExplication: pending.filter((c) => c.section === 'explication')
      .length,
    pendingAbsences: pending.filter((c) => c.section === 'absences').length,
    pendingRetardsEntree: pending.filter((c) => c.section === 'retards_entree')
      .length,
    pendingRetardsSortie: pending.filter((c) => c.section === 'retards_sortie')
      .length,
    treatedTotal: treated.length,
  };

  const sortedCases = [...cases].sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    if (a.action === 'pending' && b.action !== 'pending') return -1;
    if (a.action !== 'pending' && b.action === 'pending') return 1;
    return b.metricValue - a.metricValue;
  });

  const monthLabel =
    scope === 'ytd'
      ? `Janvier → ${MONTHS_SHORT[monthTo - 1]} ${year}`
      : monthLabelFr(year, month);

  return {
    year,
    month: monthTo,
    scope,
    monthLabel,
    from: rangeFrom,
    to: rangeTo,
    months,
    njPlafond,
    rulesLegend: (Object.keys(RULE_META) as MonitoringRuleCode[]).map(
      (code) => ({
        code,
        label: RULE_META[code].label,
        suggestion: RULE_META[code].suggestion,
      })
    ),
    kpis,
    cases: sortedCases,
    rankingsYear,
  };
}

export { RULE_META, monthBounds, monthLabelFr };
