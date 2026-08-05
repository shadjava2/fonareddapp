import { useAlarm } from '@/contexts/AlarmContext';
import { useTraitementCount } from '@/hooks/useTraitementCount';
import { usePermissions } from '@/hooks/useAuth';
import { PERMISSIONS } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import {
  ArrowUturnLeftIcon,
  BellIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  CogIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  count?: number;
  anyOf: string[];
}

const A = PERMISSIONS;

const CongeSidebar: React.FC = React.memo(() => {
  const router = useRouter();
  const notificationCount = useTraitementCount();
  const { isAlarmPlaying } = useAlarm();
  const { hasAnyPermission } = usePermissions();
  const isPageOpen = router.pathname === '/conge/traitement-demandes';

  const navDefs: NavigationItem[] = [
    {
      name: 'Tableau de bord',
      href: '/conge/',
      icon: HomeIcon,
      current: router.pathname === '/conge',
      anyOf: [
        A.CONGE_DASHBOARD,
        A.CONGE_REQUEST,
        A.CONGE_TRAITEMENT,
        A.CONGE_CONFIG,
        A.CONGE_NON_JUSTIFIE,
        A.CONGE_TYPES,
        A.CONGE_NOTIFICATIONS,
        A.CONGE_RETURN,
        A.CALENDAR_MANAGE,
        A.MODULE_CONGE,
        A.MODULE_ADMIN,
      ],
    },
    {
      name: 'Calendrier Fonaredd',
      href: '/conge/calendrier',
      icon: CalendarDaysIcon,
      current: router.pathname.startsWith('/conge/calendrier'),
      anyOf: [A.CALENDAR_MANAGE, A.MODULE_ADMIN],
    },
    {
      name: 'Config Congé',
      href: '/conge/config-conge',
      icon: CogIcon,
      current: router.pathname.startsWith('/conge/config-conge'),
      anyOf: [A.CONGE_CONFIG, A.MODULE_ADMIN],
    },
    {
      name: 'Répertoire personnel',
      href: '/conge/repertoire-personnel',
      icon: UsersIcon,
      current: router.pathname.startsWith('/conge/repertoire-personnel'),
      anyOf: [A.CONGE_CONFIG, A.CONGE_TRAITEMENT, A.MODULE_CONGE, A.MODULE_ADMIN],
    },
    {
      name: 'Congés non justifiés',
      href: '/conge/non-justifie',
      icon: ExclamationTriangleIcon,
      current: router.pathname.startsWith('/conge/non-justifie'),
      anyOf: [A.CONGE_NON_JUSTIFIE, A.MODULE_ADMIN],
    },
    {
      name: 'Demande Congé',
      href: '/conge/demandes-conge',
      icon: DocumentTextIcon,
      current: router.pathname.startsWith('/conge/demandes-conge'),
      anyOf: [A.CONGE_REQUEST, A.MODULE_ADMIN],
    },
    {
      name: 'Saisie manuelle congé',
      href: '/conge/saisie-manuelle',
      icon: DocumentPlusIcon,
      current: router.pathname.startsWith('/conge/saisie-manuelle'),
      anyOf: [A.CONGE_REQUEST, A.CONGE_TRAITEMENT, A.MODULE_ADMIN],
    },
    {
      name: 'Traitement Demandes',
      href: '/conge/traitement-demandes',
      icon: ClipboardDocumentCheckIcon,
      current: router.pathname.startsWith('/conge/traitement-demandes'),
      count: notificationCount,
      anyOf: [A.CONGE_TRAITEMENT, A.MODULE_ADMIN],
    },
    {
      name: 'Types Congés',
      href: '/conge/types-conges',
      icon: UserGroupIcon,
      current: router.pathname.startsWith('/conge/types-conges'),
      anyOf: [A.CONGE_TYPES, A.MODULE_ADMIN],
    },
    {
      name: 'Retour Congé',
      href: '/conge/retour-conge',
      icon: ArrowUturnLeftIcon,
      current: router.pathname.startsWith('/conge/retour-conge'),
      anyOf: [A.CONGE_RETURN, A.MODULE_ADMIN],
    },
    {
      name: 'Historique Notifications',
      href: '/conge/historique-notifications',
      icon: BellIcon,
      current: router.pathname.startsWith('/conge/historique-notifications'),
      anyOf: [A.CONGE_NOTIFICATIONS, A.MODULE_ADMIN],
    },
  ];

  const navigation = navDefs.filter((item) => hasAnyPermission(item.anyOf));

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center h-20 px-4 bg-gray-900">
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Fond National REDD"
              width={120}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <div className="ml-3 flex-1">
            <h1 className="text-lg font-semibold text-white">Module Congé</h1>
            <p className="text-xs text-gray-300">Gestion des congés</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                item.current
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                item.count !== undefined &&
                  item.count > 0 &&
                  !item.current &&
                  !isPageOpen &&
                  isAlarmPlaying &&
                  'animate-pulse'
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  item.current
                    ? 'text-indigo-500'
                    : 'text-gray-400 group-hover:text-white',
                  item.count !== undefined &&
                    item.count > 0 &&
                    !item.current &&
                    !isPageOpen &&
                    isAlarmPlaying &&
                    'animate-bounce'
                )}
                aria-hidden="true"
              />
              <span className="truncate flex items-center justify-between w-full">
                <span>{item.name}</span>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      'ml-auto text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center transition-colors',
                      item.count > 0
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-400 text-white',
                      item.count > 0 &&
                        !item.current &&
                        !isPageOpen &&
                        isAlarmPlaying &&
                        'animate-pulse'
                    )}
                  >
                    {item.count > 9 ? '9+' : item.count}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <Link
          href="/home"
          className="flex items-center px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
        >
          <HomeIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="truncate">Retour Accueil</span>
        </Link>
      </div>
    </div>
  );
});

CongeSidebar.displayName = 'CongeSidebar';

export default CongeSidebar;
