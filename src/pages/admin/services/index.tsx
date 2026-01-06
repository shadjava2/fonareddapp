import ServiceForm from '@/components/forms/ServiceForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  Cog6ToothIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Service {
  id: number | string;
  designation: string;
  fkSite?: number | string;
  site?: {
    id: number | string;
    designation: string;
  };
  datecreate: string;
  dateupdate: string;
  usercreateid?: number | string;
  userupdateid?: number | string;
}

interface Site {
  id: number;
  designation: string;
  abbreviation?: string;
}

const ServicesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    withSite: 0,
    withoutSite: 0,
  });

  useEffect(() => {
    console.log('🔍 useEffect - Début du chargement des données');
    fetchServices();
    fetchSites();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début du chargement des services...');

      const response = await apiGet<{
        success: boolean;
        services: Service[];
        total?: number;
        message?: string;
      }>('/api/admin/services');

      console.log('🔍 Réponse API services:', response);

      if (response.success && response.services) {
        console.log('🔍 Services reçus:', response.services);
        setServices(response.services);

        // Calculer les statistiques
        const withSite = response.services.filter((s) => s.site).length;
        const withoutSite = response.services.length - withSite;

        setStats({
          total: response.services.length,
          withSite,
          withoutSite,
        });

        console.log(
          '🔍 Services définis dans le state:',
          response.services.length
        );
        console.log('🔍 Statistiques:', {
          total: response.services.length,
          withSite,
          withoutSite,
        });
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setServices([]);
        setStats({ total: 0, withSite: 0, withoutSite: 0 });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des services:', error);
      setServices([]);
      setStats({ total: 0, withSite: 0, withoutSite: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      setSitesLoading(true);
      console.log('🔍 Début du chargement des sites...');
      const response = await apiGet<{ success: boolean; sites: Site[] }>(
        '/api/admin/sites'
      );
      console.log('🔍 Réponse API sites:', response);
      if (response.success && response.sites) {
        console.log('🔍 Sites reçus:', response.sites);
        setSites(response.sites);
        console.log('🔍 Sites définis dans le state:', response.sites.length);
      } else {
        console.error('❌ Erreur dans la réponse API sites:', response);
        setSites([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des sites:', error);
      setSites([]);
    } finally {
      setSitesLoading(false);
    }
  };

  const handleCreateService = async (data: any) => {
    try {
      const response = await apiPost('/api/admin/services', data);
      if (response.success) {
        showSuccess('Service créé avec succès');
        setShowForm(false);
        fetchServices();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleOpenForm = () => {
    console.log('🔍 Ouverture du formulaire - Sites actuels:', sites.length);
    if (sites.length === 0) {
      console.log('🔍 Rechargement des sites...');
      fetchSites();
    }
    setShowForm(true);
  };

  const handleUpdateService = async (data: any) => {
    if (!editingService) return;

    try {
      const response = await apiPut(
        `/api/admin/services/${editingService.id}`,
        data
      );
      if (response.success) {
        showSuccess('Service modifié avec succès');
        setShowForm(false);
        setEditingService(null);
        fetchServices();
      } else {
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete(
        `/api/admin/services/${serviceToDelete.id}`
      );
      if (response.success) {
        showSuccess('Service supprimé avec succès');
        setServiceToDelete(null);
        fetchServices();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = (service: Service) => {
    setServiceToDelete(service);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
  };

  console.log('🔍 Rendu - État des services:', {
    loading,
    servicesCount: services.length,
    stats,
    services: services,
  });

  return (
    <AdminLayout
      title="Gestion des Services"
      description="Gérez les services disponibles dans l'application"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Cog6ToothIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Services</h1>
                <p className="text-sm text-gray-600">
                  Gestion des services de l'application
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un service
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Total Services
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <EyeIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Avec Site
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats.withSite}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Cog6ToothIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-600">
                      Sans Site
                    </p>
                    <p className="text-2xl font-bold text-orange-900">
                      {stats.withoutSite}
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des services...
            </p>
            <button
              onClick={fetchServices}
              className="mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              Recharger
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="p-6 text-center">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun service trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre premier service.
            </p>
            <button
              onClick={fetchServices}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Recharger les services
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
                      Site
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
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{service.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {service.designation}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {service.site?.designation || (
                            <span className="text-orange-600 font-medium">
                              Non assigné
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(service.datecreate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(service.datecreate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(service.dateupdate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(service.dateupdate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service)}
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

        {/* Formulaire de service */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingService ? 'Modifier le service' : 'Nouveau service'}
                </h3>
                {sitesLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Chargement des sites...
                    </p>
                  </div>
                ) : (
                  <ServiceForm
                    onSubmit={
                      editingService ? handleUpdateService : handleCreateService
                    }
                    initialData={
                      editingService
                        ? {
                            designation: editingService.designation,
                            fkSite: editingService.fkSite
                              ? Number(editingService.fkSite)
                              : null,
                          }
                        : undefined
                    }
                    sites={sites}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!serviceToDelete}
          onClose={() => setServiceToDelete(null)}
          onConfirm={handleDeleteService}
          title="Supprimer le service"
          message={`Êtes-vous sûr de vouloir supprimer le service "${serviceToDelete?.designation}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default ServicesPage;
