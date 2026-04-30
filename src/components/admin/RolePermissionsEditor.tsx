import { useToast } from '@/hooks/useToast';
import { apiPut } from '@/lib/fetcher';
import { ROLE_ID_FULL_ACCESS } from '@/lib/role-constants';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

export interface RpRole {
  id: number;
  nom: string;
}

export interface RpPermission {
  id: number;
  nom: string;
  description: string;
}

export interface RpLink {
  fkRole: number | string;
  fkPermission: number | string;
}

interface RolePermissionsEditorProps {
  roles: RpRole[];
  permissions: RpPermission[];
  links: RpLink[];
  onSaved: () => Promise<void>;
}

const RolePermissionsEditor: React.FC<RolePermissionsEditorProps> = ({
  roles,
  permissions,
  links,
  onSaved,
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Set<number>>(new Set());
  const [baseline, setBaseline] = useState<Set<number>>(new Set());
  const [roleFilter, setRoleFilter] = useState('');
  const [permFilter, setPermFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const validPermissionIds = useMemo(
    () => new Set(permissions.map((p) => p.id)),
    [permissions]
  );

  useEffect(() => {
    if (roles.length === 0) {
      setSelectedRoleId(null);
      return;
    }
    if (
      selectedRoleId == null ||
      !roles.some((r) => r.id === selectedRoleId)
    ) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (selectedRoleId == null) {
      setDraft(new Set());
      setBaseline(new Set());
      return;
    }
    if (selectedRoleId === ROLE_ID_FULL_ACCESS) {
      const all = new Set(permissions.map((p) => p.id));
      setDraft(all);
      setBaseline(all);
      return;
    }
    const assigned = new Set<number>();
    for (const l of links) {
      if (Number(l.fkRole) === selectedRoleId) {
        const permissionId = Number(l.fkPermission);
        if (validPermissionIds.has(permissionId)) {
          assigned.add(permissionId);
        }
      }
    }
    setDraft(new Set(assigned));
    setBaseline(new Set(assigned));
  }, [selectedRoleId, links, permissions, validPermissionIds]);

  const dirty = useMemo(() => {
    if (draft.size !== baseline.size) return true;
    for (const id of draft) {
      if (!baseline.has(id)) return true;
    }
    return false;
  }, [draft, baseline]);

  const filteredRoles = useMemo(() => {
    const q = roleFilter.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.nom.toLowerCase().includes(q));
  }, [roles, roleFilter]);

  const filteredPermissions = useMemo(() => {
    const q = permFilter.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [permissions, permFilter]);

  const allFilteredInDraft = useMemo(() => {
    if (filteredPermissions.length === 0) return false;
    return filteredPermissions.every((p) => draft.has(p.id));
  }, [filteredPermissions, draft]);

  const someFilteredInDraft = useMemo(() => {
    if (filteredPermissions.length === 0) return false;
    const any = filteredPermissions.some((p) => draft.has(p.id));
    return any && !allFilteredInDraft;
  }, [filteredPermissions, draft, allFilteredInDraft]);

  const togglePermission = useCallback((permId: number) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }, []);

  const checkAllCatalog = useCallback(() => {
    setDraft(new Set(permissions.map((p) => p.id)));
  }, [permissions]);

  const uncheckAllCatalog = useCallback(() => {
    setDraft(new Set());
  }, []);

  const checkFilteredOnly = useCallback(() => {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const p of filteredPermissions) next.add(p.id);
      return next;
    });
  }, [filteredPermissions]);

  const uncheckFilteredOnly = useCallback(() => {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const p of filteredPermissions) next.delete(p.id);
      return next;
    });
  }, [filteredPermissions]);

  const handleHeaderFilterCheckbox = useCallback(
    (checked: boolean) => {
      if (checked) checkFilteredOnly();
      else uncheckFilteredOnly();
    },
    [checkFilteredOnly, uncheckFilteredOnly]
  );

  const handleSave = async () => {
    if (selectedRoleId == null || !dirty) return;
    try {
      setSaving(true);
      const cleanPermissionIds = [...draft].filter((id) =>
        validPermissionIds.has(id)
      );
      const res = await apiPut<{
        success: boolean;
        message?: string;
      }>(`/api/admin/roles/${selectedRoleId}/permissions-sync`, {
        permissionIds: cleanPermissionIds,
      });
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

  /** Rôle administrateur : l’API force toutes les permissions ; utile pour réaligner la table `roles_permissions`. */
  const handleResyncFullAccessRole = async () => {
    if (selectedRoleId !== ROLE_ID_FULL_ACCESS) return;
    try {
      setSaving(true);
      const res = await apiPut<{
        success: boolean;
        message?: string;
      }>(`/api/admin/roles/${ROLE_ID_FULL_ACCESS}/permissions-sync`, {
        permissionIds: [],
      });
      if (res.success) {
        showSuccess(res.message || 'Droits administrateur réalignés en base');
        await onSaved();
      } else {
        showError(res.message || 'Erreur à la synchronisation');
      }
    } catch (e: any) {
      showError(e?.message || 'Erreur à la synchronisation');
    } finally {
      setSaving(false);
    }
  };

  const discard = useCallback(() => {
    setDraft(new Set(baseline));
  }, [baseline]);

  if (roles.length === 0 || permissions.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Impossible d’afficher l’éditeur : chargement des rôles ou des permissions incomplet.
      </div>
    );
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isFullAccessRole = selectedRoleId === ROLE_ID_FULL_ACCESS;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      {/* Droits : à gauche sur grand écran */}
      <div className="min-h-0 flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Droits autorisés pour le rôle sélectionné
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isFullAccessRole
              ? 'Ce rôle dispose automatiquement de toutes les permissions ; la matrice est en lecture seule.'
              : 'Cochez ou décochez les permissions, puis enregistrez. Les boutons « tout » agissent sur le catalogue complet ; les boutons « résultats de recherche » n’affectent que les lignes filtrées ci-dessous.'}
          </p>
        </div>

        {isFullAccessRole && (
          <div className="flex flex-col gap-2 border-b border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0">
              <strong>Administrateur :</strong> accès complet en session (joker
              « * ») ; toute synchro API réécrit toutes les permissions en base.
            </p>
            <button
              type="button"
              onClick={() => void handleResyncFullAccessRole()}
              disabled={saving}
              className="shrink-0 rounded-md border border-purple-300 bg-white px-3 py-1.5 text-xs font-medium text-purple-900 hover:bg-purple-100 disabled:opacity-50"
            >
              Réaligner la base
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
          <span className="text-sm text-gray-600">
            {draft.size} / {permissions.length} cochée(s)
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={checkAllCatalog}
              disabled={
                saving || selectedRoleId == null || isFullAccessRole
              }
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Tout cocher (catalogue)
            </button>
            <button
              type="button"
              onClick={uncheckAllCatalog}
              disabled={
                saving || selectedRoleId == null || isFullAccessRole
              }
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Tout décocher
            </button>
            <button
              type="button"
              onClick={checkFilteredOnly}
              disabled={
                saving ||
                selectedRoleId == null ||
                permFilter.trim() === '' ||
                isFullAccessRole
              }
              className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
            >
              Cocher résultats recherche
            </button>
            <button
              type="button"
              onClick={uncheckFilteredOnly}
              disabled={
                saving ||
                selectedRoleId == null ||
                permFilter.trim() === '' ||
                isFullAccessRole
              }
              className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
            >
              Décocher résultats recherche
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={permFilter}
              onChange={(e) => setPermFilter(e.target.value)}
              placeholder="Filtrer par nom ou description…"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={allFilteredInDraft}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredInDraft;
                    }}
                    onChange={(e) => handleHeaderFilterCheckbox(e.target.checked)}
                    disabled={
                      saving ||
                      selectedRoleId == null ||
                      filteredPermissions.length === 0 ||
                      isFullAccessRole
                    }
                    aria-label="Tout cocher ou décocher les résultats filtrés"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Permission
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPermissions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={draft.has(p.id)}
                      onChange={() => togglePermission(p.id)}
                      disabled={
                        saving || selectedRoleId == null || isFullAccessRole
                      }
                      aria-label={p.nom}
                    />
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-gray-900">
                    {p.nom}
                  </td>
                  <td className="px-3 py-2 align-top text-gray-600">
                    {p.description || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPermissions.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-500">
              Aucune permission ne correspond au filtre.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-3 py-3">
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || saving || isFullAccessRole}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler les changements
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              !dirty || saving || selectedRoleId == null || isFullAccessRole
            }
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les droits'}
          </button>
        </div>
      </div>

      {/* Rôles à droite */}
      <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm lg:w-80">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Rôles</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Choisissez un rôle pour éditer ses permissions.
          </p>
        </div>
        <div className="p-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              placeholder="Filtrer les rôles…"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
        <ul className="max-h-[min(70vh,32rem)] overflow-y-auto border-t border-gray-100 p-2">
          {filteredRoles.map((r) => {
            const active = r.id === selectedRoleId;
            const count =
              r.id === ROLE_ID_FULL_ACCESS
                ? permissions.length
                : links.filter((l) => Number(l.fkRole) === r.id).length;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`mb-1 flex w-full flex-col rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? 'border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-500'
                      : 'border-transparent bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{r.nom}</span>
                  <span className="text-xs text-gray-500">
                    {count} permission(s)
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {selectedRole && (
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Rôle actif : <strong>{selectedRole.nom}</strong>
            {dirty && (
              <span className="ml-2 font-medium text-amber-700">
                · modifications non enregistrées
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RolePermissionsEditor;
