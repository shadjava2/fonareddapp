import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost } from '@/lib/fetcher';
import type { AcsDuplicateGroup } from '@/lib/hikvision/acs-user-duplicates';
import {
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';

const AcsDuplicatesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [groups, setGroups] = useState<AcsDuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mergingKey, setMergingKey] = useState<string | null>(null);
  /** keepEmployeeNo choisi par groupe */
  const [keepByKey, setKeepByKey] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const q = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : '';
      const res = await apiGet<{
        success: boolean;
        groups: AcsDuplicateGroup[];
        message?: string;
      }>(`/api/hikvision/acs-duplicates${q}`);
      if (!res.success) {
        showError('Erreur', res.message || 'Impossible de charger les doublons');
        setGroups([]);
        return;
      }
      const list = res.groups || [];
      setGroups(list);
      const defaults: Record<string, string> = {};
      for (const g of list) {
        defaults[g.key] = g.suggestedKeepEmployeeNo;
      }
      setKeepByKey(defaults);
    } catch (e: any) {
      showError('Erreur', e?.message || 'Chargement impossible');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [search, showError]);

  useEffect(() => {
    void load();
  }, []);

  const handleMerge = async (group: AcsDuplicateGroup) => {
    const keep = keepByKey[group.key] || group.suggestedKeepEmployeeNo;
    const mergeEmployeeNos = group.candidates
      .map((c) => c.employee_no)
      .filter((no) => no !== keep);

    if (!keep || mergeEmployeeNos.length === 0) {
      showError('Fusion', 'Choisissez un ID à conserver et au moins un alias.');
      return;
    }

    const ok = window.confirm(
      `Fusionner vers « ${keep} » ?\n\n` +
        `Conservé : ${keep}\n` +
        `Fusionné(s) : ${mergeEmployeeNos.join(', ')}\n\n` +
        `Les pointages / cartes des IDs fusionnés seront rattachés à ${keep}.`
    );
    if (!ok) return;

    try {
      setMergingKey(group.key);
      const res = await apiPost<{
        success: boolean;
        message?: string;
        result?: {
          eventsUpdated: number;
          cardsUpdated: number;
          usersDeleted: number;
        };
      }>('/api/hikvision/acs-duplicates', {
        keepEmployeeNo: keep,
        mergeEmployeeNos,
      });
      if (!res.success) {
        showError('Fusion échouée', res.message || 'Erreur');
        return;
      }
      const r = res.result;
      showSuccess(
        'Fusion réussie',
        `${res.message || ''} — ${r?.eventsUpdated ?? 0} pointage(s), ${r?.usersDeleted ?? 0} fiche(s) alias supprimée(s).`
      );
      await load();
    } catch (e: any) {
      showError(
        'Fusion échouée',
        e?.response?.data?.message || e?.message || 'Erreur'
      );
    } finally {
      setMergingKey(null);
    }
  };

  return (
    <PersonnelLayout
      title="Doublons agents ACS"
      description="Détecter et fusionner les fiches en double après import iVMS"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ArrowsRightLeftIcon className="h-8 w-8 text-emerald-700 shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Fusion des doublons agents
                </h1>
                <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                  Après un import, un même agent peut apparaître avec un ID
                  numérique (ex. <code className="text-xs bg-gray-100 px-1 rounded">004</code>)
                  et un ID généré{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">n:…</code>.
                  Par défaut on conserve l&apos;ID numérique ; l&apos;autre est
                  fusionné dedans.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void load();
                }}
                placeholder="Filtrer par nom ou ID…"
                className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="px-4 py-2 rounded-md bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
            >
              Actualiser
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Groupes détectés ({groups.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Analyse des doublons…
            </div>
          ) : groups.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Aucun doublon détecté (même nom, IDs différents).
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {groups.map((g) => {
                const keep =
                  keepByKey[g.key] || g.suggestedKeepEmployeeNo;
                return (
                  <li key={g.key} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {g.displayName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Choisissez l&apos;ID à conserver (radio). Les autres
                          seront fusionnés.
                        </p>
                        <div className="mt-3 space-y-2">
                          {g.candidates.map((c) => (
                            <label
                              key={c.employee_no}
                              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
                                keep === c.employee_no
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`keep-${g.key}`}
                                className="mt-1"
                                checked={keep === c.employee_no}
                                onChange={() =>
                                  setKeepByKey((prev) => ({
                                    ...prev,
                                    [g.key]: c.employee_no,
                                  }))
                                }
                              />
                              <div className="min-w-0 flex-1 text-sm">
                                <div className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                                  <span className="font-mono">
                                    {c.employee_no}
                                  </span>
                                  {c.isNumericId ? (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                      ID numérique
                                    </span>
                                  ) : (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                      Alias généré
                                    </span>
                                  )}
                                  {keep === c.employee_no && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                      À conserver
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {c.eventsCount} pointage(s)
                                  {c.department
                                    ? ` · ${c.department}`
                                    : ''}
                                  {c.system_user_id
                                    ? ` · lié user #${c.system_user_id}`
                                    : ''}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <button
                          type="button"
                          disabled={mergingKey === g.key}
                          onClick={() => void handleMerge(g)}
                          className="w-full lg:w-auto px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {mergingKey === g.key
                            ? 'Fusion…'
                            : `Fusionner → ${keep}`}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </PersonnelLayout>
  );
};

export default AcsDuplicatesPage;
