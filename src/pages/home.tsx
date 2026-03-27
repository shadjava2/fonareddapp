import ForcePasswordModal from '@/components/auth/ForcePasswordModal';
import AppShell from '@/components/layout/AppShell';
import ModuleGrid from '@/components/layout/ModuleGrid';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTimeFR } from '@/lib/formatDate';
import { apiGet } from '@/lib/fetcher';
import type { LoginHistoryEntry } from '@/lib/login-history-types';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[] | null>(
    null
  );
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadLoginHistory = useCallback(async () => {
    try {
      const res = await apiGet<{
        success: boolean;
        entries?: LoginHistoryEntry[];
        message?: string;
      }>('/api/auth/login-history');
      if (res.success && res.entries) {
        setLoginHistory(res.entries);
        setHistoryError(null);
      } else {
        setLoginHistory([]);
        setHistoryError(res.message || 'Historique indisponible');
      }
    } catch {
      setLoginHistory([]);
      setHistoryError('Impossible de charger l’historique de connexion.');
    }
  }, []);

  useEffect(() => {
    if (user) void loadLoginHistory();
  }, [user, loadLoginHistory]);

  const lastLoginLabel = useMemo(() => {
    if (loginHistory === null) return '…';
    if (loginHistory.length === 0) return '—';
    return formatDateTimeFR(loginHistory[0].datecreate);
  }, [loginHistory]);

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
                {lastLoginLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Historique de connexion (sécurité compte) — en tête du contenu */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Historique de connexion
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Vérifiez que seules vos connexions apparaissent ici. À chaque
                connexion, un e-mail de détection peut être envoyé sur votre
                adresse enregistrée si le serveur mail est configuré.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadLoginHistory()}
              className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              Actualiser
            </button>
          </div>
          {historyError && (
            <div className="px-6 py-3 bg-amber-50 text-amber-900 text-sm border-b border-amber-100">
              {historyError}{' '}
              <span className="text-amber-800">
                (exécutez la migration Prisma <code className="text-xs">connexion_historique</code>{' '}
                si la table est absente.)
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date et heure
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Adresse IP
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Navigateur / appareil
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loginHistory === null ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-500 text-sm"
                    >
                      Chargement…
                    </td>
                  </tr>
                ) : loginHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-500 text-sm"
                    >
                      Aucune connexion enregistrée pour le moment. Après votre
                      prochaine connexion, les entrées apparaîtront ici.
                    </td>
                  </tr>
                ) : (
                  loginHistory.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTimeFR(row.datecreate)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 font-mono">
                        {row.ipAddress || '—'}
                      </td>
                      <td
                        className="px-6 py-3 text-sm text-gray-600 max-w-md truncate"
                        title={row.userAgent || ''}
                      >
                        {row.userAgent || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-green-50 border-t border-green-100">
            <p className="text-sm text-green-900">
              <strong className="font-semibold">Sécurité :</strong> si vous ne
              reconnaissez pas une connexion, changez immédiatement votre mot de
              passe et signalez-le à votre administrateur.
            </p>
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
