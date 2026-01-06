import React from 'react';
import { Loader } from './Loader';

interface FormLoaderProps {
  loading?: boolean;
  overlay?: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Composant pour ajouter un loader à un formulaire avec overlay
 */
export const FormLoader: React.FC<FormLoaderProps> = ({
  loading,
  overlay = true,
  text,
  children,
  className,
}) => {
  if (!loading) {
    return <>{children}</>;
  }

  if (!overlay) {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <Loader text={text || 'Chargement...'} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm z-50 rounded-lg">
          <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
            <Loader size="lg" text={text || 'Traitement en cours...'} />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Bouton avec loader intégré
 */
interface ButtonWithLoaderProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export const ButtonWithLoader: React.FC<ButtonWithLoaderProps> = ({
  loading,
  loadingText,
  children,
  variant = 'primary',
  className,
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    secondary:
      'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader size="sm" variant="white" className="mr-2" />
          <span>{loadingText || 'Traitement...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

