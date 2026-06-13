'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

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
            // Cache data forever (until manually invalidated)
            gcTime: Infinity,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Retry on mount if data is stale
            refetchOnMount: true,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

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