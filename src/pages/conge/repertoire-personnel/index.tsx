import HistoriqueCongesModal from '@/components/conge/HistoriqueCongesModal';
import CongeAppShell from '@/components/layout/CongeAppShell';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, getAxiosErrorMessage } from '@/lib/fetcher';
import { formatDecimalFR } from '@/lib/formatDate';
import {
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type AgentRow = {
  id: string;
  label: string;
  username: string;
  soldeId: string | null;
  solde: number;
  soldeConsomme: number;
  soldeRestant: number;
  totalPrevu: number;
  monthsCounted: number;
  needsCorrection: boolean;
};

type MonthMeta = {
  month: number;
  monthName: string;
  monthsCounted: number;
  nbjourMois: number;
  totalPrevuSansConso: number;
  resetYear?: boolean;
};

const CORRECT_TIMEOUT_MS = 180_000;

const RepertoirePersonnelPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [meta, setMeta] = useState<MonthMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [historiqueAgent, setHistoriqueAgent] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{
        success: boolean;
        agents?: AgentRow[];
        currentMonth?: MonthMeta;
        message?: string;
      }>('/api/conge/repertoire-personnel');
      if (res.success) {
        setAgents(res.agents || []);
        setMeta(res.currentMonth || null);
      } else {
        showError(res.message || 'Chargement impossible');
      }
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q)
    );
  }, [agents, filter]);

  const needsCount = useMemo(
    () => agents.filter((a) => a.needsCorrection).length,
    [agents]
  );

  const correctAll = async () => {
    const ok = window.confirm(
      meta?.resetYear
        ? `Remise à zéro de janvier ?\n\nTous les soldes (restant + consommé) seront remis à 0.`
        : meta
          ? `Recalibrer tous les soldes ?\n\nMois : ${meta.monthName}\nMois crédités : ${meta.monthsCounted} × ${meta.nbjourMois} = ${meta.totalPrevuSansConso} j. prévus\nRestant = prévu − consommé (conservé).`
          : 'Recalibrer tous les soldes ?'
    );
    if (!ok) return;

    setCorrecting(true);
    try {
      const res = await apiPost<{
        success: boolean;
        message?: string;
        updated?: number;
      }>(
        '/api/conge/repertoire-personnel',
        { action: 'correct-all' },
        { timeout: CORRECT_TIMEOUT_MS }
      );
      if (res.success) {
        showSuccess(res.message || `${res.updated ?? 0} agent(s) corrigé(s).`);
        await load();
      } else {
        showError(res.message || 'Correction impossible');
      }
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Correction impossible');
      // La requête a pu aboutir côté serveur malgré un timeout client
      await load();
    } finally {
      setCorrecting(false);
    }
  };

  const correctOne = async (id: string) => {
    setCorrectingId(id);
    try {
      const res = await apiPost<{
        success: boolean;
        message?: string;
      }>(
        '/api/conge/repertoire-personnel',
        {
          action: 'correct-one',
          utilisateurId: id,
        },
        { timeout: CORRECT_TIMEOUT_MS }
      );
      if (res.success) {
        showSuccess(res.message || 'Solde corrigé.');
        await load();
      } else {
        showError(res.message || 'Correction impossible');
      }
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Correction impossible');
      await load();
    } finally {
      setCorrectingId(null);
    }
  };

  return (
    <CongeAppShell>
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <UserGroupIcon className="h-8 w-8 shrink-0 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Répertoire du personnel
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Vue d’ensemble des soldes. Recalibrage auto au 1er de chaque
                  mois (scheduler). Novembre crédite aussi décembre ;
                  janvier remet tout à zéro ; février reprend le compteur.
                </p>
                {meta && (
                  <p className="mt-2 text-sm text-indigo-800">
                    {meta.resetYear ? (
                      <>
                        <strong>{meta.monthName}</strong> → remise à zéro
                        (solde + consommé).
                      </>
                    ) : (
                      <>
                        <strong>{meta.monthName}</strong> →{' '}
                        {meta.monthsCounted} mois crédité
                        {meta.monthsCounted > 1 ? 's' : ''} ×{' '}
                        {formatDecimalFR(meta.nbjourMois)} ={' '}
                        <strong>
                          {formatDecimalFR(meta.totalPrevuSansConso)} j.
                        </strong>{' '}
                        prévus (avant consommation).
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void load()}
                disabled={loading || correcting}
              >
                <ArrowPathIcon
                  className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Actualiser
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={correcting}
                disabled={loading || correcting}
                onClick={() => void correctAll()}
              >
                {meta?.resetYear
                  ? 'Remettre à zéro'
                  : 'Corriger les nombres de jours'}
                {needsCount > 0 ? ` (${needsCount})` : ''}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrer par nom ou identifiant…"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-gray-500">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Aucun agent trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Agent
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Prévu (mois)
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Consommé
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Restant
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Attendu
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((a) => {
                    const expectedRestant = meta?.resetYear
                      ? 0
                      : Math.max(0, a.totalPrevu - a.soldeConsomme);
                    return (
                      <tr
                        key={a.id}
                        className={
                          a.needsCorrection ? 'bg-amber-50/60' : undefined
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {a.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{a.username}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {formatDecimalFR(a.totalPrevu)}
                          <div className="text-xs text-gray-400">
                            {a.monthsCounted} mois
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                          {formatDecimalFR(a.soldeConsomme)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-800">
                          {formatDecimalFR(a.soldeRestant)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {formatDecimalFR(expectedRestant)}
                          {a.needsCorrection && (
                            <div className="text-xs font-medium text-amber-700">
                              à corriger
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={correcting}
                              onClick={() =>
                                setHistoriqueAgent({
                                  id: a.id,
                                  label: a.label,
                                })
                              }
                              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              title="Historique de congés"
                            >
                              <ClockIcon className="mr-1 h-3.5 w-3.5" />
                              Historique
                            </button>
                            <button
                              type="button"
                              disabled={correcting || correctingId === a.id}
                              onClick={() => void correctOne(a.id)}
                              className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                            >
                              {correctingId === a.id
                                ? '…'
                                : meta?.resetYear
                                  ? 'Remettre à 0'
                                  : 'Corriger'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <HistoriqueCongesModal
        open={historiqueAgent != null}
        onClose={() => setHistoriqueAgent(null)}
        utilisateurId={historiqueAgent?.id || ''}
        agentLabel={historiqueAgent?.label || ''}
      />
    </CongeAppShell>
  );
};

export default RepertoirePersonnelPage;
