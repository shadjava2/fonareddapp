import TraitementAlarmManager from '@/components/global/TraitementAlarmManager';
import { AlarmProvider } from '@/contexts/AlarmContext';
import { Bars3Icon, HomeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import CongeSidebar from './CongeSidebar';

interface CongeAppShellProps {
  children: React.ReactNode;
}

const CongeAppShell: React.FC<CongeAppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // Récupérer le nom complet de l'utilisateur
  const getUserDisplayName = () => {
    if (user?.nom && user?.prenom) {
      return `${user.prenom} ${user.nom}`;
    } else if (user?.nom) {
      return user.nom;
    } else if (user?.prenom) {
      return user.prenom;
    } else if (user?.username) {
      return user.username;
    }
    return 'Utilisateur';
  };

  // Récupérer l'initiale pour l'avatar
  const getUserInitial = () => {
    if (user?.nom) {
      return user.nom.charAt(0).toUpperCase();
    } else if (user?.prenom) {
      return user.prenom.charAt(0).toUpperCase();
    } else if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <AlarmProvider>
      {/* Gestionnaire d'alarme global */}
      <TraitementAlarmManager />

      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Mobile sidebar overlay */}
        <div
          className={cn(
            'fixed inset-0 flex z-40 md:hidden',
            sidebarOpen ? 'block' : 'hidden'
          )}
        >
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="relative flex-1 flex flex-col max-w-xs w-full">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <CongeSidebar />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <CongeSidebar />
        </div>

        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Module Congé
                </h1>
              </div>

              <div className="ml-4 flex items-center md:ml-6">
                {/* User info */}
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">
                      {getUserDisplayName()}
                      {user?.id && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          (ID: {user.id})
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500">Module Congé</div>
                  </div>

                  <Link
                    href="/home"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <HomeIcon className="h-4 w-4 mr-2" />
                    Retour Accueil
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
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
