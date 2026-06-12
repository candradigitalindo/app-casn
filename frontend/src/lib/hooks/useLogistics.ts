import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsApi, UpdateShipmentDto } from '@/lib/api/logistics';
import { ShipmentStatus } from '@/types/enums';

export const shipmentKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  detail: (id: string) => [...shipmentKeys.all, 'detail', id] as const,
  summary: () => [...shipmentKeys.all, 'summary'] as const,
  inventory: () => [...shipmentKeys.all, 'inventory'] as const,
  checklists: (locationId: string) => [...shipmentKeys.all, 'checklists', locationId] as const,
  bufferStock: () => [...shipmentKeys.all, 'buffer-stock'] as const,
};

export function useShipments(query: { status?: ShipmentStatus; destinationLocationId?: string } = {}) {
  return useQuery({
    queryKey: [...shipmentKeys.lists(), query],
    queryFn: () => logisticsApi.getShipments(query),
    refetchInterval: 60 * 1000,
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: () => logisticsApi.getShipment(id),
    enabled: !!id,
  });
}

export function useShipmentsSummary() {
  return useQuery({
    queryKey: shipmentKeys.summary(),
    queryFn: () => logisticsApi.getTrackingSummary(),
    refetchInterval: 60 * 1000,
  });
}

export function useInventoryItems() {
  return useQuery({
    queryKey: shipmentKeys.inventory(),
    queryFn: () => logisticsApi.getInventoryItems(),
    staleTime: Infinity,
  });
}

export function useInventoryChecklists(locationId: string) {
  return useQuery({
    queryKey: shipmentKeys.checklists(locationId),
    queryFn: () => logisticsApi.getInventoryChecklist(locationId),
    enabled: !!locationId,
  });
}

export function useBufferStock() {
  return useQuery({
    queryKey: shipmentKeys.bufferStock(),
    queryFn: () => logisticsApi.getBufferStock(),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShipmentDto }) =>
      logisticsApi.updateShipment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: shipmentKeys.summary() });
    },
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logisticsApi.createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shipmentKeys.summary() });
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => logisticsApi.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shipmentKeys.summary() });
    },
  });
}

export function useSubmitInventoryChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logisticsApi.submitInventoryChecklist,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.checklists(variables.locationId) });
    },
  });
}
