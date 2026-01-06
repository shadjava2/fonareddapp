import { cn } from '@/lib/utils';
import React from 'react';
import { Loader } from './Loader';

interface ButtonWithProgressProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  progress?: number;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  showProgressBar?: boolean;
}

/**
 * Bouton avec loader et barre de progression intégrée
 */
export const ButtonWithProgress: React.FC<ButtonWithProgressProps> = ({
  loading = false,
  progress,
  loadingText,
  variant = 'primary',
  showProgressBar = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary:
      'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 overflow-hidden',
        variantClasses[variant],
        loading && 'opacity-90 cursor-wait',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Barre de progression en arrière-plan */}
      {showProgressBar && progress !== undefined && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Contenu du bouton */}
      <span className="relative flex items-center">
        {loading && (
          <Loader
            size="sm"
            variant={
              variant === 'primary' || variant === 'danger'
                ? 'white'
                : 'primary'
            }
            className="mr-2 flex-shrink-0"
          />
        )}
        {loading && loadingText ? loadingText : children}
      </span>

      {/* Indicateur de progression textuel */}
      {showProgressBar && progress !== undefined && progress > 0 && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white opacity-30">
          <span
            className="block h-full bg-white transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </span>
      )}
    </button>
  );
};
