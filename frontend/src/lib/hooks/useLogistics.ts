import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logisticsApi, UpdateShipmentDto } from '@/lib/api/logistics';
import { handleQueryError } from '@/lib/api-client';
import { ShipmentStatus } from '@/types/enums';

export const shipmentKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  inventory: () => [...shipmentKeys.all, 'inventory'] as const,
};

export function useShipments(query: { status?: ShipmentStatus; destinationLocationId?: string } = {}) {
  return useQuery({
    queryKey: [...shipmentKeys.lists(), query],
    queryFn: () => logisticsApi.getShipments(query),
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

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShipmentDto }) =>
      logisticsApi.updateShipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
    },
    onError: handleQueryError,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logisticsApi.createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
    },
    onError: handleQueryError,
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => logisticsApi.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
    },
    onError: handleQueryError,
  });
}
