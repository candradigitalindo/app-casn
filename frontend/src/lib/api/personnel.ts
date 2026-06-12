import { apiClient, ApiResponse } from '../api-client';
import type { Personnel, PersonnelAttendance } from '@/types/models';
import type { PersonnelRole } from '@/types/enums';

export interface CreatePersonnelDto {
  locationId: string;
  name: string;
  role: PersonnelRole;
  phone?: string;
  notes?: string;
}

export interface UpsertAttendanceDto {
  personnelId: string;
  locationId: string;
  date: string;
  present: boolean;
  notes?: string;
  // Bukti kehadiran (base64 data URL) yang di-upload admin
  fileUrl?: string;
  fileName?: string;
}

export const personnelApi = {
  getByLocation: (locationId: string): Promise<ApiResponse<Personnel[]>> =>
    apiClient.get('/api/v1/personnel', { params: { locationId } }),

  create: (data: CreatePersonnelDto): Promise<ApiResponse<Personnel>> =>
    apiClient.post('/api/v1/personnel', data),

  update: (id: string, data: Partial<Personnel>): Promise<ApiResponse<Personnel>> =>
    apiClient.patch(`/api/v1/personnel/${id}`, data),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/api/v1/personnel/${id}`),

  getAttendance: (locationId: string, date: string): Promise<ApiResponse<PersonnelAttendance[]>> =>
    apiClient.get('/api/v1/personnel/attendance', { params: { locationId, date } }),

  getAllAttendance: (locationId: string): Promise<ApiResponse<PersonnelAttendance[]>> =>
    apiClient.get('/api/v1/personnel/attendance', { params: { locationId } }),

  upsertAttendance: (data: UpsertAttendanceDto): Promise<ApiResponse<PersonnelAttendance>> =>
    apiClient.post('/api/v1/personnel/attendance', data),

  deleteAttendance: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete(`/api/v1/personnel/attendance/${id}`),

  getSummary: (): Promise<ApiResponse<{
    total: number;
    presentToday: number;
    byLocation: Array<{ locationId: string; locationName: string; total: number; present: number }>;
  }>> =>
    apiClient.get('/api/v1/personnel/summary'),
};
