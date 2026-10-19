'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleQueryError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FeaturePage, QueryStatus } from '@/components/feature-page';
import { ListPagination, useListPage } from '@/components/list-pagination';
export interface Notification {
  id: string;
  title: string;
  message: string;
  href: string;
  severity: string;
  readAt?: string;
  createdAt: string;
}
export default function NotificationsPage() {
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useListPage(String(unread));
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', page, unread],
    queryFn: () =>
      apiClient.get<Notification[]>('/api/v1/notifications', {
        params: { page, limit: 20, unread },
      }),
    refetchInterval: 60000,
  });
  const read = useMutation({
    mutationFn: (id?: string) =>
      apiClient.patch(
        `/api/v1/notifications/${id ? `${id}/read` : 'read-all'}`,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
    onError: handleQueryError,
  });
  return (
    <FeaturePage
      title="Notifikasi"
      description="Persetujuan berita acara, batas SLA, jadwal instalasi, dan backup."
    >
      <div className="flex flex-wrap justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => setUnread(e.target.checked)}
          />
          Belum dibaca
        </label>
        <Button
          variant="outline"
          disabled={read.isPending}
          onClick={() => read.mutate(undefined)}
        >
          Tandai semua dibaca
        </Button>
      </div>
      <QueryStatus
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      />
      <div className="space-y-3">
        {query.data?.data.map((item) => (
          <div
            className={`rounded-xl border p-4 ${item.readAt ? 'bg-white' : 'bg-blue-50'}`}
            key={item.id}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <Link
                className="font-semibold hover:underline"
                href={item.href}
                onClick={() => read.mutate(item.id)}
              >
                {item.title}
              </Link>
              <span
                className={`text-xs ${item.severity === 'CRITICAL' ? 'text-red-700' : 'text-muted-foreground'}`}
              >
                {new Date(item.createdAt).toLocaleString('id-ID')}
              </span>
            </div>
            <p className="text-sm mt-2">{item.message}</p>
            {!item.readAt && (
              <button
                className="text-xs text-primary mt-3"
                disabled={read.isPending}
                onClick={() => read.mutate(item.id)}
              >
                Tandai dibaca
              </button>
            )}
          </div>
        ))}
      </div>
      {query.data?.data.length === 0 && (
        <p className="text-muted-foreground">Belum ada notifikasi.</p>
      )}
      <ListPagination
        page={page}
        total={query.data?.meta?.total}
        totalPages={query.data?.meta?.totalPages}
        onPage={setPage}
        loading={query.isFetching}
      />
    </FeaturePage>
  );
}
