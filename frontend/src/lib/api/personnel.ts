import { apiClient, ApiResponse } from '../api-client';
import type { Personnel, PersonnelAttendance } from '@/types/models';
import type { EducationLevel, Gender, PersonnelRole } from '@/types/enums';

export interface PersonnelProfilePayload {
  phone?: string;
  notes?: string;
  nik?: string;
  birthPlace?: string;
  birthDate?: string | null;
  gender?: Gender | null;
  address?: string;
  email?: string | null;
  educationLevel?: EducationLevel | null;
  educationMajor?: string;
  educationInstitution?: string;
  diplomaFileUrl?: string | null;
  diplomaFileName?: string | null;
  honorPerDay?: number | null;
  recommendedRole?: PersonnelRole | null;
}

export interface CreatePersonnelDto extends PersonnelProfilePayload {
  locationId?: string | null;
  name: string;
  role: PersonnelRole;
}

export interface UpdatePersonnelDto extends PersonnelProfilePayload {
  locationId?: string | null;
  name?: string;
  role?: PersonnelRole;
}

export interface PersonnelQuery {
  locationId?: string;
  search?: string;
  role?: PersonnelRole;
  unassigned?: boolean;
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

  getAll: (query: PersonnelQuery = {}): Promise<ApiResponse<Personnel[]>> =>
    apiClient.get('/api/v1/personnel', {
      params: {
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(query.unassigned ? { unassigned: 'true' } : {}),
      },
    }),

  create: (data: CreatePersonnelDto): Promise<ApiResponse<Personnel>> =>
    apiClient.post('/api/v1/personnel', data),

  update: (id: string, data: UpdatePersonnelDto): Promise<ApiResponse<Personnel>> =>
    apiClient.patch(`/api/v1/personnel/${id}`, data),

  uploadDiploma: (file: File): Promise<ApiResponse<{ url: string }>> =>
    apiClient.uploadFile('/api/v1/uploads', file),

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
