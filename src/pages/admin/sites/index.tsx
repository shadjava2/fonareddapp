import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  BuildingOfficeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Site {
  id: number | string;
  designation: string;
  abbreviation?: string;
  adresse?: string;
  datecreate: string;
  dateupdate: string;
  usercreateid?: number | string;
  userupdateid?: number | string;
}

const SitesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
  });

  useEffect(() => {
    console.log('🔍 useEffect - Début du chargement des sites');
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      console.log('🔍 SITES - Début du chargement des sites...');

      const response = await apiGet<{
        success: boolean;
        sites: Site[];
      }>('/api/admin/sites');

      console.log('🔍 SITES - Réponse API sites:', response);
      console.log('🔍 SITES - Type de response:', typeof response);
      console.log('🔍 SITES - response.success:', response.success);
      console.log('🔍 SITES - response.sites:', response.sites);
      console.log(
        '🔍 SITES - Array.isArray(response.sites):',
        Array.isArray(response.sites)
      );

      if (response.success && response.sites && Array.isArray(response.sites)) {
        console.log('🔍 SITES - Sites reçus:', response.sites);
        console.log('🔍 SITES - Nombre de sites reçus:', response.sites.length);
        setSites(response.sites);

        setStats({
          total: response.sites.length,
        });

        console.log(
          '🔍 SITES - Sites définis dans le state:',
          response.sites.length
        );
        console.log('🔍 SITES - Statistiques:', {
          total: response.sites.length,
        });
      } else {
        console.error('❌ SITES - Erreur dans la réponse API:', response);
        console.error('❌ SITES - response existe:', !!response);
        console.error('❌ SITES - response.success:', response?.success);
        console.error('❌ SITES - response.sites existe:', !!response?.sites);
        console.error(
          '❌ SITES - response.sites est un array:',
          Array.isArray(response?.sites)
        );
        setSites([]);
        setStats({ total: 0 });
      }
    } catch (error) {
      console.error('❌ SITES - Erreur lors du chargement des sites:', error);
      console.error("❌ SITES - Détails de l'erreur:", error);
      setSites([]);
      setStats({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = async (data: any) => {
    try {
      const response = await apiPost('/api/admin/sites', data);
      if (response.success) {
        showSuccess('Site créé avec succès');
        setShowForm(false);
        fetchSites();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateSite = async (data: any) => {
    if (!editingSite) return;

    try {
      const response = await apiPut(`/api/admin/sites/${editingSite.id}`, data);
      if (response.success) {
        showSuccess('Site modifié avec succès');
        setShowForm(false);
        setEditingSite(null);
        fetchSites();
      } else {
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete(`/api/admin/sites/${siteToDelete.id}`);
      if (response.success) {
        showSuccess('Site supprimé avec succès');
        setSiteToDelete(null);
        fetchSites();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleDelete = (site: Site) => {
    setSiteToDelete(site);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  // Logs de débogage supprimés pour éviter les problèmes de compilation

  return (
    <AdminLayout
      title="Gestion des Sites"
      description="Gérez les sites et lieux de travail"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
                <p className="text-sm text-gray-600">
                  Gestion des sites et lieux de travail
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition duration-200 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un site
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BuildingOfficeIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-600">
                      Total Sites
                    </p>
                    <p className="text-2xl font-bold text-orange-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des sites...
            </p>
            <button
              onClick={fetchSites}
              className="mt-2 text-sm text-orange-600 hover:text-orange-800"
            >
              Recharger
            </button>
          </div>
        ) : sites.length === 0 ? (
          <div className="p-6 text-center">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun site trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre premier site.
            </p>
            <button
              onClick={fetchSites}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Recharger les sites
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Désignation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Abréviation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adresse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière modification
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sites.map((site) => (
                    <tr key={site.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{site.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {site.designation}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {site.abbreviation || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {site.adresse || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(site.datecreate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(site.datecreate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(site.dateupdate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(site.dateupdate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(site)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(site)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Formulaire de site */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingSite ? 'Modifier le site' : 'Nouveau site'}
                </h3>
                <SiteForm
                  onSubmit={editingSite ? handleUpdateSite : handleCreateSite}
                  initialData={
                    editingSite
                      ? {
                          designation: editingSite.designation,
                          abbreviation: editingSite.abbreviation || '',
                          adresse: editingSite.adresse || '',
                        }
                      : undefined
                  }
                  onCancel={handleCancel}
                />
              </div>
            </div>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!siteToDelete}
          onClose={() => setSiteToDelete(null)}
          onConfirm={handleDeleteSite}
          title="Supprimer le site"
          message={`Êtes-vous sûr de vouloir supprimer le site "${siteToDelete?.designation}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default SitesPage;
