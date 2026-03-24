import PersonnelLayout from '@/components/layout/PersonnelLayout';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost } from '@/lib/fetcher';
import { ArrowDownTrayIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface ACSUser {
  id: string;
  device_ip: string;
  employee_no: string;
  name?: string;
  department?: string;
  raw: any;
}

/** Valeurs affichées en priorité depuis user, puis depuis user.raw */
function displayName(user: ACSUser): string {
  const n =
    (user.name && String(user.name).trim()) ||
    (user.raw?.personName ?? user.raw?.name ?? user.raw?.employeeName ?? user.raw?.Name);
  return n != null && String(n).trim() !== '' ? String(n).trim() : 'N/A';
}

function displayDepartment(user: ACSUser): string | null {
  const d =
    user.department ||
    user.raw?.department ||
    user.raw?.deptName ||
    user.raw?.departmentName;
  return d != null && String(d).trim() !== '' ? String(d).trim() : null;
}

const ACSUsersPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<ACSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (
    page = currentPage,
    limit = itemsPerPage,
    search = searchQuery
  ) => {
    try {
      setLoading(true);
      console.log('🔍 Chargement des utilisateurs ACS...', {
        page,
        limit,
        search,
      });

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const response = await apiGet<{
        success: boolean;
        users: ACSUser[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        message: string;
      }>(`/api/hikvision/users?${params.toString()}`);

      console.log('🔍 Réponse API utilisateurs ACS:', response);

      if (response.success && response.users) {
        setUsers(response.users);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        console.log('✅ Utilisateurs ACS chargés:', response.users.length);
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error(
        '❌ Erreur lors du chargement des utilisateurs ACS:',
        error
      );
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

  const handleImportFromDevice = async () => {
    try {
      setSyncing(true);
      const response = await apiPost<{
        success: boolean;
        message: string;
        imported?: number;
        created?: number;
        updated?: number;
      }>('/api/hikvision/users-sync', {});
      if (response.success) {
        showSuccess(
          response.imported
            ? `${response.imported} personne(s) importée(s) depuis l'appareil`
            : response.message
        );
        await fetchUsers(1, itemsPerPage, searchQuery);
      } else {
        showError(response.message || "Erreur lors de l'import");
      }
    } catch (error: any) {
      showError(
        error?.message || "Impossible d'importer depuis l'appareil. Vérifiez la configuration du lecteur."
      );
    } finally {
      setSyncing(false);
    }
  };

  const getDepartmentColor = (department?: string) => {
    if (!department) return 'bg-gray-100 text-gray-800';

    const colors: { [key: string]: string } = {
      IT: 'bg-blue-100 text-blue-800',
      HR: 'bg-green-100 text-green-800',
      Finance: 'bg-purple-100 text-purple-800',
      Admin: 'bg-orange-100 text-orange-800',
      Security: 'bg-red-100 text-red-800',
    };
    return colors[department] || 'bg-gray-100 text-gray-800';
  };

  return (
    <PersonnelLayout
      title="Utilisateurs ACS"
      description="Gestion des utilisateurs du système de contrôle d'accès"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Utilisateurs ACS
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion des utilisateurs du système de contrôle d'accès
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportFromDevice}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                {syncing ? 'Import en cours…' : "Importer depuis l'appareil"}
              </button>
              <button
                onClick={() => fetchUsers()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Rechercher des utilisateurs
            </h3>
            <button
              onClick={() => fetchUsers()}
              className="text-sm text-green-600 hover:text-green-800"
            >
              Actualiser
            </button>
          </div>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Rechercher par numéro d'employé ou nom..."
            loading={loading}
            className="w-full"
          />
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des utilisateurs...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg shadow">
            <UserGroupIcon className="mx-auto h-14 w-14 text-gray-400" />
            <h3 className="mt-3 text-lg font-medium text-gray-900">
              Aucun utilisateur trouvé
            </h3>
            <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
              Il faut d’abord importer les personnes depuis l’appareil (lecteur
              d’empreinte). Les utilisateurs apparaîtront ici après l’import.
            </p>
            <button
              onClick={handleImportFromDevice}
              disabled={syncing}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {syncing ? 'Import en cours…' : "Importer depuis l'appareil"}
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lecteur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-sm font-bold">
                                {user.employee_no.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.employee_no}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {displayName(user)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const dept = displayDepartment(user);
                          return dept ? (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentColor(dept)}`}
                            >
                              {dept}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.device_ip}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            loading={loading}
          />
        )}
      </div>
    </PersonnelLayout>
  );
};

export default ACSUsersPage;
