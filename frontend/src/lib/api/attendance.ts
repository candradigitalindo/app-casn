import { apiClient, ApiResponse } from '../api-client';
import type { AttendanceLog } from '@/types/models';

export interface AttendanceQuery {
  locationId?: string;
  session?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ScanDto {
  locationId: string;
  barcodeValue: string;
  session: number;
  scannedBy?: string;
}

export const attendanceApi = {
  getLogs: (query: AttendanceQuery = {}): Promise<ApiResponse<AttendanceLog[]>> =>
    apiClient.get('/api/v1/attendance/logs', { params: query }),

  scan: (data: ScanDto): Promise<ApiResponse<AttendanceLog>> =>
    apiClient.post('/api/v1/attendance/scan', data),
};
