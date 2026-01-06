import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost } from '@/lib/fetcher';
import React, { useEffect, useState } from 'react';

interface Permission {
  id: string;
  nom: string;
  description?: string;
  rolePermissionId?: string;
  datecreate?: string;
  dateupdate?: string;
}

interface Role {
  id: number;
  nom: string;
  description?: string;
}

interface RolePermissionsFormProps {
  role: Role;
  onClose: () => void;
}

const RolePermissionsForm: React.FC<RolePermissionsFormProps> = ({
  role,
  onClose,
}) => {
  const { showSuccess, showError } = useToast();
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [role.id]);

  // Fonction pour vérifier si une permission est déjà assignée
  const isPermissionAssigned = (permissionId: string): boolean => {
    return rolePermissions.some((rp) => rp.id === permissionId);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer toutes les permissions disponibles
      const allPermissionsResponse = await apiGet<{
        success: boolean;
        permissions: Permission[];
      }>('/api/rbac/permissions');

      // Récupérer les permissions du rôle
      const rolePermissionsResponse = await apiGet<{
        success: boolean;
        permissions: Permission[];
      }>(`/api/rbac/roles/${role.id}/permissions`);

      if (allPermissionsResponse.success) {
        console.log(
          '🔍 Toutes les permissions reçues:',
          allPermissionsResponse.permissions.length
        );
        setAllPermissions(allPermissionsResponse.permissions);
      } else {
        console.log(
          '❌ Erreur dans la réponse de toutes les permissions:',
          allPermissionsResponse
        );
      }

      if (rolePermissionsResponse.success) {
        console.log(
          '🔍 Permissions du rôle reçues:',
          rolePermissionsResponse.permissions
        );
        setRolePermissions(rolePermissionsResponse.permissions);
      } else {
        console.log(
          '❌ Erreur dans la réponse des permissions du rôle:',
          rolePermissionsResponse
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de chargement',
        error.message || 'Impossible de charger les données'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPermission = async (permission: Permission) => {
    try {
      setAssigning(true);

      console.log('🔍 Assignation de permission:', {
        roleId: role.id,
        permissionId: permission.id,
        permission: permission,
      });

      const response = await apiPost<{ success: boolean; message?: string }>(
        `/api/rbac/roles/${role.id}/permissions`,
        { permissionId: Number(permission.id) }
      );

      if (response.success) {
        // Ajouter la permission à la liste des permissions du rôle
        setRolePermissions((prev) => [...prev, permission]);
        showSuccess(
          'Permission assignée',
          'La permission a été assignée avec succès'
        );
      } else {
        showError(
          "Erreur d'assignation",
          response.message || "Impossible d'assigner la permission"
        );
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de l'assignation de la permission:", error);

      // Gérer l'erreur 409 (conflit) de manière plus gracieuse
      if (error.message && error.message.includes('409')) {
        showError(
          'Permission déjà assignée',
          'Cette permission est déjà assignée à ce rôle'
        );
      } else {
        showError(
          "Erreur d'assignation",
          error.message || "Impossible d'assigner la permission"
        );
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRemovePermission = async (permission: Permission) => {
    try {
      setRemoving(permission.id);

      const response = await apiDelete(
        `/api/rbac/roles/${role.id}/permissions`,
        { permissionId: permission.id }
      );

      if (response.success) {
        // Supprimer la permission de la liste des permissions du rôle
        setRolePermissions((prev) =>
          prev.filter((p) => p.id !== permission.id)
        );
        showSuccess(
          'Permission supprimée',
          'La permission a été supprimée avec succès'
        );
      } else {
        showError(
          'Erreur de suppression',
          response.message || 'Impossible de supprimer la permission'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de suppression',
        error.message || 'Impossible de supprimer la permission'
      );
    } finally {
      setRemoving(null);
    }
  };

  // Filtrer les permissions disponibles (celles qui ne sont pas déjà assignées)
  console.log('🔍 Toutes les permissions:', allPermissions.length);
  console.log('🔍 Permissions du rôle:', rolePermissions.length);
  console.log('🔍 Permissions du rôle (détail):', rolePermissions);

  const availablePermissions = allPermissions.filter(
    (permission) => !rolePermissions.some((rp) => rp.id === permission.id)
  );

  console.log(
    '🔍 Permissions disponibles après filtrage:',
    availablePermissions.length
  );

  // Filtrer par terme de recherche
  const filteredAvailablePermissions = availablePermissions.filter(
    (permission) =>
      permission.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (permission.description &&
        permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredRolePermissions = rolePermissions.filter(
    (permission) =>
      permission.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (permission.description &&
        permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Permissions du rôle : {role.nom}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Gérez les permissions attribuées à ce rôle
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Fermer</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Rechercher une permission..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Permissions disponibles */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Permissions disponibles ({filteredAvailablePermissions.length})
              </h4>
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {filteredAvailablePermissions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm
                      ? 'Aucune permission trouvée'
                      : 'Toutes les permissions sont assignées'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAvailablePermissions.map((permission) => (
                      <div key={permission.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.nom}
                            </div>
                            {permission.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {permission.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignPermission(permission)}
                            disabled={
                              assigning || isPermissionAssigned(permission.id)
                            }
                            className={`ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isPermissionAssigned(permission.id)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {assigning ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                Assignation...
                              </>
                            ) : isPermissionAssigned(permission.id) ? (
                              'Déjà assignée'
                            ) : (
                              'Ajouter'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permissions assignées */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Permissions assignées ({filteredRolePermissions.length})
              </h4>
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {filteredRolePermissions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucune permission assignée
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredRolePermissions.map((permission) => (
                      <div key={permission.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.nom}
                            </div>
                            {permission.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {permission.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemovePermission(permission)}
                            disabled={removing === permission.id}
                            className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {removing === permission.id ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                                Suppression...
                              </>
                            ) : (
                              'Supprimer'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsForm;
