import { useAuth } from '@/hooks/useAuth';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row w-full max-w-[100vw] overflow-x-hidden">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar : tiroir sur mobile, fixe sur grand écran */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw,18rem)] flex-shrink-0 transform transition-transform duration-200 ease-out lg:relative lg:z-auto lg:w-72 xl:w-80 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full overflow-y-auto shadow-xl lg:shadow-none">
          <AdminSidebar />
        </div>
      </div>

      {/* Colonne principale : min-w-0 évite l’élargissement flex (scroll horizontal page) */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileNavOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 sm:text-sm">
                {description}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-3 sm:flex sm:gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500 sm:text-sm">Utilisateur</div>
                <div className="max-w-[8rem] truncate text-sm font-medium text-gray-900">
                  {user?.username || 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 sm:text-sm">
                  Services autorisés
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {(user?.services || []).length}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <svg
                  className="h-5 w-5 shrink-0"
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
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-2 sm:hidden">
            <span className="text-xs text-gray-500">
              {user?.username || 'N/A'} · {(user?.services || []).length} svc
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Déconnexion
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
