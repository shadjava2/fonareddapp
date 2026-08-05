import { IngestProgressPanel } from '@/components/personnel/IngestProgressPanel';
import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { consumeNdjsonStream } from '@/lib/fetch-ndjson-stream';
import {
  computePercent,
  emptyIngestProgress,
  type IngestStreamProgress,
} from '@/lib/hikvision/ingest-progress';
import React, { useRef, useState } from 'react';

function validateCsvFile(file: File): { ok: true } | { ok: false; msg: string } {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv';
  const maxBytes = 32 * 1024 * 1024;
  if (!isCsv) return { ok: false, msg: 'Fichier invalide : un .csv est requis.' };
  if (file.size > maxBytes) {
    return { ok: false, msg: 'Fichier trop volumineux (max ~32 Mo).' };
  }
  return { ok: true };
}

function progressFromNdjson(evt: Record<string, unknown>): IngestStreamProgress {
  const mode =
    evt.mode === 'full' || evt.mode === 'normalize'
      ? evt.mode
      : 'incremental';
  const total = Number(evt.total || 0);
  const current = Number(evt.current || evt.rowsParsed || evt.processed || 0);
  const percent = Number(
    evt.percent ??
      (total > 0 ? computePercent(current, total) : evt.percent || 0)
  );
  return {
    phase:
      evt.phase === 'start' || evt.phase === 'done' ? evt.phase : 'progress',
    mode,
    total,
    current,
    percent,
    inserted: Number(evt.inserted || 0),
    updated: Number(evt.updated || 0),
    skipped: Number(evt.skipped || 0),
    fetched: Number(evt.fetched || 0),
    pages: Number(evt.pages || evt.batches || 0),
    monthsProcessed: Number(evt.monthsProcessed || 0),
    usersUpserted: Number(evt.usersUpserted || 0),
    monthLabel: evt.monthLabel ? String(evt.monthLabel) : undefined,
    message: evt.message ? String(evt.message) : undefined,
  };
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

const HikvisionIngestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);
  const [ivmsLoading, setIvmsLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [incProgress, setIncProgress] = useState<IngestStreamProgress | null>(
    null
  );
  const [fullProgress, setFullProgress] = useState<IngestStreamProgress | null>(
    null
  );
  const [ivmsProgress, setIvmsProgress] = useState<IngestStreamProgress | null>(
    null
  );
  const [csvProgress, setCsvProgress] = useState<IngestStreamProgress | null>(
    null
  );

  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvDragActive, setCsvDragActive] = useState(false);
  const [selectedCsvName, setSelectedCsvName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busy =
    loading || fullLoading || ivmsLoading || csvLoading || photoLoading;

  const handleNdjsonProgress =
    (setter: React.Dispatch<React.SetStateAction<IngestStreamProgress | null>>) =>
    async (evt: Record<string, unknown>) => {
      if (
        evt.type === 'progress' ||
        evt.type === 'start' ||
        evt.phase === 'progress' ||
        evt.phase === 'start'
      ) {
        setter(progressFromNdjson(evt));
      }
      if (evt.type === 'done') {
        setter({
          ...progressFromNdjson(evt),
          phase: 'done',
          percent: 100,
          message: evt.message ? String(evt.message) : 'Terminé',
        });
      }
    };

  const runIngestStream = async (full: boolean) => {
    const setLoadingFn = full ? setFullLoading : setLoading;
    const setProgressFn = full ? setFullProgress : setIncProgress;
    const mode = full ? 'full' : 'incremental';

    try {
      setLoadingFn(true);
      setError(null);
      setResult(null);
      setProgressFn(
        emptyIngestProgress(mode, {
          message: full
            ? 'Préparation import historique…'
            : 'Connexion au lecteur…',
        })
      );

      const url = full
        ? '/api/hikvision/ingest?full=1&stream=1'
        : '/api/hikvision/ingest?stream=1';

      const res = await fetch(url, {
        headers: { Accept: 'application/x-ndjson' },
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `Échec ingestion (HTTP ${res.status})`;
        try {
          const j = JSON.parse(errText) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const finalResult = await consumeNdjsonStream(res, handleNdjsonProgress(setProgressFn));
      setResult({
        kind: full ? 'ingest-full' : 'ingest-inc',
        ...finalResult,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setProgressFn(null);
    } finally {
      setLoadingFn(false);
    }
  };

  const runNormalizeIvms = async () => {
    try {
      setIvmsLoading(true);
      setError(null);
      setResult(null);
      setIvmsProgress(
        emptyIngestProgress('normalize', {
          message: 'Lecture des lignes iVMS en attente…',
        })
      );

      const res = await fetch('/api/hikvision/normalize-ivms?stream=1', {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson' },
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `Échec normalisation (HTTP ${res.status})`;
        try {
          const j = JSON.parse(errText) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const finalResult = await consumeNdjsonStream(
        res,
        handleNdjsonProgress(setIvmsProgress)
      );
      setResult({ kind: 'normalize-ivms', ...finalResult });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setIvmsProgress(null);
    } finally {
      setIvmsLoading(false);
    }
  };

  const runSyncPhotos = async () => {
    try {
      setPhotoLoading(true);
      setError(null);
      setResult(null);
      const res = await fetch('/api/hikvision/sync-ivms-photos', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Échec sync photos');
      }
      setResult({ kind: 'photos', ...data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setPhotoLoading(false);
    }
  };

  const onCsvFile = async (file: File | null) => {
    if (!file) return;
    if (busy) return;

    const v = validateCsvFile(file);
    if (!v.ok) {
      setError(v.msg);
      setCsvProgress(null);
      setSelectedCsvName(null);
      setResult(null);
      return;
    }

    try {
      setCsvLoading(true);
      setError(null);
      setResult(null);
      setSelectedCsvName(file.name);
      setCsvProgress(
        emptyIngestProgress('incremental', {
          message: `Lecture de ${file.name}…`,
        })
      );

      const csvBase64 = await fileToBase64(file);

      const res = await fetch('/api/hikvision/import-ivms-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify({ csvBase64, stream: true }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = `Échec import CSV (HTTP ${res.status})`;
        try {
          const j = JSON.parse(errText) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const finalResult = await consumeNdjsonStream(res, async (evt) => {
        if (evt.type === 'progress' || evt.type === 'start') {
          const p = progressFromNdjson({
            ...evt,
            mode: 'incremental',
          });
          setCsvProgress(p);
        }
        if (evt.type === 'done') {
          setCsvProgress({
            ...progressFromNdjson({
              ...evt,
              mode: 'incremental',
              current: Number(evt.rowsParsed || evt.current || 0),
            }),
            phase: 'done',
            percent: 100,
            message: 'Import CSV terminé',
          });
        }
      });

      setResult({ kind: 'csv', file: file.name, ...finalResult });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setCsvProgress(null);
    } finally {
      setCsvLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <PersonnelLayout
      title="Hikvision - Ingestion"
      description="iVMS MySQL, CSV et ingestion lecteur"
    >
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold mb-2">
            iVMS → MySQL (recommandé)
          </h1>
          <p className="text-sm text-gray-600 mb-3">
            Configurez iVMS <strong>Third-Party Database → MySQL</strong> vers la
            table{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">
              ivms_attendance
            </code>
            . Puis normalisez ici pour alimenter les rapports Fonaredd.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runNormalizeIvms()}
              disabled={busy}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {ivmsLoading ? 'Normalisation…' : 'Normaliser iVMS → acs_events'}
            </button>
            <button
              type="button"
              onClick={() => void runSyncPhotos()}
              disabled={busy}
              className="px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {photoLoading ? 'Photos…' : 'Synchroniser photos (docs/hikvision)'}
            </button>
          </div>
          <IngestProgressPanel
            title="Normalisation iVMS"
            loading={ivmsLoading}
            progress={ivmsProgress}
            accent="indigo"
            showUpdated
            showAgents
            hint="Transfert ivms_attendance → acs_events pour les rapports."
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">
            Rattrapage historique — CSV Original Records
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Depuis iVMS : Attendance Record → Export → CSV. Importe Person ID,
            Name, Time, Status, Check Point, Custom Name.
          </p>

          <button
            type="button"
            className={[
              'w-full rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center gap-2 transition-colors',
              csvDragActive
                ? 'border-indigo-600 bg-indigo-50 scale-[1.01]'
                : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30',
              busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
            onClick={() => {
              if (busy) return;
              fileRef.current?.click();
            }}
            disabled={busy}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!busy) setCsvDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!busy) setCsvDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCsvDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCsvDragActive(false);
              if (busy) return;
              void onCsvFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <div className="text-3xl text-indigo-500 mb-1">⬆</div>
            <div className="text-sm font-medium text-gray-800">
              Glissez-déposez votre fichier CSV ici
            </div>
            <div className="text-xs text-gray-500">
              ou cliquez pour parcourir (.csv, max ~32 Mo)
            </div>
            {selectedCsvName ? (
              <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                Dernier fichier : {selectedCsvName}
              </div>
            ) : null}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            className="sr-only"
            onChange={(e) => void onCsvFile(e.target.files?.[0] ?? null)}
          />

          <IngestProgressPanel
            title="Import CSV Original Records"
            loading={csvLoading}
            progress={csvProgress}
            accent="indigo"
            showUpdated
            showAgents
            hint="Une barre à 100 % indique que les rapports peuvent être lancés."
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">
            Lecteur ISAPI (secours)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Incrémental</strong> : après le dernier événement en base.{' '}
            <strong>Historique complet</strong> : mois par mois depuis 2010
            (peut être long selon le firmware).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runIngestStream(false)}
              disabled={busy}
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Ingestion…' : 'Ingestion incrémentale'}
            </button>
            <button
              type="button"
              onClick={() => void runIngestStream(true)}
              disabled={busy}
              className="px-4 py-2 rounded bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {fullLoading ? 'Import historique…' : 'Import tout l’historique (2010 → )'}
            </button>
          </div>

          <IngestProgressPanel
            title="Ingestion incrémentale"
            loading={loading}
            progress={incProgress}
            accent="emerald"
            hint="Synchronise les nouveaux pointages depuis le lecteur."
          />
          <IngestProgressPanel
            title="Import historique complet"
            loading={fullLoading}
            progress={fullProgress}
            accent="teal"
            hint="Peut durer plusieurs minutes — suivez la progression par mois."
          />
        </div>

        {error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 text-sm space-y-2">
            <p className="font-medium">Résumé de l’opération</p>
            {result.kind === 'normalize-ivms' ? (
              <>
                <p>
                  Traités : <strong>{String(result.processed)}</strong> — insérés :{' '}
                  <strong>{String(result.inserted)}</strong> — mis à jour :{' '}
                  <strong>{String(result.updated)}</strong> — ignorés :{' '}
                  <strong>{String(result.skipped)}</strong>
                </p>
                {Array.isArray(result.errors) && result.errors.length > 0 ? (
                  <pre className="text-xs whitespace-pre-wrap text-amber-900 bg-white/60 p-2 rounded">
                    {(result.errors as string[]).slice(0, 8).join('\n')}
                  </pre>
                ) : null}
              </>
            ) : result.kind === 'csv' ? (
              <>
                <p>
                  Fichier : <strong>{String(result.file)}</strong> — lignes :{' '}
                  <strong>{String(result.rowsParsed)}</strong> — insérés :{' '}
                  <strong>{String(result.inserted)}</strong> — mis à jour :{' '}
                  <strong>{String(result.updated)}</strong>
                </p>
              </>
            ) : result.kind === 'photos' ? (
              <p>
                Photos copiées : <strong>{String(result.copied)}</strong> — users
                liés : <strong>{String(result.linked)}</strong>
              </p>
            ) : result.kind === 'ingest-full' ? (
              <>
                <p>
                  Insérés : <strong>{String(result.inserted)}</strong> — ignorés :{' '}
                  <strong>{String(result.skipped)}</strong> — reçus :{' '}
                  <strong>{String(result.fetched)}</strong>
                </p>
                <p>
                  Mois traités :{' '}
                  <strong>{String(result.monthsProcessed ?? '—')}</strong>
                  {result.repairedFromRaw != null ? (
                    <>
                      {' '}
                      — réparés depuis raw :{' '}
                      <strong>{String(result.repairedFromRaw)}</strong>
                    </>
                  ) : null}
                </p>
              </>
            ) : (
              <>
                <p>
                  Insérés : <strong>{String(result.inserted)}</strong> — ignorés :{' '}
                  <strong>{String(result.skipped ?? 0)}</strong> — reçus :{' '}
                  <strong>{String(result.fetched ?? '—')}</strong>
                </p>
                {result.window ? (
                  <p className="text-gray-700 text-xs">
                    Fenêtre :{' '}
                    {String((result.window as { beginISO?: string }).beginISO)} →{' '}
                    {String((result.window as { endISO?: string }).endISO)}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </PersonnelLayout>
  );
};

export default HikvisionIngestPage;
