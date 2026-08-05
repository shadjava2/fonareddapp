import TraitementAlarmManager from '@/components/global/TraitementAlarmManager';
import { AlarmProvider } from '@/contexts/AlarmContext';
import { UserProfile } from '@/lib/auth';
import { canAccessCongeModule, hasAnyPermission, PERMISSIONS } from '@/lib/rbac';
import { Bars3Icon, HomeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import CongeSidebar from './CongeSidebar';

interface CongeAppShellProps {
  children: React.ReactNode;
}

const CongeAppShell: React.FC<CongeAppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const profile = user as unknown as UserProfile | null;
  const canConge = canAccessCongeModule(profile);
  const routePermissions: Array<{ prefix: string; anyOf: string[] }> = [
    {
      prefix: '/conge/calendrier',
      anyOf: [
        PERMISSIONS.CALENDAR_MANAGE,
        PERMISSIONS.MODULE_ADMIN,
      ],
    },
    {
      prefix: '/conge/config-conge',
      anyOf: [PERMISSIONS.CONGE_CONFIG, PERMISSIONS.MODULE_ADMIN],
    },
    {
      prefix: '/conge/repertoire-personnel',
      anyOf: [
        PERMISSIONS.CONGE_CONFIG,
        PERMISSIONS.CONGE_TRAITEMENT,
        PERMISSIONS.MODULE_CONGE,
        PERMISSIONS.MODULE_ADMIN,
      ],
    },
    {
      prefix: '/conge/saisie-manuelle',
      anyOf: [
        PERMISSIONS.CONGE_REQUEST,
        PERMISSIONS.CONGE_TRAITEMENT,
        PERMISSIONS.MODULE_ADMIN,
      ],
    },
    {
      prefix: '/conge/non-justifie',
      anyOf: [PERMISSIONS.CONGE_NON_JUSTIFIE, PERMISSIONS.MODULE_ADMIN],
    },
    {
      prefix: '/conge/demandes-conge',
      anyOf: [
        PERMISSIONS.CONGE_REQUEST,
        PERMISSIONS.MODULE_ADMIN,
      ],
    },
    {
      prefix: '/conge/traitement-demandes',
      anyOf: [PERMISSIONS.CONGE_TRAITEMENT, PERMISSIONS.MODULE_ADMIN],
    },
    {
      prefix: '/conge/types-conges',
      anyOf: [PERMISSIONS.CONGE_TYPES, PERMISSIONS.MODULE_ADMIN],
    },
    {
      prefix: '/conge/retour-conge',
      anyOf: [PERMISSIONS.CONGE_RETURN, PERMISSIONS.MODULE_ADMIN],
    },
    {
      prefix: '/conge/historique-notifications',
      anyOf: [PERMISSIONS.CONGE_NOTIFICATIONS, PERMISSIONS.MODULE_ADMIN],
    },
  ];
  const matchedRoute = routePermissions.find((r) =>
    router.pathname.startsWith(r.prefix)
  );
  const canCurrentRoute = matchedRoute
    ? hasAnyPermission(profile, matchedRoute.anyOf)
    : canConge;

  // Récupérer le nom complet de l'utilisateur (Prénom NOM POST-NOM)
  const getUserDisplayName = () => {
    if (!user) return 'Utilisateur';
    return formatPersonDisplayName(user) || user.username || 'Utilisateur';
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  const hasDeniedAccess = !user || !canConge || !canCurrentRoute;
  if (hasDeniedAccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-gray-100 px-4 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Module Congé</h1>
        <p className="max-w-md text-sm text-gray-600">
          {user
            ? 'Votre rôle ne dispose pas des droits nécessaires pour cette section du module congé.'
            : 'Vous devez être connecté pour accéder au module congé.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/home"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Tableau de bord
          </Link>
          {user ? null : (
            <Link
              href="/"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <AlarmProvider>
      {/* Gestionnaire d'alarme global */}
      <TraitementAlarmManager />

      <div className="h-[100dvh] min-h-0 flex overflow-hidden bg-gray-100">
        {/* Mobile sidebar overlay */}
        <div
          className={cn(
            'fixed inset-0 flex z-40 md:hidden print:hidden',
            sidebarOpen ? 'block' : 'hidden'
          )}
        >
          <button
            type="button"
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          />

          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-[env(safe-area-inset-top,0px)]">
            <div className="absolute top-[max(0.5rem,env(safe-area-inset-top,0px))] right-0 -mr-12 z-10">
              <button
                type="button"
                className="ml-1 flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <CongeSidebar />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0 print:hidden">
          <CongeSidebar />
        </div>

        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="relative z-10 flex-shrink-0 flex min-h-[3.5rem] sm:h-16 items-stretch bg-white shadow print:hidden pt-[env(safe-area-inset-top,0px)]">
            <button
              type="button"
              className="flex items-center justify-center min-h-[48px] min-w-[48px] px-3 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-2 pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:px-4">
              <div className="min-w-0 flex-1 flex items-center">
                <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                  Module Congé
                </h1>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <div className="hidden sm:block text-right min-w-0 max-w-[200px] md:max-w-xs">
                  <div className="text-sm text-gray-700 truncate font-medium">
                    {getUserDisplayName()}
                    {user?.id && (
                      <span className="ml-1.5 text-xs font-normal text-gray-500 whitespace-nowrap">
                        (ID: {user.id})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Module Congé
                  </div>
                </div>

                <Link
                  href="/home"
                  className="inline-flex sm:hidden items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
                  aria-label="Retour à l’accueil"
                >
                  <HomeIcon className="h-6 w-6" />
                </Link>
                <Link
                  href="/home"
                  className="hidden sm:inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
                >
                  <HomeIcon className="h-4 w-4 mr-2 shrink-0" />
                  Retour Accueil
                </Link>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain focus:outline-none [-webkit-overflow-scrolling:touch]">
            <div className="py-4 sm:py-6">
              <div
                className={cn(
                  'max-w-7xl mx-auto w-full',
                  'pl-[max(1.125rem,env(safe-area-inset-left,0px))]',
                  'pr-[max(1.125rem,env(safe-area-inset-right,0px))]',
                  'pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]',
                  'sm:pl-6 sm:pr-6 md:pl-8 md:pr-8'
                )}
              >
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AlarmProvider>
  );
};

export default CongeAppShell;
