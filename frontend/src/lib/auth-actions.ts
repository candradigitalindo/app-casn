import { apiClient } from './api-client';
import { useAuthStore } from './stores/auth';

export async function logoutSession() {
  useAuthStore.getState().logout();
  await apiClient.post('/api/v1/auth/logout');
}
