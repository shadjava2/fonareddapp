/** Progression streaming (NDJSON) — ingestion lecteur / normalisation iVMS. */
export type IngestStreamPhase = 'start' | 'progress' | 'done';

export type IngestStreamMode = 'incremental' | 'full' | 'normalize';

export type IngestStreamProgress = {
  phase: IngestStreamPhase;
  mode: IngestStreamMode;
  total: number;
  current: number;
  percent: number;
  inserted: number;
  updated: number;
  skipped: number;
  fetched: number;
  pages: number;
  monthsProcessed: number;
  usersUpserted: number;
  monthLabel?: string;
  message?: string;
};

export function computePercent(current: number, total: number, fallback = 0): number {
  if (total > 0) {
    return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  }
  return Math.min(100, Math.max(0, fallback));
}

export function countMonthsBetween(from: Date, to: Date): number {
  if (from >= to) return 1;
  let count = 0;
  let cursor = new Date(from);
  while (cursor < to) {
    count += 1;
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    cursor = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  }
  return Math.max(1, count);
}

export function emptyIngestProgress(
  mode: IngestStreamMode,
  partial?: Partial<IngestStreamProgress>
): IngestStreamProgress {
  return {
    phase: 'start',
    mode,
    total: 0,
    current: 0,
    percent: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    fetched: 0,
    pages: 0,
    monthsProcessed: 0,
    usersUpserted: 0,
    ...partial,
  };
}
