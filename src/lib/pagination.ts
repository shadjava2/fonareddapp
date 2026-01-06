export interface PaginationParams {
  page?: number;
  size?: number;
  q?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationState {
  page: number;
  size: number;
  search: string;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Calcule les paramètres de pagination pour Prisma
 */
export function getPaginationParams(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, params.size || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * size;

  return {
    skip,
    take: size,
    page,
    size,
    search: params.q || '',
  };
}

/**
 * Calcule les métadonnées de pagination
 */
export function getPaginationMeta(
  page: number,
  size: number,
  total: number
) {
  const totalPages = Math.ceil(total / size);

  return {
    page,
    size,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Crée une réponse paginée
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  size: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: getPaginationMeta(page, size, total),
  };
}
