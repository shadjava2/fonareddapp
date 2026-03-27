import UserForm from '@/components/forms/UserForm';
import AdminLayout from '@/components/layout/AdminLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SearchBar from '@/components/ui/SearchBar';
import { useToast } from '@/hooks/useToast';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/fetcher';
import { PROVISIONAL_RESET_PASSWORD_PLAIN } from '@/lib/provisional-password';
import {
  ArrowPathIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_RESET_PASSWORD = PROVISIONAL_RESET_PASSWORD_PLAIN;

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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [lastResetUsername, setLastResetUsername] = useState<string | null>(
    null
  );
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

  const handleUserSearch = useCallback((query: string) => {
    setUserSearchQuery(query);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const parts = [
        u.id,
        u.nom,
        u.postnom,
        u.prenom,
        u.username,
        u.mail,
        u.phone,
        u.role?.nom,
        u.fonction?.nom,
      ]
        .filter((x) => x != null && String(x).length > 0)
        .map((x) => String(x).toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }, [users, userSearchQuery]);

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
    const usernameForModal = userToReset.username;

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
        setLastResetUsername(usernameForModal);
        setTempPassword(response.tempPassword);
        setShowPasswordModal(true);
        showSuccess('Mot de passe réinitialisé (provisoire communiqué à l’utilisateur)');
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
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center">
              <UserGroupIcon className="mr-3 h-8 w-8 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Utilisateurs
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion des utilisateurs de l'application
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
            >
              <PlusIcon className="h-5 w-5" />
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
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Recherche rapide
              </p>
              <SearchBar
                onSearch={handleUserSearch}
                placeholder="Nom, prénom, username, e-mail, téléphone, rôle, fonction, n° ID…"
                loading={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                {filteredUsers.length} affiché(s) sur {users.length} utilisateur(s)
              </p>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <UserGroupIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Aucun utilisateur ne correspond à « {userSearchQuery.trim() || '…'} »
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Modifiez ou effacez votre recherche pour voir toute la liste.
                </p>
              </div>
            ) : (
          <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[680px] divide-y divide-gray-200 text-sm lg:min-w-0">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-14 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      ID
                    </th>
                    <th className="min-w-[10rem] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Nom Complet
                    </th>
                    <th className="min-w-[7rem] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Username
                    </th>
                    <th className="min-w-[8rem] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Email
                    </th>
                    <th className="min-w-[6rem] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Rôle
                    </th>
                    <th className="min-w-[6rem] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Fonction
                    </th>
                    <th className="min-w-[7rem] px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Date de création
                    </th>
                    <th className="w-28 px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-3 sm:px-4 sm:py-4">
                        <div className="font-medium text-gray-900">
                          #{user.id}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <div className="break-words font-medium text-gray-900">
                          {user.nom} {user.postnom ? user.postnom + ' ' : ''}
                          {user.prenom || ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <div className="break-all font-medium text-gray-900">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <div className="break-all text-gray-900">
                          {user.mail || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <div className="break-words text-gray-900">
                          {user.role?.nom || (
                            <span className="font-medium text-orange-600">
                              Non assigné
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <div className="break-words text-gray-900">
                          {user.fonction?.nom || (
                            <span className="font-medium text-orange-600">
                              Non assigné
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 sm:px-4 sm:py-4">
                        <div className="text-gray-900">
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
                      <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium sm:px-4 sm:py-4">
                        <div className="flex justify-end gap-1 sm:gap-2">
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
                            title={`Mot de passe oublié : définir à ${DEFAULT_RESET_PASSWORD}`}
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
          </>
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
          title="Réinitialiser le mot de passe (oubli)"
          message={`Réinitialiser le compte de « ${userToReset?.nom} ${userToReset?.prenom || ''} » (@${userToReset?.username}) ? Le mot de passe sera défini sur « ${DEFAULT_RESET_PASSWORD} ». À la prochaine connexion, l’utilisateur devra choisir un nouveau mot de passe.`}
          type="warning"
          confirmText={`Oui, définir ${DEFAULT_RESET_PASSWORD}`}
          cancelText="Annuler"
          loading={isResetting}
        />

        {/* Modal d'affichage du mot de passe temporaire */}
        {showPasswordModal && tempPassword && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Mot de passe réinitialisé
                </h3>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Compte :{' '}
                      <strong>{lastResetUsername || '—'}</strong>
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Mot de passe provisoire (oubli) :
                    </p>
                    <div className="bg-white border border-gray-300 rounded-md p-3 font-mono text-lg text-center font-bold text-blue-600 select-all">
                      {tempPassword}
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Communiquez ce mot de passe à l’utilisateur. À la connexion, il devra en choisir un nouveau (écran de changement obligatoire).
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowPasswordModal(false);
                        setTempPassword(null);
                        setLastResetUsername(null);
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
