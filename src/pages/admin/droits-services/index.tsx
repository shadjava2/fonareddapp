import DroitsServicesForm from '@/components/forms/DroitsServicesForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { useEffect, useState } from 'react';

interface DroitsService {
  id: number | string;
  fkUtilisateur: number | string;
  fkService: number | string;
  utilisateur?: {
    id: number | string;
    nom: string;
    prenom: string;
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
  prenom: string;
  username: string;
}

interface Service {
  id: number;
  designation: string;
  site?: {
    id: number;
    designation: string;
  };
}

const DroitsServicesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [droitsServices, setDroitsServices] = useState<DroitsService[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDroitsService, setEditingDroitsService] =
    useState<DroitsService | null>(null);
  const [droitsServiceToDelete, setDroitsServiceToDelete] =
    useState<DroitsService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
  });

  useEffect(() => {
    console.log('🔍 useEffect - Début du chargement des données');
    fetchDroitsServices();
    fetchUsers();
    fetchServices();
  }, []);

  const fetchDroitsServices = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début du chargement des droits services...');

      const response = await apiGet<{
        success: boolean;
        droitsServices: DroitsService[];
        total?: number;
        message?: string;
        pagination?: any;
      }>('/api/admin/droits-services?all=true');

      console.log('🔍 Réponse API droits-services:', response);

      if (response.success && response.droitsServices) {
        console.log('🔍 Droits services reçus:', response.droitsServices);
        setDroitsServices(response.droitsServices);

        setStats({
          total: response.droitsServices.length,
        });

        console.log(
          '🔍 Droits services définis dans le state:',
          response.droitsServices.length
        );
        console.log('🔍 Statistiques:', {
          total: response.droitsServices.length,
        });
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setDroitsServices([]);
        setStats({ total: 0 });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des droits services:', error);
      setDroitsServices([]);
      setStats({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('🔍 Début du chargement des utilisateurs...');
      const response = await apiGet<{ success: boolean; users: User[] }>(
        '/api/admin/users'
      );
      console.log('🔍 Réponse API users:', response);
      if (response.success && response.users) {
        console.log('🔍 Utilisateurs reçus:', response.users);
        setUsers(response.users);
        console.log(
          '🔍 Utilisateurs définis dans le state:',
          response.users.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API users:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
    }
  };

  const fetchServices = async () => {
    try {
      console.log('🔍 Début du chargement des services...');
      const response = await apiGet<{ success: boolean; services: Service[] }>(
        '/api/admin/services'
      );
      console.log('🔍 Réponse API services:', response);
      if (response.success && response.services) {
        console.log('🔍 Services reçus:', response.services);
        setServices(response.services);
        console.log(
          '🔍 Services définis dans le state:',
          response.services.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API services:', response);
        setServices([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des services:', error);
      setServices([]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateDroitsService = async (data: any) => {
    try {
      const response = await apiPost<{ success: boolean; message?: string }>(
        '/api/admin/droits-services',
        data
      );
      if (response.success) {
        showSuccess('Droit service créé avec succès');
        setShowForm(false);
        fetchDroitsServices();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleOpenForm = () => {
    console.log('🔍 Ouverture du formulaire - Données actuelles:', {
      users: users.length,
      services: services.length,
    });
    if (users.length === 0 || services.length === 0) {
      console.log('🔍 Rechargement des données...');
      fetchUsers();
      fetchServices();
    }
    setShowForm(true);
  };

  const handleUpdateDroitsService = async (data: any) => {
    if (!editingDroitsService) return;

    try {
      const response = await apiPut<{ success: boolean; message?: string }>(
        `/api/admin/droits-services/${editingDroitsService.id}`,
        data
      );
      if (response.success) {
        showSuccess('Droit service modifié avec succès');
        setShowForm(false);
        setEditingDroitsService(null);
        fetchDroitsServices();
      } else {
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la modification');
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

  const handleEdit = (droitsService: DroitsService) => {
    setEditingDroitsService(droitsService);
    setShowForm(true);
  };

  const handleDelete = (droitsService: DroitsService) => {
    setDroitsServiceToDelete(droitsService);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDroitsService(null);
  };

  return (
    <AdminLayout
      title="Gestion des Droits Services"
      description="Gérez les droits d'accès aux services"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 text-blue-600 mr-3 flex items-center justify-center">
                <span className="text-2xl">🔑</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Droits Services
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion des droits d'accès aux services
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm"
            >
              <span className="mr-2">+</span>
              Ajouter un droit service
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">🔑</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Total Droits Services
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
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
        ) : droitsServices.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
              <span className="text-2xl">🔑</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun droit service trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre premier droit service.
            </p>
            <button
              onClick={fetchDroitsServices}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recharger les droits services
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
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {droitsServices.map((droitsService) => (
                    <tr key={droitsService.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{droitsService.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {droitsService.utilisateur?.nom}{' '}
                          {droitsService.utilisateur?.prenom}
                        </div>
                        <div className="text-xs text-gray-500">
                          @{droitsService.utilisateur?.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {droitsService.service?.designation}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {droitsService.service?.site?.designation || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(
                            droitsService.datecreate
                          ).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(
                            droitsService.datecreate
                          ).toLocaleTimeString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(droitsService)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(droitsService)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
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

        {/* Formulaire de droits services */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingDroitsService
                    ? 'Modifier le droit service'
                    : 'Nouveau droit service'}
                </h3>
                {dataLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Chargement des données...
                    </p>
                  </div>
                ) : (
                  <DroitsServicesForm
                    onSubmit={
                      editingDroitsService
                        ? handleUpdateDroitsService
                        : handleCreateDroitsService
                    }
                    initialData={
                      editingDroitsService
                        ? {
                            fkUtilisateur: editingDroitsService.fkUtilisateur
                              ? Number(editingDroitsService.fkUtilisateur)
                              : null,
                            fkService: editingDroitsService.fkService
                              ? Number(editingDroitsService.fkService)
                              : null,
                          }
                        : undefined
                    }
                    users={users}
                    services={services}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!droitsServiceToDelete}
          onClose={() => setDroitsServiceToDelete(null)}
          onConfirm={handleDeleteDroitsService}
          title="Supprimer le droit service"
          message={`Êtes-vous sûr de vouloir supprimer le droit service de "${droitsServiceToDelete?.utilisateur?.nom} ${droitsServiceToDelete?.utilisateur?.prenom}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default DroitsServicesPage;
