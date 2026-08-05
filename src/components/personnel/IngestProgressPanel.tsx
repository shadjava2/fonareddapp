import type { IngestStreamProgress } from '@/lib/hikvision/ingest-progress';
import { computePercent } from '@/lib/hikvision/ingest-progress';

type IngestProgressPanelProps = Readonly<{
  title: string;
  loading: boolean;
  progress: IngestStreamProgress | null;
  accent?: 'indigo' | 'emerald' | 'teal' | 'violet';
  hint?: string;
  showUpdated?: boolean;
  showAgents?: boolean;
}>;

const ACCENT: Record<
  NonNullable<IngestProgressPanelProps['accent']>,
  { bar: string; track: string; text: string }
> = {
  indigo: { bar: 'bg-indigo-600', track: 'bg-indigo-100', text: 'text-indigo-800' },
  emerald: { bar: 'bg-emerald-600', track: 'bg-emerald-100', text: 'text-emerald-800' },
  teal: { bar: 'bg-teal-700', track: 'bg-teal-100', text: 'text-teal-800' },
  violet: { bar: 'bg-violet-600', track: 'bg-violet-100', text: 'text-violet-800' },
};

export function IngestProgressPanel({
  title,
  loading,
  progress,
  accent = 'indigo',
  hint,
  showUpdated = false,
  showAgents = false,
}: IngestProgressPanelProps) {
  if (!loading && !progress) return null;

  const colors = ACCENT[accent];
  const percent =
    progress && progress.total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            progress.percent > 0
              ? progress.percent
              : computePercent(progress.current, progress.total)
          )
        )
      : progress?.percent ?? (loading ? 2 : 0);

  const counterLabel =
    progress && progress.total > 0
      ? `${progress.current} / ${progress.total}`
      : progress?.pages
        ? `${progress.pages} page(s) API`
        : '…';

  const percentLabel =
    Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${colors.text}`}>{title}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {progress?.message || (loading ? 'Traitement en cours…' : title)}
          </p>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${colors.text}`}>
          {counterLabel} ({percentLabel})
        </span>
      </div>

      <div className={`h-3 w-full overflow-hidden rounded-full ${colors.track}`}>
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(loading && !progress ? 4 : 0, percent))}%` }}
        />
      </div>

      {progress ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-700">
          <Stat label="Insérés" value={progress.inserted} />
          {showUpdated ? (
            <Stat label="Mis à jour" value={progress.updated} />
          ) : (
            <Stat label="Reçus" value={progress.fetched} />
          )}
          <Stat label="Ignorés" value={progress.skipped} />
          {showAgents ? (
            <Stat label="Agents" value={progress.usersUpserted} />
          ) : progress.mode === 'full' ? (
            <Stat label="Mois" value={progress.monthsProcessed} />
          ) : (
            <Stat label="Pages" value={progress.pages} />
          )}
        </div>
      ) : null}

      {hint ? <p className="text-[11px] text-gray-500">{hint}</p> : null}
    </div>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-md bg-white border border-gray-100 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}
