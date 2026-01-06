import {
  ClockIcon,
  Cog6ToothIcon,
  HomeIcon,
  UserGroupIcon,
  WifiIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

const PersonnelSidebar: React.FC = () => {
  const router = useRouter();

  const navigation = [
    {
      name: 'Tableau de bord',
      href: '/personnel',
      icon: HomeIcon,
      current: router.pathname === '/personnel',
    },
    {
      name: 'Événements',
      href: '/personnel/events',
      icon: ClockIcon,
      current: router.pathname === '/personnel/events',
    },
    {
      name: 'Utilisateurs ACS',
      href: '/personnel/users',
      icon: UserGroupIcon,
      current: router.pathname === '/personnel/users',
    },
    {
      name: 'Monitoring',
      href: '/personnel/monitoring',
      icon: WifiIcon,
      current: router.pathname === '/personnel/monitoring',
    },
    {
      name: 'Configuration',
      href: '/personnel/config',
      icon: Cog6ToothIcon,
      current: router.pathname === '/personnel/config',
    },
    {
      name: 'Diagnostic',
      href: '/personnel/debug',
      icon: WrenchScrewdriverIcon,
      current: router.pathname === '/personnel/debug',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo/Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            <Image
              src="/logo.png"
              alt="Fond National REDD"
              width={100}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Personnel</h2>
            <p className="text-xs text-gray-500">Module de gestion</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                item.current
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  item.current
                    ? 'text-blue-700'
                    : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Actions rapides */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="space-y-2">
          <Link
            href="/admin"
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <HomeIcon className="mr-3 h-5 w-5 text-gray-400" />
            Retour à l'admin
          </Link>

          <button
            onClick={() => {
              if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                // Logique de déconnexion
                window.location.href = '/';
              }
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <span className="mr-3">🚪</span>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonnelSidebar;
