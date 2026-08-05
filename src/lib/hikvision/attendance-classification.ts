import type { Prisma } from '@prisma/client';

/**
 * Types d’événements T&A Hikvision (noms personnalisés fréquents + équivalents anglais).
 * Aligné sur Configuration → T&A Status (ex. « Entrée Service », « Sortie Service », missions, heures sup.).
 */
export type AttendanceFlowKind =
  | 'work_in'
  | 'work_out'
  | 'break_out'
  | 'break_in'
  | 'overtime_in'
  | 'overtime_out'
  | 'unknown';

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Interprète un événement importé (`direction` + `event_type` / Custom Name).
 *
 * - Missions / heures sup. sont classées **avant** `direction` in/out (évite qu’un Break-In
 *   soit traité comme entrée service).
 * - **dayBoundaryInOut** : bornes journée (première entrée service / dernière sortie service).
 */
export function classifyAttendance(
  direction: string | null | undefined,
  eventType: string
): {
  flow: AttendanceFlowKind;
  /** `in` / `out` pour bornes journée ; `null` si mission, heures sup. ou non classé. */
  dayBoundaryInOut: 'in' | 'out' | null;
  /** Libellé court pour tableaux / PDF */
  categoryLabel: string;
} {
  const d = (direction || '').trim().toLowerCase();
  const rawType = (eventType || '').trim();
  const t = norm(rawType);

  if (t.includes('sortie mission') || t.includes('break out')) {
    return {
      flow: 'break_out',
      dayBoundaryInOut: null,
      categoryLabel: rawType || 'Sortie mission',
    };
  }
  if (t.includes('retour mission') || t.includes('break in')) {
    return {
      flow: 'break_in',
      dayBoundaryInOut: null,
      categoryLabel: rawType || 'Retour mission',
    };
  }
  if (
    t.includes('debut heure sup') ||
    t.includes('debut heures sup') ||
    t.includes('overtime in')
  ) {
    return {
      flow: 'overtime_in',
      dayBoundaryInOut: null,
      categoryLabel: rawType || 'Début heures sup.',
    };
  }
  if (
    t.includes('fin heure sup') ||
    t.includes('fin heures sup') ||
    t.includes('overtime out')
  ) {
    return {
      flow: 'overtime_out',
      dayBoundaryInOut: null,
      categoryLabel: rawType || 'Fin heures sup.',
    };
  }

  if (
    t.includes('entree service') ||
    t === 'check in' ||
    t.includes('check in') ||
    t === 'checkin' ||
    t.includes('clock in') ||
    t.includes('on duty')
  ) {
    // Évite que « break in » tombe ici : déjà traité plus haut.
    if (!t.includes('break')) {
      return {
        flow: 'work_in',
        dayBoundaryInOut: 'in',
        categoryLabel: rawType || 'Entrée service',
      };
    }
  }
  if (
    t.includes('sortie service') ||
    t === 'check out' ||
    t.includes('check out') ||
    t === 'checkout' ||
    t.includes('clock out') ||
    t.includes('off duty')
  ) {
    if (!t.includes('break')) {
      return {
        flow: 'work_out',
        dayBoundaryInOut: 'out',
        categoryLabel: rawType || 'Sortie service',
      };
    }
  }

  if (d === 'in') {
    return {
      flow: 'work_in',
      dayBoundaryInOut: 'in',
      categoryLabel: rawType || 'Entrée (lecteur)',
    };
  }
  if (d === 'out') {
    return {
      flow: 'work_out',
      dayBoundaryInOut: 'out',
      categoryLabel: rawType || 'Sortie (lecteur)',
    };
  }

  return {
    flow: 'unknown',
    dayBoundaryInOut: null,
    categoryLabel: rawType || '—',
  };
}

/**
 * Libellé court type iVMS (Check-in / Check-out) ou libellé T&A (mission, heures sup., …).
 */
export function attendancePresenceCellLabel(
  direction: string | null | undefined,
  eventType: string | null | undefined
): string {
  const c = classifyAttendance(direction, String(eventType ?? ''));
  if (c.dayBoundaryInOut === 'in') return 'Entrée service';
  if (c.dayBoundaryInOut === 'out') return 'Sortie service';
  if (c.flow !== 'unknown') return c.categoryLabel;
  const d = String(direction ?? '').trim();
  return d || '—';
}

const DIRECTION_IN: Prisma.acs_eventsWhereInput[] = [
  { direction: 'in' },
  { direction: 'In' },
  { direction: 'IN' },
];

const DIRECTION_OUT: Prisma.acs_eventsWhereInput[] = [
  { direction: 'out' },
  { direction: 'Out' },
  { direction: 'OUT' },
];

/** Sous-chaînes sur `event_type` (collations MySQL souvent insensibles à la casse). */
const EVENT_SNIPPETS_IN = [
  'Entrée Service',
  'entree service',
  'Check In',
  'check in',
  'Check-in',
  'Clock In',
  'On Duty',
];

const EVENT_SNIPPETS_OUT = [
  'Sortie Service',
  'sortie service',
  'Check Out',
  'check out',
  'Check-out',
  'Clock Out',
  'Off Duty',
];

function snippetOrs(snippets: string[]): Prisma.acs_eventsWhereInput[] {
  return snippets.map((s) => ({
    event_type: { contains: s },
  }));
}

/** Filtre liste / PDF « entrée » ou « sortie » : lecteur in/out OU libellés T&A configurés sur l’appareil. */
export function presenceDirectionWhere(
  pointageDirection: 'in' | 'out'
): Prisma.acs_eventsWhereInput {
  if (pointageDirection === 'in') {
    return {
      OR: [...DIRECTION_IN, ...snippetOrs(EVENT_SNIPPETS_IN)],
    };
  }
  return {
    OR: [...DIRECTION_OUT, ...snippetOrs(EVENT_SNIPPETS_OUT)],
  };
}
