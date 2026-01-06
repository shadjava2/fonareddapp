import { cn } from '@/lib/utils';
import React from 'react';
import { Loader } from './Loader';

interface ActionLoaderProps {
  loading?: boolean;
  message?: string;
  subMessage?: string;
  progress?: number;
  className?: string;
}

/**
 * Composant de loader pour les actions (clics, soumissions, etc.)
 * Affiche un overlay avec une boîte de dialogue moderne
 */
export const ActionLoader: React.FC<ActionLoaderProps> = ({
  loading,
  message = 'Traitement en cours...',
  subMessage,
  progress,
  className,
}) => {
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 animate-scale-in',
          className
        )}
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Loader principal */}
          <div className="relative">
            <Loader size="xl" variant="primary" />

            {/* Cercle animé supplémentaire pour effet premium */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-ping opacity-20"></div>
            </div>
          </div>

          {/* Message principal */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {message}
            </h3>
            {subMessage && (
              <p className="text-sm text-gray-600 animate-pulse">
                {subMessage}
              </p>
            )}
          </div>

          {/* Barre de progression si disponible */}
          {progress !== undefined && (
            <div className="w-full">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {progress}%
              </p>
            </div>
          )}

          {/* Indicateur de chargement textuel */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                style={{ animationDelay: '0s' }}
              />
              <div
                className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <span>Veuillez patienter...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook pour gérer le loader d'action avec état
 */
export function useActionLoader() {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('Traitement en cours...');
  const [subMessage, setSubMessage] = React.useState<string | undefined>(
    undefined
  );
  const [progress, setProgress] = React.useState<number | undefined>(undefined);

  const startLoading = React.useCallback((msg?: string, subMsg?: string) => {
    setMessage(msg || 'Traitement en cours...');
    setSubMessage(subMsg);
    setProgress(undefined);
    setLoading(true);
  }, []);

  const setProgressValue = React.useCallback((value: number) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  const stopLoading = React.useCallback(() => {
    setLoading(false);
    // Reset après animation
    setTimeout(() => {
      setMessage('Traitement en cours...');
      setSubMessage(undefined);
      setProgress(undefined);
    }, 300);
  }, []);

  const updateMessage = React.useCallback((msg: string, subMsg?: string) => {
    setMessage(msg);
    if (subMsg !== undefined) setSubMessage(subMsg);
  }, []);

  return {
    loading,
    message,
    subMessage,
    progress,
    startLoading,
    stopLoading,
    setProgressValue,
    updateMessage,
    ActionLoaderComponent: (
      <ActionLoader
        loading={loading}
        message={message}
        subMessage={subMessage}
        progress={progress}
      />
    ),
  };
}



