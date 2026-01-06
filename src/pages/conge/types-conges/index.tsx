import TypeCongeForm from '@/components/forms/TypeCongeForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface TypeConge {
  id: number;
  nom: string;
  description?: string;
  datecreate: string;
  dateupdate: string;
  usercreateid?: number;
  userupdateid?: number;
}

const TypesCongesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [typesConges, setTypesConges] = useState<TypeConge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTypeConge, setEditingTypeConge] = useState<TypeConge | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [typeCongeToDelete, setTypeCongeToDelete] = useState<TypeConge | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTypesConges();
  }, []);

  const fetchTypesConges = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        typesConges: TypeConge[];
      }>('/api/admin/personnel/types-conges');
      if (response.success) {
        setTypesConges(
          response.typesConges.map((type) => ({
            ...type,
            id: parseInt(type.id.toString()),
          }))
        );
      } else {
        showError(
          'Erreur de chargement',
          'Impossible de charger les types de congés'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de chargement',
        error.message || 'Impossible de charger les types de congés'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTypeConge(null);
    setShowForm(true);
  };

  const handleEdit = (typeConge: TypeConge) => {
    setEditingTypeConge(typeConge);
    setShowForm(true);
  };

  const handleDeleteClick = (typeConge: TypeConge) => {
    setTypeCongeToDelete(typeConge);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!typeCongeToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{
        success: boolean;
        message?: string;
      }>(`/api/admin/personnel/types-conges/${typeCongeToDelete.id}/`);
      if (response.success) {
        setTypesConges(
          typesConges.filter((type) => type.id !== typeCongeToDelete.id)
        );
        showSuccess(
          'Type de congé supprimé',
          'Le type de congé a été supprimé avec succès'
        );
      } else {
        showError(
          'Erreur de suppression',
          response.message || 'Impossible de supprimer le type de congé'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de suppression',
        error.message || 'Impossible de supprimer le type de congé'
      );
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setTypeCongeToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowConfirmDialog(false);
    setTypeCongeToDelete(null);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      if (editingTypeConge) {
        const response = await apiPut<{
          success: boolean;
          typeConge: TypeConge;
          message?: string;
        }>(`/api/admin/personnel/types-conges/${editingTypeConge.id}/`, data);
        if (response.success) {
          setTypesConges(
            typesConges.map((type) =>
              type.id === editingTypeConge.id
                ? {
                    ...response.typeConge,
                    id: parseInt(response.typeConge.id.toString()),
                  }
                : type
            )
          );
          showSuccess(
            'Type de congé modifié',
            'Le type de congé a été modifié avec succès'
          );
        } else {
          showError(
            'Erreur de modification',
            response.message || 'Impossible de modifier le type de congé'
          );
          return;
        }
      } else {
        const response = await apiPost<{
          success: boolean;
          typeConge: TypeConge;
          message?: string;
        }>('/api/admin/personnel/types-conges', data);
        if (response.success) {
          setTypesConges([
            ...typesConges,
            {
              ...response.typeConge,
              id: parseInt(response.typeConge.id.toString()),
            },
          ]);
          showSuccess(
            'Type de congé créé',
            'Le type de congé a été créé avec succès'
          );
        } else {
          showError(
            'Erreur de création',
            response.message || 'Impossible de créer le type de congé'
          );
          return;
        }
      }
      setShowForm(false);
      setEditingTypeConge(null);
    } catch (error: any) {
      showError(
        'Erreur de sauvegarde',
        error.message || 'Impossible de sauvegarder le type de congé'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrer les types de congés basés sur le terme de recherche
  const filteredTypesConges = typesConges.filter(
    (type) =>
      type.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (type.description &&
        type.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <CongeAppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarDaysIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Types de Congés
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestion des types de congés
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="max-w-md">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Types de Congés ({filteredTypesConges.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredTypesConges.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucun type de congé trouvé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Aucun type de congé ne correspond à votre recherche.'
                    : 'Commencez par créer un nouveau type de congé.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreate}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Nouveau type de congé
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NOM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DESCRIPTION
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CRÉÉ LE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTypesConges.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {type.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {type.description || (
                            <span className="text-gray-400 italic">
                              Aucune description
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(type.datecreate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(type)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteClick(type)}
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
            )}
          </div>
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTypeConge
                  ? 'Modifier le type de congé'
                  : 'Nouveau type de congé'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingTypeConge(null);
                }}
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

            <TypeCongeForm
              onSubmit={handleFormSubmit}
              initialData={
                editingTypeConge
                  ? {
                      nom: editingTypeConge.nom,
                      description: editingTypeConge.description || '',
                    }
                  : undefined
              }
              submitLabel={editingTypeConge ? 'Modifier' : 'Créer'}
              cancelLabel="Annuler"
              onCancel={() => {
                setShowForm(false);
                setEditingTypeConge(null);
              }}
              loading={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Boîte de dialogue de confirmation */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le type de congé"
        message={`Êtes-vous sûr de vouloir supprimer le type de congé "${typeCongeToDelete?.nom}" ? Cette action est irréversible.`}
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        loading={isDeleting}
      />
    </CongeAppShell>
  );
};

export default TypesCongesPage;
