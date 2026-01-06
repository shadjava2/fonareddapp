import { cn } from '@/lib/utils';
import React, { useCallback, useState } from 'react';
import { Loader } from './Loader';

interface InputWithLoaderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean;
  loadingText?: string;
  onAsyncAction?: (value: string) => Promise<void>;
  debounceMs?: number;
  showProgress?: boolean;
}

/**
 * Input avec loader intégré et support d'actions asynchrones
 */
export const InputWithLoader: React.FC<InputWithLoaderProps> = ({
  loading = false,
  loadingText,
  onAsyncAction,
  debounceMs = 300,
  showProgress = false,
  className,
  onChange,
  ...props
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Appel synchrone immédiat
      if (onChange) {
        onChange(e);
      }

      // Action asynchrone avec debounce
      if (onAsyncAction) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Simuler la progression pour feedback visuel
        if (showProgress) {
          setProgress(0);
          const progressInterval = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 50);
        }

        setLocalLoading(true);

        timeoutRef.current = setTimeout(async () => {
          try {
            await onAsyncAction(e.target.value);
            if (showProgress) {
              setProgress(100);
              setTimeout(() => setProgress(0), 300);
            }
          } catch (error) {
            console.error('Erreur action asynchrone:', error);
          } finally {
            setLocalLoading(false);
          }
        }, debounceMs);
      }
    },
    [onChange, onAsyncAction, debounceMs, showProgress]
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isLoading = loading || localLoading;

  return (
    <div className="relative">
      <div className="relative">
        <input
          {...props}
          onChange={handleChange}
          disabled={props.disabled || isLoading}
          className={cn(
            'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-200',
            isLoading && 'pr-10 opacity-75',
            className
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader size="sm" variant="primary" />
          </div>
        )}
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



