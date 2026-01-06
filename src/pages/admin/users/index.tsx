import UserForm from '@/components/forms/UserForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  ArrowPathIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  nom: string;
  postnom?: string;
  prenom?: string;
  username: string;
  mail?: string;
  phone?: string;
  fkRole?: string;
  fkFonction?: string;
  role?: {
    id: string;
    nom: string;
  };
  fonction?: {
    id: string;
    nom: string;
  };
  datecreate: string;
  dateupdate: string;
  usercreateid?: string;
  userupdateid?: string;
}

interface Role {
  id: number | string;
  nom: string;
}

interface Fonction {
  id: number | string;
  nom: string;
}

const UsersPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [fonctionsLoading, setFonctionsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    withRole: 0,
    withFonction: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchFonctions();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Début du chargement des utilisateurs...');

      const response = await apiGet<{
        success: boolean;
        users: User[];
        total?: number;
        message?: string;
      }>('/api/admin/users');

      console.log('🔍 Réponse API users:', response);

      if (response.success && response.users) {
        console.log('🔍 Utilisateurs reçus:', response.users);
        setUsers(response.users);
        const withRole = response.users.filter((u) => u.role).length;
        const withFonction = response.users.filter((u) => u.fonction).length;
        setStats({
          total: response.users.length,
          withRole,
          withFonction,
        });
        console.log(
          '🔍 Utilisateurs définis dans le state:',
          response.users.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setUsers([]);
        setStats({ total: 0, withRole: 0, withFonction: 0 });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
      setStats({ total: 0, withRole: 0, withFonction: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
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
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchFonctions = async () => {
    try {
      setFonctionsLoading(true);
      console.log('🔍 Début du chargement des fonctions...');
      const response = await apiGet<{
        success: boolean;
        fonctions: Fonction[];
      }>('/api/admin/fonctions');
      console.log('🔍 Réponse API fonctions:', response);
      if (response.success && response.fonctions) {
        console.log('🔍 Fonctions reçues:', response.fonctions);
        setFonctions(response.fonctions);
        console.log(
          '🔍 Fonctions définies dans le state:',
          response.fonctions.length
        );
      } else {
        console.error('❌ Erreur dans la réponse API fonctions:', response);
        setFonctions([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des fonctions:', error);
      setFonctions([]);
    } finally {
      setFonctionsLoading(false);
    }
  };

  const handleCreateUser = async (data: any) => {
    try {
      const response = await apiPost<{ success: boolean; message?: string }>(
        '/api/admin/users',
        data
      );
      if (response.success) {
        showSuccess('Utilisateur créé avec succès');
        setShowForm(false);
        fetchUsers();
      } else {
        showError(response.message || 'Erreur lors de la création');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateUser = async (data: any) => {
    if (!editingUser) return;

    try {
      console.log(
        "🔍 Début de la modification de l'utilisateur:",
        editingUser.id
      );
      console.log('🔍 Données à envoyer:', data);

      const response = await apiPut<{ success: boolean; message?: string }>(
        `/api/admin/users/${editingUser.id}`,
        data
      );

      console.log('🔍 Réponse de modification:', response);

      if (response.success) {
        showSuccess('Utilisateur modifié avec succès');
        setShowForm(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        console.error('❌ Erreur dans la réponse:', response);
        showError(response.message || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification:', error);
      showError(error.message || 'Erreur lors de la modification');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      const response = await apiDelete<{ success: boolean; message?: string }>(
        `/api/admin/users/${userToDelete.id}`
      );
      if (response.success) {
        showSuccess('Utilisateur supprimé avec succès');
        setUserToDelete(null);
        fetchUsers();
      } else {
        showError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
  };

  const handleResetPassword = (user: User) => {
    setUserToReset(user);
  };

  const handleConfirmResetPassword = async () => {
    if (!userToReset) return;

    try {
      setIsResetting(true);
      const response = await apiPost<{
        success: boolean;
        message?: string;
        tempPassword?: string;
      }>(`/api/admin/users/${userToReset.id}`, {
        action: 'reset-password',
      });

      if (response.success && response.tempPassword) {
        setTempPassword(response.tempPassword);
        setShowPasswordModal(true);
        showSuccess('Mot de passe réinitialisé avec succès');
        fetchUsers();
      } else {
        showError(response.message || 'Erreur lors de la réinitialisation');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
      setUserToReset(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleOpenForm = () => {
    console.log('🔍 Ouverture du formulaire - Rôles actuels:', roles.length);
    console.log(
      '🔍 Ouverture du formulaire - Fonctions actuelles:',
      fonctions.length
    );
    if (roles.length === 0) {
      console.log('🔍 Rechargement des rôles...');
      fetchRoles();
    }
    if (fonctions.length === 0) {
      console.log('🔍 Rechargement des fonctions...');
      fetchFonctions();
    }
    setShowForm(true);
  };

  console.log('🔍 Rendu - État des utilisateurs:', {
    loading,
    usersCount: users.length,
    stats,
    users: users,
  });

  return (
    <AdminLayout
      title="Gestion des Utilisateurs"
      description="Gérez les utilisateurs disponibles dans l'application"
    >
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Utilisateurs
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion des utilisateurs de l'application
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un utilisateur
            </button>
          </div>

          {/* Statistiques */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">
                      Total Utilisateurs
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">
                      Avec Rôle
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats.withRole}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">
                      Avec Fonction
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.withFonction}
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
              Chargement des utilisateurs...
            </p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Recharger
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun utilisateur trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre premier utilisateur.
            </p>
            <button
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recharger les utilisateurs
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
                      Nom Complet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fonction
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
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{user.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.nom} {user.postnom ? user.postnom + ' ' : ''}
                          {user.prenom || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.mail || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.role?.nom || (
                            <span className="text-orange-600 font-medium">
                              Non assigné
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.fonction?.nom || (
                            <span className="text-orange-600 font-medium">
                              Non assigné
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(user.datecreate).toLocaleDateString(
                            'fr-FR'
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(user.datecreate).toLocaleTimeString(
                            'fr-FR'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Réinitialiser le mot de passe"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
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

        {/* Formulaire d'utilisateur */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingUser
                    ? "Modifier l'utilisateur"
                    : 'Nouvel utilisateur'}
                </h3>
                {rolesLoading || fonctionsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Chargement des données...
                    </p>
                  </div>
                ) : (
                  <UserForm
                    onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
                    initialData={
                      editingUser
                        ? {
                            nom: editingUser.nom,
                            postnom: editingUser.postnom || '',
                            prenom: editingUser.prenom || '',
                            username: editingUser.username,
                            mail: editingUser.mail || '',
                            phone: editingUser.phone || '',
                            fkFonction: editingUser.fkFonction
                              ? Number(editingUser.fkFonction)
                              : null,
                            fkRole: editingUser.fkRole
                              ? Number(editingUser.fkRole)
                              : null,
                          }
                        : undefined
                    }
                    roles={roles}
                    fonctions={fonctions}
                    onCancel={handleCancel}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dialog de confirmation de suppression */}
        <ConfirmDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteUser}
          title="Supprimer l'utilisateur"
          message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete?.nom} ${userToDelete?.prenom || ''}" ? Cette action est irréversible.`}
          type="danger"
          confirmText="Supprimer"
          cancelText="Annuler"
          loading={isDeleting}
        />

        {/* Dialog de confirmation de réinitialisation du mot de passe */}
        <ConfirmDialog
          isOpen={!!userToReset}
          onClose={() => setUserToReset(null)}
          onConfirm={handleConfirmResetPassword}
          title="Réinitialiser le mot de passe"
          message={`Êtes-vous sûr de vouloir réinitialiser le mot de passe de l'utilisateur "${userToReset?.nom} ${userToReset?.prenom || ''}" ? Un nouveau mot de passe temporaire sera généré et l'utilisateur devra le changer à la prochaine connexion.`}
          type="warning"
          confirmText="Réinitialiser"
          cancelText="Annuler"
          loading={isResetting}
        />

        {/* Modal d'affichage du mot de passe temporaire */}
        {showPasswordModal && tempPassword && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Mot de passe temporaire généré
                </h3>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Un nouveau mot de passe temporaire a été généré pour{' '}
                      <strong>{userToReset?.username}</strong>.
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Mot de passe temporaire :
                    </p>
                    <div className="bg-white border border-gray-300 rounded-md p-3 font-mono text-lg text-center font-bold text-blue-600 select-all">
                      {tempPassword}
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      ⚠️ Notez ce mot de passe. Il ne sera pas affiché à
                      nouveau. L'utilisateur devra le changer lors de sa
                      prochaine connexion.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowPasswordModal(false);
                        setTempPassword(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      J'ai noté le mot de passe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UsersPage;
