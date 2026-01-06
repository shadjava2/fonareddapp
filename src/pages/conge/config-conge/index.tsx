import ConfigCongeForm from '@/components/forms/ConfigCongeForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { CogIcon, PencilIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

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
        showError(
          'Erreur de chargement',
          'Impossible de charger la configuration'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de chargement',
        error.message || 'Impossible de charger la configuration'
      );
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
          showSuccess(
            'Configuration modifiée',
            'La configuration a été modifiée avec succès'
          );
        } else {
          showError(
            'Erreur de modification',
            response.message || 'Impossible de modifier la configuration'
          );
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
          showSuccess(
            'Configuration créée',
            'La configuration a été créée avec succès'
          );
        } else {
          showError(
            'Erreur de création',
            response.message || 'Impossible de créer la configuration'
          );
          return;
        }
      }
      setShowForm(false);
    } catch (error: any) {
      showError(
        'Erreur de sauvegarde',
        error.message || 'Impossible de sauvegarder la configuration'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CongeAppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CogIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Configuration Congé
                  </h1>
                  <p className="text-sm text-gray-500">
                    Paramètres généraux des congés
                  </p>
                </div>
              </div>
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {configConge ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Display */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : configConge ? (
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
          ) : (
            <div className="text-center py-12">
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
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <CogIcon className="h-4 w-4 mr-2" />
                  Créer la configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {configConge
                  ? 'Modifier la configuration'
                  : 'Nouvelle configuration'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fermer</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <ConfigCongeForm
              onSubmit={handleFormSubmit}
              initialData={
                configConge ? { nbjourMois: configConge.nbjourMois } : undefined
              }
              submitLabel={configConge ? 'Modifier' : 'Créer'}
              cancelLabel="Annuler"
              onCancel={() => setShowForm(false)}
              loading={isSubmitting}
            />
          </div>
        </div>
      )}
    </CongeAppShell>
  );
};

export default ConfigCongePage;
