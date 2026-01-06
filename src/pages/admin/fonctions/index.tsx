import FonctionForm from '@/components/forms/FonctionForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  BriefcaseIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Fonction {
  id: string;
  nom: string;
  description: string;
  datecreate: string;
  dateupdate: string;
  usercreateid?: string;
  userupdateid?: string;
}

const FonctionsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFonction, setEditingFonction] = useState<Fonction | null>(null);
  const [fonctionToDelete, setFonctionToDelete] = useState<Fonction | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
  });

  useEffect(() => {
    fetchFonctions();
  }, []);

  const fetchFonctions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début du chargement des fonctions...');

      const response = await apiGet<{
        success: boolean;
        fonctions: Fonction[];
        total?: number;
        message?: string;
      }>('/api/admin/fonctions');

      console.log('🔍 Réponse API fonctions:', response);

      if (response.success && response.fonctions) {
        console.log('🔍 Fonctions reçues:', response.fonctions);
        setFonctions(response.fonctions);
        setStats({
          total: response.fonctions.length,
        });
        console.log(
          '🔍 Fonctions définies dans le state:',
          response.fonctions.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setFonctions([]);
        setStats({ total: 0 });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des fonctions:', error);
      setFonctions([]);
      setStats({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFonction = async (data: any) => {
    try {
      const response = await apiPost<{ success: boolean; message?: string }>(
        '/api/admin/fonctions',
        data
      );
      if (response.success) {
        showSuccess('Fonction créée avec succès');
        setShowForm(false);
        fetchFonctions();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateFonction = async (data: any) => {
    if (!editingFonction) return;

    try {
      console.log(
        '🔍 Début de la modification de la fonction:',
        editingFonction.id
      );
      console.log('🔍 Données à envoyer:', data);

      const response = await apiPut<{ success: boolean; message?: string }>(
        `/api/admin/fonctions/${editingFonction.id}`,
        data
      );

      console.log('🔍 Réponse de modification:', response);

      if (response.success) {
        showSuccess('Fonction modifiée avec succès');
        setShowForm(false);
        setEditingFonction(null);
        fetchFonctions();
      } else {
        console.error('❌ Erreur dans la réponse:', response);
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification:', error);
      showError(error.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteFonction = async () => {
    if (!fonctionToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{ success: boolean; message?: string }>(
        `/api/admin/fonctions/${fonctionToDelete.id}`
      );
      if (response.success) {
        showSuccess('Fonction supprimée avec succès');
        setFonctionToDelete(null);
        fetchFonctions();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (fonction: Fonction) => {
    setEditingFonction(fonction);
    setShowForm(true);
  };

  const handleDelete = (fonction: Fonction) => {
    setFonctionToDelete(fonction);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingFonction(null);
  };

  const handleOpenForm = () => {
    setShowForm(true);
  };

  console.log('🔍 Rendu - État des fonctions:', {
    loading,
    fonctionsCount: fonctions.length,
    stats,
    fonctions: fonctions,
  });

  return (
    <AdminLayout
      title="Gestion des Fonctions"
      description="Gérez les fonctions disponibles dans l'application"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BriefcaseIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fonctions</h1>
                <p className="text-sm text-gray-600">
                  Gestion des fonctions de l'application
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter une fonction
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BriefcaseIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Total Fonctions
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
              Chargement des fonctions...
            </p>
            <button
              onClick={fetchFonctions}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Recharger
            </button>
          </div>
        ) : fonctions.length === 0 ? (
          <div className="p-6 text-center">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucune fonction trouvée
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre première fonction.
            </p>
            <button
              onClick={fetchFonctions}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recharger les fonctions
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
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                  {fonctions.map((fonction) => (
                    <tr key={fonction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{fonction.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {fonction.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {fonction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(fonction.datecreate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(fonction.datecreate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(fonction.dateupdate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(fonction.dateupdate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(fonction)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fonction)}
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

        {/* Formulaire de fonction */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingFonction
                    ? 'Modifier la fonction'
                    : 'Nouvelle fonction'}
                </h3>
                <FonctionForm
                  onSubmit={
                    editingFonction
                      ? handleUpdateFonction
                      : handleCreateFonction
                  }
                  initialData={
                    editingFonction
                      ? {
                          nom: editingFonction.nom,
                          description: editingFonction.description,
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
          isOpen={!!fonctionToDelete}
          onClose={() => setFonctionToDelete(null)}
          onConfirm={handleDeleteFonction}
          title="Supprimer la fonction"
          message={`Êtes-vous sûr de vouloir supprimer la fonction "${fonctionToDelete?.nom}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default FonctionsPage;
