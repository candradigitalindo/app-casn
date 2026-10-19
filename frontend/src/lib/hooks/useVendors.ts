import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vendorsApi, ComparisonQuery, VendorItemInput, VendorPayload, VendorQuery,
} from '@/lib/api/vendors';
import { handleQueryError } from '@/lib/api-client';

export const vendorKeys = {
  all: ['vendors'] as const,
  list: (query: VendorQuery) => [...vendorKeys.all, 'list', query] as const,
  detail: (id: string) => [...vendorKeys.all, 'detail', id] as const,
  items: (id: string) => [...vendorKeys.all, 'items', id] as const,
};

export function useVendors(query: VendorQuery = {}) {
  return useQuery({
    queryKey: vendorKeys.list(query),
    queryFn: () => vendorsApi.getVendors(query),
    staleTime: 60 * 1000,
  });
}

export function useVendor(id: string, enabled = true) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => vendorsApi.getVendor(id),
    enabled: enabled && !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VendorPayload) => vendorsApi.createVendor(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKeys.all }),
    onError: handleQueryError,
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorPayload> }) =>
      vendorsApi.updateVendor(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorsApi.deleteVendor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKeys.all }),
    onError: handleQueryError,
  });
}

export function useItemComparison(query: ComparisonQuery = {}) {
  return useQuery({
    queryKey: [...vendorKeys.all, 'comparison', query] as const,
    queryFn: () => vendorsApi.getItemComparison(query),
    staleTime: 60 * 1000,
  });
}

export function useVendorItems(id: string, enabled = true) {
  return useQuery({
    queryKey: vendorKeys.items(id),
    queryFn: () => vendorsApi.getVendorItems(id),
    enabled: enabled && !!id,
  });
}

export function useSetVendorItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: VendorItemInput[] }) =>
      vendorsApi.setVendorItems(id, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vendorKeys.all }),
    onError: handleQueryError,
  });
}
