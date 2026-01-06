import ConfigCongeForm from '@/components/forms/ConfigCongeForm';
import AdminLayout from '@/components/layout/AdminLayout';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { CogIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface ConfigConge {
  id: number;
  nbjourMois: number;
  datecreate: string;
  dateupdate: string;
  usercreateid?: number;
  userupdateid?: number;
}

const ConfigCongePage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [configConge, setConfigConge] = useState<ConfigConge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConfigConge();
  }, []);

  const fetchConfigConge = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        configConge: ConfigConge | null;
      }>('/api/admin/personnel/config-conge');
      if (response.success) {
        if (response.configConge) {
          setConfigConge({
            ...response.configConge,
            id: parseInt(response.configConge.id.toString()),
          });
        }
      } else {
        showError('Impossible de charger la configuration');
      }
    } catch (error: any) {
      showError(error.message || 'Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowForm(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      if (configConge) {
        // Mise à jour
        const response = await apiPut<{
          success: boolean;
          configConge: ConfigConge;
          message?: string;
        }>('/api/admin/personnel/config-conge', data);
        if (response.success) {
          setConfigConge({
            ...response.configConge,
            id: parseInt(response.configConge.id.toString()),
          });
          showSuccess('Configuration modifiée avec succès');
        } else {
          showError(response.message || 'Erreur lors de la modification');
          return;
        }
      } else {
        // Création
        const response = await apiPost<{
          success: boolean;
          configConge: ConfigConge;
          message?: string;
        }>('/api/admin/personnel/config-conge', data);
        if (response.success) {
          setConfigConge({
            ...response.configConge,
            id: parseInt(response.configConge.id.toString()),
          });
          showSuccess('Configuration créée avec succès');
        } else {
          showError(response.message || 'Erreur lors de la création');
          return;
        }
      }
      setShowForm(false);
      fetchConfigConge();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Configuration Congé"
      description="Paramètres généraux des congés"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CogIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuration Congé
                </h1>
                <p className="text-sm text-gray-600">
                  Paramètres généraux des congés
                </p>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 shadow-sm"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              {configConge ? 'Modifier' : 'Créer'}
            </button>
          </div>

          {/* Statistiques */}
          {!loading && configConge && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CogIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Jours/Mois Configurés
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {configConge.nbjourMois}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CogIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Par Trimestre
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {(configConge.nbjourMois * 3).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CogIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      Par Année
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {(configConge.nbjourMois * 12).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement de la configuration...
            </p>
          </div>
        ) : configConge ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Configuration Actuelle
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Jours par mois:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {configConge.nbjourMois} jour
                        {configConge.nbjourMois > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Créé le:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(configConge.datecreate).toLocaleDateString(
                          'fr-FR'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Modifié le:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(configConge.dateupdate).toLocaleDateString(
                          'fr-FR'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Calcul Automatique
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">Par mois:</span>
                      <span className="text-sm font-medium text-blue-900">
                        {configConge.nbjourMois} jour
                        {configConge.nbjourMois > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">
                        Par trimestre:
                      </span>
                      <span className="text-sm font-medium text-blue-900">
                        {(configConge.nbjourMois * 3).toFixed(1)} jour
                        {configConge.nbjourMois * 3 > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">Par année:</span>
                      <span className="text-sm font-medium text-blue-900">
                        {(configConge.nbjourMois * 12).toFixed(1)} jour
                        {configConge.nbjourMois * 12 > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucune configuration
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Créez une configuration pour définir les paramètres des congés.
            </p>
            <div className="mt-6">
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Créer la configuration
              </button>
            </div>
          </div>
        )}

        {/* Modal de formulaire */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {configConge
                    ? 'Modifier la configuration'
                    : 'Nouvelle configuration'}
                </h3>
                <ConfigCongeForm
                  onSubmit={handleFormSubmit}
                  initialData={
                    configConge
                      ? { nbjourMois: configConge.nbjourMois }
                      : undefined
                  }
                  submitLabel={configConge ? 'Modifier' : 'Créer'}
                  cancelLabel="Annuler"
                  onCancel={() => setShowForm(false)}
                  loading={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ConfigCongePage;
