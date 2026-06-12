import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsApi, LocationQuery, ProvinceData } from '@/lib/api/locations';
import { handleQueryError } from '@/lib/api-client';
import type { Location, DashboardStats } from '@/types/models';
import { LocationStatus } from '@/types/enums';
import { useAuthStore } from '@/lib/stores/auth';

// Query Keys
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
  stats: () => [...locationKeys.all, 'stats'] as const,
  provinceStats: () => [...locationKeys.all, 'province-stats'] as const,
  installations: (id: string) => [...locationKeys.all, 'installations', id] as const,
};

// Hooks
// Pengguna yang terikat ke satu titik lokasi (user.locationId terisi)
// hanya melihat data lokasinya sendiri di seluruh aplikasi.
export function useLocations(query: LocationQuery = {}) {
  const scopedLocationId = useAuthStore((s) => s.user?.locationId);
  return useQuery({
    queryKey: [...locationKeys.lists(), query],
    queryFn: () => locationsApi.getLocations(query),
    select: scopedLocationId
      ? (res) => ({ ...res, data: (res.data ?? []).filter((l) => l.id === scopedLocationId) })
      : undefined,
  });
}

// Status scope lokasi user: terikat ke lokasi? lokasinya masih ada?
export function useLocationScope() {
  const scopedLocationId = useAuthStore((s) => s.user?.locationId);
  const { data, isLoading } = useLocations({});
  return {
    scopedLocationId: scopedLocationId ?? null,
    // true = user terikat lokasi tapi lokasinya tidak ditemukan (mis. sudah dihapus)
    missing: !!scopedLocationId && !isLoading && (data?.data ?? []).length === 0,
  };
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => locationsApi.getLocation(id),
    enabled: !!id,
  });
}

export function useLocationStats() {
  return useQuery({
    queryKey: locationKeys.stats(),
    queryFn: () => locationsApi.getNationalStats(),
    // Refetch stats every 30 seconds for real-time feel
    refetchInterval: 30 * 1000,
  });
}

export function useProvinceStats() {
  return useQuery({
    queryKey: locationKeys.provinceStats(),
    queryFn: () => locationsApi.getProvinceStats(),
    // Refetch every minute
    refetchInterval: 60 * 1000,
  });
}

export function useLocationInstallations(id: string) {
  return useQuery({
    queryKey: locationKeys.installations(id),
    queryFn: () => locationsApi.getLocationInstallations(id),
    enabled: !!id,
  });
}

// Mutations
export function useUpdateLocationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LocationStatus }) =>
      locationsApi.updateLocationStatus(id, status),
    onSuccess: (data, variables) => {
      // Invalidate and refetch location details
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) });
      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: locationKeys.stats() });
    },
    onError: handleQueryError,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: locationsApi.createLocation,
    onSuccess: () => {
      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
    onError: handleQueryError,
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Location> }) =>
      locationsApi.updateLocation(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch location details
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) });
      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
    onError: handleQueryError,
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsApi.deleteLocation(id),
    onSuccess: () => {
      // Hapus lokasi men-cascade ke personnel, stages, items, dokumen,
      // tiket, dll. — invalidate seluruh cache agar tidak ada data basi.
      queryClient.invalidateQueries();
    },
    onError: handleQueryError,
  });
}

export function useUpdateCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, capacity }: { id: string; capacity: number }) =>
      locationsApi.updateCapacity(id, capacity),
    onSuccess: (_data, variables) => {
      // Invalidate location detail
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(variables.id) });
      // Invalidate location items (they get auto-scaled)
      queryClient.invalidateQueries({ queryKey: ['location-items', variables.id] });
      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
    onError: handleQueryError,
  });
}

// Helper hook for dashboard stats
export function useDashboardStats(): DashboardStats | undefined {
  const { data } = useLocationStats();
  return data?.data;
}

// Helper hook for filtered locations
export function useFilteredLocations(query: LocationQuery = {}) {
  return useLocations(query);
}

// Helper hook for locations by status
export function useLocationsByStatus(status: LocationStatus) {
  return useLocations({ status });
}

// Helper hook for active locations count
export function useActiveLocationsCount() {
  const { data } = useLocations({ status: LocationStatus.READY });
  return data?.data.length || 0;
}