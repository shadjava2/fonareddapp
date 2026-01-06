import { cn } from '@/lib/utils';
import React from 'react';
import { Loader } from './Loader';

interface FormProgressIndicatorProps {
  loading?: boolean;
  step?: number;
  totalSteps?: number;
  currentStep?: string;
  message?: string;
  className?: string;
}

/**
 * Indicateur de progression pour formulaires
 */
export const FormProgressIndicator: React.FC<FormProgressIndicatorProps> = ({
  loading = false,
  step = 0,
  totalSteps = 3,
  currentStep,
  message,
  className,
}) => {
  const progress = totalSteps > 0 ? (step / totalSteps) * 100 : 0;

  if (!loading && step === 0) return null;

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 transition-all duration-300',
        loading && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-center space-x-4">
        {loading && (
          <div className="flex-shrink-0">
            <Loader size="sm" variant="primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {currentStep && (
            <p className="text-sm font-medium text-gray-900">{currentStep}</p>
          )}
          {message && <p className="text-xs text-gray-600 mt-1">{message}</p>}
          {totalSteps > 1 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progression</span>
                <span>
                  {step} / {totalSteps}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Badge de statut avec animation
 */
interface StatusBadgeProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  message,
  className,
}) => {
  const statusClasses = {
    idle: 'bg-gray-100 text-gray-700',
    loading: 'bg-blue-100 text-blue-700 animate-pulse',
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
        statusClasses[status],
        className
      )}
    >
      {status === 'loading' && (
        <Loader size="sm" variant="primary" className="mr-2" />
      )}
      {status === 'success' && (
        <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {status === 'error' && (
        <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
};



