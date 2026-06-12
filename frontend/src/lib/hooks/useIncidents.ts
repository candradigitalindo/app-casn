import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsApi, TicketQuery, CreateTicketDto } from '@/lib/api/incidents';
import { handleQueryError } from '@/lib/api-client';
import type { IncidentTicket } from '@/types/models';
import { TicketStatus } from '@/types/enums';

// Query Keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  sla: () => [...ticketKeys.all, 'sla'] as const,
  overdue: () => [...ticketKeys.all, 'overdue'] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
};

// Hooks
export function useTickets(query: TicketQuery = {}) {
  return useQuery({
    queryKey: [...ticketKeys.lists(), query],
    queryFn: () => incidentsApi.getTickets(query),
    // Refetch tickets every minute for real-time updates
    refetchInterval: 60 * 1000,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => incidentsApi.getTicket(id),
    enabled: !!id,
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

export function useSLAStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: () => incidentsApi.getSLAStats(),
    // Refetch every minute
    refetchInterval: 60 * 1000,
  });
}

// Mutations
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTicketDto) => incidentsApi.createTicket(data),
    onSuccess: () => {
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      // Invalidate SLA stats
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: handleQueryError,
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, technicianId }: { id: string; technicianId: string }) =>
      incidentsApi.assignTicket(id, technicianId),
    onSuccess: (data, variables) => {
      // Invalidate ticket details
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
    onError: handleQueryError,
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: TicketStatus; assignedTo?: string; resolutionNote?: string }) =>
      incidentsApi.updateTicketStatus(id, data),
    onSuccess: (data, variables) => {
      // Invalidate ticket details
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      // Invalidate SLA stats
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: handleQueryError,
  });
}

export function useAddTicketNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      incidentsApi.addTicketNote(id, note),
    onSuccess: (data, variables) => {
      // Invalidate ticket details
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: handleQueryError,
  });
}

export function useUploadTicketPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      incidentsApi.uploadTicketPhoto(id, file),
    onSuccess: (data, variables) => {
      // Invalidate ticket details
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: handleQueryError,
  });
}

export function useEscalateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      incidentsApi.escalateTicket(id, reason),
    onSuccess: (data, variables) => {
      // Invalidate ticket details
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      // Invalidate overdue tickets
      queryClient.invalidateQueries({ queryKey: ticketKeys.overdue() });
    },
    onError: handleQueryError,
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => incidentsApi.deleteTicket(id),
    onSuccess: () => {
      // Invalidate tickets list
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      // Invalidate SLA stats
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      // Invalidate overdue tickets
      queryClient.invalidateQueries({ queryKey: ticketKeys.overdue() });
    },
    onError: handleQueryError,
  });
}

// Helper hooks
export function useTicketsByStatus(status: TicketStatus) {
  return useTickets({ status });
}

export function useTicketsByLocation(locationId: string) {
  return useTickets({ locationId });
}

export function useOpenTicketsCount() {
  const { data } = useTickets({ status: TicketStatus.OPEN });
  return data?.data.length || 0;
}

export function useOverdueTicketsCount() {
  const { data } = useOverdueTickets();
  return data?.data.length || 0;
}
