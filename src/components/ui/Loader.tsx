import { cn } from '@/lib/utils';
import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  text?: string;
}

/**
 * Composant Loader professionnel avec animations fluides
 */
export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
  };

  const colorClasses = {
    primary: 'text-indigo-600',
    secondary: 'text-gray-600',
    white: 'text-white',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative">
        {/* Cercle principal avec rotation */}
        <svg
          className={cn(
            'animate-spin',
            sizeClasses[size],
            colorClasses[variant]
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        {/* Cercle secondaire avec rotation inverse (plus petit) */}
        <svg
          className={cn(
            'absolute top-0 left-0 animate-spin-reverse',
            sizeClasses[size],
            colorClasses[variant],
            'opacity-50'
          )}
          style={{ animationDuration: '1.5s' }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-40"
            cx="12"
            cy="12"
            r="6"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      </div>
      {text && (
        <p
          className={cn(
            'mt-3 text-sm font-medium animate-pulse',
            variant === 'white' ? 'text-white' : 'text-gray-600'
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
};

/**
 * Loader avec des points animés
 */
export const DotsLoader: React.FC<{
  className?: string;
  text?: string;
  variant?: 'primary' | 'secondary';
}> = ({ className, text, variant = 'primary' }) => {
  const dotColor = variant === 'primary' ? 'bg-indigo-600' : 'bg-gray-400';

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn('w-3 h-3 rounded-full animate-bounce', dotColor)}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </div>
      {text && <p className="mt-3 text-sm font-medium text-gray-600">{text}</p>}
    </div>
  );
};

/**
 * Loader avec barre de progression animée
 */
export const ProgressLoader: React.FC<{
  progress?: number;
  className?: string;
  text?: string;
}> = ({ progress, className, text }) => {
  return (
    <div className={cn('w-full', className)}>
      {text && (
        <p className="text-sm font-medium text-gray-700 mb-2 text-center">
          {text}
        </p>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer rounded-full transition-all duration-300"
          style={{
            width: progress ? `${progress}%` : '100%',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Skeleton loader pour le chargement de contenu
 */
export const SkeletonLoader: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className, lines = 3 }) => {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{
            width: i === lines - 1 ? '75%' : '100%',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton loader
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div
      className={cn('bg-white rounded-lg shadow p-6 animate-pulse', className)}
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
};
