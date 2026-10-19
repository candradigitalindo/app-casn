import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  masterDataApi,
  MasterItemPayload,
  MasterItemQuery,
  PersonnelRequirementPayload,
  RegencyQuery,
  RegencyType,
} from '@/lib/api/master-data';
import { handleQueryError } from '@/lib/api-client';

export const masterDataKeys = {
  all: ['master-data'] as const,
  provinces: (search?: string) => [...masterDataKeys.all, 'provinces', search ?? ''] as const,
  regencies: (query: RegencyQuery) => [...masterDataKeys.all, 'regencies', query] as const,
  items: (query: MasterItemQuery) => [...masterDataKeys.all, 'items', query] as const,
  personnelRequirements: () => [...masterDataKeys.all, 'personnel-requirements'] as const,
};

// ── Provinsi ──

export function useProvinces(search?: string) {
  return useQuery({
    queryKey: masterDataKeys.provinces(search),
    queryFn: () => masterDataApi.getProvinces(search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProvince() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createProvince,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

export function useUpdateProvince() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { code?: string; name?: string } }) =>
      masterDataApi.updateProvince(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeleteProvince() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => masterDataApi.deleteProvince(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

// ── Kabupaten / Kota ──

export function useRegencies(query: RegencyQuery = {}, enabled = true) {
  return useQuery({
    queryKey: masterDataKeys.regencies(query),
    queryFn: () => masterDataApi.getRegencies(query),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCreateRegency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createRegency,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

export function useUpdateRegency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ code: string; name: string; type: RegencyType; provinceId: string }> }) =>
      masterDataApi.updateRegency(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeleteRegency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => masterDataApi.deleteRegency(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

// ── Master Item Sarana Prasarana (Kepsesma 240/2026) ──

export function useMasterItems(query: MasterItemQuery = {}) {
  return useQuery({
    queryKey: masterDataKeys.items(query),
    queryFn: () => masterDataApi.getMasterItems(query),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMasterItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createMasterItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.all });
      queryClient.invalidateQueries({ queryKey: ['shipments', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: handleQueryError,
  });
}

export function useUpdateMasterItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MasterItemPayload> }) =>
      masterDataApi.updateMasterItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.all });
      queryClient.invalidateQueries({ queryKey: ['shipments', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: handleQueryError,
  });
}

export function useDeleteMasterItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => masterDataApi.deleteMasterItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.all });
      queryClient.invalidateQueries({ queryKey: ['shipments', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: handleQueryError,
  });
}

// ── Kebutuhan Tenaga Teknis per tier (Kepsesma 240/2026) ──

export function usePersonnelRequirements() {
  return useQuery({
    queryKey: masterDataKeys.personnelRequirements(),
    queryFn: () => masterDataApi.getPersonnelRequirements(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePersonnelRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createPersonnelRequirement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

export function useUpdatePersonnelRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PersonnelRequirementPayload> }) =>
      masterDataApi.updatePersonnelRequirement(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}

export function useDeletePersonnelRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => masterDataApi.deletePersonnelRequirement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: masterDataKeys.all }),
    onError: handleQueryError,
  });
}
