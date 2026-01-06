import { FormLoader } from '@/components/ui/FormLoader';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Modal avec animations fluides d'ouverture/fermeture
 */
export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  loading = false,
  size = 'md',
  className,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Petit délai pour déclencher l'animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Attendre la fin de l'animation avant de démonter
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <>
      {/* Overlay avec animation fade */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-gray-600 bg-opacity-50 transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Modal avec animation scale + fade */}
      <div
        className={cn(
          'fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'bg-white rounded-lg shadow-xl w-full transform transition-all duration-300',
            sizeClasses[size],
            isAnimating
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4'
          )}
        >
          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Content avec loader */}
          <FormLoader loading={loading} text="Traitement en cours...">
            <div
              className={cn('p-6', loading && 'opacity-50 pointer-events-none')}
            >
              {children}
            </div>
          </FormLoader>
        </div>
      </div>
    </>
  );
};

/**
 * Wrapper pour formulaire dans modal avec animations
 */
interface FormModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FormModalWrapper: React.FC<FormModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
  loading = false,
  onSubmit,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  size = 'md',
}) => {
  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      loading={loading}
      size={size}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {children}

        {/* Footer avec boutons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
          >
            {loading ? (
              <>
                <Loader size="sm" variant="white" className="mr-2" />
                <span>Traitement...</span>
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
};

