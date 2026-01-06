import RoleForm from '@/components/forms/RoleForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Role {
  id: string;
  nom: string;
  description: string;
  datecreate: string;
  dateupdate: string;
  usercreateid?: string;
  userupdateid?: string;
}

const RolesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début du chargement des rôles...');

      const response = await apiGet<{
        success: boolean;
        roles: Role[];
        total?: number;
        message?: string;
      }>('/api/admin/roles');

      console.log('🔍 Réponse API roles:', response);

      if (response.success && response.roles) {
        console.log('🔍 Rôles reçus:', response.roles);
        setRoles(response.roles);
        setStats({
          total: response.roles.length,
        });
        console.log('🔍 Rôles définis dans le state:', response.roles.length);
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setRoles([]);
        setStats({ total: 0 });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des rôles:', error);
      setRoles([]);
      setStats({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (data: any) => {
    try {
      const response = await apiPost<{ success: boolean; message?: string }>(
        '/api/admin/roles',
        data
      );
      if (response.success) {
        showSuccess('Rôle créé avec succès');
        setShowForm(false);
        fetchRoles();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateRole = async (data: any) => {
    if (!editingRole) return;

    try {
      console.log('🔍 Début de la modification du rôle:', editingRole.id);
      console.log('🔍 Données à envoyer:', data);

      const response = await apiPut<{ success: boolean; message?: string }>(
        `/api/admin/roles/${editingRole.id}`,
        data
      );

      console.log('🔍 Réponse de modification:', response);

      if (response.success) {
        showSuccess('Rôle modifié avec succès');
        setShowForm(false);
        setEditingRole(null);
        fetchRoles();
      } else {
        console.error('❌ Erreur dans la réponse:', response);
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification:', error);
      showError(error.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{ success: boolean; message?: string }>(
        `/api/admin/roles/${roleToDelete.id}`
      );
      if (response.success) {
        showSuccess('Rôle supprimé avec succès');
        setRoleToDelete(null);
        fetchRoles();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setShowForm(true);
  };

  const handleDelete = (role: Role) => {
    setRoleToDelete(role);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRole(null);
  };

  const handleOpenForm = () => {
    setShowForm(true);
  };

  console.log('🔍 Rendu - État des rôles:', {
    loading,
    rolesCount: roles.length,
    stats,
    roles: roles,
  });

  return (
    <AdminLayout
      title="Gestion des Rôles"
      description="Gérez les rôles disponibles dans l'application"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Rôles</h1>
                <p className="text-sm text-gray-600">
                  Gestion des rôles de l'application
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un rôle
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Total Rôles
                    </p>
                    <p className="text-2xl font-bold text-green-900">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des rôles...
            </p>
            <button
              onClick={fetchRoles}
              className="mt-2 text-sm text-green-600 hover:text-green-800"
            >
              Recharger
            </button>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-6 text-center">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun rôle trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre premier rôle.
            </p>
            <button
              onClick={fetchRoles}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Recharger les rôles
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
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{role.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {role.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {role.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(role.datecreate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(role.datecreate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(role.dateupdate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(role.dateupdate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(role)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(role)}
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

        {/* Formulaire de rôle */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
                </h3>
                <RoleForm
                  onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
                  initialData={
                    editingRole
                      ? {
                          nom: editingRole.nom,
                          description: editingRole.description,
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
          isOpen={!!roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={handleDeleteRole}
          title="Supprimer le rôle"
          message={`Êtes-vous sûr de vouloir supprimer le rôle "${roleToDelete?.nom}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default RolesPage;
