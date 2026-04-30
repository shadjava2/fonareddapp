import RolePermissionsEditor from '@/components/admin/RolePermissionsEditor';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost } from '@/lib/fetcher';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface RolePermission {
  id: number | string;
  fkRole: number | string;
  fkPermission: number | string;
  role?: {
    id: number | string;
    nom: string;
  };
  permission?: {
    id: number | string;
    nom: string;
    description: string;
  };
  datecreate: string;
  dateupdate: string;
  usercreateid?: number | string;
  userupdateid?: number | string;
}

interface Role {
  id: number;
  nom: string;
}

interface Permission {
  id: number;
  nom: string;
  description: string;
}

const RolesPermissionsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [rolesPermissions, setRolesPermissions] = useState<RolePermission[]>(
    []
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolePermissionToDelete, setRolePermissionToDelete] =
    useState<RolePermission | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    rolesCount: 0,
    permissionsCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchRolesPermissions(),
          fetchRoles(),
          fetchPermissions(),
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchRolesPermissions = async () => {
    try {
      console.log('🔍 Début du chargement des rôles permissions...');

      const response = await apiGet<{
        success: boolean;
        rolesPermissions: RolePermission[];
        total?: number;
        message?: string;
        pagination?: any;
      }>('/api/admin/roles-permissions?all=true');

      console.log('🔍 Réponse API roles-permissions:', response);

      if (response.success && response.rolesPermissions) {
        console.log('🔍 Rôles permissions reçus:', response.rolesPermissions);
        setRolesPermissions(response.rolesPermissions);

        setStats((s) => ({
          ...s,
          total: response.rolesPermissions.length,
        }));

        console.log(
          '🔍 Rôles permissions définis dans le state:',
          response.rolesPermissions.length
        );
        console.log('🔍 Statistiques:', {
          total: response.rolesPermissions.length,
        });
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setRolesPermissions([]);
        setStats((s) => ({ ...s, total: 0 }));
      }
    } catch (error) {
      console.error(
        '❌ Erreur lors du chargement des rôles permissions:',
        error
      );
      setRolesPermissions([]);
      setStats((s) => ({ ...s, total: 0 }));
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('🔍 Début du chargement des rôles...');
      const response = await apiGet<{ success: boolean; roles: Role[] }>(
        '/api/admin/roles'
      );
      console.log('🔍 Réponse API roles:', response);
      if (response.success && response.roles) {
        console.log('🔍 Rôles reçus:', response.roles);
        const list = response.roles.map((r) => ({
          ...r,
          id: Number(r.id),
        }));
        setRoles(list);
        setStats((s) => ({ ...s, rolesCount: list.length }));
        console.log('🔍 Rôles définis dans le state:', response.roles.length);
      } else {
        console.error('❌ Erreur dans la réponse API roles:', response);
        setRoles([]);
        setStats((s) => ({ ...s, rolesCount: 0 }));
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des rôles:', error);
      setRoles([]);
      setStats((s) => ({ ...s, rolesCount: 0 }));
    }
  };

  const fetchPermissions = async () => {
    try {
      console.log('🔍 Début du chargement des permissions...');
      const response = await apiGet<{
        success: boolean;
        permissions: Permission[];
      }>('/api/admin/permissions', { timeout: 20000 });
      console.log('🔍 Réponse API permissions:', response);
      if (response.success && response.permissions) {
        console.log('🔍 Permissions reçues:', response.permissions);
        const plist = response.permissions.map((p) => ({
          ...p,
          id: Number(p.id),
        }));
        setPermissions(plist);
        setStats((s) => ({ ...s, permissionsCount: plist.length }));
        console.log(
          '🔍 Permissions définies dans le state:',
          response.permissions.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API permissions:', response);
        setPermissions([]);
        setStats((s) => ({ ...s, permissionsCount: 0 }));
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des permissions:', error);
      setPermissions([]);
      setStats((s) => ({ ...s, permissionsCount: 0 }));
    }
  };

  const handleDeleteRolePermission = async () => {
    if (!rolePermissionToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{ success: boolean; message?: string }>(
        `/api/admin/roles-permissions/${rolePermissionToDelete.id}`
      );
      if (response.success) {
        showSuccess('Rôle permission supprimé avec succès');
        setRolePermissionToDelete(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(rolePermissionToDelete.id));
          return next;
        });
        fetchRolesPermissions();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = useCallback((id: string | number) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(
        new Set(rolesPermissions.map((rp) => String(rp.id)))
      );
    },
    [rolesPermissions]
  );

  const allVisibleSelected = useMemo(() => {
    if (rolesPermissions.length === 0) return false;
    return rolesPermissions.every((rp) => selectedIds.has(String(rp.id)));
  }, [rolesPermissions, selectedIds]);

  const someVisibleSelected = useMemo(
    () =>
      rolesPermissions.some((rp) => selectedIds.has(String(rp.id))) &&
      !allVisibleSelected,
    [rolesPermissions, selectedIds, allVisibleSelected]
  );

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const response = await apiPost<{
        success: boolean;
        message?: string;
        deleted?: number;
      }>('/api/admin/roles-permissions', {
        action: 'bulk-delete',
        ids,
      });
      if (response.success) {
        showSuccess(
          response.message ||
            `${response.deleted ?? ids.length} élément(s) supprimé(s)`
        );
        setBulkDeleteOpen(false);
        setSelectedIds(new Set());
        fetchRolesPermissions();
      } else {
        showError(response.message || 'Erreur lors de la suppression multiple');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression multiple');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDelete = (rolePermission: RolePermission) => {
    setRolePermissionToDelete(rolePermission);
  };

  const matrixLinks = useMemo(
    () =>
      rolesPermissions.map((rp) => ({
        fkRole: rp.fkRole,
        fkPermission: rp.fkPermission,
      })),
    [rolesPermissions]
  );

  return (
    <AdminLayout
      title="Gestion des Rôles Permissions"
      description="Gérez les permissions par rôle"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 text-purple-600 mr-3 flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Rôles Permissions
                </h1>
                <p className="text-sm text-gray-600">
                  Choisissez un rôle à droite, cochez les droits à gauche, puis
                  enregistrez.
                </p>
              </div>
            </div>
          </div>

          {!loading && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-purple-50 p-4">
                <p className="text-sm font-medium text-purple-600">Rôles</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.rolesCount}
                </p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-600">
                  Permissions (catalogue)
                </p>
                <p className="text-2xl font-bold text-indigo-900">
                  {stats.permissionsCount}
                </p>
              </div>
              <div className="rounded-lg bg-violet-50 p-4">
                <p className="text-sm font-medium text-violet-600">
                  Liaisons en base
                </p>
                <p className="text-2xl font-bold text-violet-900">
                  {stats.total}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des rôles permissions...
            </p>
            <button
              onClick={fetchRolesPermissions}
              className="mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              Recharger
            </button>
          </div>
        ) : roles.length === 0 || permissions.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
            Données insuffisantes (rôles ou permissions). Vérifiez les droits
            d’accès API ou rechargez la page.
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 block w-full rounded-md bg-amber-800 px-4 py-2 text-white hover:bg-amber-900 sm:mx-auto sm:w-auto"
            >
              Recharger
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <RolePermissionsEditor
              roles={roles}
              permissions={permissions}
              links={matrixLinks}
              onSaved={fetchRolesPermissions}
            />

            <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>
                    Vue liste avancée (suppression ligne à ligne ou par lot)
                  </span>
                  <span className="text-xs font-normal text-gray-500 group-open:hidden">
                    Afficher
                  </span>
                  <span className="hidden text-xs font-normal text-gray-500 group-open:inline">
                    Masquer
                  </span>
                </span>
              </summary>
              <div className="border-t border-gray-100">
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedIds.size > 0 ? (
                      <span>
                        <span className="font-medium text-gray-900">
                          {selectedIds.size}
                        </span>
                        {` élément(s) sélectionné(s)`}
                      </span>
                    ) : (
                      'Sélection multiple pour suppression en masse.'
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={selectedIds.size === 0}
                    onClick={() => setBulkDeleteOpen(true)}
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Supprimer la sélection
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="w-12 px-4 py-3 text-left align-middle"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={allVisibleSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someVisibleSelected;
                            }}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            aria-label="Tout sélectionner sur cette page"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Rôle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Permission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Date de création
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rolesPermissions.map((rolePermission) => (
                        <tr key={rolePermission.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 align-middle">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={selectedIds.has(
                                String(rolePermission.id)
                              )}
                              onChange={() => toggleSelect(rolePermission.id)}
                              aria-label={`Sélectionner #${rolePermission.id}`}
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              #{rolePermission.id}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {rolePermission.role?.nom}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {rolePermission.permission?.nom}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs truncate text-sm text-gray-900">
                              {rolePermission.permission?.description}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(
                                rolePermission.datecreate
                              ).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(
                                rolePermission.datecreate
                              ).toLocaleTimeString('fr-FR')}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => handleDelete(rolePermission)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!rolePermissionToDelete}
          onClose={() => setRolePermissionToDelete(null)}
          onConfirm={handleDeleteRolePermission}
          title="Supprimer le rôle permission"
          message={`Êtes-vous sûr de vouloir supprimer le rôle permission "${rolePermissionToDelete?.role?.nom}" - "${rolePermissionToDelete?.permission?.nom}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />

        <ConfirmDialog
          isOpen={bulkDeleteOpen}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
          title="Suppression multiple"
          message={`Supprimer définitivement ${selectedIds.size} liaison(s) rôle-permission ? Cette action est irréversible.`}
          type="danger"
          confirmText={`Supprimer ${selectedIds.size} élément(s)`}
          cancelText="Annuler"
          loading={isBulkDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default RolesPermissionsPage;
