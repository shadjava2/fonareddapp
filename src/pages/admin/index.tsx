import AdminLayout from '@/components/layout/AdminLayout';
import { apiGet } from '@/lib/fetcher';
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  EyeIcon,
  HomeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalServices: number;
  totalRoles: number;
  totalSites: number;
  totalUsers: number;
  servicesWithSite: number;
  servicesWithoutSite: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        data: {
          stats: DashboardStats;
        };
      }>('/api/admin/dashboard');

      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      name: 'Utilisateurs',
      href: '/admin/users',
      icon: UserGroupIcon,
      description: 'Gestion des utilisateurs du système',
      color: 'bg-blue-500',
      count: stats?.totalUsers || 0,
    },
    {
      name: 'Rôles',
      href: '/admin/roles',
      icon: ShieldCheckIcon,
      description: 'Gestion des rôles et permissions',
      color: 'bg-green-500',
      count: stats?.totalRoles || 0,
    },
    {
      name: 'Services',
      href: '/admin/services',
      icon: Cog6ToothIcon,
      description: 'Gestion des services disponibles',
      color: 'bg-purple-500',
      count: stats?.totalServices || 0,
    },
    {
      name: 'Sites',
      href: '/admin/sites',
      icon: BuildingOfficeIcon,
      description: 'Gestion des sites et lieux de travail',
      color: 'bg-orange-500',
      count: stats?.totalSites || 0,
    },
    {
      name: 'Droits Services',
      href: '/admin/droits-services',
      icon: KeyIcon,
      description: "Gestion des droits d'accès aux services",
      color: 'bg-red-500',
      count: 0,
    },
    {
      name: 'Rôles Permissions',
      href: '/admin/roles-permissions',
      icon: UserIcon,
      description: 'Gestion des permissions par rôle',
      color: 'bg-indigo-500',
      count: 0,
    },
  ];

  return (
    <AdminLayout
      title="Tableau de bord"
      description="Vue d'ensemble de l'administration"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <HomeIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Tableau de bord
                </h1>
                <p className="text-sm text-gray-600">
                  Vue d'ensemble de l'administration
                </p>
              </div>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
            >
              Actualiser
            </button>
          </div>
        </div>

        {/* Statistiques globales */}
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des données...
            </p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">
                    Utilisateurs
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {stats.totalUsers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Rôles</p>
                  <p className="text-2xl font-bold text-green-900">
                    {stats.totalRoles}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Cog6ToothIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">
                    Services
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {stats.totalServices}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <BuildingOfficeIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-600">Sites</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {stats.totalSites}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Détails des services */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Répartition des Services
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <EyeIcon className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      Services avec Site
                    </p>
                    <p className="text-xl font-bold text-green-900">
                      {stats.servicesWithSite}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Cog6ToothIcon className="h-5 w-5 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-orange-600">
                      Services sans Site
                    </p>
                    <p className="text-xl font-bold text-orange-900">
                      {stats.servicesWithoutSite}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.name}
                href={module.href}
                className="group bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`p-3 rounded-lg ${module.color} text-white group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                        {module.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  {module.count > 0 && (
                    <div className="bg-gray-100 text-gray-600 rounded-full px-3 py-1 text-sm font-medium">
                      {module.count}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
