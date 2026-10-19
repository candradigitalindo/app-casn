import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsApi, TicketQuery, CreateTicketDto } from '@/lib/api/incidents';
import { handleQueryError } from '@/lib/api-client';
import { TicketStatus } from '@/types/enums';
import { useAuthStore } from '@/lib/stores/auth';

// Query Keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  overdue: () => [...ticketKeys.all, 'overdue'] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
};

// Hooks
// User yang terikat satu titik lokasi hanya melihat tiket lokasinya sendiri.
export function useTickets(query: TicketQuery = {}) {
  const scopedLocationId = useAuthStore((s) => s.user?.locationId);
  const effectiveQuery = scopedLocationId && !query.locationId
    ? { ...query, locationId: scopedLocationId }
    : query;
  return useQuery({
    queryKey: [...ticketKeys.lists(), effectiveQuery],
    queryFn: () => incidentsApi.getTickets(effectiveQuery),
    // Refetch tickets every minute for real-time updates
    refetchInterval: 60 * 1000,
  });
}

export function useOverdueTickets() {
  return useQuery({
    queryKey: ticketKeys.overdue(),
    queryFn: () => incidentsApi.getOverdueTickets(),
    // Refetch every 30 seconds
    refetchInterval: 30 * 1000,
  });
}

// Mutations
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTicketDto) => incidentsApi.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: handleQueryError,
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: TicketStatus; resolutionNote?: string }) =>
      incidentsApi.updateTicketStatus(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: handleQueryError,
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => incidentsApi.deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.overdue() });
    },
    onError: handleQueryError,
  });
}
