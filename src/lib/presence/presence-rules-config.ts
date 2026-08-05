/** Config horaires / cotation — sans Prisma (safe côté navigateur). */

export type PresenceRulesConfig = {
  /** Entrée — fin plage « à l’heure » (inclus), ex. 08:30 */
  start_work_time: string;
  /** Sortie — heure de fin de service, ex. 18:00 */
  end_work_time: string;
  /** Entrée — début plage « à l’heure », ex. 08:00 */
  checkin_valid_from: string;
  /** Entrée — absent dès cette heure, ex. 09:30 */
  checkin_valid_to: string;
  /** Entrée — retard dès, ex. 08:40 */
  late_from: string;
  /** Entrée — retard jusqu’à (inclus), ex. 09:10 */
  late_until: string;
  /** Sortie — fenêtre normale dès, ex. 17:30 */
  checkout_valid_from: string;
  /** Sortie — fenêtre normale jusqu’à, ex. 18:30 */
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
};

export const DEFAULT_PRESENCE_RULES: PresenceRulesConfig = {
  start_work_time: '08:30',
  end_work_time: '18:00',
  checkin_valid_from: '08:00',
  checkin_valid_to: '09:30',
  late_from: '08:40',
  late_until: '09:10',
  checkout_valid_from: '17:30',
  checkout_valid_to: '18:30',
  late_allowable_minutes: 10,
  early_leave_allowable_minutes: 10,
  absent_after_hours: 3,
  count_mission_as_presence: true,
  score_on_time: 100,
  score_late: 70,
  score_early_leave: 80,
  score_late_exit: 90,
  score_absent: 0,
  score_mission_day: 95,
  excellent_min: 90,
  bon_min: 75,
  moyen_min: 50,
};

/** Statut d’arrivée (entrée service). */
export type ArrivalStatus =
  | 'a_l_heure'
  | 'entree_anticipee'
  | 'en_retard'
  | 'absent'
  | 'mission'
  | 'conge'
  | 'conge_non_justifie'
  | 'non_ouvre'
  | 'sans_pointage_weekend';

/** Statut de sortie (sortie service). */
export type DepartureStatus =
  | 'normale'
  | 'sortie_anticipee'
  | 'sortie_tardive'
  | 'non_detectee'
  | 'sans_objet';

export type DayPerformanceRow = {
  date: string;
  dayLabel: string;
  isWorkingDay: boolean;
  firstEntryIso: string | null;
  lastExitIso: string | null;
  entryStr: string;
  exitStr: string;
  durationMinutes: number | null;
  durationStr: string;
  arrivalStatus: ArrivalStatus;
  arrivalLabel: string;
  departureStatus: DepartureStatus;
  departureLabel: string;
  hasMission: boolean;
  missionLabel: string;
  remark: string;
  dayScore: number | null;
  eventsThatDay: number;
};

export type MonthPerformanceSummary = {
  year: number;
  month: number;
  monthLabel: string;
  workingDays: number;
  onTime: number;
  late: number;
  absent: number;
  earlyLeave: number;
  lateExit: number;
  missionDays: number;
  averageScore: number | null;
  statusLabel: string;
  days: DayPerformanceRow[];
};

export type EmployeePerformanceReport = {
  employeeNo: string;
  employeeName: string;
  department: string;
  /** Infos compte système lié (si aligné ACS ↔ utilisateurs) */
  fonction?: string | null;
  role?: string | null;
  services?: string | null;
  linkedSystemUser?: boolean;
  from: string;
  to: string;
  rules: PresenceRulesConfig;
  totals: Omit<MonthPerformanceSummary, 'year' | 'month' | 'monthLabel' | 'days'>;
  months: MonthPerformanceSummary[];
};
