import PersonnelLayout from '@/components/layout/PersonnelLayout';
import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost } from '@/lib/fetcher';
import {
  BuildingOffice2Icon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';

interface ACSUser {
  id: string;
  device_ip: string;
  employee_no: string;
  name?: string;
  department?: string;
  raw?: Record<string, unknown>;
}

interface AppUser {
  id: string;
  nom: string;
  prenom: string;
  postnom?: string | null;
  username: string;
  label: string;
}

interface Service {
  id: string;
  designation: string | null;
  site?: { id: string; designation: string | null } | null;
}

const DepartmentsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<ACSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingUser, setEditingUser] = useState<ACSUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameIsOther, setEditNameIsOther] = useState(false);
  const [editDepartment, setEditDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!editingUser || appUsers.length === 0) return;
    const name = (editingUser.name && String(editingUser.name).trim()) || '';
    if (!name) return;
    const found = appUsers.some((u) => u.label === name);
    setEditNameIsOther(!found);
  }, [editingUser, appUsers]);

  const fetchAppUsers = async () => {
    try {
      setAppUsersLoading(true);
      const res = await apiGet<AppUser[]>('/api/admin/users/autocomplete?limit=500');
      setAppUsers(Array.isArray(res) ? res : []);
    } catch {
      setAppUsers([]);
    } finally {
      setAppUsersLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const res = await apiGet<{ success: boolean; services: Service[] }>('/api/admin/services');
      setServices(res?.services ?? []);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchUsers = async (
    page = currentPage,
    limit = itemsPerPage,
    search = searchQuery
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      const response = await apiGet<{
        success: boolean;
        users: ACSUser[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
        message: string;
      }>(`/api/hikvision/users?${params.toString()}`);

      if (response.success && response.users) {
        setUsers(response.users);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers(page, itemsPerPage, searchQuery);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    fetchUsers(1, newItemsPerPage, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchUsers(1, itemsPerPage, query);
  };

  const openEdit = (user: ACSUser) => {
    setEditingUser(user);
    const currentName = (user.name && String(user.name).trim()) || '';
    setEditName(currentName);
    setEditDepartment((user.department && String(user.department).trim()) || '');
    setEditNameIsOther(false);
    fetchAppUsers();
    fetchServices();
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditName('');
    setEditNameIsOther(false);
    setEditDepartment('');
  };

  const displayName = (user: ACSUser): string => {
    if (user.name && String(user.name).trim()) return user.name;
    const raw = user.raw;
    if (typeof raw !== 'object' || raw === null) return 'N/A';
    const r = raw as Record<string, unknown>;
    const v = r.personName ?? r.name ?? r.employeeName ?? r.Name;
    if (v == null || typeof v === 'object') return 'N/A';
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s || 'N/A';
  };

  const nameSelectOptions = useMemo(
    () => [
      ...appUsers.map((u) => ({ value: u.label as string, label: u.label })),
      { value: '__other__' as const, label: '— Saisie manuelle —' },
    ],
    [appUsers]
  );

  const getSaveName = () => editName.trim() || undefined;

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      const response = await apiPost<{ success: boolean; message: string }>(
        '/api/hikvision/users',
        {
          device_ip: editingUser.device_ip,
          employee_no: editingUser.employee_no,
          name: getSaveName(),
          department: editDepartment.trim() || undefined,
        }
      );
      if (response.success) {
        showSuccess('Nom et département enregistrés.');
        closeEdit();
        await fetchUsers(currentPage, itemsPerPage, searchQuery);
      } else {
        showError(response.message || 'Erreur lors de l\'enregistrement.');
      }
    } catch (error) {
      console.error('Erreur enregistrement nom/département:', error);
      showError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PersonnelLayout
      title="Gestion des services"
      subtitle="Lier le nom et le service des personnes (utilisateurs ACS)"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <SearchBar
            placeholder="Rechercher par nom ou numéro d'employé..."
            onSearch={handleSearch}
            debounceMs={300}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {(() => {
            if (loading) {
              return (
                <div className="p-8 text-center text-gray-500">
                  Chargement des utilisateurs...
                </div>
              );
            }
            if (users.length === 0) {
              return (
                <div className="p-8 text-center text-gray-500">
                  Aucun utilisateur. Importez d'abord les personnes depuis l'appareil
                  (Utilisateurs ACS).
                </div>
              );
            }
            return (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employé
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Lecteur
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {user.employee_no}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {displayName(user)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.department || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.device_ip}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="inline-flex items-center px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilSquareIcon className="h-4 w-4 mr-1" />
                            Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </>
            );
          })()}
        </div>
      </div>

      {/* Modal d'édition */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              aria-hidden="true"
              onClick={closeEdit}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BuildingOffice2Icon className="h-5 w-5 mr-2 text-blue-600" />
                  Modifier nom et service
                </h3>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Employé n° {editingUser.employee_no} — {editingUser.device_ip}
              </p>
              <div className="space-y-4">
                <div>
                  {appUsersLoading ? (
                    <div className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-500">
                      Chargement des utilisateurs...
                    </div>
                  ) : (
                    <>
                      <AutocompleteSelect
                        label="Nom (utilisateur de l'app)"
                        options={nameSelectOptions}
                        value={editNameIsOther ? '__other__' : (editName || null)}
                        onChange={(v) => {
                          if (v === '__other__' || v === null) {
                            setEditNameIsOther(true);
                            setEditName('');
                          } else {
                            setEditNameIsOther(false);
                            setEditName(String(v));
                          }
                        }}
                        placeholder="Rechercher par nom (saisie automatique)..."
                        className="text-sm"
                      />
                      {editNameIsOther && (
                        <div className="mt-2">
                          <label htmlFor="edit-department-manual" className="block text-sm font-medium text-gray-700 mb-1">
                            Nom (saisie manuelle)
                          </label>
                          <input
                            id="edit-department-manual"
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nom de la personne"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  {servicesLoading ? (
                    <div className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-500">
                      Chargement des services...
                    </div>
                  ) : (
                    <AutocompleteSelect
                      label="Service"
                      options={(() => {
                        const opts = services.map((s) => ({
                          value: (s.designation ?? s.id) as string,
                          label: s.site?.designation
                            ? `${s.designation ?? s.id} (${s.site.designation})`
                            : (s.designation ?? s.id),
                        }));
                        if (editDepartment && !opts.some((o) => o.value === editDepartment)) {
                          opts.unshift({ value: editDepartment, label: `${editDepartment} (valeur actuelle)` });
                        }
                        return opts;
                      })()}
                      value={editDepartment || null}
                      onChange={(v) => setEditDepartment(v != null ? String(v) : '')}
                      placeholder="Rechercher un service..."
                      className="text-sm"
                    />
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PersonnelLayout>
  );
};

export default DepartmentsPage;
