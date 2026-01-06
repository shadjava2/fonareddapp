import React, { Suspense } from 'react';
import { Loader, SkeletonLoader } from './Loader';

interface LoadingWrapperProps {
  loading?: boolean;
  skeleton?: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

/**
 * Wrapper avec loader automatique
 */
export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  loading,
  skeleton = false,
  children,
  text,
  className,
}) => {
  if (loading) {
    if (skeleton) {
      return (
        <div className={className}>
          <SkeletonLoader lines={3} />
        </div>
      );
    }
    return (
      <div
        className={`flex items-center justify-center py-8 ${className || ''}`}
      >
        <Loader size="lg" text={text || 'Chargement...'} />
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Suspense wrapper avec fallback loader
 */
export const SuspenseLoader: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({
  children,
  fallback = (
    <div className="flex items-center justify-center py-12">
      <Loader size="lg" text="Chargement..." />
    </div>
  ),
}) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};



