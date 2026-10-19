'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState, type ReactNode } from 'react';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useAuthStore } from '@/lib/stores/auth';

interface ProvidersProps {
  children: ReactNode;
}

/** Membuka koneksi real-time app-wide (tanpa UI). Harus di dalam QueryClientProvider. */
function WebSocketBridge() {
  useWebSocket();
  return null;
}

export function QueryProvider({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Time data remains fresh (5 minutes)
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: true,
            refetchInterval: 10 * 60 * 1000,
            // Retry on mount if data is stale
            refetchOnMount: true,
          },
          mutations: {
            // Jangan retry mutasi: POST non-idempoten (buat tiket/pengiriman)
            // bisa tereksekusi dua kali bila respons pertama gagal/timeout.
            retry: 0,
          },
        },
      })
  );

  // Hapus cache saat logout/pergantian akun sebelum akun berikutnya membaca data.
  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id) queryClient.clear();
  }), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketBridge />
      {children}
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-right"
      />
    </QueryClientProvider>
  );
}
