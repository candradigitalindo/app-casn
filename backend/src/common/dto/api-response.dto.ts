// Helper untuk membentuk envelope respons { data, message, meta }
// yang identik dengan format mock API frontend.

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(data: T, message = 'success', meta?: PaginationMeta) {
  return { data, message, ...(meta ? { meta } : {}) };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): ReturnType<typeof ok<T[]>> & { meta: PaginationMeta } {
  return {
    data,
    message: 'success',
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
