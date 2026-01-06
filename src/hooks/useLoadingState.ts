import { useCallback, useState } from 'react';

/**
 * Hook pour gérer les états de chargement avec optimisations
 */
export function useLoadingState(initialState = false) {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState<Error | null>(null);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const setLoadingError = useCallback((err: Error) => {
    setLoading(false);
    setError(err);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset,
  };
}

