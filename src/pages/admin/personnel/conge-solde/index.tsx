import CongeSoldeForm from '@/components/forms/CongeSoldeForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  BanknotesIcon,
  PencilIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Solde {
  id: string;
  fkUtilisateur?: string;
  solde?: number;
  soldeConsomme?: number;
  soldeRestant?: number;
  utilisateur?: {
    id: string;
    nom: string;
    prenom: string;
    username: string;
  };
  datecreate: string;
  dateupdate?: string;
}

interface CongeSoldeFormData {
  fkUtilisateur?: number;
  solde?: number;
  soldeConsomme?: number;
}

const CongeSoldePage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [soldes, setSoldes] = useState<Solde[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSolde, setEditingSolde] = useState<Solde | null>(null);
  const [soldeToDelete, setSoldeToDelete] = useState<Solde | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSoldes();
  }, []);

  const fetchSoldes = async () => {
    try {
      setLoading(true);
      // Récupérer tous les soldes avec les utilisateurs
      const response = await apiGet<{
        success: boolean;
        soldes: Solde[];
      }>('/api/admin/personnel/conge-soldes');

      if (response.success && response.soldes) {
        setSoldes(response.soldes);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des soldes:', error);
      showError('Erreur lors du chargement des soldes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CongeSoldeFormData) => {
    try {
      setIsSubmitting(true);
      const response = await apiPost<{
        success: boolean;
        solde: Solde;
        message?: string;
      }>('/api/conge/solde', {
        fkUtilisateur: data.fkUtilisateur,
        solde: data.solde,
        soldeConsomme: data.soldeConsomme,
      });

      if (response.success) {
        showSuccess('Solde régularisé avec succès');
        setShowForm(false);
        fetchSoldes();
      } else {
        showError(response.message || 'Erreur lors de la régularisation');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du solde:', error);
      showError(error.message || 'Erreur lors de la régularisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: CongeSoldeFormData) => {
    if (!editingSolde) return;

    try {
      setIsSubmitting(true);
      const response = await apiPut<{
        success: boolean;
        solde: Solde;
        message?: string;
      }>('/api/conge/solde', {
        id: editingSolde.id,
        fkUtilisateur: editingSolde.fkUtilisateur,
        solde: data.solde,
        soldeConsomme: data.soldeConsomme,
      });

      if (response.success) {
        showSuccess('Solde modifié avec succès');
        setShowForm(false);
        setEditingSolde(null);
        fetchSoldes();
      } else {
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      console.error('Erreur lors de la modification du solde:', error);
      showError(error.message || 'Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!soldeToDelete) return;

    try {
      setIsDeleting(true);
      // Note: L'API de suppression doit être créée si nécessaire
      // Pour le moment, on peut juste masquer la fonctionnalité de suppression
      showError("La suppression des soldes n'est pas encore disponible");
      setSoldeToDelete(null);
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (solde: Solde) => {
    setEditingSolde(solde);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSolde(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout
      title="Régularisation des Soldes de Congé"
      description="Gestion et régularisation manuelle des soldes de congé des utilisateurs"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Régularisation des Soldes de Congé
                </h1>
                <p className="text-sm text-gray-600">
                  Modifiez manuellement les soldes de congé des utilisateurs
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingSolde(null);
                setShowForm(true);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nouvelle régularisation
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BanknotesIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Total Soldes
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {soldes.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BanknotesIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Solde Moyen
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {soldes.length > 0
                        ? (
                            soldes.reduce((sum, s) => sum + (s.solde || 0), 0) /
                            soldes.length
                          ).toFixed(1)
                        : '0'}{' '}
                      jours
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BanknotesIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      Total Consommé
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {soldes
                        .reduce((sum, s) => sum + (s.soldeConsomme || 0), 0)
                        .toFixed(1)}{' '}
                      jours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des soldes...
            </p>
          </div>
        ) : soldes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun solde trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer une régularisation de solde.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solde Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solde Consommé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solde Restant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de création
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {soldes.map((solde) => (
                    <tr key={solde.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {solde.utilisateur
                            ? `${solde.utilisateur.nom} ${solde.utilisateur.prenom}`
                            : 'N/A'}
                        </div>
                        {solde.utilisateur && (
                          <div className="text-xs text-gray-500">
                            @{solde.utilisateur.username}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {solde.solde?.toFixed(1) || '0'} jour
                          {solde.solde !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-orange-600">
                          {solde.soldeConsomme?.toFixed(1) || '0'} jour
                          {solde.soldeConsomme !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-bold ${
                            (solde.soldeRestant || 0) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {(solde.soldeRestant || 0).toFixed(1)} jour
                          {solde.soldeRestant !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(solde.datecreate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(solde)}
                            className="text-green-600 hover:text-green-900"
                            title="Modifier"
                          >
                            <PencilIcon className="h-5 w-5" />
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

        {/* Modal de formulaire */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingSolde
                    ? 'Modifier le solde de congé'
                    : 'Nouvelle régularisation de solde'}
                </h3>
                <CongeSoldeForm
                  onSubmit={editingSolde ? handleUpdate : handleCreate}
                  initialData={
                    editingSolde
                      ? {
                          fkUtilisateur: editingSolde.fkUtilisateur
                            ? Number(editingSolde.fkUtilisateur)
                            : undefined,
                          solde: editingSolde.solde,
                          soldeConsomme: editingSolde.soldeConsomme,
                        }
                      : undefined
                  }
                  onCancel={handleCancel}
                  loading={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!soldeToDelete}
          onClose={() => setSoldeToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer le solde"
          message={`Êtes-vous sûr de vouloir supprimer le solde de "${soldeToDelete?.utilisateur?.nom} ${soldeToDelete?.utilisateur?.prenom}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default CongeSoldePage;
