import RolesPermissionsForm from '@/components/forms/RolesPermissionsForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { useEffect, useState } from 'react';

interface RolePermission {
  id: number | string;
  fkRole: number | string;
  fkPermission: number | string;
  role?: {
    id: number | string;
    nom: string;
  };
  permission?: {
    id: number | string;
    nom: string;
    description: string;
  };
  datecreate: string;
  dateupdate: string;
  usercreateid?: number | string;
  userupdateid?: number | string;
}

interface Role {
  id: number;
  nom: string;
}

interface Permission {
  id: number;
  nom: string;
  description: string;
}

const RolesPermissionsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [rolesPermissions, setRolesPermissions] = useState<RolePermission[]>(
    []
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRolePermission, setEditingRolePermission] =
    useState<RolePermission | null>(null);
  const [rolePermissionToDelete, setRolePermissionToDelete] =
    useState<RolePermission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
  });

  useEffect(() => {
    console.log('🔍 useEffect - Début du chargement des données');
    fetchRolesPermissions();
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRolesPermissions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début du chargement des rôles permissions...');

      const response = await apiGet<{
        success: boolean;
        rolesPermissions: RolePermission[];
        total?: number;
        message?: string;
        pagination?: any;
      }>('/api/admin/roles-permissions?all=true');

      console.log('🔍 Réponse API roles-permissions:', response);

      if (response.success && response.rolesPermissions) {
        console.log('🔍 Rôles permissions reçus:', response.rolesPermissions);
        setRolesPermissions(response.rolesPermissions);

        setStats({
          total: response.rolesPermissions.length,
        });

        console.log(
          '🔍 Rôles permissions définis dans le state:',
          response.rolesPermissions.length
        );
        console.log('🔍 Statistiques:', {
          total: response.rolesPermissions.length,
        });
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setRolesPermissions([]);
        setStats({ total: 0 });
      }
    } catch (error) {
      console.error(
        '❌ Erreur lors du chargement des rôles permissions:',
        error
      );
      setRolesPermissions([]);
      setStats({ total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('🔍 Début du chargement des rôles...');
      const response = await apiGet<{ success: boolean; roles: Role[] }>(
        '/api/admin/roles'
      );
      console.log('🔍 Réponse API roles:', response);
      if (response.success && response.roles) {
        console.log('🔍 Rôles reçus:', response.roles);
        setRoles(response.roles);
        console.log('🔍 Rôles définis dans le state:', response.roles.length);
      } else {
        console.error('❌ Erreur dans la réponse API roles:', response);
        setRoles([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des rôles:', error);
      setRoles([]);
    }
  };

  const fetchPermissions = async () => {
    try {
      console.log('🔍 Début du chargement des permissions...');
      const response = await apiGet<{
        success: boolean;
        permissions: Permission[];
      }>('/api/admin/permissions');
      console.log('🔍 Réponse API permissions:', response);
      if (response.success && response.permissions) {
        console.log('🔍 Permissions reçues:', response.permissions);
        setPermissions(response.permissions);
        console.log(
          '🔍 Permissions définies dans le state:',
          response.permissions.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API permissions:', response);
        setPermissions([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des permissions:', error);
      setPermissions([]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateRolePermission = async (data: any) => {
    try {
      const response = await apiPost<{ success: boolean; message?: string }>(
        '/api/admin/roles-permissions',
        data
      );
      if (response.success) {
        showSuccess('Rôle permission créé avec succès');
        setShowForm(false);
        fetchRolesPermissions();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleOpenForm = () => {
    console.log('🔍 Ouverture du formulaire - Données actuelles:', {
      roles: roles.length,
      permissions: permissions.length,
    });
    if (roles.length === 0 || permissions.length === 0) {
      console.log('🔍 Rechargement des données...');
      fetchRoles();
      fetchPermissions();
    }
    setShowForm(true);
  };

  const handleUpdateRolePermission = async (data: any) => {
    if (!editingRolePermission) return;

    try {
      const response = await apiPut<{ success: boolean; message?: string }>(
        `/api/admin/roles-permissions/${editingRolePermission.id}`,
        data
      );
      if (response.success) {
        showSuccess('Rôle permission modifié avec succès');
        setShowForm(false);
        setEditingRolePermission(null);
        fetchRolesPermissions();
      } else {
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteRolePermission = async () => {
    if (!rolePermissionToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{ success: boolean; message?: string }>(
        `/api/admin/roles-permissions/${rolePermissionToDelete.id}`
      );
      if (response.success) {
        showSuccess('Rôle permission supprimé avec succès');
        setRolePermissionToDelete(null);
        fetchRolesPermissions();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (rolePermission: RolePermission) => {
    setEditingRolePermission(rolePermission);
    setShowForm(true);
  };

  const handleDelete = (rolePermission: RolePermission) => {
    setRolePermissionToDelete(rolePermission);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRolePermission(null);
  };

  return (
    <AdminLayout
      title="Gestion des Rôles Permissions"
      description="Gérez les permissions par rôle"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 text-purple-600 mr-3 flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Rôles Permissions
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion des permissions par rôle
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 shadow-sm"
            >
              <span className="mr-2">+</span>
              Ajouter un rôle permission
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      Total Rôles Permissions
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des rôles permissions...
            </p>
            <button
              onClick={fetchRolesPermissions}
              className="mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              Recharger
            </button>
          </div>
        ) : rolesPermissions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun rôle permission trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre premier rôle permission.
            </p>
            <button
              onClick={fetchRolesPermissions}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Recharger les rôles permissions
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
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                  {rolesPermissions.map((rolePermission) => (
                    <tr key={rolePermission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{rolePermission.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {rolePermission.role?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {rolePermission.permission?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {rolePermission.permission?.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(
                            rolePermission.datecreate
                          ).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(
                            rolePermission.datecreate
                          ).toLocaleTimeString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(rolePermission)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(rolePermission)}
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

        {/* Formulaire de rôles permissions */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingRolePermission
                    ? 'Modifier le rôle permission'
                    : 'Nouveau rôle permission'}
                </h3>
                {dataLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Chargement des données...
                    </p>
                  </div>
                ) : (
                  <RolesPermissionsForm
                    onSubmit={
                      editingRolePermission
                        ? handleUpdateRolePermission
                        : handleCreateRolePermission
                    }
                    initialData={
                      editingRolePermission
                        ? {
                            fkRole: editingRolePermission.fkRole
                              ? Number(editingRolePermission.fkRole)
                              : null,
                            fkPermission: editingRolePermission.fkPermission
                              ? Number(editingRolePermission.fkPermission)
                              : null,
                          }
                        : undefined
                    }
                    roles={roles}
                    permissions={permissions}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!rolePermissionToDelete}
          onClose={() => setRolePermissionToDelete(null)}
          onConfirm={handleDeleteRolePermission}
          title="Supprimer le rôle permission"
          message={`Êtes-vous sûr de vouloir supprimer le rôle permission "${rolePermissionToDelete?.role?.nom}" - "${rolePermissionToDelete?.permission?.nom}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default RolesPermissionsPage;
