import { effectiveAcsEventClassificationInput } from '@/lib/hikvision/acs-event-ingest-fields';
import { classifyAttendance } from '@/lib/hikvision/attendance-classification';
import { resolveAcsSystemIdentity } from '@/lib/hikvision/acs-system-user-resolve';
import { prisma } from '@/lib/prisma';

export type MonthlyIndividualDayRow = {
  /** Clé jour (calendrier UTC, aligné sur `event_time` en base). */
  date: string;
  firstEntryIso: string | null;
  lastExitIso: string | null;
  durationMinutes: number | null;
  remark: string;
  eventsThatDay: number;
  /** Événements non reconnus (ni direction in/out, ni libellés T&A connus). */
  unknownClassificationCount: number;
  /** Missions, heures sup., etc. (hors première entrée / dernière sortie « service »). */
  ancillaryEventsCount: number;
};

export type MonthlyIndividualResult = {
  year: number;
  month: number;
  employeeNo: string;
  employeeName: string;
  department: string;
  fonction?: string | null;
  role?: string | null;
  services?: string | null;
  days: MonthlyIndividualDayRow[];
};

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastUtcDayOfMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function monthRangeUtc(year: number, month1to12: number): {
  start: Date;
  end: Date;
} {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
  const lastDay = lastUtcDayOfMonth(year, month1to12);
  const end = new Date(
    Date.UTC(year, month1to12 - 1, lastDay, 23, 59, 59, 999)
  );
  return { start, end };
}

/**
 * Tableau mensuel pour une personne : chaque jour du mois, **première entrée service**
 * et **dernière sortie service** (T&A Hikvision : `direction` in/out et/ou libellés
 * « Entrée Service », « Sortie Service », etc.). Missions et heures sup. sont ignorées
 * pour ces deux bornes mais comptées en annexes.
 */
export async function fetchMonthlyIndividualPresence(params: {
  employeeNo: string;
  year: number;
  month: number;
}): Promise<MonthlyIndividualResult | null> {
  const employeeNo = String(params.employeeNo || '').trim();
  if (!employeeNo) return null;

  const year = Math.floor(Number(params.year));
  const month = Math.floor(Number(params.month));
  if (
    !Number.isFinite(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const { start, end } = monthRangeUtc(year, month);

  const identity = await resolveAcsSystemIdentity(employeeNo);

  const events = await prisma.acs_events.findMany({
    where: {
      employee_no: employeeNo,
      event_time: { gte: start, lte: end },
    },
    orderBy: [{ event_time: 'asc' }, { id: 'asc' }],
    take: 50_000,
  });

  const byDay = new Map<string, typeof events>();
  for (const ev of events) {
    const key = utcDateKey(ev.event_time);
    const list = byDay.get(key);
    if (list) list.push(ev);
    else byDay.set(key, [ev]);
  }

  const lastDay = lastUtcDayOfMonth(year, month);
  const days: MonthlyIndividualDayRow[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = byDay.get(date) ?? [];

    let firstEntryIso: string | null = null;
    let lastExitIso: string | null = null;
    let unknownClassificationCount = 0;
    let ancillaryEventsCount = 0;

    for (const ev of dayEvents) {
      const eff = effectiveAcsEventClassificationInput({
        direction: ev.direction,
        event_type: ev.event_type,
        raw: ev.raw,
      });
      const c = classifyAttendance(eff.direction, eff.event_type);
      const iso = ev.event_time.toISOString();

      if (c.dayBoundaryInOut === 'in') {
        if (!firstEntryIso || iso < firstEntryIso) firstEntryIso = iso;
      } else if (c.dayBoundaryInOut === 'out') {
        if (!lastExitIso || iso > lastExitIso) lastExitIso = iso;
      } else if (c.flow === 'unknown') {
        unknownClassificationCount++;
      } else {
        ancillaryEventsCount++;
      }
    }

    let durationMinutes: number | null = null;
    if (firstEntryIso && lastExitIso) {
      const a = new Date(firstEntryIso).getTime();
      const b = new Date(lastExitIso).getTime();
      if (b >= a) durationMinutes = Math.round((b - a) / 60_000);
      else durationMinutes = null;
    }

    const remarks: string[] = [];
    if (dayEvents.length === 0) remarks.push('Aucun pointage');
    else {
      if (firstEntryIso && !lastExitIso) remarks.push('Sortie service non détectée');
      if (!firstEntryIso && lastExitIso) remarks.push('Entrée service non détectée');
      if (ancillaryEventsCount > 0) {
        remarks.push(
          `${ancillaryEventsCount} pointage(s) mission / heures sup. / autre`
        );
      }
      if (unknownClassificationCount > 0) {
        remarks.push(
          `${unknownClassificationCount} évén. non classés (voir rapport détaillé)`
        );
      }
    }

    days.push({
      date,
      firstEntryIso,
      lastExitIso,
      durationMinutes,
      remark: remarks.join(' · ') || '—',
      eventsThatDay: dayEvents.length,
      unknownClassificationCount,
      ancillaryEventsCount,
    });
  }

  return {
    year,
    month,
    employeeNo,
    employeeName: identity?.displayName || employeeNo,
    department: identity?.department || '—',
    fonction: identity?.fonction ?? null,
    role: identity?.role ?? null,
    services: identity?.services ?? null,
    days,
  };
}
