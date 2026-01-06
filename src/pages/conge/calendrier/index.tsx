import CalendrierForm from '@/components/forms/CalendrierForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface CalendrierEntry {
  id: number;
  d: string;
  label?: string;
  datecreate: string;
  dateupdate: string;
  usercreateid?: number;
  userupdateid?: number;
}

const CalendrierPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [calendrier, setCalendrier] = useState<CalendrierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendrierEntry | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<CalendrierEntry | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCalendrier();
  }, []);

  const fetchCalendrier = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        calendrier: CalendrierEntry[];
      }>('/api/conge/calendrier');
      if (response.success) {
        setCalendrier(
          response.calendrier.map((entry) => ({
            ...entry,
            id: parseInt(entry.id.toString()),
          }))
        );
      } else {
        showError(
          'Erreur de chargement',
          'Impossible de charger le calendrier'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de chargement',
        error.message || 'Impossible de charger le calendrier'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEdit = (entry: CalendrierEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDeleteClick = (entry: CalendrierEntry) => {
    setEntryToDelete(entry);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{
        success: boolean;
        message?: string;
      }>(`/api/conge/calendrier?id=${entryToDelete.id}`);
      if (response.success) {
        setCalendrier(
          calendrier.filter((entry) => entry.id !== entryToDelete.id)
        );
        showSuccess(
          'Date supprimée',
          'La date a été supprimée du calendrier avec succès'
        );
      } else {
        showError(
          'Erreur de suppression',
          response.message || 'Impossible de supprimer la date'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de suppression',
        error.message || 'Impossible de supprimer la date'
      );
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setEntryToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowConfirmDialog(false);
    setEntryToDelete(null);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      if (editingEntry) {
        const response = await apiPut<{
          success: boolean;
          calendrier: CalendrierEntry;
          message?: string;
        }>(`/api/conge/calendrier?id=${editingEntry.id}`, data);
        if (response.success) {
          setCalendrier(
            calendrier.map((entry) =>
              entry.id === editingEntry.id
                ? {
                    ...response.calendrier,
                    id: parseInt(response.calendrier.id.toString()),
                  }
                : entry
            )
          );
          showSuccess('Date modifiée', 'La date a été modifiée avec succès');
        } else {
          showError(
            'Erreur de modification',
            response.message || 'Impossible de modifier la date'
          );
          return;
        }
      } else {
        const response = await apiPost<{
          success: boolean;
          calendrier: CalendrierEntry;
          message?: string;
        }>('/api/conge/calendrier', data);
        if (response.success) {
          setCalendrier([
            ...calendrier,
            {
              ...response.calendrier,
              id: parseInt(response.calendrier.id.toString()),
            },
          ]);
          showSuccess(
            'Date ajoutée',
            'La date a été ajoutée au calendrier avec succès'
          );
        } else {
          showError(
            'Erreur de création',
            response.message || 'Impossible de créer la date'
          );
          return;
        }
      }
      setShowForm(false);
      setEditingEntry(null);
    } catch (error: any) {
      showError(
        'Erreur de sauvegarde',
        error.message || 'Impossible de sauvegarder la date'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrer les dates basées sur le terme de recherche
  const filteredCalendrier = calendrier.filter(
    (entry) =>
      entry.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(entry.d).toLocaleDateString('fr-FR').includes(searchTerm)
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
                    Calendrier Fonaredd
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestion du calendrier des jours ouvrables et fériés
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
              Calendrier ({filteredCalendrier.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredCalendrier.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucune date trouvée
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Aucune date ne correspond à votre recherche.'
                    : 'Commencez par créer une nouvelle date au calendrier.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreate}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Nouvelle date au calendrier
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DATE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LABEL
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
                  {filteredCalendrier.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(entry.d).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {entry.label || (
                            <span className="text-gray-400 italic">
                              Aucun label
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.datecreate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry)}
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
                {editingEntry
                  ? 'Modifier la date du calendrier'
                  : 'Nouvelle date au calendrier'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingEntry(null);
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

            <CalendrierForm
              onSubmit={handleFormSubmit}
              initialData={
                editingEntry
                  ? {
                      d: editingEntry.d,
                      label: editingEntry.label || '',
                    }
                  : undefined
              }
              submitLabel={editingEntry ? 'Modifier' : 'Créer'}
              cancelLabel="Annuler"
              onCancel={() => {
                setShowForm(false);
                setEditingEntry(null);
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
        title="Supprimer la date"
        message={`Êtes-vous sûr de vouloir supprimer la date du ${new Date(
          entryToDelete?.d || ''
        ).toLocaleDateString('fr-FR')} ? Cette action est irréversible.`}
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        loading={isDeleting}
      />
    </CongeAppShell>
  );
};

export default CalendrierPage;
