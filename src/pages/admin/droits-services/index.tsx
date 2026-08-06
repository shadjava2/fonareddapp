import UserServicesEditor from '@/components/admin/UserServicesEditor';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost } from '@/lib/fetcher';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface DroitsService {
  id: number | string;
  fkUtilisateur: number | string;
  fkService: number | string;
  utilisateur?: {
    id: number | string;
    nom: string;
    prenom: string;
    postnom?: string | null;
    username: string;
  };
  service?: {
    id: number | string;
    designation: string;
    site?: {
      id: number | string;
      designation: string;
    };
  };
  datecreate: string;
  usercreateid?: number | string;
}

interface User {
  id: number;
  nom: string;
  prenom: string | null;
  postnom?: string | null;
  username: string;
}

interface Service {
  id: number;
  designation: string | null;
  site?: {
    id: number;
    designation: string | null;
  } | null;
}

const DroitsServicesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [droitsServices, setDroitsServices] = useState<DroitsService[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [droitsServiceToDelete, setDroitsServiceToDelete] =
    useState<DroitsService | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    usersCount: 0,
    servicesCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchDroitsServices(), fetchUsers(), fetchServices()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchDroitsServices = async () => {
    try {
      const response = await apiGet<{
        success: boolean;
        droitsServices: DroitsService[];
        total?: number;
        message?: string;
        pagination?: any;
      }>('/api/admin/droits-services?all=true');

      if (response.success && response.droitsServices) {
        setDroitsServices(response.droitsServices);
        const total =
          typeof response.pagination?.total === 'number'
            ? response.pagination.total
            : response.total ?? response.droitsServices.length;
        setStats((s) => ({ ...s, total }));
      } else {
        setDroitsServices([]);
        setStats((s) => ({ ...s, total: 0 }));
      }
    } catch (error) {
      console.error('Erreur chargement droits services:', error);
      setDroitsServices([]);
      setStats((s) => ({ ...s, total: 0 }));
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiGet<{ success: boolean; users: User[] }>(
        '/api/admin/users'
      );
      if (response.success && response.users) {
        const list = response.users.map((u) => ({
          ...u,
          id: Number(u.id),
        }));
        setUsers(list);
        setStats((s) => ({ ...s, usersCount: list.length }));
      } else {
        setUsers([]);
        setStats((s) => ({ ...s, usersCount: 0 }));
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setUsers([]);
      setStats((s) => ({ ...s, usersCount: 0 }));
    }
  };

  const fetchServices = async () => {
    try {
      const response = await apiGet<{ success: boolean; services: Service[] }>(
        '/api/admin/services'
      );
      if (response.success && response.services) {
        const list = response.services.map((s) => ({
          ...s,
          id: Number(s.id),
        }));
        setServices(list);
        setStats((s) => ({ ...s, servicesCount: list.length }));
      } else {
        setServices([]);
        setStats((s) => ({ ...s, servicesCount: 0 }));
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
      setServices([]);
      setStats((s) => ({ ...s, servicesCount: 0 }));
    }
  };

  const handleDeleteDroitsService = async () => {
    if (!droitsServiceToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{ success: boolean; message?: string }>(
        `/api/admin/droits-services/${droitsServiceToDelete.id}`
      );
      if (response.success) {
        showSuccess('Droit service supprimé avec succès');
        setDroitsServiceToDelete(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(droitsServiceToDelete.id));
          return next;
        });
        fetchDroitsServices();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (droitsService: DroitsService) => {
    setDroitsServiceToDelete(droitsService);
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
      setSelectedIds(new Set(droitsServices.map((ds) => String(ds.id))));
    },
    [droitsServices]
  );

  const allVisibleSelected = useMemo(() => {
    if (droitsServices.length === 0) return false;
    return droitsServices.every((ds) => selectedIds.has(String(ds.id)));
  }, [droitsServices, selectedIds]);

  const someVisibleSelected = useMemo(
    () =>
      droitsServices.some((ds) => selectedIds.has(String(ds.id))) &&
      !allVisibleSelected,
    [droitsServices, selectedIds, allVisibleSelected]
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
      }>('/api/admin/droits-services', {
        action: 'bulk-delete',
        ids,
      });
      if (response.success) {
        showSuccess(
          response.message || `${response.deleted ?? ids.length} element(s) supprime(s)`
        );
        setBulkDeleteOpen(false);
        setSelectedIds(new Set());
        fetchDroitsServices();
      } else {
        showError(response.message || 'Erreur lors de la suppression multiple');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression multiple');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const matrixLinks = useMemo(
    () =>
      droitsServices.map((ds) => ({
        fkUtilisateur: ds.fkUtilisateur,
        fkService: ds.fkService,
      })),
    [droitsServices]
  );
  const hasCatalog = users.length > 0 && services.length > 0;

  return (
    <AdminLayout
      title="Gestion des Droits Services"
      description="Gérez les droits d'accès aux services"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 text-blue-600 mr-3 flex items-center justify-center">
                <span className="text-2xl">🔑</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Droits Services
                </h1>
                <p className="text-sm text-gray-600">
                  Choisissez un service a gauche, cochez les agents a droite,
                  puis enregistrez.
                </p>
              </div>
            </div>
          </div>

          {!loading && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.usersCount}
                </p>
              </div>
              <div className="rounded-lg bg-cyan-50 p-4">
                <p className="text-sm font-medium text-cyan-600">Services</p>
                <p className="text-2xl font-bold text-cyan-900">
                  {stats.servicesCount}
                </p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-600">
                  Liaisons en base
                </p>
                <p className="text-2xl font-bold text-indigo-900">{stats.total}</p>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des droits services...
            </p>
            <button
              onClick={fetchDroitsServices}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Recharger
            </button>
          </div>
        )}

        {!loading && !hasCatalog && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
            Donnees insuffisantes (utilisateurs ou services). Verifiez les droits
            d'acces API ou rechargez la page.
            <div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 block w-full rounded-md bg-amber-800 px-4 py-2 text-white hover:bg-amber-900 sm:mx-auto sm:w-auto"
              >
                Recharger
              </button>
            </div>
          </div>
        )}

        {!loading && hasCatalog && (
          <div className="space-y-6">
            <UserServicesEditor
              users={users}
              services={services}
              links={matrixLinks}
              onSaved={fetchDroitsServices}
            />

            <details className="group rounded-lg border border-gray-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>
                    Vue liste avancee (suppression ligne a ligne ou par lot)
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
                        </span>{' '}
                        element(s) selectionne(s)
                      </span>
                    ) : (
                      'Selection multiple pour suppression en masse.'
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={selectedIds.size === 0}
                    onClick={() => setBulkDeleteOpen(true)}
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Supprimer la selection
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="w-12 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={allVisibleSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someVisibleSelected;
                            }}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            aria-label="Tout selectionner sur cette page"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Utilisateur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Site
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {droitsServices.map((ds) => (
                        <tr key={ds.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 align-middle">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedIds.has(String(ds.id))}
                              onChange={() => toggleSelect(ds.id)}
                              aria-label={`Selectionner #${ds.id}`}
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            #{ds.id}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {ds.utilisateur
                              ? formatPersonDisplayName(ds.utilisateur) ||
                                ds.utilisateur.username
                              : '—'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {ds.service?.designation || '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                            {ds.service?.site?.designation || '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => handleDelete(ds)}
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

        <ConfirmDialog
          isOpen={!!droitsServiceToDelete}
          onClose={() => setDroitsServiceToDelete(null)}
          onConfirm={handleDeleteDroitsService}
          title="Supprimer le droit service"
          message={`Êtes-vous sûr de vouloir supprimer le droit service de "${
            droitsServiceToDelete?.utilisateur
              ? formatPersonDisplayName(droitsServiceToDelete.utilisateur) ||
                droitsServiceToDelete.utilisateur.username
              : ''
          }" ? Cette action est irréversible.`}
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
          message={`Supprimer definitivement ${selectedIds.size} liaison(s) utilisateur-service ? Cette action est irreversible.`}
          type="danger"
          confirmText={`Supprimer ${selectedIds.size} element(s)`}
          cancelText="Annuler"
          loading={isBulkDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default DroitsServicesPage;
