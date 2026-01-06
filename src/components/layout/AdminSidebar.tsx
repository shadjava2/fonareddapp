import { useAuth } from '@/hooks/useAuth';
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

const AdminSidebar: React.FC = () => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      try {
        await logout();
        alert('Déconnexion réussie');
        router.push('/');
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        alert('Erreur lors de la déconnexion');
        router.push('/');
      }
    }
  };

  const menuItems = [
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
    },
    {
      name: 'Utilisateurs',
      href: '/admin/users',
      icon: UserGroupIcon,
      description: 'Gestion des utilisateurs du système',
    },
    {
      name: 'Rôles',
      href: '/admin/roles',
      icon: ShieldCheckIcon,
      description: 'Gestion des rôles et permissions',
    },
    {
      name: 'Fonctions',
      href: '/admin/fonctions',
      icon: BriefcaseIcon,
      description: "Gestion des fonctions de l'application",
    },
    {
      name: 'Services',
      href: '/admin/services',
      icon: Cog6ToothIcon,
      description: 'Gestion des services disponibles',
    },
    {
      name: 'Sites',
      href: '/admin/sites',
      icon: BuildingOfficeIcon,
      description: 'Gestion des sites et lieux de travail',
    },
    {
      name: 'Droits services',
      href: '/admin/droits-services',
      icon: KeyIcon,
      description: "Gestion des droits d'accès aux services",
    },
    {
      name: 'Rôles permissions',
      href: '/admin/roles-permissions',
      icon: UserIcon,
      description: 'Gestion des permissions par rôle',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-600 to-green-700 text-white">
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
        {/* Bouton retour */}
        <Link
          href="/home"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-green-500 transition-colors duration-200 group"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Retour à l'accueil</span>
        </Link>

        {/* Séparateur */}
        <div className="border-t border-green-500 my-4"></div>

        {/* Menu items */}
        {menuItems.map((item) => {
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

      {/* Footer */}
      <div className="p-4 border-t border-green-500">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-200 group mb-3"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span className="font-medium">Déconnexion</span>
        </button>
        <div className="text-xs text-green-100 text-center">
          <p>Version 1.0.0</p>
          <p>Mode développement</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
