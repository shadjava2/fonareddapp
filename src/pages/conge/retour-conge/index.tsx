import RetourCongeForm from '@/components/forms/RetourCongeForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { ArrowUturnLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface RetourConge {
  id: number;
  fkDemande?: number;
  fkSoldes?: number;
  observations?: string;
  nbrjour?: number;
  datecreate: string;
  dateupdate?: string;
  usercreateid?: number;
  userupdateid?: number;
}

interface DemandeConge {
  id: number;
  demandeur?: string;
  du?: string;
  au?: string;
  nbrjour?: number;
  section?: string;
  statut?: string;
}

const RetourCongePage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [retourConges, setRetourConges] = useState<RetourConge[]>([]);
  const [demandes, setDemandes] = useState<Map<number, DemandeConge>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRetour, setEditingRetour] = useState<RetourConge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retourToDelete, setRetourToDelete] = useState<RetourConge | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRetourConges();
  }, []);

  // Charger les informations des demandes associées
  useEffect(() => {
    const fetchDemandes = async () => {
      const demandeIds = retourConges
        .map((r) => r.fkDemande)
        .filter((id): id is number => id !== undefined && id !== null);

      if (demandeIds.length === 0) return;

      try {
        const response = await apiGet<{
          success: boolean;
          demandes: DemandeConge[];
        }>('/api/conge/demandes?limit=1000');

        if (response.success && Array.isArray(response.demandes)) {
          const demandesMap = new Map<number, DemandeConge>();
          response.demandes.forEach((demande) => {
            const demandeId = Number(demande.id);
            if (demandeIds.includes(demandeId)) {
              demandesMap.set(demandeId, demande);
            }
          });
          setDemandes(demandesMap);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error);
      }
    };

    if (retourConges.length > 0) {
      fetchDemandes();
    }
  }, [retourConges]);

  const fetchRetourConges = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        retourConges?: RetourConge[];
        message?: string;
      }>('/api/conge/retour-conge');

      if (response.success) {
        if (Array.isArray(response.retourConges)) {
          setRetourConges(
            response.retourConges.map((retour) => ({
              ...retour,
              id: Number(retour.id),
              fkDemande: retour.fkDemande
                ? Number(retour.fkDemande)
                : undefined,
              fkSoldes: retour.fkSoldes ? Number(retour.fkSoldes) : undefined,
              nbrjour: retour.nbrjour ? Number(retour.nbrjour) : undefined,
            }))
          );
        } else {
          // Si pas de retourConges mais success=true, probablement une liste vide
          setRetourConges([]);
        }
      } else {
        const errorMessage =
          response.message || 'Impossible de charger les retours de congé';
        showError('Erreur de chargement', errorMessage);

        // Si le message indique que le modèle est introuvable, donner des instructions
        if (errorMessage.includes('npx prisma generate')) {
          console.error(
            '⚠️ Action requise: Exécutez "npx prisma generate" puis redémarrez le serveur'
          );
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Impossible de charger les retours de congé';
      showError('Erreur de chargement', errorMessage);
      console.error('❌ Erreur détaillée:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRetour(null);
    setShowForm(true);
  };

  const handleEdit = (retour: RetourConge) => {
    setEditingRetour(retour);
    setShowForm(true);
  };

  const handleDelete = (retour: RetourConge) => {
    setRetourToDelete(retour);
    setShowDeleteDialog(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      if (editingRetour) {
        // Mise à jour
        const response = await apiPut<{
          success: boolean;
          message?: string;
          retourConge?: RetourConge;
        }>('/api/conge/retour-conge', {
          id: editingRetour.id,
          ...data,
        });

        if (response.success) {
          showSuccess('Succès', 'Retour de congé modifié avec succès');
          setShowForm(false);
          setEditingRetour(null);
          fetchRetourConges();
        } else {
          const errorMessage =
            response.message || 'Impossible de modifier le retour de congé';
          showError('Erreur', errorMessage);
          if (errorMessage.includes('npx prisma generate')) {
            console.error(
              '⚠️ Action requise: Exécutez "npx prisma generate" puis redémarrez le serveur'
            );
          }
        }
      } else {
        // Création
        const response = await apiPost<{
          success: boolean;
          message?: string;
          retourConge?: RetourConge;
        }>('/api/conge/retour-conge', data);

        if (response.success) {
          showSuccess('Succès', 'Retour de congé créé avec succès');
          setShowForm(false);
          fetchRetourConges();
        } else {
          const errorMessage =
            response.message || 'Impossible de créer le retour de congé';
          showError('Erreur', errorMessage);
          if (errorMessage.includes('npx prisma generate')) {
            console.error(
              '⚠️ Action requise: Exécutez "npx prisma generate" puis redémarrez le serveur'
            );
          }
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Une erreur est survenue lors de l'enregistrement";
      showError('Erreur', errorMessage);
      console.error('❌ Erreur détaillée lors de la soumission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!retourToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{
        success: boolean;
        message?: string;
      }>(`/api/conge/retour-conge?id=${retourToDelete.id}`);

      if (response.success) {
        showSuccess('Succès', 'Retour de congé supprimé avec succès');
        setShowDeleteDialog(false);
        setRetourToDelete(null);
        fetchRetourConges();
      } else {
        showError(
          'Erreur',
          response.message || 'Impossible de supprimer le retour de congé'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la suppression'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filtrer les retours selon le terme de recherche
  const filteredRetourConges = retourConges.filter((retour) => {
    if (!searchTerm) return true;

    const demande = retour.fkDemande
      ? demandes.get(retour.fkDemande)
      : undefined;
    const searchLower = searchTerm.toLowerCase();

    return (
      retour.observations?.toLowerCase().includes(searchLower) ||
      demande?.demandeur?.toLowerCase().includes(searchLower) ||
      demande?.section?.toLowerCase().includes(searchLower) ||
      retour.fkDemande?.toString().includes(searchTerm)
    );
  });

  const toggleSelectAllFiltered = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(new Set(filteredRetourConges.map((r) => r.id)));
    },
    [filteredRetourConges]
  );

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const response = await apiPost<{ success: boolean; message?: string }>(
        '/api/conge/retour-conge',
        { action: 'bulk-delete', ids }
      );
      if (response.success) {
        showSuccess('Succès', response.message || `${ids.length} retour(s) supprimé(s)`);
        setShowBulkDeleteDialog(false);
        setSelectedIds(new Set());
        fetchRetourConges();
      } else {
        showError('Erreur', response.message || 'Suppression multiple impossible');
      }
    } catch (error: any) {
      showError(
        'Erreur',
        error?.response?.data?.message ||
          error?.message ||
          'Une erreur est survenue lors de la suppression multiple'
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const allFilteredSelected = useMemo(() => {
    if (filteredRetourConges.length === 0) return false;
    return filteredRetourConges.every((r) => selectedIds.has(r.id));
  }, [filteredRetourConges, selectedIds]);

  const someFilteredSelected = useMemo(
    () => filteredRetourConges.some((r) => selectedIds.has(r.id)) && !allFilteredSelected,
    [filteredRetourConges, selectedIds, allFilteredSelected]
  );
  const emptyStateMessage = searchTerm
    ? 'Aucun retour de congé trouvé pour votre recherche'
    : 'Aucun retour de congé enregistré';
  const hasNoResults = filteredRetourConges.length === 0;
  let tableContent: React.ReactNode;
  if (loading) {
    tableContent = (
      <div className="p-8 text-center">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-2 text-sm text-gray-500">Chargement...</p>
      </div>
    );
  } else if (hasNoResults) {
    tableContent = (
      <div className="p-8 text-center">
        <ArrowUturnLeftIcon className="h-12 w-12 text-gray-400 mx-auto" />
        <p className="mt-2 text-sm text-gray-500">{emptyStateMessage}</p>
      </div>
    );
  } else {
    tableContent = (
      <div className="overflow-x-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-600">
            {selectedIds.size > 0
              ? `${selectedIds.size} élément(s) sélectionné(s)`
              : 'Sélection multiple disponible'}
          </p>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={() => setShowBulkDeleteDialog(true)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Supprimer la sélection
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected;
                  }}
                  onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                  aria-label="Sélectionner tout"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Demande</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Jours retournés</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Observations</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date de création</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredRetourConges.map((retour) => {
              const demande = retour.fkDemande ? demandes.get(retour.fkDemande) : undefined;
              const demandeurStr = demande?.demandeur || 'Non spécifié';
              const demandeurNom = demandeurStr.includes('|')
                ? demandeurStr.split('|')[1]?.trim() || demandeurStr
                : demandeurStr;
              return (
                <tr key={retour.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedIds.has(retour.id)}
                      onChange={() => toggleSelect(retour.id)}
                      aria-label={`Sélectionner ${retour.id}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">#{retour.id}</td>
                  <td className="px-6 py-4 text-sm">
                    {demande ? (
                      <div>
                        <div className="font-medium text-gray-900">{demandeurNom}</div>
                        <div className="text-xs text-gray-500">
                          {demande.du && demande.au
                            ? `${new Date(demande.du).toLocaleDateString('fr-FR')} - ${new Date(demande.au).toLocaleDateString('fr-FR')}`
                            : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Demande #{retour.fkDemande}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {retour.nbrjour == null ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className="font-medium text-green-600">{retour.nbrjour} jour(s)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {retour.observations ? (
                      <div className="max-w-xs truncate" title={retour.observations}>
                        {retour.observations}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {retour.datecreate
                      ? new Date(retour.datecreate).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(retour)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Modifier"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(retour)}
                      className="ml-3 text-red-600 hover:text-red-900"
                      title="Supprimer"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <CongeAppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowUturnLeftIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Retour de Congé
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestion des retours de congé pour les demandes approuvées
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
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par observations, demandeur, section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg">
          {tableContent}
        </div>

        {/* Modal de formulaire */}
        {showForm && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingRetour
                    ? 'Modifier le retour de congé'
                    : 'Nouveau retour de congé'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingRetour(null);
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

              <RetourCongeForm
                onSubmit={handleFormSubmit}
                initialData={editingRetour || undefined}
                submitLabel={editingRetour ? 'Modifier' : 'Créer'}
                cancelLabel="Annuler"
                onCancel={() => {
                  setShowForm(false);
                  setEditingRetour(null);
                }}
                loading={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setRetourToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Supprimer le retour de congé"
          message={`Êtes-vous sûr de vouloir supprimer le retour de congé #${retourToDelete?.id} ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          type="danger"
          loading={isDeleting}
        />

        <ConfirmDialog
          isOpen={showBulkDeleteDialog}
          onClose={() => setShowBulkDeleteDialog(false)}
          onConfirm={handleBulkDelete}
          title="Suppression multiple"
          message={`Supprimer définitivement ${selectedIds.size} retour(s) de congé ? Cette action est irréversible.`}
          confirmText={`Supprimer ${selectedIds.size}`}
          cancelText="Annuler"
          type="danger"
          loading={isBulkDeleting}
        />
      </div>
    </CongeAppShell>
  );
};

export default RetourCongePage;
