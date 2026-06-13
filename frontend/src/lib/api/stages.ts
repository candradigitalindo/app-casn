import { apiClient, ApiResponse } from '../api-client';
import type { LocationStage, BeritaAcara, BeritaAcaraParty, LocationItem, StagePhoto } from '@/types/models';
import type { StagePhase, StageStatus, BeritaAcaraType, TransportMode, DeliveryType, ItemOwnership, ItemCondition } from '@/types/enums';

export interface StageSummary {
  locationId: string;
  locationName: string;
  province: string;
  currentPhase: StagePhase;
  completedPhases: number;
  totalPhases: number;
}

export interface UpdateStageDto {
  status?: StageStatus;
  progress?: number;
  notes?: string;
}

export interface BeritaAcaraReportRow {
  locationId: string;
  locationName: string;
  province: string;
  city: string;
  totalBA: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  byType: Record<string, { count: number; latestStatus: string | null }>;
  items: Array<{
    id: string;
    type: BeritaAcaraType;
    status: string;
    title: string;
    date: string;
    createdAt: string;
    approvedAt?: string | null;
    approvedBy?: { name: string } | null;
  }>;
}

// BA berupa upload file yang sudah ditandatangani — field komposisi
// dokumen (body, pihak, items) tidak lagi dikirim dari form.
export interface CreateBeritaAcaraDto {
  type: BeritaAcaraType;
  locationId: string;
  title: string;
  date: string;
  fileUrl: string;
  fileName: string;
}

export interface CreateLocationItemDto {
  name: string;
  qty: number;
  unit: string;
  ownership: ItemOwnership;
  condition: ItemCondition;
  notes?: string;
}

export const stagesApi = {
  getByLocation: (locationId: string): Promise<ApiResponse<LocationStage[]>> =>
    apiClient.get(`/api/v1/stages/location/${locationId}`),

  getSummary: (): Promise<ApiResponse<StageSummary[]>> =>
    apiClient.get('/api/v1/stages/summary'),

  update: (id: string, data: UpdateStageDto): Promise<ApiResponse<LocationStage>> =>
    apiClient.patch(`/api/v1/stages/${id}`, data),

  addPhoto: (id: string, data: { url: string; caption: string; takenAt: string; uploadedBy?: string }): Promise<ApiResponse<LocationStage>> =>
    apiClient.post(`/api/v1/stages/${id}/photos`, data),

  deletePhoto: (stageId: string, photoId: string): Promise<ApiResponse<LocationStage>> =>
    apiClient.delete(`/api/v1/stages/${stageId}/photos/${photoId}`),
};

export const beritaAcaraApi = {
  getAll: (query: { locationId?: string; type?: BeritaAcaraType } = {}): Promise<ApiResponse<BeritaAcara[]>> =>
    apiClient.get('/api/v1/berita-acara', { params: query }),

  get: (id: string): Promise<ApiResponse<BeritaAcara>> =>
    apiClient.get(`/api/v1/berita-acara/${id}`),

  create: (data: CreateBeritaAcaraDto): Promise<ApiResponse<BeritaAcara>> =>
    apiClient.post('/api/v1/berita-acara', data),

  update: (id: string, data: Partial<BeritaAcara>): Promise<ApiResponse<BeritaAcara>> =>
    apiClient.patch(`/api/v1/berita-acara/${id}`, data),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/api/v1/berita-acara/${id}`),

  // Rekap BA per lokasi (laporan hasil upload berita acara)
  report: (): Promise<ApiResponse<BeritaAcaraReportRow[]>> =>
    apiClient.get('/api/v1/reports/berita-acara'),

  approve: (id: string): Promise<ApiResponse<BeritaAcara>> =>
    apiClient.patch(`/api/v1/berita-acara/${id}/approve`, {}),

  reject: (id: string, note: string): Promise<ApiResponse<BeritaAcara>> =>
    apiClient.patch(`/api/v1/berita-acara/${id}/reject`, { note }),
};

export const locationItemsApi = {
  getAll: (): Promise<ApiResponse<LocationItem[]>> =>
    apiClient.get('/api/v1/locations/items/all'),

  getByLocation: (locationId: string): Promise<ApiResponse<LocationItem[]>> =>
    apiClient.get(`/api/v1/locations/${locationId}/items`),

  create: (locationId: string, data: CreateLocationItemDto): Promise<ApiResponse<LocationItem>> =>
    apiClient.post(`/api/v1/locations/${locationId}/items`, data),

  update: (locationId: string, itemId: string, data: Partial<LocationItem>): Promise<ApiResponse<LocationItem>> =>
    apiClient.patch(`/api/v1/locations/${locationId}/items/${itemId}`, data),

  delete: (locationId: string, itemId: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/api/v1/locations/${locationId}/items/${itemId}`),

  seedStandard: (locationId: string, capacity = 100): Promise<ApiResponse<LocationItem[]>> =>
    apiClient.post(`/api/v1/locations/${locationId}/items/seed-standard`, { capacity }),
};
