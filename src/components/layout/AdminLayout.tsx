import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = 'Administration',
  description = "Gestion administrative de l'application",
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Utilisateur</div>
                  <div className="text-sm font-medium text-gray-900">
                    {user?.username || 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Services autorisés
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {(user?.services || []).length}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
