import { apiClient } from '../api-client';
import type { Location, DashboardStats } from '@/types/models';
import { LocationStatus } from '@/types/enums';

// Types
export interface LocationQuery {
  province?: string;
  city?: string;
  status?: LocationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// API Service
export const locationsApi = {
  // Get all locations with filtering
  getLocations: (query: LocationQuery = {}) =>
    apiClient.get<Location[]>('/api/v1/locations', {
      params: query,
    }),

  // Get location detail
  getLocation: (id: string) =>
    apiClient.get<Location>(`/api/v1/locations/${id}`),

  // Get national dashboard stats
  getNationalStats: () =>
    apiClient.get<DashboardStats>('/api/v1/locations/stats/summary'),

  // Create location (admin only)
  createLocation: (data: Partial<Location>) =>
    apiClient.post<Location>('/api/v1/locations', data),

  // Update location
  updateLocation: (id: string, data: Partial<Location>) =>
    apiClient.patch<Location>(`/api/v1/locations/${id}`, data),

  // Update capacity & auto-scale items
  updateCapacity: (id: string, capacity: number) =>
    apiClient.patch<{ location: Location; updatedItems: any[] }>(`/api/v1/locations/${id}/capacity`, { capacity }),

  // Delete location (admin only)
  deleteLocation: (id: string) =>
    apiClient.delete<void>(`/api/v1/locations/${id}`),
};
