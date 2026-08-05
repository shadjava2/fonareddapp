import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, getAxiosErrorMessage } from '@/lib/fetcher';
import { formatDecimalFR } from '@/lib/formatDate';
import type {
  MonitoringActionCode,
  MonitoringCase,
  PresenceMonitoringResult,
  PresenceMonitoringScope,
} from '@/lib/presence/presence-monitoring';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const ACTION_OPTIONS: Array<{ value: MonitoringActionCode; label: string }> = [
  { value: 'pending', label: 'En attente' },
  { value: 'observation', label: 'Observation (aucune sanction)' },
  { value: 'explication_demandee', label: 'Demande d’explication' },
  { value: 'blame_declenche', label: 'Blâme déclenché' },
  { value: 'revocation_proposee', label: 'Révocation proposée' },
  { value: 'retrait_conge_fait', label: 'Retrait congé fait' },
  { value: 'justification_recue', label: 'Justification reçue' },
];

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const SECTION_DEFS: Array<{
  id: MonitoringCase['section'];
  title: string;
}> = [
  { id: 'blame', title: 'À blâmer / révoquer' },
  { id: 'explication', title: 'Demandes d’explication' },
  {
    id: 'absences',
    title: 'Absences (retrait congé suggéré)',
  },
  {
    id: 'retards_entree',
    title: 'Retards d’entrée (≥ 8 / mois) — blâme / révocation',
  },
  {
    id: 'retards_sortie',
    title: 'Sorties irrégulières (≥ 8 / mois)',
  },
];

type FilterMode = 'pending' | 'treated' | 'all';

type Draft = {
  action: MonitoringActionCode;
  notes: string;
  joursRetrait: string;
};

function caseKey(c: MonitoringCase): string {
  return `${c.employeeNo}|${c.ruleCode}|${c.year}|${c.month}`;
}

function defaultEndMonth(year: number): number {
  const now = new Date();
  if (year === now.getFullYear()) return now.getMonth() + 1;
  if (year > now.getFullYear()) return 1;
  return 12;
}

const PresenceMonitoringPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [scope, setScope] = useState<PresenceMonitoringScope>('month');
  const [filter, setFilter] = useState<FilterMode>('pending');
  const [data, setData] = useState<PresenceMonitoringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2, y - 3];
  }, [now]);

  const monthOptions = useMemo(() => {
    const max =
      year === now.getFullYear()
        ? now.getMonth() + 1
        : year > now.getFullYear()
          ? 1
          : 12;
    return MONTHS.slice(0, max).map((label, i) => ({
      value: i + 1,
      label,
    }));
  }, [year, now]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<
        PresenceMonitoringResult & { success: boolean; message?: string }
      >(
        `/api/hikvision/presence-monitoring?year=${year}&month=${month}&scope=${scope}`,
        { timeout: 180_000 }
      );
      if (!res.success) {
        showError(res.message || 'Chargement impossible');
        setData(null);
        return;
      }
      setData(res);
      const next: Record<string, Draft> = {};
      for (const c of res.cases || []) {
        next[caseKey(c)] = {
          action: c.action,
          notes: c.notes || '',
          joursRetrait: String(c.joursRetraitSuggeres || 0),
        };
      }
      setDrafts(next);
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Chargement impossible');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, scope, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCases = useMemo(() => {
    const list = data?.cases || [];
    if (filter === 'pending') return list.filter((c) => c.action === 'pending');
    if (filter === 'treated') return list.filter((c) => c.action !== 'pending');
    return list;
  }, [data, filter]);

  const monthGroups = useMemo(() => {
    const months = data?.months?.length
      ? data.months
      : [...new Set(filteredCases.map((c) => c.month))].sort((a, b) => a - b);
    if (scope === 'month') {
      return [
        {
          month,
          label: MONTHS[month - 1] || String(month),
          sections: SECTION_DEFS.map((sec) => ({
            ...sec,
            rows: filteredCases.filter((c) => c.section === sec.id),
          })),
        },
      ];
    }
    return months
      .map((m) => ({
        month: m,
        label: MONTHS[m - 1] || String(m),
        sections: SECTION_DEFS.map((sec) => ({
          ...sec,
          rows: filteredCases.filter(
            (c) => c.month === m && c.section === sec.id
          ),
        })),
      }))
      .filter((g) => g.sections.some((s) => s.rows.length > 0));
  }, [data, filteredCases, scope, month]);

  const saveAction = async (c: MonitoringCase) => {
    const key = caseKey(c);
    const draft = drafts[key];
    if (!draft) return;
    setSavingKey(key);
    try {
      const res = await apiPost<{
        success: boolean;
        message?: string;
      }>('/api/hikvision/presence-monitoring', {
        employeeNo: c.employeeNo,
        year: c.year,
        month: c.month,
        ruleCode: c.ruleCode,
        action: draft.action,
        notes: draft.notes || null,
        metricValue: c.metricValue,
        joursRetrait:
          draft.action === 'retrait_conge_fait'
            ? Number(draft.joursRetrait) || 0
            : 0,
        detail: c.detail,
      });
      if (res.success) {
        showSuccess(res.message || 'Action enregistrée.');
        await load();
      } else {
        showError(res.message || 'Enregistrement impossible');
      }
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Enregistrement impossible');
    } finally {
      setSavingKey(null);
    }
  };

  const downloadPdf = () => {
    const pendingOnly = filter === 'pending' ? '1' : '0';
    window.open(
      `/api/hikvision/presence-monitoring-pdf?year=${year}&month=${month}&scope=${scope}&pendingOnly=${pendingOnly}`,
      '_blank'
    );
  };

  const onScopeChange = (next: PresenceMonitoringScope) => {
    setScope(next);
    if (next === 'ytd') {
      setMonth(defaultEndMonth(year));
    }
  };

  const onYearChange = (nextYear: number) => {
    setYear(nextYear);
    const max = defaultEndMonth(nextYear);
    setMonth((m) => Math.min(m, max));
  };

  return (
    <PersonnelLayout
      title="Monitoring de présence"
      description="KPI et actions selon les notes circulaires"
    >
      <div className="space-y-6 print:space-y-3">
        <div className="rounded-lg bg-white p-6 shadow print:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-8 w-8 shrink-0 text-amber-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Monitoring de présence
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Tableau décisionnel : absences, retards, NJ (plafond{' '}
                  {data?.njPlafond ?? 3} j./an). Cochez les actions déclenchées
                  pour actualiser la file « à traiter ».
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Config plafond NJ :{' '}
                  <Link
                    href="/conge/config-conge"
                    className="text-indigo-700 underline"
                  >
                    Config Congé
                  </Link>
                  {' · '}
                  <Link
                    href="/conge/non-justifie"
                    className="text-indigo-700 underline"
                  >
                    Congés non justifiés
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Actualiser
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <PrinterIcon className="mr-1.5 h-4 w-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
            <div>
              <label
                htmlFor="mon-scope"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Période
              </label>
              <select
                id="mon-scope"
                value={scope}
                onChange={(e) =>
                  onScopeChange(e.target.value as PresenceMonitoringScope)
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="month">Mois par mois</option>
                <option value="ytd">
                  Cumul année (janv. → mois en cours)
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="mon-year"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Année
              </label>
              <select
                id="mon-year"
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="mon-month"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                {scope === 'ytd' ? 'Jusqu’au mois' : 'Mois'}
              </label>
              <select
                id="mon-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {(scope === 'ytd'
                  ? monthOptions
                  : MONTHS.map((label, i) => ({
                      value: i + 1,
                      label,
                    }))
                ).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="mon-filter"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Affichage
              </label>
              <select
                id="mon-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterMode)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="pending">À traiter</option>
                <option value="treated">Traités</option>
                <option value="all">Tout</option>
              </select>
            </div>
            {data?.monthLabel ? (
              <p className="pb-2 text-xs text-gray-500">
                {data.monthLabel}
                {data.from && data.to ? ` · ${data.from} → ${data.to}` : ''}
              </p>
            ) : null}
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['À traiter', data.kpis.pendingTotal],
              ['Blâme', data.kpis.pendingBlame],
              ['Explications', data.kpis.pendingExplication],
              ['Absences', data.kpis.pendingAbsences],
              ['Retards entrée', data.kpis.pendingRetardsEntree],
              ['Traités', data.kpis.treatedTotal],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-amber-100 bg-amber-50/60 p-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-amber-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
            Calcul des indicateurs… (peut prendre une minute)
          </p>
        ) : !data ? (
          <p className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
            Aucune donnée.
          </p>
        ) : (
          <>
            {monthGroups.length === 0 ? (
              <p className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
                Aucun cas sur la période sélectionnée.
              </p>
            ) : (
              monthGroups.map((group) => (
                <div key={group.month} className="space-y-4">
                  {scope === 'ytd' && (
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {group.label} {year}
                      </h2>
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs text-gray-500">
                        {group.sections.reduce((n, s) => n + s.rows.length, 0)}{' '}
                        cas
                      </span>
                    </div>
                  )}
                  {group.sections
                    .filter((sec) => scope === 'month' || sec.rows.length > 0)
                    .map((sec) => (
                      <div
                        key={`${group.month}-${sec.id}`}
                        className="overflow-hidden rounded-lg bg-white shadow print:shadow-none"
                      >
                        <div className="border-b border-gray-100 px-4 py-3">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {sec.title}{' '}
                            <span className="font-normal text-gray-500">
                              ({sec.rows.length})
                            </span>
                          </h3>
                        </div>
                        {sec.rows.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-gray-500">
                            Aucun cas.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                                    Agent
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                                    Règle
                                  </th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                                    Métrique
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600 print:hidden">
                                    Action
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600 print:hidden">
                                    Notes / j. retrait
                                  </th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-600 print:hidden">
                                    —
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sec.rows.map((c) => {
                                  const key = caseKey(c);
                                  const draft = drafts[key] || {
                                    action: c.action,
                                    notes: c.notes || '',
                                    joursRetrait: String(
                                      c.joursRetraitSuggeres || 0
                                    ),
                                  };
                                  return (
                                    <tr
                                      key={key}
                                      className={
                                        c.action === 'pending'
                                          ? 'bg-amber-50/40'
                                          : undefined
                                      }
                                    >
                                      <td className="px-3 py-2">
                                        <div className="font-medium text-gray-900">
                                          {c.employeeName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          ID {c.employeeNo}
                                          {c.department
                                            ? ` · ${c.department}`
                                            : ''}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">
                                        <div>{c.ruleLabel}</div>
                                        <div className="text-xs text-gray-500">
                                          {c.suggestedAction}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                                        {c.metricLabel}
                                      </td>
                                      <td className="px-3 py-2 print:hidden">
                                        <select
                                          value={draft.action}
                                          onChange={(e) =>
                                            setDrafts((p) => ({
                                              ...p,
                                              [key]: {
                                                ...draft,
                                                action: e.target
                                                  .value as MonitoringActionCode,
                                              },
                                            }))
                                          }
                                          className="w-full max-w-[11rem] rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                                        >
                                          {ACTION_OPTIONS.map((o) => (
                                            <option
                                              key={o.value}
                                              value={o.value}
                                            >
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2 print:hidden">
                                        <input
                                          type="text"
                                          value={draft.notes}
                                          onChange={(e) =>
                                            setDrafts((p) => ({
                                              ...p,
                                              [key]: {
                                                ...draft,
                                                notes: e.target.value,
                                              },
                                            }))
                                          }
                                          placeholder="Notes…"
                                          className="mb-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                                        />
                                        {draft.action ===
                                          'retrait_conge_fait' && (
                                          <input
                                            type="number"
                                            min={0}
                                            step={0.5}
                                            value={draft.joursRetrait}
                                            onChange={(e) =>
                                              setDrafts((p) => ({
                                                ...p,
                                                [key]: {
                                                  ...draft,
                                                  joursRetrait: e.target.value,
                                                },
                                              }))
                                            }
                                            className="w-24 rounded-md border border-amber-300 px-2 py-1 text-xs"
                                            title="Jours à débiter du solde"
                                          />
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right print:hidden">
                                        <button
                                          type="button"
                                          disabled={savingKey === key}
                                          onClick={() => void saveAction(c)}
                                          className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                          {savingKey === key
                                            ? '…'
                                            : 'Enregistrer'}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: `Top retards entrée ${year}`,
                  rows: data.rankingsYear.lateEntry,
                  field: 'lateEntry' as const,
                },
                {
                  title: `Top sorties tardives ${year}`,
                  rows: data.rankingsYear.lateExit,
                  field: 'lateExit' as const,
                },
                {
                  title: `Top sorties anticipées ${year}`,
                  rows: data.rankingsYear.earlyLeave,
                  field: 'earlyLeave' as const,
                },
              ].map((block) => (
                <div
                  key={block.title}
                  className="rounded-lg bg-white p-4 shadow print:shadow-none"
                >
                  <h3 className="text-sm font-semibold text-gray-900">
                    {block.title}
                  </h3>
                  {block.rows.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">Aucun.</p>
                  ) : (
                    <ol className="mt-3 space-y-1.5 text-sm">
                      {block.rows.slice(0, 10).map((r, i) => (
                        <li
                          key={r.employeeNo}
                          className="flex justify-between gap-2"
                        >
                          <span className="text-gray-800">
                            {i + 1}. {r.employeeName}
                          </span>
                          <span className="tabular-nums font-medium text-gray-900">
                            {formatDecimalFR(r[block.field])}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
              <p className="font-semibold text-gray-800">Règles appliquées</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {data.rulesLegend.map((r) => (
                  <li key={r.code}>
                    <span className="font-medium">{r.code}</span> — {r.label}{' '}
                    → {r.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </PersonnelLayout>
  );
};

export default PresenceMonitoringPage;
