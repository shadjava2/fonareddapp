import { cn } from '@/lib/utils';
import React, { useCallback, useState } from 'react';
import { Loader } from './Loader';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectWithLoaderProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  loading?: boolean;
  loadingText?: string;
  options: SelectOption[];
  onAsyncChange?: (value: string | number) => Promise<void>;
  showProgress?: boolean;
}

/**
 * Select avec loader intégré et support d'actions asynchrones
 */
export const SelectWithLoader: React.FC<SelectWithLoaderProps> = ({
  loading = false,
  loadingText,
  options,
  onAsyncChange,
  showProgress = false,
  className,
  onChange,
  ...props
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Appel synchrone immédiat
      if (onChange) {
        onChange(e);
      }

      // Action asynchrone avec feedback visuel
      if (onAsyncChange) {
        setLocalLoading(true);

        if (showProgress) {
          setProgress(0);
          const progressInterval = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 15;
            });
          }, 30);
        }

        try {
          await onAsyncChange(e.target.value);
          if (showProgress) {
            setProgress(100);
            setTimeout(() => {
              setProgress(0);
              setLocalLoading(false);
            }, 300);
          } else {
            setLocalLoading(false);
          }
        } catch (error) {
          console.error('Erreur action asynchrone:', error);
          setLocalLoading(false);
          setProgress(0);
        }
      }
    },
    [onChange, onAsyncChange, showProgress]
  );

  const isLoading = loading || localLoading;

  return (
    <div className="relative">
      <div className="relative">
        <select
          {...props}
          onChange={handleChange}
          disabled={props.disabled || isLoading}
          className={cn(
            'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-200 appearance-none bg-white',
            isLoading && 'pr-10 opacity-75',
            className
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isLoading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader size="sm" variant="primary" />
          </div>
        )}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {showProgress && progress > 0 && (
        <div className="mt-1 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {isLoading && loadingText && (
        <p className="mt-1 text-xs text-gray-500 animate-pulse">
          {loadingText}
        </p>
      )}
    </div>
  );
};



