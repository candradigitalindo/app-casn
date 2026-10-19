import { apiClient } from '../api-client';
export const projectLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENYUSUNAN_PENAWARAN: 'Penyusunan penawaran',
  DIAJUKAN: 'Diajukan',
  MENANG: 'Menang',
  KALAH: 'Kalah',
  OPERASIONAL: 'Operasional',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};
export const money = (value: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 2,
  }).format(Number(value));
export interface Allocation {
  id: string;
  vendorId: string;
  vendorItemId?: string;
  qty: number;
  unitPrice: string;
  priceUnit: string;
  subtotal: string;
  notes?: string;
  vendor: { id: string; name: string };
}
export interface Requirement {
  id: string;
  name: string;
  unit: string;
  qty: number;
  allocatedQty: number;
  missingQty: number;
  marginPct?: string;
  effectiveMarginPct: string;
  costTotal: string;
  sellTotal: string;
  allocations: Allocation[];
}
export interface PlanLocation {
  id: string;
  name: string;
  provinceId: string;
  regencyId?: string;
  city: string;
  capacity: number;
  days: number;
  address?: string;
  latitude?: string;
  longitude?: string;
  locationId?: string;
  province: { name: string };
  requirements: Requirement[];
  costTotal: string;
  sellTotal: string;
}
export interface Proposal {
  version: number;
  documentNumber: string;
  costTotal: string;
  sellTotal: string;
  createdAt: string;
  snapshot: Project;
}
export interface Project {
  id: string;
  code: string;
  name: string;
  agencyName: string;
  fiscalYear: number;
  description?: string;
  status: string;
  hpsAmount?: string;
  defaultMarginPct: string;
  startDate?: string;
  endDate?: string;
  submissionDeadline?: string;
  locations: PlanLocation[];
  proposals: Proposal[];
  summary: {
    costTotal: string;
    sellTotal: string;
    profit: string;
    missingLines: number;
    overHps: boolean;
  };
  _count?: { locations: number; proposals: number };
}
export interface Offer {
  id: string;
  vendorId: string;
  vendor: { name: string };
  qty: number;
  availableQty: number;
  unitPrice: string;
  priceUnit: string;
  effectivePerEvent: string;
}
export const projectApi = {
  list: (params: { page: number; search?: string; status?: string }) =>
    apiClient.get<Project[]>('/api/v1/projects', {
      params: { limit: 20, ...params },
    }),
  get: (id: string) => apiClient.get<Project>(`/api/v1/projects/${id}`),
  create: (data: object) => apiClient.post<Project>('/api/v1/projects', data),
  update: (id: string, data: object) =>
    apiClient.patch<Project>(`/api/v1/projects/${id}`, data),
  action: (id: string, path: string, data?: object) =>
    apiClient.post<Project>(`/api/v1/projects/${id}/${path}`, data),
};
