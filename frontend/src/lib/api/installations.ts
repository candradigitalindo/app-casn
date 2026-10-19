import { apiClient, ApiResponse } from '../api-client';

// API Service
export const installationsApi = {
  // Get installation summary by province
  getInstallationSummary: (): Promise<ApiResponse<any[]>> =>
    apiClient.get('/api/v1/installations/summary'),
};
