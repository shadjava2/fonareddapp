import React from 'react';
import { Loader } from './Loader';

interface PageLoaderProps {
  loading?: boolean;
  text?: string;
  className?: string;
}

/**
 * Loader de page avec overlay complet
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  loading,
  text = 'Chargement...',
  className,
}) => {
  if (!loading) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm ${className || ''}`}
    >
      <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
        <Loader size="lg" text={text} />
      </div>
    </div>
  );
};

/**
 * Skeleton pour les lignes de tableau
 */
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 6 }) => {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </td>
      ))}
    </tr>
  );
};



