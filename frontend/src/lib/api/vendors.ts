import { apiClient, ApiResponse } from '../api-client';
import type { SarprasCategory } from './master-data';

export interface VendorCoverage {
  id: string;
  vendorId: string;
  provinceId: string;
  province?: { id: string; code: string; name: string };
}

export interface Vendor {
  id: string;
  _count?: { items: number };
  code: string;
  name: string;
  categories: SarprasCategory[];
  npwp?: string | null;
  nib?: string | null;
  kbli?: string | null;
  address?: string | null;
  provinceId?: string | null;
  province?: { id: string; code: string; name: string } | null;
  picName?: string | null;
  picPhone?: string | null;
  email?: string | null;
  rating?: number | null;
  isActive: boolean;
  notes?: string | null;
  coverages: VendorCoverage[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorPayload {
  name: string;
  categories: SarprasCategory[];
  npwp?: string;
  nib?: string;
  kbli?: string;
  address?: string;
  provinceId?: string;
  picName?: string;
  picPhone?: string;
  email?: string;
  rating?: number;
  isActive?: boolean;
  notes?: string;
  coverageProvinceIds?: string[];
}

export interface VendorQuery {
  search?: string;
  category?: SarprasCategory;
  provinceId?: string;
  includeInactive?: boolean;
}

// Satuan harga vendor: per hari kegiatan atau flat per event
export type PriceUnit = 'PER_HARI' | 'PER_EVENT';

export const PriceUnitLabels: Record<PriceUnit, string> = {
  PER_HARI: 'per hari',
  PER_EVENT: 'per event',
};

export interface VendorItem {
  id: string;
  vendorId: string;
  masterItemId: string;
  qty: number;
  unitPrice: string | number; // Prisma Decimal terserialisasi sebagai string
  priceUnit: PriceUnit;
  notes?: string | null;
  masterItem: { id: string; no: number; name: string; unit: string; category: SarprasCategory };
  createdAt: string;
  updatedAt: string;
}

export interface VendorItemInput {
  masterItemId: string;
  qty: number;
  unitPrice: number;
  priceUnit?: PriceUnit;
  notes?: string;
}

export interface ItemOffer {
  vendorItemId: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  vendorRating?: number | null;
  qty: number;
  unitPrice: string | number;
  priceUnit: PriceUnit;
  effectivePerEvent: number; // estimasi biaya per unit untuk satu event `days` hari
  notes?: string | null;
}

export interface ItemComparison {
  id: string;
  no: number;
  name: string;
  unit: string;
  category: SarprasCategory;
  days: number;
  offers: ItemOffer[]; // urut biaya efektif per event dari backend
}

export interface ComparisonQuery {
  category?: SarprasCategory;
  provinceId?: string;
  search?: string;
  days?: number;
}

export const vendorsApi = {
  getVendors: (query: VendorQuery = {}): Promise<ApiResponse<Vendor[]>> =>
    apiClient.get('/api/v1/vendors', {
      params: {
        ...(query.search ? { search: query.search } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.provinceId ? { provinceId: query.provinceId } : {}),
        ...(query.includeInactive ? { includeInactive: 'true' } : {}),
      },
    }),

  getVendor: (id: string): Promise<ApiResponse<Vendor>> =>
    apiClient.get(`/api/v1/vendors/${id}`),

  createVendor: (data: VendorPayload): Promise<ApiResponse<Vendor>> =>
    apiClient.post('/api/v1/vendors', data),

  updateVendor: (id: string, data: Partial<VendorPayload>): Promise<ApiResponse<Vendor>> =>
    apiClient.patch(`/api/v1/vendors/${id}`, data),

  setCoverages: (id: string, provinceIds: string[]): Promise<ApiResponse<Vendor>> =>
    apiClient.put(`/api/v1/vendors/${id}/coverages`, { provinceIds }),

  deleteVendor: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete(`/api/v1/vendors/${id}`),

  getVendorItems: (id: string): Promise<ApiResponse<VendorItem[]>> =>
    apiClient.get(`/api/v1/vendors/${id}/items`),

  setVendorItems: (id: string, items: VendorItemInput[]): Promise<ApiResponse<VendorItem[]>> =>
    apiClient.put(`/api/v1/vendors/${id}/items`, { items }),

  getItemComparison: (query: ComparisonQuery = {}): Promise<ApiResponse<ItemComparison[]>> =>
    apiClient.get('/api/v1/vendors/items/comparison', {
      params: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.provinceId ? { provinceId: query.provinceId } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.days ? { days: String(query.days) } : {}),
      },
    }),
};
