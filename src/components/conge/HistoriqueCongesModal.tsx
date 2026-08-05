import { AnimatedModal } from '@/components/forms/AnimatedModal';
import { apiGet, getAxiosErrorMessage } from '@/lib/fetcher';
import { formatDateFR, formatDecimalFR } from '@/lib/formatDate';
import React, { useCallback, useEffect, useState } from 'react';

type HistoriqueKind =
  | 'processus_normal'
  | 'saisie_manuelle'
  | 'non_justifie';

type HistoriqueItem = {
  id: string;
  kind: HistoriqueKind;
  label: string;
  du: string | null;
  au: string | null;
  nbrjour: number;
  statut: string | null;
  section: string | null;
  commentaire: string | null;
  datecreate: string | null;
  typeConge: string | null;
};

type Stats = {
  year: number;
  totalJours: number;
  processusNormal: { count: number; jours: number };
  saisieManuelle: { count: number; jours: number };
  nonJustifie: { count: number; jours: number };
};

type Props = {
  open: boolean;
  onClose: () => void;
  utilisateurId: string;
  agentLabel: string;
};

const KIND_STYLE: Record<
  HistoriqueKind,
  { badge: string; text: string }
> = {
  processus_normal: {
    badge: 'bg-indigo-100 text-indigo-800',
    text: 'Processus normal',
  },
  saisie_manuelle: {
    badge: 'bg-emerald-100 text-emerald-800',
    text: 'Saisie manuelle',
  },
  non_justifie: {
    badge: 'bg-amber-100 text-amber-900',
    text: 'Non justifié',
  },
};

export const HistoriqueCongesModal: React.FC<Props> = ({
  open,
  onClose,
  utilisateurId,
  agentLabel,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [years, setYears] = useState<number[]>([currentYear]);
  const [items, setItems] = useState<HistoriqueItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'all' | HistoriqueKind>('all');

  const load = useCallback(async () => {
    if (!utilisateurId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{
        success: boolean;
        message?: string;
        years?: number[];
        year?: number;
        stats?: Stats;
        items?: HistoriqueItem[];
      }>(
        `/api/conge/historique-conges?utilisateurId=${encodeURIComponent(utilisateurId)}&year=${year}`
      );
      if (!res.success) {
        setError(res.message || 'Chargement impossible');
        setItems([]);
        setStats(null);
        return;
      }
      setYears(res.years?.length ? res.years : [currentYear]);
      setStats(res.stats || null);
      setItems(res.items || []);
    } catch (e: unknown) {
      setError(getAxiosErrorMessage(e) || 'Chargement impossible');
      setItems([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [utilisateurId, year, currentYear]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (open) {
      setYear(currentYear);
      setKindFilter('all');
    }
  }, [open, utilisateurId, currentYear]);

  const filtered =
    kindFilter === 'all'
      ? items
      : items.filter((i) => i.kind === kindFilter);

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      title={`Historique de congés — ${agentLabel}`}
      size="xl"
      loading={loading}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="historique-year"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Année
            </label>
            <select
              id="historique-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              htmlFor="historique-kind"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Type
            </label>
            <select
              id="historique-kind"
              value={kindFilter}
              onChange={(e) =>
                setKindFilter(e.target.value as 'all' | HistoriqueKind)
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tous</option>
              <option value="processus_normal">Processus normal</option>
              <option value="saisie_manuelle">Saisie manuelle</option>
              <option value="non_justifie">Non justifié</option>
            </select>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total {stats.year}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                {formatDecimalFR(stats.totalJours)} j.
              </p>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                Processus normal
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-indigo-950">
                {formatDecimalFR(stats.processusNormal.jours)} j.
              </p>
              <p className="text-xs text-indigo-700/80">
                {stats.processusNormal.count} période
                {stats.processusNormal.count > 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Saisie manuelle
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-950">
                {formatDecimalFR(stats.saisieManuelle.jours)} j.
              </p>
              <p className="text-xs text-emerald-700/80">
                {stats.saisieManuelle.count} période
                {stats.saisieManuelle.count > 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                Non justifié
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-950">
                {formatDecimalFR(stats.nonJustifie.jours)} j.
              </p>
              <p className="text-xs text-amber-800/80">
                {stats.nonJustifie.count} période
                {stats.nonJustifie.count > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Aucun congé enregistré pour {year}.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Période
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Jours
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Détail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((it) => {
                  const style = KIND_STYLE[it.kind];
                  return (
                    <tr key={it.id}>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}
                        >
                          {style.text}
                        </span>
                        {it.typeConge && (
                          <div className="mt-1 text-xs text-gray-500">
                            {it.typeConge}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-800">
                        {it.du || it.au ? (
                          <>
                            {formatDateFR(it.du)}
                            {it.au ? ` → ${formatDateFR(it.au)}` : ''}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                        {formatDecimalFR(it.nbrjour)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-xs">
                        {it.commentaire ? (
                          <span className="line-clamp-2" title={it.commentaire}>
                            {it.commentaire}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
};

export default HistoriqueCongesModal;
