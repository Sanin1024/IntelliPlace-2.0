// Challenge 214: Standardized Pagination Utility
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPaginationParams = (query: any) => {
  const page = Math.max(1, parseInt(query?.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit as string, 10) || 10)); // Max 100 per page
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / Math.max(1, limit)),
  };
};

