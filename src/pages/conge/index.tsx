import CongeAppShell from '@/components/layout/CongeAppShell';
import {
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  CogIcon,
  DocumentTextIcon,
  HomeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import React from 'react';

const CongePage: React.FC = () => {
  const menuItems = [
    {
      title: 'Calendrier Fonaredd',
      description: 'Gestion du calendrier des jours ouvrables et fériés',
      icon: CalendarDaysIcon,
      href: '/conge/calendrier',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      title: 'Config Congé',
      description: 'Configuration des paramètres généraux des congés',
      icon: CogIcon,
      href: '/conge/config-conge',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      title: 'Demande Congé',
      description: 'Gestion des demandes de congé des employés',
      icon: DocumentTextIcon,
      href: '/conge/demandes-conge',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      title: 'Traitement Demandes',
      description: 'Validation et approbation des demandes de congé',
      icon: ClipboardDocumentCheckIcon,
      href: '/conge/traitement-demandes',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
    {
      title: 'Types Congés',
      description: 'Gestion des différents types de congés disponibles',
      icon: UserGroupIcon,
      href: '/conge/types-conges',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
    },
    {
      title: 'Retour Congé',
      description: 'Gestion des retours de congé pour les demandes approuvées',
      icon: ArrowUturnLeftIcon,
      href: '/conge/retour-conge',
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
    },
  ];

  return (
    <CongeAppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarDaysIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Module Congé
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestion complète des congés et du calendrier
                  </p>
                </div>
              </div>
              <Link
                href="/home"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Retour Accueil
              </Link>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg">
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Bienvenue dans le Module Congé
              </h2>
              <p className="text-indigo-100 text-base sm:text-lg">
                Gérez efficacement les congés, le calendrier et les demandes de
                votre équipe
              </p>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href}>
              <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div
                      className={`p-2 sm:p-3 rounded-lg ${item.color} ${item.hoverColor} transition-colors duration-200`}
                    >
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="px-4 sm:px-6 py-3 bg-gray-50 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Accéder</span>
                    <svg
                      className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Statistiques Rapides
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">5</div>
                <div className="text-sm text-gray-500">Modules Actifs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">2</div>
                <div className="text-sm text-gray-500">Types de Congés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">1.75</div>
                <div className="text-sm text-gray-500">
                  Jours/Mois Configurés
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-gray-500">Demandes en Attente</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CongeAppShell>
  );
};

export default CongePage;
