import RetourCongeForm from '@/components/forms/RetourCongeForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Table from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { ArrowUturnLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

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
  const { user } = useAuth();
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

  // Préparer les colonnes de la table
  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (retour: RetourConge) => (
        <span className="font-medium">#{retour.id}</span>
      ),
    },
    {
      header: 'Demande',
      accessor: 'fkDemande',
      render: (retour: RetourConge) => {
        const demande = retour.fkDemande
          ? demandes.get(retour.fkDemande)
          : undefined;
        if (!demande) {
          return (
            <span className="text-gray-400">Demande #{retour.fkDemande}</span>
          );
        }

        const demandeurStr = demande.demandeur || 'Non spécifié';
        const demandeurNom = demandeurStr.includes('|')
          ? demandeurStr.split('|')[1]?.trim() || demandeurStr
          : demandeurStr;

        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{demandeurNom}</div>
            <div className="text-gray-500 text-xs">
              {demande.du && demande.au
                ? `${new Date(demande.du).toLocaleDateString('fr-FR')} - ${new Date(demande.au).toLocaleDateString('fr-FR')}`
                : ''}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Jours retournés',
      accessor: 'nbrjour',
      render: (retour: RetourConge) =>
        retour.nbrjour !== undefined && retour.nbrjour !== null ? (
          <span className="font-medium text-green-600">
            {retour.nbrjour} jour(s)
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      header: 'Observations',
      accessor: 'observations',
      render: (retour: RetourConge) =>
        retour.observations ? (
          <div className="max-w-xs truncate" title={retour.observations}>
            {retour.observations}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      header: 'Date de création',
      accessor: 'datecreate',
      render: (retour: RetourConge) =>
        retour.datecreate
          ? new Date(retour.datecreate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (retour: RetourConge) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(retour)}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            title="Modifier"
          >
            Modifier
          </button>
          <button
            onClick={() => handleDelete(retour)}
            className="text-red-600 hover:text-red-900 text-sm font-medium"
            title="Supprimer"
          >
            Supprimer
          </button>
        </div>
      ),
    },
  ];

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
          {loading ? (
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
          ) : filteredRetourConges.length === 0 ? (
            <div className="p-8 text-center">
              <ArrowUturnLeftIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm
                  ? 'Aucun retour de congé trouvé pour votre recherche'
                  : 'Aucun retour de congé enregistré'}
              </p>
            </div>
          ) : (
            <Table
              data={filteredRetourConges}
              columns={columns}
              keyField="id"
            />
          )}
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
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
          loading={isDeleting}
        />
      </div>
    </CongeAppShell>
  );
};

export default RetourCongePage;
