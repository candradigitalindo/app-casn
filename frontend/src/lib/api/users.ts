import { apiClient, ApiResponse } from '../api-client';
import type { User } from '@/types/models';
import type { UserRole } from '@/types/enums';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  locationId?: string;
  instansi?: string;
}

export const usersApi = {
  getAll: (params?: { role?: string; search?: string }): Promise<ApiResponse<User[]>> =>
    apiClient.get('/api/v1/users', { params }),

  create: (data: CreateUserDto): Promise<ApiResponse<User>> =>
    apiClient.post('/api/v1/users', data),

  update: (id: string, data: Partial<Omit<CreateUserDto, 'password'>> & { password?: string }): Promise<ApiResponse<User>> =>
    apiClient.patch(`/api/v1/users/${id}`, data),

  delete: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/api/v1/users/${id}`),

  toggleActive: (id: string): Promise<ApiResponse<User>> =>
    apiClient.patch(`/api/v1/users/${id}/toggle-active`, {}),
};
