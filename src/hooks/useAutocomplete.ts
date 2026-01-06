import { debounce } from '@/lib/utils';
import { useCallback, useState } from 'react';

interface AutocompleteOption {
  value: string | number;
  label: string;
}

interface UseAutocompleteOptions {
  endpoint: string;
  searchParam?: string;
  debounceMs?: number;
  minSearchLength?: number;
  transformResponse?: (data: any[]) => AutocompleteOption[];
  initialOptions?: AutocompleteOption[];
}

export function useAutocomplete({
  endpoint,
  searchParam = 'q',
  debounceMs = 300,
  minSearchLength = 1,
  transformResponse,
  initialOptions = [],
}: UseAutocompleteOptions) {
  const [options, setOptions] = useState<AutocompleteOption[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTransformResponse = useCallback((data: any[]): AutocompleteOption[] => {
    return data.map(item => ({
      value: item.id || item.value,
      label: item.nom || item.name || item.label || String(item.value || item.id),
    }));
  }, []);

  const search = useCallback(async (query: string) => {
    if (query.length < minSearchLength) {
      setOptions(initialOptions);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        [searchParam]: query,
      });

      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const transformedOptions = transformResponse
        ? transformResponse(data)
        : defaultTransformResponse(data);

      setOptions(transformedOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, searchParam, minSearchLength, transformResponse, defaultTransformResponse, initialOptions]);

  const debouncedSearch = useCallback(
    debounce(search, debounceMs),
    [search, debounceMs]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setOptions(initialOptions);
    setError(null);
    setLoading(false);
  }, [initialOptions]);

  return {
    options,
    loading,
    error,
    search: debouncedSearch,
    clearError,
    reset,
  };
}

// Hook spécialisé pour les utilisateurs
export function useUserAutocomplete(options: Partial<UseAutocompleteOptions> = {}) {
  return useAutocomplete({
    endpoint: '/api/rbac/utilisateurs/autocomplete',
    searchParam: 'q',
    minSearchLength: 2,
    transformResponse: (users: any[]) =>
      users.map(user => ({
        value: user.id,
        label: `${user.nom || ''} ${user.prenom || ''}`.trim() || user.username,
      })),
    ...options,
  });
}

// Hook spécialisé pour les services
export function useServiceAutocomplete(options: Partial<UseAutocompleteOptions> = {}) {
  return useAutocomplete({
    endpoint: '/api/rbac/services/autocomplete',
    searchParam: 'q',
    minSearchLength: 1,
    transformResponse: (services: any[]) =>
      services.map(service => ({
        value: service.id,
        label: service.nom,
      })),
    ...options,
  });
}

// Hook spécialisé pour les rôles
export function useRoleAutocomplete(options: Partial<UseAutocompleteOptions> = {}) {
  return useAutocomplete({
    endpoint: '/api/rbac/roles/autocomplete',
    searchParam: 'q',
    minSearchLength: 1,
    transformResponse: (roles: any[]) =>
      roles.map(role => ({
        value: role.id,
        label: role.nom,
      })),
    ...options,
  });
}

// Hook spécialisé pour les sites
export function useSiteAutocomplete(options: Partial<UseAutocompleteOptions> = {}) {
  return useAutocomplete({
    endpoint: '/api/rbac/sites/autocomplete',
    searchParam: 'q',
    minSearchLength: 1,
    transformResponse: (sites: any[]) =>
      sites.map(site => ({
        value: site.id,
        label: site.nom,
      })),
    ...options,
  });
}
