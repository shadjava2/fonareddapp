import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import React, { useMemo } from 'react';

export type CalendrierGridEntry = {
  id: number;
  d: string;
  label?: string;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Clé jour/mois uniquement (répétition chaque année), ex. "01-16" pour le 16 janvier. */
function monthDayKeyFromEntry(isoOrDate: string): string | null {
  try {
    const d = parseISO(
      isoOrDate.includes('T') ? isoOrDate : `${isoOrDate}T12:00:00`
    );
    if (Number.isNaN(d.getTime())) return null;
    return format(d, 'MM-dd');
  } catch {
    return null;
  }
}

function isWeekend(d: Date): boolean {
  const day = getDay(d);
  return day === 0 || day === 6;
}

type Props = {
  /** Mois affiché (n’importe quel jour du mois) */
  viewMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday?: () => void;
  entries: CalendrierGridEntry[];
  loading?: boolean;
};

const CalendrierMonthGrid: React.FC<Props> = ({
  viewMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  entries,
  loading,
}) => {
  /** Regroupe par jour + mois, l’année en base est ignorée pour l’affichage grille. */
  const entriesByMonthDay = useMemo(() => {
    const m = new Map<string, CalendrierGridEntry[]>();
    for (const e of entries) {
      const k = monthDayKeyFromEntry(e.d);
      if (!k) continue;
      const list = m.get(k) || [];
      list.push(e);
      m.set(k, list);
    }
    return m;
  }, [entries]);

  const { days, monthStart } = useMemo(() => {
    const monthStartInner = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStartInner, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const daysInner = eachDayOfInterval({
      start: gridStart,
      end: gridEnd,
    });
    return { days: daysInner, monthStart: monthStartInner };
  }, [viewMonth]);

  const title = format(viewMonth, 'MMMM yyyy', { locale: fr });

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {onToday && (
            <button
              type="button"
              onClick={onToday}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Aujourd’hui
            </button>
          )}
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={onPrevMonth}
              className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              aria-label="Mois précédent"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="relative -ml-px inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              aria-label="Mois suivant"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 py-3 sm:px-4 sm:py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  {wd}
                </div>
              ))}
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const mdKey = format(day, 'MM-dd');
                const inMonth = isSameMonth(day, monthStart);
                const registered = entriesByMonthDay.get(mdKey) || [];
                const weekend = isWeekend(day);
                const isReg = registered.length > 0;

                let cellBg = 'bg-white';
                let dayNumClass = 'text-gray-900';
                if (!inMonth) {
                  cellBg = 'bg-gray-50';
                  dayNumClass = 'text-gray-400';
                }
                if (inMonth && !isReg && weekend) {
                  cellBg = 'bg-red-50';
                  dayNumClass = 'text-red-800';
                }
                if (isReg) {
                  cellBg = 'bg-emerald-100';
                  dayNumClass = 'text-emerald-900';
                }

                let titleTip: string;
                if (isReg) {
                  titleTip = registered
                    .map((r) => r.label || 'Jour férié')
                    .join(' · ');
                } else if (weekend && inMonth) {
                  titleTip = 'Week-end';
                } else {
                  titleTip = format(day, 'EEEE d MMMM yyyy', { locale: fr });
                }

                return (
                  <div
                    key={key}
                    title={titleTip}
                    className={`min-h-[4.25rem] sm:min-h-[5rem] p-1 sm:p-2 ${cellBg} ${inMonth ? '' : 'opacity-80'}`}
                  >
                    <div
                      className={`text-sm font-semibold ${dayNumClass} ${isReg && weekend ? 'ring-1 ring-red-300 rounded' : ''}`}
                    >
                      {format(day, 'd')}
                    </div>
                    {isReg && (
                      <div className="mt-0.5 text-[10px] sm:text-xs leading-tight text-emerald-800 line-clamp-2">
                        {registered[0].label || 'Férié'}
                        {registered.length > 1 && (
                          <span className="text-emerald-600">
                            {' '}
                            +{registered.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded border border-emerald-300 bg-emerald-100"
                  aria-hidden
                />
                <span>Jour enregistré (jour + mois, chaque année)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded border border-red-200 bg-red-50"
                  aria-hidden
                />
                <span>Samedi et dimanche</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded border border-gray-200 bg-white"
                  aria-hidden
                />
                <span>Jour ouvrable (sans entrée)</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Logique jour + mois (ex. 16/01) : marquage vert chaque année pour ce
              couple date/mois. Le mois affiché définit l’année utilisée pour le jour de
              la semaine et les week-ends (ex. janvier 2026 → le 16 tombe un vendredi).
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendrierMonthGrid;
