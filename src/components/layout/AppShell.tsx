import Button from '@/components/ui/Button';
import NotificationBell from '@/components/ui/NotificationBell';
import { useAuth, usePermissions } from '@/hooks/useAuth';
import {
  ADMIN_ZONE_PERMISSIONS,
  API_ADMIN,
  PERMISSIONS,
} from '@/lib/rbac';
import { cn } from '@/lib/utils';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClockIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

type ShellNavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  /** Si défini : au moins une permission requise */
  anyOf?: string[];
};

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const serviceIds = user?.services ?? [];
  const router = useRouter();

  // Détermine la section courante et construit un menu dynamique et centralisé
  const section: 'home' | 'admin' | 'personnel' = router.pathname.startsWith(
    '/admin'
  )
    ? 'admin'
    : router.pathname.startsWith('/personnel')
      ? 'personnel'
      : 'home';

  const isPersonnelAdminRoute = router.pathname.startsWith(
    '/admin/personnel'
  );
  const canShowAdminNav = isPersonnelAdminRoute
    ? hasAnyPermission([...API_ADMIN.personnel])
    : hasAnyPermission(ADMIN_ZONE_PERMISSIONS);
  const canPersonnel = hasAnyPermission([
    PERMISSIONS.MODULE_PERSONNEL,
    PERMISSIONS.MODULE_ADMIN,
  ]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  let navigation: ShellNavItem[];

  if (section === 'admin' && canShowAdminNav) {
    const adminCandidates: ShellNavItem[] = [
      {
        name: 'Retour Accueil',
        href: '/home',
        icon: UserIcon,
        current: router.pathname === '/home',
      },
      {
        name: 'Sites',
        href: '/admin/sites',
        icon: BuildingOfficeIcon,
        current: router.pathname.startsWith('/admin/sites'),
        anyOf: [
          PERMISSIONS.SITE_MANAGE,
          PERMISSIONS.ITEM_SITES,
          PERMISSIONS.MODULE_ADMIN,
        ],
      },
      {
        name: 'Services',
        href: '/admin/services',
        icon: Cog6ToothIcon,
        current: router.pathname.startsWith('/admin/services'),
        anyOf: [PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.MODULE_ADMIN],
      },
      {
        name: 'Rôles',
        href: '/admin/roles',
        icon: ShieldCheckIcon,
        current: router.pathname.startsWith('/admin/roles'),
        anyOf: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
      },
      {
        name: 'Droits Rôles',
        href: '/admin/roles-permissions',
        icon: ShieldCheckIcon,
        current: router.pathname.startsWith('/admin/roles-permissions'),
        anyOf: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
      },
      {
        name: 'Utilisateurs',
        href: '/admin/utilisateurs',
        icon: UserIcon,
        current: router.pathname.startsWith('/admin/utilisateurs'),
        anyOf: [PERMISSIONS.USER_MANAGE, PERMISSIONS.MODULE_ADMIN],
      },
      {
        name: 'Droits Services',
        href: '/admin/droits-services',
        icon: UserGroupIcon,
        current: router.pathname.startsWith('/admin/droits-services'),
        anyOf: [PERMISSIONS.USER_MANAGE, PERMISSIONS.MODULE_ADMIN],
      },
    ];
    navigation = adminCandidates.filter(
      (i) => !i.anyOf?.length || hasAnyPermission(i.anyOf)
    );
  } else if (section === 'personnel' && canPersonnel) {
    navigation = [
      {
        name: 'Retour Accueil',
        href: '/home',
        icon: UserIcon,
        current: router.pathname === '/home',
      },
      {
        name: 'Calendrier Fonaredd',
        href: '/personnel/calendrier',
        icon: CalendarDaysIcon,
        current: router.pathname.startsWith('/personnel/calendrier'),
      },
      {
        name: 'Congé Config',
        href: '/personnel/conge-config',
        icon: Cog6ToothIcon,
        current: router.pathname.startsWith('/personnel/conge-config'),
      },
      {
        name: 'Demande Congé',
        href: '/personnel/demande-conge',
        icon: UserGroupIcon,
        current: router.pathname.startsWith('/personnel/demande-conge'),
      },
      {
        name: 'Congé Phase',
        href: '/personnel/conge-phase',
        icon: Cog6ToothIcon,
        current: router.pathname.startsWith('/personnel/conge-phase'),
      },
      {
        name: 'Congé Solde',
        href: '/personnel/conge-solde',
        icon: Cog6ToothIcon,
        current: router.pathname.startsWith('/personnel/conge-solde'),
      },
      {
        name: 'Congé Traitement',
        href: '/personnel/conge-traitement',
        icon: Cog6ToothIcon,
        current: router.pathname.startsWith('/personnel/conge-traitement'),
      },
      {
        name: 'Type Congé',
        href: '/personnel/type-conge',
        icon: Cog6ToothIcon,
        current: router.pathname.startsWith('/personnel/type-conge'),
      },
    ];
  } else {
    // Accueil: seulement tableau de bord, et éventuellement accès aux modules si autorisé
    navigation = [
      {
        name: 'Tableau de bord',
        href: '/home',
        icon: UserIcon,
        current: router.pathname === '/home',
      },
      ...(hasAnyPermission(ADMIN_ZONE_PERMISSIONS)
        ? [
            {
              name: 'Administration',
              href: '/admin',
              icon: Cog6ToothIcon,
              current: router.pathname.startsWith('/admin'),
            },
          ]
        : []),
      ...(canPersonnel
        ? [
            {
              name: 'Gestion Personnel',
              href: '/personnel',
              icon: ClockIcon,
              current: router.pathname.startsWith('/personnel'),
            },
          ]
        : []),
    ];
  }

  const userDisplayName = user
    ? `${user.nom || ''} ${user.prenom || ''}`.trim() || user.username
    : 'Utilisateur';

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
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

        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <SidebarContent
            navigation={navigation}
            user={user}
            serviceIds={serviceIds}
            userDisplayName={userDisplayName}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent
            navigation={navigation}
            user={user}
            serviceIds={serviceIds}
            userDisplayName={userDisplayName}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Fonaredd App
              </h1>
            </div>

            <div className="ml-4 flex items-center md:ml-6">
              {/* User menu */}
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <NotificationBell />

                <div className="text-sm text-gray-700">
                  <div className="font-medium">{userDisplayName}</div>
                  <div className="text-gray-500">
                    {serviceIds.length} service
                    {serviceIds.length > 1 ? 's' : ''} autorisé
                    {serviceIds.length > 1 ? 's' : ''}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span>Déconnexion</span>
                </Button>
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
  );
};

interface SidebarContentProps {
  navigation: ShellNavItem[];
  user: any;
  serviceIds: number[];
  userDisplayName: string;
  onLogout: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  navigation,
  user,
  serviceIds,
  userDisplayName,
  onLogout,
}) => {
  return (
    <div className="flex flex-col h-full bg-primary-600">
      <div className="flex items-center h-16 flex-shrink-0 px-4">
        <div className="flex items-center">
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
          <div className="ml-3">
            <p className="text-white text-sm font-medium">Fonaredd App</p>
            <p className="text-primary-200 text-xs">Gestion interne</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  item.current
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                )}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="flex-shrink-0 flex border-t border-primary-700 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                {userDisplayName}
              </p>
              <p className="text-xs text-primary-200">
                {serviceIds.length} service
                {serviceIds.length > 1 ? 's' : ''} autorisé
                {serviceIds.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
