import { useToast } from '@/hooks/useToast';
import { apiPut } from '@/lib/fetcher';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

export interface UsUser {
  id: number;
  nom: string;
  prenom: string | null;
  username: string;
}

export interface UsService {
  id: number;
  designation: string | null;
  site?: {
    id: number;
    designation: string | null;
  } | null;
}

export interface UsLink {
  fkUtilisateur: number | string;
  fkService: number | string;
}

interface UserServicesEditorProps {
  users: UsUser[];
  services: UsService[];
  links: UsLink[];
  onSaved: () => Promise<void>;
}

const getUserLabel = (u: UsUser): string => {
  const fullName = [u.nom, u.prenom].filter(Boolean).join(' ').trim();
  if (fullName) return `${fullName} (@${u.username})`;
  return `@${u.username}`;
};

const getServiceLabel = (s: UsService): string => {
  const base = s.designation?.trim() || `Service #${s.id}`;
  const site = s.site?.designation?.trim();
  return site ? `${base} - ${site}` : base;
};

const UserServicesEditor: React.FC<UserServicesEditorProps> = ({
  users,
  services,
  links,
  onSaved,
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Set<number>>(new Set());
  const [baseline, setBaseline] = useState<Set<number>>(new Set());
  const [userFilter, setUserFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const validServiceIds = useMemo(
    () => new Set(services.map((s) => s.id)),
    [services]
  );

  useEffect(() => {
    if (users.length === 0) {
      setSelectedUserId(null);
      return;
    }
    if (selectedUserId == null || !users.some((u) => u.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    if (selectedUserId == null) {
      setDraft(new Set());
      setBaseline(new Set());
      return;
    }
    const assigned = new Set<number>();
    for (const l of links) {
      if (Number(l.fkUtilisateur) === selectedUserId) {
        const serviceId = Number(l.fkService);
        if (validServiceIds.has(serviceId)) assigned.add(serviceId);
      }
    }
    setDraft(new Set(assigned));
    setBaseline(new Set(assigned));
  }, [selectedUserId, links, validServiceIds]);

  const dirty = useMemo(() => {
    if (draft.size !== baseline.size) return true;
    for (const id of draft) if (!baseline.has(id)) return true;
    return false;
  }, [draft, baseline]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => getUserLabel(u).toLowerCase().includes(q));
  }, [users, userFilter]);

  const filteredServices = useMemo(() => {
    const q = serviceFilter.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => getServiceLabel(s).toLowerCase().includes(q));
  }, [services, serviceFilter]);

  const allFilteredInDraft = useMemo(() => {
    if (filteredServices.length === 0) return false;
    return filteredServices.every((s) => draft.has(s.id));
  }, [filteredServices, draft]);

  const someFilteredInDraft = useMemo(() => {
    if (filteredServices.length === 0) return false;
    const any = filteredServices.some((s) => draft.has(s.id));
    return any && !allFilteredInDraft;
  }, [filteredServices, draft, allFilteredInDraft]);

  const toggleService = useCallback((serviceId: number) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }, []);

  const checkAllCatalog = useCallback(() => {
    setDraft(new Set(services.map((s) => s.id)));
  }, [services]);

  const uncheckAllCatalog = useCallback(() => {
    setDraft(new Set());
  }, []);

  const checkFilteredOnly = useCallback(() => {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const s of filteredServices) next.add(s.id);
      return next;
    });
  }, [filteredServices]);

  const uncheckFilteredOnly = useCallback(() => {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const s of filteredServices) next.delete(s.id);
      return next;
    });
  }, [filteredServices]);

  const handleHeaderFilterCheckbox = useCallback(
    (checked: boolean) => {
      if (checked) checkFilteredOnly();
      else uncheckFilteredOnly();
    },
    [checkFilteredOnly, uncheckFilteredOnly]
  );

  const handleSave = async () => {
    if (selectedUserId == null || !dirty) return;
    try {
      setSaving(true);
      const cleanServiceIds = [...draft].filter((id) => validServiceIds.has(id));
      const res = await apiPut<{ success: boolean; message?: string }>(
        `/api/admin/users/${selectedUserId}/services-sync`,
        { serviceIds: cleanServiceIds }
      );
      if (res.success) {
        showSuccess(res.message || 'Enregistré');
        await onSaved();
      } else {
        showError(res.message || 'Erreur à l’enregistrement');
      }
    } catch (e: any) {
      showError(e?.message || 'Erreur à l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const discard = useCallback(() => {
    setDraft(new Set(baseline));
  }, [baseline]);

  if (users.length === 0 || services.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Impossible d'afficher l'editeur : chargement des utilisateurs ou des services incomplet.
      </div>
    );
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="min-h-0 flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Services autorises pour l'utilisateur selectionne
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Cochez ou decochez les services, puis enregistrez. Les boutons "tout" agissent sur le catalogue complet ; les boutons "resultats de recherche" n'affectent que les lignes filtrees ci-dessous.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
          <span className="text-sm text-gray-600">
            {draft.size} / {services.length} coche(s)
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={checkAllCatalog}
              disabled={saving || selectedUserId == null}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Tout cocher (catalogue)
            </button>
            <button
              type="button"
              onClick={uncheckAllCatalog}
              disabled={saving || selectedUserId == null}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Tout decocher
            </button>
            <button
              type="button"
              onClick={checkFilteredOnly}
              disabled={saving || selectedUserId == null || serviceFilter.trim() === ''}
              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              Cocher resultats recherche
            </button>
            <button
              type="button"
              onClick={uncheckFilteredOnly}
              disabled={saving || selectedUserId == null || serviceFilter.trim() === ''}
              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
            >
              Decocher resultats recherche
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              placeholder="Filtrer par service ou site..."
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto border-t border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={allFilteredInDraft}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredInDraft;
                    }}
                    onChange={(e) => handleHeaderFilterCheckbox(e.target.checked)}
                    disabled={saving || selectedUserId == null || filteredServices.length === 0}
                    aria-label="Tout cocher ou decocher les resultats filtres"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Service
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Site
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredServices.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={draft.has(s.id)}
                      onChange={() => toggleService(s.id)}
                      disabled={saving || selectedUserId == null}
                      aria-label={getServiceLabel(s)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top text-gray-900">
                    {s.designation || 'Service sans designation'}
                  </td>
                  <td className="px-3 py-2 align-top text-gray-600">
                    {s.site?.designation || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredServices.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-500">
              Aucun service ne correspond au filtre.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-3 py-3">
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || saving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler les changements
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving || selectedUserId == null}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les droits'}
          </button>
        </div>
      </div>

      <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm lg:w-80">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Utilisateurs</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Choisissez un utilisateur pour editer ses services.
          </p>
        </div>
        <div className="p-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filtrer les utilisateurs..."
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <ul className="max-h-[min(70vh,32rem)] overflow-y-auto border-t border-gray-100 p-2">
          {filteredUsers.map((u) => {
            const active = u.id === selectedUserId;
            const count = links.filter((l) => Number(l.fkUtilisateur) === u.id).length;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`mb-1 flex w-full flex-col rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500'
                      : 'border-transparent bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{getUserLabel(u)}</span>
                  <span className="text-xs text-gray-500">{count} service(s)</span>
                </button>
              </li>
            );
          })}
        </ul>
        {selectedUser && (
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Utilisateur actif : <strong>{getUserLabel(selectedUser)}</strong>
            {dirty && (
              <span className="ml-2 font-medium text-amber-700">
                . modifications non enregistrees
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserServicesEditor;
