'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
export function NotificationLink() {
  const query = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () =>
      (
        await apiClient.get<never[]>('/api/v1/notifications', {
          params: { limit: 1, unread: true },
        })
      ).meta?.total ?? 0,
    refetchInterval: 60000,
  });
  return (
    <Link
      href="/notifications"
      className="relative inline-flex gap-2 items-center rounded-lg px-3 py-2 hover:bg-muted"
      aria-label={`Notifikasi: ${query.data ?? 0} belum dibaca`}
    >
      <Bell className="h-4 w-4" />
      <span className="text-sm">Notifikasi</span>
      {!!query.data && (
        <span className="rounded-full bg-red-600 text-white text-xs px-1.5">
          {query.data > 99 ? '99+' : query.data}
        </span>
      )}
    </Link>
  );
}
