import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import { usePermissions } from '@/hooks/useAuth';
import React, { useState } from 'react';
import { PERMISSIONS } from '@/lib/rbac';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  HomeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  anyOf?: string[];
};

const AdminSidebar: React.FC = () => {
  const router = useRouter();
  const { hasAnyPermission } = usePermissions();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      name: 'Tableau de bord',
      href: '/admin',
      icon: HomeIcon,
      description: "Vue d'ensemble de l'administration",
    },
    {
      name: 'Vue des données',
      href: '/admin/data-overview',
      icon: ChartBarIcon,
      description: 'Données en temps réel',
      anyOf: [
        PERMISSIONS.MODULE_ADMIN,
        PERMISSIONS.SERVICE_MANAGE,
        PERMISSIONS.USER_MANAGE,
      ],
    },
    {
      name: 'Utilisateurs',
      href: '/admin/users',
      icon: UserGroupIcon,
      description: 'Gestion des utilisateurs du système',
      anyOf: [PERMISSIONS.USER_MANAGE, PERMISSIONS.MODULE_ADMIN],
    },
    {
      name: 'Rôles',
      href: '/admin/roles',
      icon: ShieldCheckIcon,
      description: 'Gestion des rôles et permissions',
      anyOf: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
    },
    {
      name: 'Fonctions',
      href: '/admin/fonctions',
      icon: BriefcaseIcon,
      description: "Gestion des fonctions de l'application",
      anyOf: [PERMISSIONS.MODULE_ADMIN, PERMISSIONS.USER_MANAGE],
    },
    {
      name: 'Services',
      href: '/admin/services',
      icon: Cog6ToothIcon,
      description: 'Gestion des services disponibles',
      anyOf: [PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.MODULE_ADMIN],
    },
    {
      name: 'Sites',
      href: '/admin/sites',
      icon: BuildingOfficeIcon,
      description: 'Gestion des sites et lieux de travail',
      anyOf: [
        PERMISSIONS.SITE_MANAGE,
        PERMISSIONS.ITEM_SITES,
        PERMISSIONS.MODULE_ADMIN,
      ],
    },
    {
      name: 'Droits services',
      href: '/admin/droits-services',
      icon: KeyIcon,
      description: "Gestion des droits d'accès aux services",
      anyOf: [PERMISSIONS.USER_MANAGE, PERMISSIONS.MODULE_ADMIN],
    },
    {
      name: 'Rôles permissions',
      href: '/admin/roles-permissions',
      icon: UserIcon,
      description: 'Gestion des permissions par rôle',
      anyOf: [PERMISSIONS.ROLE_MANAGE, PERMISSIONS.MODULE_ADMIN],
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.anyOf?.length || hasAnyPermission(item.anyOf)
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-600 to-green-700 text-white">
      <LogoutConfirmDialog
        isOpen={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
      />
      {/* Header */}
      <div className="p-6 border-b border-green-500">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
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
            <h1 className="text-lg font-bold">Fonaredd App</h1>
            <p className="text-sm text-green-100">Administration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/home"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-green-500 transition-colors duration-200 group"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Retour à l'accueil</span>
        </Link>

        <div className="border-t border-green-500 my-4"></div>

        {visibleItems.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 group ${
                isActive
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'hover:bg-green-500 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium block truncate">{item.name}</span>
                <span className="text-xs text-green-100 group-hover:text-white truncate">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-green-500">
        <button
          type="button"
          onClick={() => setLogoutDialogOpen(true)}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-200 group mb-3"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
        <div className="text-xs text-green-100 text-center">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
