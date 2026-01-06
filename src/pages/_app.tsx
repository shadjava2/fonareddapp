import ErrorBoundary from '@/components/ErrorBoundary';
import ToastContainer from '@/components/ui/ToastContainer';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider, useToast } from '@/hooks/useToast';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';

function AppContent({ Component, pageProps }: AppProps) {
  const { toasts, removeToast } = useToast();

  try {
    return (
      <ErrorBoundary>
        <Component {...pageProps} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ErrorBoundary>
    );
  } catch (error: any) {
    console.error('❌ Erreur dans AppContent:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur d'application
          </h1>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Erreur inconnue'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}

export default function App({ Component, pageProps }: AppProps) {
  try {
    return (
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <AppContent Component={Component} pageProps={pageProps} />
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    );
  } catch (error: any) {
    console.error('❌ Erreur fatale dans App:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur fatale de l'application
          </h1>
          <p className="text-gray-600 mb-4">
            {error?.message || "Impossible de charger l'application"}
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }
}
