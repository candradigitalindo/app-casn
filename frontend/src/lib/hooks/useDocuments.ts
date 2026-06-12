import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, CreateDocumentDto } from '@/lib/api/documents';
import type { LocationDocument } from '@/types/models';
import { handleQueryError } from '@/lib/api-client';

export const documentKeys = {
  all: ['documents'] as const,
  location: (locationId: string) => [...documentKeys.all, locationId] as const,
};

export function useDocuments(locationId: string) {
  return useQuery({
    queryKey: documentKeys.location(locationId),
    queryFn: () => documentsApi.getByLocation(locationId),
    enabled: !!locationId,
    staleTime: 30 * 1000,
  });
}

export function useCreateDocument(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentDto) => documentsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.location(locationId) }),
    onError: handleQueryError,
  });
}

export function useUpdateDocument(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LocationDocument> }) => documentsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.location(locationId) }),
    onError: handleQueryError,
  });
}

export function useDeleteDocument(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.location(locationId) }),
    onError: handleQueryError,
  });
}
