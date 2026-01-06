import { useCallback, useRef } from 'react';

/**
 * Hook pour optimiser les fetch avec debounce et cache
 */
export function useOptimizedFetch() {
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(
    new Map()
  );
  const pendingRequestsRef = useRef<Map<string, Promise<any>>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cache TTL: 30 secondes
  const CACHE_TTL = 30000;

  /**
   * Fetch optimisé avec cache et déduplication des requêtes
   */
  const fetchCached = useCallback(
    async (url: string, options?: RequestInit): Promise<any> => {
      const cacheKey = `${url}-${JSON.stringify(options)}`;
      const cached = cacheRef.current.get(cacheKey);

      // Vérifier le cache
      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_TTL &&
        !options?.method // Ne pas cacher les POST/PUT/DELETE
      ) {
        return cached.data;
      }

      // Vérifier si une requête est déjà en cours
      const pending = pendingRequestsRef.current.get(cacheKey);
      if (pending) {
        return pending;
      }

      // Créer la nouvelle requête
      const requestPromise = fetch(url, options)
        .then((res) => res.json())
        .then((data) => {
          // Mettre en cache uniquement les GET réussis
          if (!options?.method && res.ok) {
            cacheRef.current.set(cacheKey, {
              data,
              timestamp: Date.now(),
            });
          }
          pendingRequestsRef.current.delete(cacheKey);
          return data;
        })
        .catch((error) => {
          pendingRequestsRef.current.delete(cacheKey);
          throw error;
        });

      pendingRequestsRef.current.set(cacheKey, requestPromise);
      return requestPromise;
    },
    []
  );

  /**
   * Fetch avec debounce
   */
  const fetchDebounced = useCallback(
    (url: string, options?: RequestInit, delay: number = 300): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
          try {
            const data = await fetchCached(url, options);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    },
    [fetchCached]
  );

  /**
   * Invalider le cache pour une URL
   */
  const invalidateCache = useCallback((url: string) => {
    for (const key of cacheRef.current.keys()) {
      if (key.startsWith(url)) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  /**
   * Vider tout le cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    fetchCached,
    fetchDebounced,
    invalidateCache,
    clearCache,
  };
}

