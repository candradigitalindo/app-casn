import { apiClient, ApiResponse } from '../api-client';
import type { LocationDocument } from '@/types/models';
import type { DocumentCategory } from '@/types/enums';

export interface CreateDocumentDto {
  locationId: string;
  category: DocumentCategory;
  name: string;
  fileName: string;
  fileUrl: string; // base64 data URL
  fileSizeKb?: number;
  notes?: string;
}

export const documentsApi = {
  getByLocation: (locationId: string): Promise<ApiResponse<LocationDocument[]>> =>
    apiClient.get('/api/v1/documents', { params: { locationId } }),

  create: (data: CreateDocumentDto): Promise<ApiResponse<LocationDocument>> =>
    apiClient.post('/api/v1/documents', data),

  update: (id: string, data: Partial<LocationDocument>): Promise<ApiResponse<LocationDocument>> =>
    apiClient.patch(`/api/v1/documents/${id}`, data),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/api/v1/documents/${id}`),
};
