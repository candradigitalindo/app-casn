import { apiClient, ApiResponse } from '../api-client';

// ── Tipe master data wilayah ──
export type RegencyType = 'KABUPATEN' | 'KOTA';

export interface Province {
  id: string;
  code: string;
  name: string;
  _count?: { regencies: number };
  createdAt: string;
  updatedAt: string;
}

export interface Regency {
  id: string;
  code: string;
  name: string;
  type: RegencyType;
  provinceId: string;
  province?: { id: string; code: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface RegencyQuery {
  provinceId?: string;
  type?: RegencyType;
  search?: string;
}

// ── Tipe master item sarpras & kebutuhan tenaga teknis (Kepsesma 240/2026) ──

export type MasterItemOwnership = 'MILIK_SENDIRI' | 'SEWA';

// Kategori sarpras — dasar pemetaan vendor per kategori
export type SarprasCategory = 'SARPRAS_IT' | 'SARPRAS_NON_IT';

export const SarprasCategoryLabels: Record<SarprasCategory, string> = {
  SARPRAS_IT: 'Sarpras IT',
  SARPRAS_NON_IT: 'Sarpras Non IT',
};

export interface MasterItem {
  id: string;
  no: number;
  name: string;
  unit: string;
  ownership: MasterItemOwnership;
  category: SarprasCategory;
  qty100: number;
  qty200: number;
  qty300: number;
  qty400: number;
  qty500: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MasterItemPayload {
  no: number;
  name: string;
  unit: string;
  ownership?: MasterItemOwnership;
  category?: SarprasCategory;
  qty100: number;
  qty200: number;
  qty300: number;
  qty400: number;
  qty500: number;
  isActive?: boolean;
  notes?: string;
}

export interface MasterItemQuery {
  search?: string;
  includeInactive?: boolean;
  category?: SarprasCategory;
}

export interface PersonnelRequirement {
  id: string;
  capacity: number;
  koordinator: number;
  tenagaIt: number;
  elektrikal: number;
  sarpras: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonnelRequirementPayload {
  capacity: number;
  koordinator: number;
  tenagaIt: number;
  elektrikal: number;
  sarpras: number;
}

export const masterDataApi = {
  // Provinsi
  getProvinces: (search?: string): Promise<ApiResponse<Province[]>> =>
    apiClient.get('/api/v1/master-data/provinces', { params: search ? { search } : undefined }),

  createProvince: (data: { code: string; name: string }): Promise<ApiResponse<Province>> =>
    apiClient.post('/api/v1/master-data/provinces', data),

  updateProvince: (id: string, data: { code?: string; name?: string }): Promise<ApiResponse<Province>> =>
    apiClient.patch(`/api/v1/master-data/provinces/${id}`, data),

  deleteProvince: (id: string): Promise<ApiResponse<{ deletedRegencies: number }>> =>
    apiClient.delete(`/api/v1/master-data/provinces/${id}`),

  // Kabupaten / Kota
  getRegencies: (query: RegencyQuery = {}): Promise<ApiResponse<Regency[]>> =>
    apiClient.get('/api/v1/master-data/regencies', { params: query }),

  createRegency: (data: { code: string; name: string; type: RegencyType; provinceId: string }): Promise<ApiResponse<Regency>> =>
    apiClient.post('/api/v1/master-data/regencies', data),

  updateRegency: (id: string, data: Partial<{ code: string; name: string; type: RegencyType; provinceId: string }>): Promise<ApiResponse<Regency>> =>
    apiClient.patch(`/api/v1/master-data/regencies/${id}`, data),

  deleteRegency: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete(`/api/v1/master-data/regencies/${id}`),

  // Master item sarana prasarana (38 item Lampiran E Kepsesma 240/2026)
  getMasterItems: (query: MasterItemQuery = {}): Promise<ApiResponse<MasterItem[]>> =>
    apiClient.get('/api/v1/master-data/items', {
      params: {
        ...(query.search ? { search: query.search } : {}),
        ...(query.includeInactive ? { includeInactive: 'true' } : {}),
        ...(query.category ? { category: query.category } : {}),
      },
    }),

  createMasterItem: (data: MasterItemPayload): Promise<ApiResponse<MasterItem>> =>
    apiClient.post('/api/v1/master-data/items', data),

  updateMasterItem: (id: string, data: Partial<MasterItemPayload>): Promise<ApiResponse<MasterItem>> =>
    apiClient.patch(`/api/v1/master-data/items/${id}`, data),

  deleteMasterItem: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete(`/api/v1/master-data/items/${id}`),

  // Kebutuhan tenaga teknis per tier kapasitas (huruf D.4.e Kepsesma 240/2026)
  getPersonnelRequirements: (): Promise<ApiResponse<PersonnelRequirement[]>> =>
    apiClient.get('/api/v1/master-data/personnel-requirements'),

  createPersonnelRequirement: (data: PersonnelRequirementPayload): Promise<ApiResponse<PersonnelRequirement>> =>
    apiClient.post('/api/v1/master-data/personnel-requirements', data),

  updatePersonnelRequirement: (id: string, data: Partial<PersonnelRequirementPayload>): Promise<ApiResponse<PersonnelRequirement>> =>
    apiClient.patch(`/api/v1/master-data/personnel-requirements/${id}`, data),

  deletePersonnelRequirement: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete(`/api/v1/master-data/personnel-requirements/${id}`),
};
