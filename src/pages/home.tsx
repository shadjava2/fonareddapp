import ForcePasswordModal from '@/components/auth/ForcePasswordModal';
import AppShell from '@/components/layout/AppShell';
import ModuleGrid from '@/components/layout/ModuleGrid';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import React from 'react';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  const handlePasswordSuccess = () => {
    router.reload(); // Recharger pour mettre à jour les données utilisateur
  };

  const handlePasswordError = (message: string) => {
    console.error('Erreur lors de la configuration du mot de passe:', message);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* En-tête de bienvenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bienvenue,{' '}
                {user?.nom || user?.prenom || user?.username || 'Utilisateur'} !
              </h1>
              <p className="text-gray-600 mt-1">
                Tableau de bord de l'application Fonaredd
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Dernière connexion</div>
              <div className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        </div>

        {/* Grille des modules */}
        <ModuleGrid user={user} />

        {/* Informations rapides */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">U</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Utilisateur
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.username || 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">R</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Rôle
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ID {user?.fkRole || 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Permissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {(user?.permissions || []).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">S</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Services
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {(user?.services || []).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal pour forcer le changement de mot de passe */}
      {user && user.initPassword === 0 && (
        <ForcePasswordModal
          isOpen={true}
          username={user.username}
          onSuccess={handlePasswordSuccess}
          onError={handlePasswordError}
        />
      )}
    </AppShell>
  );
};

export default HomePage;
