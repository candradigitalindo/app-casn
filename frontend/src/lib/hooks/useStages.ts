'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  stagesApi,
  beritaAcaraApi,
  locationItemsApi,
  UpdateStageDto,
  CreateBeritaAcaraDto,
  CreateLocationItemDto,
} from '@/lib/api/stages';
import type { BeritaAcara, LocationItem } from '@/types/models';
import type { BeritaAcaraType } from '@/types/enums';
import { handleQueryError } from '@/lib/api-client';
import { locationKeys } from './useLocations';

// ============ Query Keys ============
export const stageKeys = {
  all: ['stages'] as const,
  summary: () => [...stageKeys.all, 'summary'] as const,
  location: (locationId: string) => [...stageKeys.all, 'location', locationId] as const,
};

export const beritaAcaraKeys = {
  all: ['berita-acara'] as const,
  lists: () => [...beritaAcaraKeys.all, 'list'] as const,
  list: (query: Record<string, unknown>) => [...beritaAcaraKeys.lists(), query] as const,
  detail: (id: string) => [...beritaAcaraKeys.all, 'detail', id] as const,
};

export const locationItemKeys = {
  all: ['location-items'] as const,
  allItems: () => [...locationItemKeys.all, 'all'] as const,
  location: (locationId: string) => [...locationItemKeys.all, locationId] as const,
};

// Perubahan barang men-sync fase INSTALASI + status lokasi di backend,
// dan grafik dashboard membaca ringkasan instalasi dari barang — refresh semuanya.
// (key installations ditulis literal untuk menghindari import melingkar dengan useInstallations)
function invalidateItemRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: locationItemKeys.all });
  queryClient.invalidateQueries({ queryKey: ['installations'] });
  queryClient.invalidateQueries({ queryKey: stageKeys.all });
  queryClient.invalidateQueries({ queryKey: locationKeys.all });
}

// ============ Tahapan ============
export function useLocationStages(locationId: string) {
  return useQuery({
    queryKey: stageKeys.location(locationId),
    queryFn: () => stagesApi.getByLocation(locationId),
    enabled: !!locationId,
    staleTime: 30 * 1000,
  });
}

export function useStagesSummary() {
  return useQuery({
    queryKey: stageKeys.summary(),
    queryFn: () => stagesApi.getSummary(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateStage(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStageDto }) => stagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.location(locationId) });
      queryClient.invalidateQueries({ queryKey: stageKeys.summary() });
      // Status lokasi diturunkan dari tahapan di backend — refresh
      // daftar lokasi & dashboard agar badge status ikut terbarui.
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
    onError: handleQueryError,
  });
}

export function useAddStagePhoto(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, url, caption }: { id: string; url: string; caption: string }) =>
      stagesApi.addPhoto(id, { url, caption, takenAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.location(locationId) });
    },
    onError: handleQueryError,
  });
}

export function useDeleteStagePhoto(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, photoId }: { stageId: string; photoId: string }) =>
      stagesApi.deletePhoto(stageId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageKeys.location(locationId) });
    },
    onError: handleQueryError,
  });
}

// ============ Berita Acara ============
export function useBeritaAcaraList(query: { locationId?: string; type?: BeritaAcaraType } = {}) {
  return useQuery({
    queryKey: beritaAcaraKeys.list(query),
    queryFn: () => beritaAcaraApi.getAll(query),
    staleTime: 30 * 1000,
  });
}

export function useCreateBeritaAcara() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBeritaAcaraDto) => beritaAcaraApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beritaAcaraKeys.lists() });
    },
    onError: handleQueryError,
  });
}

export function useUpdateBeritaAcara() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BeritaAcara> }) => beritaAcaraApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beritaAcaraKeys.all });
    },
    onError: handleQueryError,
  });
}

export function useBeritaAcaraReport() {
  return useQuery({
    queryKey: [...beritaAcaraKeys.all, 'report'],
    queryFn: () => beritaAcaraApi.report(),
    staleTime: 30 * 1000,
  });
}

export function useApproveBeritaAcara() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beritaAcaraApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: beritaAcaraKeys.all }),
    onError: handleQueryError,
  });
}

export function useRejectBeritaAcara() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => beritaAcaraApi.reject(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: beritaAcaraKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeleteBeritaAcara() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beritaAcaraApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beritaAcaraKeys.lists() });
    },
    onError: handleQueryError,
  });
}

// ============ Barang di Titik Lokasi ============
export function useAllLocationItems() {
  return useQuery({
    queryKey: locationItemKeys.allItems(),
    queryFn: () => locationItemsApi.getAll(),
    staleTime: 30 * 1000,
  });
}

export function useLocationItems(locationId: string) {
  return useQuery({
    queryKey: locationItemKeys.location(locationId),
    queryFn: () => locationItemsApi.getByLocation(locationId),
    enabled: !!locationId,
    staleTime: 30 * 1000,
  });
}

export function useCreateLocationItem(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLocationItemDto) => locationItemsApi.create(locationId, data),
    onSuccess: () => {
      invalidateItemRelatedQueries(queryClient);
    },
    onError: handleQueryError,
  });
}

export function useUpdateLocationItem(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<LocationItem> }) =>
      locationItemsApi.update(locationId, itemId, data),
    onSuccess: () => {
      invalidateItemRelatedQueries(queryClient);
    },
    onError: handleQueryError,
  });
}

export function useDeleteLocationItem(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => locationItemsApi.delete(locationId, itemId),
    onSuccess: () => {
      invalidateItemRelatedQueries(queryClient);
    },
    onError: handleQueryError,
  });
}

export function useSeedStandardItems(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (capacity: number) => locationItemsApi.seedStandard(locationId, capacity),
    onSuccess: () => {
      invalidateItemRelatedQueries(queryClient);
    },
    onError: handleQueryError,
  });
}
