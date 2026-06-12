import { apiClient, ApiResponse } from '../api-client';
import type { InstallationProgress } from '@/types/models';
import { InstallationMilestone } from '@/types/enums';

// Types
export interface UpdateProgressDto {
  locationId: string;
  milestone: InstallationMilestone;
  percentage: number;
  notes?: string;
  photos: Array<{
    url: string;
    lat: number;
    lng: number;
    timestamp: string;
  }>;
}

export interface PhotoEvidence {
  url: string;
  lat: number;
  lng: number;
  timestamp: string;
}

// API Service
export const installationsApi = {
  // Get installation progress for location
  getLocationProgress: (locationId: string) =>
    apiClient.get<InstallationProgress[]>(`/api/v1/installations/progress/${locationId}`),

  // Update installation progress
  updateProgress: (data: UpdateProgressDto) =>
    apiClient.post<InstallationProgress>('/api/v1/installations/progress', data),

  // Upload progress photo with geotagging
  uploadProgressPhoto: (progressId: string, photo: PhotoEvidence) =>
    apiClient.post<InstallationProgress>(
      `/api/v1/installations/progress/${progressId}/photos`,
      photo
    ),

  // Get milestone checklist
  getMilestoneChecklist: (milestone: InstallationMilestone) =>
    apiClient.get<any[]>(`/api/v1/installations/checklist/${milestone}`),

  // Get delay alerts (locations behind schedule)
  getDelayAlerts: () =>
    apiClient.get<any[]>('/api/v1/installations/alerts/delays'),

  // Get all installation progress records
  getAllProgress: (): Promise<ApiResponse<InstallationProgress[]>> =>
    apiClient.get('/api/v1/installations/progress'),

  // Get installation summary by province
  getInstallationSummary: (): Promise<ApiResponse<any[]>> =>
    apiClient.get('/api/v1/installations/summary'),
};