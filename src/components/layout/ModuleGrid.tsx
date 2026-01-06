import { UserProfile } from '@/lib/auth';
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClockIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import React from 'react';

interface ModuleTileProps {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  count?: number;
  countLabel?: string;
}

const ModuleTile: React.FC<ModuleTileProps> = ({
  name,
  description,
  icon: Icon,
  href,
  color,
  count,
  countLabel,
}) => {
  return (
    <Link href={href} className="group">
      <div className="module-tile hover:scale-105 transition-transform duration-200">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
              {name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>

        {count !== undefined && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="ml-2 text-sm text-gray-500">{countLabel}</div>
            </div>
            <div className="text-primary-600 group-hover:text-primary-700 transition-colors">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
        )}
      </div>
    </Link>
  );
};

interface ModuleGridProps {
  user: UserProfile | null;
}

const ModuleGrid: React.FC<ModuleGridProps> = ({ user }) => {
  // Mode développement : tous les modules accessibles
  const accessibleNames = new Set([
    'Administration',
    'Gestion Congé',
    'Gestion Personnel',
    'Sites',
    'Rapports',
  ]);

  // Modules par défaut avec leurs métadonnées (cartes plus "pro" et actionnables)
  const allModules = [
    {
      name: 'Administration',
      description: 'Utilisateurs, rôles, permissions, structures',
      icon: Cog6ToothIcon,
      href: '/admin',
      color: 'bg-primary-500',
      count: user?.permissions?.length ?? 0,
      countLabel: 'droits via rôle',
    },
    {
      name: 'Gestion Congé',
      description: 'Demandes, validations, calendrier',
      icon: CalendarDaysIcon,
      href: '/conge',
      color: 'bg-blue-500',
      count: 0, // À implémenter avec les vraies données
      countLabel: 'demandes en attente',
    },
    {
      name: 'Gestion Personnel',
      description: 'Effectifs, présences, affectations',
      icon: ClockIcon,
      href: '/personnel',
      color: 'bg-green-500',
      count: 0, // À implémenter avec les vraies données
      countLabel: "présences aujourd'hui",
    },
  ];

  // Filtrer strictement les modules accessibles sans afficher d'erreur
  const modules = allModules.filter((module) =>
    accessibleNames.has(module.name)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Modules disponibles
        </h2>
        <p className="text-sm text-gray-500">
          Accédez aux différents modules de gestion selon vos permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <ModuleTile
            key={module.name}
            name={module.name}
            description={module.description}
            icon={module.icon}
            href={module.href}
            color={module.color}
            count={module.count}
            countLabel={module.countLabel}
          />
        ))}
      </div>

      {/* Statistiques globales (corrigées: droits issus du rôle) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-primary-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Services autorisés
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {user?.services?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Droits (rôle)</p>
              <p className="text-2xl font-semibold text-gray-900">
                {user?.permissions?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Rôle</p>
              <p className="text-2xl font-semibold text-gray-900">Actif</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleGrid;
