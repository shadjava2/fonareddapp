import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  handleApiError,
} from '@/lib/fetcher';
import { PaginatedResponse } from '@/lib/pagination';
import { useCallback, useEffect, useState } from 'react';

interface CrudState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  search: string;
}

interface UseCrudOptions {
  initialPageSize?: number;
  autoLoad?: boolean;
}

export function useCrud<T extends { id: number | string }>(
  endpoint: string,
  options: UseCrudOptions = {}
) {
  const { initialPageSize = 10, autoLoad = true } = options;

  const [state, setState] = useState<CrudState<T>>({
    data: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      size: initialPageSize,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    search: '',
  });

  const [editingItem, setEditingItem] = useState<T | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const loadData = useCallback(
    async (
      page: number = state.pagination.page,
      size: number = state.pagination.size,
      search: string = state.search
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          size: size.toString(),
          ...(search && { q: search }),
        });

        const response = await apiGet<PaginatedResponse<T>>(
          `${endpoint}?${params.toString()}`
        );

        setState((prev) => ({
          ...prev,
          data: response.data,
          pagination: response.pagination,
          search,
        }));
      } catch (error) {
        const apiError = handleApiError(error);
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    },
    [
      endpoint,
      state.pagination.page,
      state.pagination.size,
      state.search,
      setLoading,
      setError,
    ]
  );

  const create = useCallback(
    async (data: Omit<T, 'id'>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiPost<T>(endpoint, data);

        // Recharger la première page pour voir le nouvel élément
        await loadData(1);

        return { success: true, data: response };
      } catch (error) {
        const apiError = handleApiError(error);
        setError(apiError.message);
        return { success: false, error: apiError.message };
      } finally {
        setLoading(false);
      }
    },
    [endpoint, loadData, setLoading, setError]
  );

  const update = useCallback(
    async (id: number | string, data: Partial<T>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiPut<T>(`${endpoint}/${id}`, data);

        // Mettre à jour l'élément dans la liste
        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) =>
            item.id === id ? { ...item, ...response } : item
          ),
        }));

        return { success: true, data: response };
      } catch (error) {
        const apiError = handleApiError(error);
        setError(apiError.message);
        return { success: false, error: apiError.message };
      } finally {
        setLoading(false);
      }
    },
    [endpoint, setLoading, setError]
  );

  const remove = useCallback(
    async (id: number | string) => {
      try {
        setLoading(true);
        setError(null);

        await apiDelete(`${endpoint}/${id}`);

        // Supprimer l'élément de la liste
        setState((prev) => ({
          ...prev,
          data: prev.data.filter((item) => item.id !== id),
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total - 1,
          },
        }));

        return { success: true };
      } catch (error) {
        const apiError = handleApiError(error);
        setError(apiError.message);
        return { success: false, error: apiError.message };
      } finally {
        setLoading(false);
      }
    },
    [endpoint, setLoading, setError]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      loadData(page, state.pagination.size, state.search);
    },
    [loadData, state.pagination.size, state.search]
  );

  const handleSizeChange = useCallback(
    (size: number) => {
      loadData(1, size, state.search);
    },
    [loadData, state.search]
  );

  const handleSearch = useCallback(
    (search: string) => {
      loadData(1, state.pagination.size, search);
    },
    [loadData, state.pagination.size]
  );

  const startEdit = useCallback((item: T) => {
    setEditingItem(item);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  // Charger les données au montage si autoLoad est activé
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);

  return {
    // État
    data: state.data,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    search: state.search,
    editingItem,

    // Actions
    loadData,
    create,
    update,
    remove,
    handlePageChange,
    handleSizeChange,
    handleSearch,
    startEdit,
    cancelEdit,
    setError,
  };
}
