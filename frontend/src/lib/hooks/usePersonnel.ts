import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  personnelApi, CreatePersonnelDto, UpdatePersonnelDto, PersonnelQuery, UpsertAttendanceDto,
} from '@/lib/api/personnel';
import { handleQueryError } from '@/lib/api-client';

export const personnelKeys = {
  all: ['personnel'] as const,
  location: (locationId: string) => [...personnelKeys.all, locationId] as const,
  attendance: (locationId: string, date: string) => [...personnelKeys.all, 'attendance', locationId, date] as const,
};

export function usePersonnel(locationId: string) {
  return useQuery({
    queryKey: personnelKeys.location(locationId),
    queryFn: () => personnelApi.getByLocation(locationId),
    enabled: !!locationId,
    staleTime: 30 * 1000,
  });
}

// Master Data Tenaga Teknis (lintas lokasi, dengan filter)
export function useAllPersonnel(query: PersonnelQuery = {}) {
  return useQuery({
    queryKey: [...personnelKeys.all, 'master', query] as const,
    queryFn: () => personnelApi.getAll(query),
    staleTime: 30 * 1000,
  });
}

export function useSavePersonnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CreatePersonnelDto | UpdatePersonnelDto }) =>
      id ? personnelApi.update(id, data) : personnelApi.create(data as CreatePersonnelDto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeletePersonnelGlobal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personnelApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.all }),
    onError: handleQueryError,
  });
}

export function usePersonnelAttendance(locationId: string, date: string) {
  return useQuery({
    queryKey: personnelKeys.attendance(locationId, date),
    queryFn: () => personnelApi.getAttendance(locationId, date),
    enabled: !!locationId && !!date,
    staleTime: 10 * 1000,
  });
}

export function useAllPersonnelAttendance(locationId: string, enabled = true) {
  return useQuery({
    queryKey: [...personnelKeys.all, 'attendance-all', locationId],
    queryFn: () => personnelApi.getAllAttendance(locationId),
    enabled: !!locationId && enabled,
    staleTime: 10 * 1000,
  });
}

export function useCreatePersonnel(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonnelDto) => personnelApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.location(locationId) }),
    onError: handleQueryError,
  });
}

export function useUpdatePersonnel(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePersonnelDto }) => personnelApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.location(locationId) }),
    onError: handleQueryError,
  });
}

export function useDeletePersonnel(locationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personnelApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.location(locationId) }),
    onError: handleQueryError,
  });
}

export function usePersonnelSummary() {
  return useQuery({
    queryKey: [...personnelKeys.all, 'summary'],
    queryFn: () => personnelApi.getSummary(),
    staleTime: 30 * 1000,
  });
}

export function useUpsertAttendance(locationId: string, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertAttendanceDto) => personnelApi.upsertAttendance(data),
    // Invalidate semua query personnel agar tab Rekap (attendance-all)
    // dan summary dashboard ikut terbarui, bukan hanya tanggal aktif.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeleteAttendance(locationId: string, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => personnelApi.deleteAttendance(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personnelKeys.all }),
    onError: handleQueryError,
  });
}
