import { effectiveAcsEventClassificationInput } from '@/lib/hikvision/acs-event-ingest-fields';
import { classifyAttendance } from '@/lib/hikvision/attendance-classification';
import { resolveAcsSystemIdentities, resolveAcsSystemIdentity } from '@/lib/hikvision/acs-system-user-resolve';
import { prisma } from '@/lib/prisma';
import {
  leaveKindForEmployeeDay,
  loadLeaveDaysByEmployee,
  type LeaveDayKind,
  type LeaveDayMap,
} from '@/lib/presence/leave-day-lookup';
import {
  DEFAULT_PRESENCE_RULES,
  type ArrivalStatus,
  type DayPerformanceRow,
  type DepartureStatus,
  type EmployeePerformanceReport,
  type MonthPerformanceSummary,
  type PresenceRulesConfig,
} from '@/lib/presence/presence-rules-config';

export type {
  ArrivalStatus,
  DayPerformanceRow,
  DepartureStatus,
  EmployeePerformanceReport,
  MonthPerformanceSummary,
  PresenceRulesConfig,
};
export { DEFAULT_PRESENCE_RULES };

function parseHm(hm: string): { h: number; m: number } {
  const parts = String(hm || '')
    .trim()
    .split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return { h, m };
}

function minutesOfDayFromIso(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function hmToMinutes(hm: string): number {
  const { h, m } = parseHm(hm);
  return h * 60 + m;
}

function formatHmFromIso(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function formatDuration(mins: number | null): string {
  if (mins == null || !Number.isFinite(mins) || mins < 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Excel / CSV iVMS : Person ID souvent préfixé d’une apostrophe (`'004`). */
export function normalizeEmployeeNo(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^'+/, '')
    .replace(/'+$/, '')
    .trim();
}

function employeeNoVariants(raw: string): string[] {
  const n = normalizeEmployeeNo(raw);
  if (!n) return [];
  const set = new Set([n, `'${n}`, raw.trim()]);
  return [...set].filter(Boolean);
}

function eachDateKeyInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return out;
  }
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    out.push(utcDateKey(new Date(t)));
  }
  return out;
}

function monthLabelFr(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  const label = d.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayLabelFr(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

function statusFromScore(
  score: number | null,
  rules: PresenceRulesConfig
): string {
  if (score == null) return 'Sans cotation';
  if (score >= rules.excellent_min) return 'Excellent';
  if (score >= rules.bon_min) return 'Bon';
  if (score >= rules.moyen_min) return 'Moyen';
  return 'Faible';
}

function mapRulesRow(row: {
  start_work_time: string;
  end_work_time: string;
  checkin_valid_from: string;
  checkin_valid_to: string;
  late_from?: string | null;
  late_until?: string | null;
  checkout_valid_from: string;
  checkout_valid_to: string;
  late_allowable_minutes: number;
  early_leave_allowable_minutes: number;
  absent_after_hours: number;
  count_mission_as_presence: boolean;
  score_on_time: number;
  score_late: number;
  score_early_leave: number;
  score_late_exit: number;
  score_absent: number;
  score_mission_day: number;
  excellent_min: number;
  bon_min: number;
  moyen_min: number;
}): PresenceRulesConfig {
  const base: PresenceRulesConfig = {
    start_work_time: row.start_work_time || DEFAULT_PRESENCE_RULES.start_work_time,
    end_work_time: row.end_work_time || DEFAULT_PRESENCE_RULES.end_work_time,
    checkin_valid_from:
      row.checkin_valid_from || DEFAULT_PRESENCE_RULES.checkin_valid_from,
    checkin_valid_to:
      row.checkin_valid_to || DEFAULT_PRESENCE_RULES.checkin_valid_to,
    late_from: row.late_from || DEFAULT_PRESENCE_RULES.late_from,
    late_until: row.late_until || DEFAULT_PRESENCE_RULES.late_until,
    checkout_valid_from:
      row.checkout_valid_from || DEFAULT_PRESENCE_RULES.checkout_valid_from,
    checkout_valid_to:
      row.checkout_valid_to || DEFAULT_PRESENCE_RULES.checkout_valid_to,
    late_allowable_minutes: row.late_allowable_minutes,
    early_leave_allowable_minutes: row.early_leave_allowable_minutes,
    absent_after_hours: row.absent_after_hours,
    count_mission_as_presence: row.count_mission_as_presence,
    score_on_time: row.score_on_time,
    score_late: row.score_late,
    score_early_leave: row.score_early_leave,
    score_late_exit: row.score_late_exit,
    score_absent: row.score_absent,
    score_mission_day: row.score_mission_day,
    excellent_min: row.excellent_min,
    bon_min: row.bon_min,
    moyen_min: row.moyen_min,
  };
  return base;
}

/** Corrige seulement les cas clairement invalides (ex. retard en après-midi). */
export function sanitizePresenceRules(
  rules: PresenceRulesConfig
): PresenceRulesConfig {
  const out = { ...rules };
  const noon = 12 * 60;
  const lateFrom = hmToMinutes(out.late_from || DEFAULT_PRESENCE_RULES.late_from);
  const lateUntil = hmToMinutes(out.late_until || DEFAULT_PRESENCE_RULES.late_until);
  const checkoutFrom = hmToMinutes(
    out.checkout_valid_from || DEFAULT_PRESENCE_RULES.checkout_valid_from
  );
  const checkoutTo = hmToMinutes(
    out.checkout_valid_to || DEFAULT_PRESENCE_RULES.checkout_valid_to
  );

  if (!out.late_from) out.late_from = DEFAULT_PRESENCE_RULES.late_from;
  if (!out.late_until) out.late_until = DEFAULT_PRESENCE_RULES.late_until;

  // Ancien bug : heures de sortie (16h+) stockées comme retard d’arrivée
  if (lateFrom >= noon || lateUntil >= noon || lateUntil < lateFrom) {
    out.late_from = DEFAULT_PRESENCE_RULES.late_from;
    out.late_until = DEFAULT_PRESENCE_RULES.late_until;
  }

  // Sortie le matin = mapping corrompu (sauf si volontairement vide)
  if (checkoutFrom < noon && checkoutTo < noon) {
    out.checkout_valid_from = DEFAULT_PRESENCE_RULES.checkout_valid_from;
    out.checkout_valid_to = DEFAULT_PRESENCE_RULES.checkout_valid_to;
  }

  return out;
}

export async function getPresenceRules(): Promise<PresenceRulesConfig> {
  try {
    const row = await prisma.presence_rules.findUnique({ where: { id: 1 } });
    if (!row) return { ...DEFAULT_PRESENCE_RULES };
    // Pas de sanitize agressif à la lecture : on renvoie ce qui est en base
    return mapRulesRow(row as Parameters<typeof mapRulesRow>[0]);
  } catch {
    return { ...DEFAULT_PRESENCE_RULES };
  }
}

async function ensureLateColumns(): Promise<void> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'presence_rules'
         AND COLUMN_NAME IN ('late_from', 'late_until')`
    )) as Array<{ name: string }>;
    const have = new Set(rows.map((r) => r.name));
    if (!have.has('late_from')) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE presence_rules ADD COLUMN late_from VARCHAR(8) NOT NULL DEFAULT '08:40'`
      );
    }
    if (!have.has('late_until')) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE presence_rules ADD COLUMN late_until VARCHAR(8) NOT NULL DEFAULT '09:10'`
      );
    }
  } catch {
    /* ignore */
  }
}

async function persistSanitizedRules(rules: PresenceRulesConfig): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE presence_rules SET
        start_work_time = ?,
        end_work_time = ?,
        checkin_valid_from = ?,
        checkin_valid_to = ?,
        late_from = ?,
        late_until = ?,
        checkout_valid_from = ?,
        checkout_valid_to = ?,
        late_allowable_minutes = ?,
        early_leave_allowable_minutes = ?,
        absent_after_hours = ?,
        count_mission_as_presence = ?,
        score_on_time = ?,
        score_late = ?,
        score_early_leave = ?,
        score_late_exit = ?,
        score_absent = ?,
        score_mission_day = ?,
        excellent_min = ?,
        bon_min = ?,
        moyen_min = ?,
        updated_at = NOW()
      WHERE id = 1`,
      rules.start_work_time,
      rules.end_work_time,
      rules.checkin_valid_from,
      rules.checkin_valid_to,
      rules.late_from,
      rules.late_until,
      rules.checkout_valid_from,
      rules.checkout_valid_to,
      rules.late_allowable_minutes,
      rules.early_leave_allowable_minutes,
      rules.absent_after_hours,
      rules.count_mission_as_presence ? 1 : 0,
      rules.score_on_time,
      rules.score_late,
      rules.score_early_leave,
      rules.score_late_exit,
      rules.score_absent,
      rules.score_mission_day,
      rules.excellent_min,
      rules.bon_min,
      rules.moyen_min
    );
  } catch {
    /* ignore */
  }
}

export async function ensurePresenceRulesRow(): Promise<PresenceRulesConfig> {
  await ensureLateColumns();
  const defaults = DEFAULT_PRESENCE_RULES;

  let raw: PresenceRulesConfig = { ...defaults };
  try {
    const existing = await prisma.presence_rules.findUnique({ where: { id: 1 } });
    if (!existing) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO presence_rules (
          id, start_work_time, end_work_time, checkin_valid_from, checkin_valid_to,
          late_from, late_until, checkout_valid_from, checkout_valid_to,
          late_allowable_minutes, early_leave_allowable_minutes, absent_after_hours,
          count_mission_as_presence, score_on_time, score_late, score_early_leave,
          score_late_exit, score_absent, score_mission_day, excellent_min, bon_min, moyen_min,
          updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        )`,
        defaults.start_work_time,
        defaults.end_work_time,
        defaults.checkin_valid_from,
        defaults.checkin_valid_to,
        defaults.late_from,
        defaults.late_until,
        defaults.checkout_valid_from,
        defaults.checkout_valid_to,
        defaults.late_allowable_minutes,
        defaults.early_leave_allowable_minutes,
        defaults.absent_after_hours,
        1,
        defaults.score_on_time,
        defaults.score_late,
        defaults.score_early_leave,
        defaults.score_late_exit,
        defaults.score_absent,
        defaults.score_mission_day,
        defaults.excellent_min,
        defaults.bon_min,
        defaults.moyen_min
      );
    } else {
      raw = mapRulesRow(existing as Parameters<typeof mapRulesRow>[0]);
    }
  } catch {
    /* table absente */
  }

  // Ne réécrit la base QUE si le retard est encore en après-midi (bug historique)
  const noon = 12 * 60;
  if (
    hmToMinutes(raw.late_from) >= noon ||
    hmToMinutes(raw.late_until) >= noon
  ) {
    const fixed = sanitizePresenceRules(raw);
    await persistSanitizedRules({ ...raw, ...fixed });
    return fixed;
  }
  return raw;
}

async function loadHolidayMonthDays(
  from: string,
  to: string
): Promise<Set<string>> {
  /** Clés MM-DD (calendrier Fonaredd = fériés, année flexible). */
  const set = new Set<string>();
  try {
    const rows = await prisma.calendrier.findMany({
      where: {
        d: {
          gte: new Date(`${from.slice(0, 4)}-01-01T00:00:00.000Z`),
          lte: new Date(`${to.slice(0, 4)}-12-31T23:59:59.999Z`),
        },
      },
      select: { d: true },
      take: 5000,
    });
    for (const r of rows) {
      const iso = r.d.toISOString().slice(0, 10);
      set.add(iso.slice(5)); // MM-DD
    }
  } catch {
    /* ignore */
  }
  return set;
}

function isWorkingDay(dateKey: string, holidayMd: Set<string>): boolean {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  const dow = d.getUTCDay(); // 0 dim … 6 sam
  if (dow === 0 || dow === 6) return false;
  if (holidayMd.has(dateKey.slice(5))) return false;
  return true;
}

function classifyArrival(
  entryMin: number,
  rules: PresenceRulesConfig
): { status: ArrivalStatus; remark?: string } {
  const r = sanitizePresenceRules(rules);
  const onTimeFrom = hmToMinutes(r.checkin_valid_from);
  const onTimeUntil = hmToMinutes(r.start_work_time);
  const lateFrom = hmToMinutes(r.late_from);
  const absentFrom = hmToMinutes(r.checkin_valid_to);

  if (entryMin >= absentFrom) {
    return { status: 'absent', remark: 'Absent' };
  }
  // Avant l’heure de début → Entrée anticipée (miroir de Sortie anticipée)
  if (entryMin < onTimeFrom) {
    return { status: 'entree_anticipee', remark: 'Entrée anticipée' };
  }
  if (entryMin > onTimeUntil || entryMin >= lateFrom) {
    return { status: 'en_retard', remark: 'Retard' };
  }
  return { status: 'a_l_heure' };
}

/** Règle unique de départ — toujours basée sur l’heure de sortie. */
function classifyDeparture(
  exitMin: number,
  rules: PresenceRulesConfig
): { status: DepartureStatus; remark?: string } {
  const r = sanitizePresenceRules(rules);
  const endMin = hmToMinutes(r.end_work_time);
  const windowTo = Math.max(endMin, hmToMinutes(r.checkout_valid_to));

  // Avant l’heure de fin de service → sortie anticipée (tolérance non appliquée ici)
  if (exitMin < endMin) {
    return { status: 'sortie_anticipee', remark: 'Sortie anticipée' };
  }
  if (exitMin > windowTo) {
    return { status: 'sortie_tardive', remark: 'Sortie tardive' };
  }
  return { status: 'normale' };
}

/** Remarques courtes pour lecture administrative (max 3). */
function pushRemark(remarks: string[], text: string, max = 3): void {
  if (!text || remarks.includes(text) || remarks.length >= max) return;
  remarks.push(text);
}

function applyExitClassification(
  lastExitIso: string | null,
  rules: PresenceRulesConfig,
  remarks: string[]
): DepartureStatus {
  if (!lastExitIso) {
    pushRemark(remarks, 'Sortie non pointée');
    return 'non_detectee';
  }
  const dep = classifyDeparture(minutesOfDayFromIso(lastExitIso), rules);
  if (dep.remark) pushRemark(remarks, dep.remark);
  return dep.status;
}

function evaluateDay(params: {
  dateKey: string;
  events: Array<{
    event_time: Date;
    direction: string | null;
    event_type: string;
    custom_status: string | null;
    raw: unknown;
  }>;
  rules: PresenceRulesConfig;
  holidayMd: Set<string>;
  leaveKind?: LeaveDayKind | null;
}): DayPerformanceRow {
  const { dateKey, events, rules, holidayMd, leaveKind } = params;
  const working = isWorkingDay(dateKey, holidayMd);

  let firstEntryIso: string | null = null;
  let lastExitIso: string | null = null;
  let lastRetourMissionIso: string | null = null;
  let missionOut = 0;
  let missionIn = 0;
  let overtime = 0;

  for (const ev of events) {
    const eff = effectiveAcsEventClassificationInput({
      direction: ev.direction,
      event_type: ev.custom_status?.trim() || ev.event_type,
      raw: ev.raw,
    });
    const typeHint =
      [ev.custom_status, eff.event_type, ev.event_type]
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .join(' ') || eff.event_type;
    const c = classifyAttendance(eff.direction, typeHint);
    const iso = ev.event_time.toISOString();

    if (c.dayBoundaryInOut === 'in') {
      if (!firstEntryIso || iso < firstEntryIso) firstEntryIso = iso;
    } else if (c.dayBoundaryInOut === 'out') {
      if (!lastExitIso || iso > lastExitIso) lastExitIso = iso;
    } else if (c.flow === 'break_out') {
      // Sortie mission = départ en mission (exige une entrée service)
      missionOut++;
    } else if (c.flow === 'break_in') {
      // Retour mission = peut valider la présence sans entrée service
      missionIn++;
      if (!lastRetourMissionIso || iso > lastRetourMissionIso) {
        lastRetourMissionIso = iso;
      }
    } else if (c.flow === 'overtime_in' || c.flow === 'overtime_out') {
      overtime++;
    }
  }

  const hasRetourMission = missionIn > 0;
  const hasSortieMission = missionOut > 0;
  const hasMission = hasRetourMission || hasSortieMission;
  const missionLabel = hasMission ? 'Mission' : '—';
  // Présence sans Entrée Service : uniquement via « retour mission »
  const retourSansEntree =
    hasRetourMission && !firstEntryIso && rules.count_mission_as_presence;

  // Retour mission sans entrée → début 08:00 pour calculer la durée
  const missionEntryDefault = `${dateKey}T08:00:00.000Z`;
  let entryAssumed0800 = false;
  let displayEntryIso = firstEntryIso;
  let durationExitIso = lastExitIso;

  if (retourSansEntree) {
    displayEntryIso = missionEntryDefault;
    entryAssumed0800 = true;
  }
  if (retourSansEntree && !lastExitIso && lastRetourMissionIso) {
    durationExitIso = lastRetourMissionIso;
  }

  let durationMinutes: number | null = null;
  if (displayEntryIso && durationExitIso) {
    const a = new Date(displayEntryIso).getTime();
    const b = new Date(durationExitIso).getTime();
    if (b >= a) durationMinutes = Math.round((b - a) / 60_000);
  }

  let arrivalStatus: ArrivalStatus;
  let departureStatus: DepartureStatus = 'sans_objet';
  const remarks: string[] = [];

  if (!working) {
    const d = new Date(`${dateKey}T12:00:00.000Z`);
    const dow = d.getUTCDay();
    const isHoliday = holidayMd.has(dateKey.slice(5));
    arrivalStatus = 'non_ouvre';
    if (isHoliday) pushRemark(remarks, 'Férié');
    else if (dow === 0 || dow === 6) pushRemark(remarks, 'Week-end');
    if (hasMission) pushRemark(remarks, 'Mission');
    else if (firstEntryIso || lastExitIso) pushRemark(remarks, 'Hors jour ouvré');
  } else if (leaveKind === 'conge_non_justifie') {
    arrivalStatus = 'conge_non_justifie';
    pushRemark(remarks, 'Congé non justifié');
    departureStatus = 'sans_objet';
  } else if (leaveKind === 'conge') {
    arrivalStatus = 'conge';
    pushRemark(remarks, 'Congé');
    departureStatus = 'sans_objet';
  } else if (!firstEntryIso) {
    // Pas d’Entrée Service
    if (retourSansEntree) {
      // Retour mission → présent, entrée 08:00
      arrivalStatus = 'mission';
      pushRemark(remarks, 'Retour mission');
      pushRemark(remarks, 'Entrée 08:00 (défaut)');
      const exitForClass = lastExitIso || lastRetourMissionIso;
      if (exitForClass) {
        departureStatus = applyExitClassification(exitForClass, rules, remarks);
      }
    } else {
      // Sortie mission (ou rien) sans entrée → absent
      arrivalStatus = 'absent';
      pushRemark(remarks, 'Absent');
      if (hasSortieMission) {
        pushRemark(remarks, 'Sortie mission sans entrée');
      }
      if (lastExitIso) {
        departureStatus = applyExitClassification(lastExitIso, rules, remarks);
      }
    }
  } else {
    // Entrée Service présente → statut d’arrivée = classification de l’entrée
    const entryMin = minutesOfDayFromIso(firstEntryIso);
    const arrival = classifyArrival(entryMin, rules);
    arrivalStatus = arrival.status;
    if (arrival.remark) pushRemark(remarks, arrival.remark);

    if (hasRetourMission) {
      pushRemark(remarks, 'Retour mission');
    }
    // Sortie mission : simple mention, quel que soit le statut d’entrée
    if (hasSortieMission) {
      pushRemark(remarks, 'Sortie mission');
    }

    departureStatus = applyExitClassification(lastExitIso, rules, remarks);
  }

  if (overtime > 0) pushRemark(remarks, 'Heures sup.');

  const arrivalLabelMap: Record<ArrivalStatus, string> = {
    a_l_heure: 'À l’heure',
    entree_anticipee: 'Entrée anticipée',
    en_retard: 'En retard',
    absent: 'Absent',
    mission: 'Mission (présent)',
    conge: 'Congé',
    conge_non_justifie: 'Congé non justifié',
    non_ouvre: 'Non ouvré',
    sans_pointage_weekend: 'Week-end',
  };
  const departureLabelMap: Record<DepartureStatus, string> = {
    normale: 'Sortie normale',
    sortie_anticipee: 'Sortie anticipée',
    sortie_tardive: 'Sortie tardive',
    non_detectee: 'Sortie non détectée',
    sans_objet: '—',
  };

  let dayScore: number | null = null;
  if (working) {
    if (arrivalStatus === 'absent') {
      dayScore = rules.score_absent;
    } else if (
      arrivalStatus === 'mission' ||
      arrivalStatus === 'conge' ||
      arrivalStatus === 'conge_non_justifie'
    ) {
      // Congé / NJ / mission : pas de pénalité absence
      dayScore = rules.score_mission_day;
    } else {
      let score = rules.score_on_time;
      if (arrivalStatus === 'en_retard') score = Math.min(score, rules.score_late);
      if (departureStatus === 'sortie_anticipee') {
        score = Math.min(score, rules.score_early_leave);
      } else if (departureStatus === 'sortie_tardive') {
        score = Math.min(score, rules.score_late_exit);
      } else if (departureStatus === 'non_detectee') {
        score = Math.min(score, rules.score_early_leave);
      }
      dayScore = score;
    }
  }

  // Sortie affichée = Sortie Service ; sinon pointe retour mission si entrée 08:00 déduite
  const exitDisplayIso =
    lastExitIso || (entryAssumed0800 ? lastRetourMissionIso : null);

  return {
    date: dateKey,
    dayLabel: dayLabelFr(dateKey),
    isWorkingDay: working,
    firstEntryIso: displayEntryIso,
    lastExitIso: exitDisplayIso,
    entryStr: formatHmFromIso(displayEntryIso),
    exitStr: formatHmFromIso(exitDisplayIso),
    durationMinutes,
    durationStr: formatDuration(durationMinutes),
    arrivalStatus,
    arrivalLabel: arrivalLabelMap[arrivalStatus],
    departureStatus,
    departureLabel: departureLabelMap[departureStatus],
    hasMission,
    missionLabel,
    remark: remarks.join(' · ') || '—',
    dayScore,
    eventsThatDay: events.length,
  };
}

function summarizeDays(
  days: DayPerformanceRow[],
  rules: PresenceRulesConfig
): Omit<MonthPerformanceSummary, 'year' | 'month' | 'monthLabel' | 'days'> {
  const working = days.filter((d) => d.isWorkingDay);
  let onTime = 0;
  let late = 0;
  let absent = 0;
  let earlyLeave = 0;
  let lateExit = 0;
  let missionDays = 0;
  const scores: number[] = [];

  for (const d of working) {
    if (d.dayScore != null) scores.push(d.dayScore);
    if (
      d.arrivalStatus === 'a_l_heure' ||
      d.arrivalStatus === 'entree_anticipee'
    ) {
      onTime++;
    }
    if (d.arrivalStatus === 'en_retard') late++;
    if (d.arrivalStatus === 'absent') absent++;
    // Ne pas compter « sortie mission » seule (absent) comme jour mission
    if (d.arrivalStatus === 'mission' || (d.hasMission && d.arrivalStatus !== 'absent')) {
      missionDays++;
    }
    if (d.departureStatus === 'sortie_anticipee') earlyLeave++;
    if (d.departureStatus === 'sortie_tardive') lateExit++;
  }

  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return {
    workingDays: working.length,
    onTime,
    late,
    absent,
    earlyLeave,
    lateExit,
    missionDays,
    averageScore,
    statusLabel: statusFromScore(averageScore, rules),
  };
}

type PerfEventRow = {
  employee_no?: string | null;
  event_time: Date;
  direction: string | null;
  event_type: string;
  custom_status: string | null;
  raw: unknown;
};

function buildReportFromDayEvents(params: {
  employeeNo: string;
  employeeName: string;
  department: string;
  fonction?: string | null;
  role?: string | null;
  services?: string | null;
  linkedSystemUser?: boolean;
  from: string;
  to: string;
  rules: PresenceRulesConfig;
  holidayMd: Set<string>;
  events: PerfEventRow[];
  leaveMap?: LeaveDayMap | null;
}): EmployeePerformanceReport {
  const {
    employeeNo,
    employeeName,
    department,
    fonction,
    role,
    services,
    linkedSystemUser,
    from,
    to,
    rules,
    holidayMd,
    leaveMap,
  } = params;

  const byDay = new Map<string, PerfEventRow[]>();
  for (const ev of params.events) {
    const key = utcDateKey(ev.event_time);
    const list = byDay.get(key);
    if (list) list.push(ev);
    else byDay.set(key, [ev]);
  }

  const allDays: DayPerformanceRow[] = [];
  for (const dateKey of eachDateKeyInclusive(from, to)) {
    allDays.push(
      evaluateDay({
        dateKey,
        events: byDay.get(dateKey) ?? [],
        rules,
        holidayMd,
        leaveKind: leaveKindForEmployeeDay(leaveMap, employeeNo, dateKey),
      })
    );
  }

  const monthMap = new Map<string, DayPerformanceRow[]>();
  for (const day of allDays) {
    const ym = day.date.slice(0, 7);
    const list = monthMap.get(ym);
    if (list) list.push(day);
    else monthMap.set(ym, [day]);
  }

  const months: MonthPerformanceSummary[] = [];
  for (const [ym, days] of monthMap) {
    const [ys, ms] = ym.split('-');
    const year = Number(ys);
    const month = Number(ms);
    const summary = summarizeDays(days, rules);
    months.push({
      year,
      month,
      monthLabel: monthLabelFr(year, month),
      ...summary,
      days,
    });
  }

  return {
    employeeNo,
    employeeName,
    department,
    fonction: fonction ?? null,
    role: role ?? null,
    services: services ?? null,
    linkedSystemUser: Boolean(linkedSystemUser),
    from,
    to,
    rules,
    totals: summarizeDays(allDays, rules),
    months,
  };
}

export async function computeEmployeePerformance(params: {
  employeeNo: string;
  from: string;
  to: string;
  rules?: PresenceRulesConfig;
}): Promise<EmployeePerformanceReport | null> {
  const employeeNoRaw = String(params.employeeNo || '').trim();
  const employeeNo = normalizeEmployeeNo(employeeNoRaw);
  const from = String(params.from || '').trim().slice(0, 10);
  const to = String(params.to || '').trim().slice(0, 10);
  if (!employeeNo || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return null;
  }
  if (from > to) return null;

  const rules = params.rules ?? (await getPresenceRules());
  const holidayMd = await loadHolidayMonthDays(from, to);
  const leaveMap = await loadLeaveDaysByEmployee(from, to);
  const variants = employeeNoVariants(employeeNoRaw);

  const identity = await resolveAcsSystemIdentity(employeeNo);

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);

  const events = await prisma.acs_events.findMany({
    where: {
      employee_no: { in: variants },
      event_time: { gte: start, lte: end },
    },
    orderBy: [{ event_time: 'asc' }, { id: 'asc' }],
    take: 100_000,
    select: {
      event_time: true,
      direction: true,
      event_type: true,
      custom_status: true,
      raw: true,
    },
  });

  return buildReportFromDayEvents({
    employeeNo,
    employeeName: identity?.displayName || employeeNo,
    department: identity?.department || '—',
    fonction: identity?.fonction,
    role: identity?.role,
    services: identity?.services,
    linkedSystemUser: identity?.linked,
    from,
    to,
    rules,
    holidayMd,
    events,
    leaveMap,
  });
}

export async function listEmployeesForPerformance(params: {
  from: string;
  to: string;
  department?: string;
  employeeNo?: string;
}): Promise<
  Array<{
    employeeNo: string;
    name: string;
    department: string;
    fonction?: string | null;
    role?: string | null;
    services?: string | null;
    linkedSystemUser?: boolean;
  }>
> {
  const empRaw = params.employeeNo?.trim();
  if (empRaw) {
    const emp = normalizeEmployeeNo(empRaw);
    const identity = await resolveAcsSystemIdentity(emp);
    return [
      {
        employeeNo: emp,
        name: identity?.displayName || emp,
        department: identity?.department || '—',
        fonction: identity?.fonction ?? null,
        role: identity?.role ?? null,
        services: identity?.services ?? null,
        linkedSystemUser: Boolean(identity?.linked),
      },
    ];
  }

  const start = new Date(`${params.from}T00:00:00.000Z`);
  const end = new Date(`${params.to}T23:59:59.999Z`);
  const dept = params.department?.trim();

  let employeeFilter: { not: null } | { in: string[] } = { not: null };
  if (dept) {
    const deptUsers = await prisma.acs_users.findMany({
      where: { department: { contains: dept } },
      select: { employee_no: true },
      distinct: ['employee_no'],
    });
    const nos = deptUsers.map((u) => u.employee_no);
    if (nos.length === 0) return [];
    employeeFilter = { in: nos };
  }

  const grouped = await prisma.acs_events.groupBy({
    by: ['employee_no'],
    where: {
      event_time: { gte: start, lte: end },
      employee_no: employeeFilter,
    },
    _count: { _all: true },
  });

  /** Déduplique `'004` et `004` sous la même clé normalisée. */
  const normalizedNos = [
    ...new Set(
      grouped
        .map((g) => g.employee_no)
        .filter((n): n is string => Boolean(n))
        .map((n) => normalizeEmployeeNo(n))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

  if (normalizedNos.length === 0) return [];

  const identities = await resolveAcsSystemIdentities(normalizedNos);

  return normalizedNos.map((employeeNo) => {
    const idn = identities.get(employeeNo);
    return {
      employeeNo,
      name: idn?.displayName || employeeNo,
      department: idn?.department || '—',
      fonction: idn?.fonction ?? null,
      role: idn?.role ?? null,
      services: idn?.services ?? null,
      linkedSystemUser: Boolean(idn?.linked),
    };
  });
}

export async function computePerformanceReports(params: {
  from: string;
  to: string;
  department?: string;
  employeeNo?: string;
}): Promise<{
  rules: PresenceRulesConfig;
  from: string;
  to: string;
  reports: EmployeePerformanceReport[];
}> {
  const rules = await getPresenceRules();
  const employees = await listEmployeesForPerformance(params);
  if (employees.length === 0) {
    return { rules, from: params.from, to: params.to, reports: [] };
  }

  const holidayMd = await loadHolidayMonthDays(params.from, params.to);
  const leaveMap = await loadLeaveDaysByEmployee(params.from, params.to);
  const start = new Date(`${params.from}T00:00:00.000Z`);
  const end = new Date(`${params.to}T23:59:59.999Z`);
  const allVariants = [
    ...new Set(employees.flatMap((e) => employeeNoVariants(e.employeeNo))),
  ];

  // Une seule requête events pour toute la période / tous les agents
  const events = await prisma.acs_events.findMany({
    where: {
      employee_no: { in: allVariants },
      event_time: { gte: start, lte: end },
    },
    orderBy: [{ event_time: 'asc' }, { id: 'asc' }],
    take: 500_000,
    select: {
      employee_no: true,
      event_time: true,
      direction: true,
      event_type: true,
      custom_status: true,
      raw: true,
    },
  });

  const eventsByEmp = new Map<string, PerfEventRow[]>();
  for (const ev of events) {
    const key = normalizeEmployeeNo(String(ev.employee_no || ''));
    if (!key) continue;
    const list = eventsByEmp.get(key);
    if (list) list.push(ev);
    else eventsByEmp.set(key, [ev]);
  }

  const reports: EmployeePerformanceReport[] = [];
  for (const emp of employees) {
    reports.push(
      buildReportFromDayEvents({
        employeeNo: emp.employeeNo,
        employeeName: emp.name,
        department: emp.department,
        fonction: emp.fonction,
        role: emp.role,
        services: emp.services,
        linkedSystemUser: emp.linkedSystemUser,
        from: params.from,
        to: params.to,
        rules,
        holidayMd,
        events: eventsByEmp.get(emp.employeeNo) ?? [],
        leaveMap,
      })
    );
  }
  return { rules, from: params.from, to: params.to, reports };
}
