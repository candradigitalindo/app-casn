'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function useListPage(filters: string) {
  const [state, setState] = useState({ filters, page: 1 });
  const page = state.filters === filters ? state.page : 1;
  return [page, (value: number) => setState({ filters, page: value })] as const;
}
export function useDebouncedSearch(value: string) {
  const [search, setSearch] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return search;
}
export function ListPagination({
  page,
  total = 0,
  totalPages = 0,
  onPage,
  loading,
}: {
  page: number;
  total?: number;
  totalPages?: number;
  onPage: (page: number) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted-foreground">
      <span>
        {total.toLocaleString('id-ID')} data · Halaman {page} dari{' '}
        {Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={loading || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          disabled={loading || page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
