import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/lib/stores/auth';

// API Response Types
interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface ApiError {
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    constraint?: string;
  }>;
  requestId: string;
  timestamp: string;
  path: string;
}

// API Client Configuration
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Wajib true agar httpOnly refresh_token cookie terkirim/tersimpan
  // saat frontend (3000) memanggil backend (4000).
  withCredentials: true,
};

class ApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create(API_CONFIG);

    // Request Interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const { token } = useAuthStore.getState();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        return this.handleResponseError(error);
      }
    );
  }

  // Error Handling
  private async handleResponseError(error: AxiosError<ApiError>): Promise<never> {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Try refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await this.refreshAccessToken();

        // Update the header and retry
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return this.client(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();

        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const apiError: ApiError = error.response?.data || {
      statusCode: error.response?.status || 500,
      message: error.message || 'Internal Server Error',
      requestId: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      path: originalRequest.url || '',
    };

    // Log error for monitoring
    this.logError(apiError, error);

    return Promise.reject(apiError);
  }

  // Token Management
  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple refresh attempts
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = this.performTokenRefresh();

    try {
      const token = await this.refreshTokenPromise;
      return token;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const response = await this.client.post('/api/v1/auth/refresh', {}, {
        withCredentials: true
      });

      const newToken = response.data.data.tokens.accessToken;

      useAuthStore.getState().setToken(newToken);

      return newToken;
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }

  // Utility Methods
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(apiError: ApiError, originalError: AxiosError): void {
    // In production, send to monitoring service (Sentry, etc.)
    // eslint-disable-next-line no-console
    console.error('[API Error]', {
      ...apiError,
      url: originalError.config?.url,
      method: originalError.config?.method,
    });
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File Upload
  async uploadFile<T>(url: string, file: File, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // WebSocket Connection Helper
  getWebSocketUrl(): string {
    // WebSocket tidak melewati rewrites Next, jadi di dev harus ke backend langsung.
    if (process.env.NEXT_PUBLIC_WS_URL) return `${process.env.NEXT_PUBLIC_WS_URL}/ws`;
    const baseURL = API_CONFIG.baseURL;
    if (!baseURL) {
      const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/ws`;
    }
    const wsUrl = baseURL.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${wsUrl}/ws`;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiResponse, ApiError };

  // Export error handler for React Query
  export const handleQueryError = (error: ApiError) => {
    // eslint-disable-next-line no-console
    console.error('[Query Error]', error);

  // Show toast notification (implement with sonner/react-hot-toast)
  if (error.statusCode >= 500) {
    // Toast error('Server error. Please try again later.');
  } else if (error.statusCode === 401) {
    // Toast info('Session expired. Please login again.');
  } else if (error.statusCode === 403) {
    // Toast error('You do not have permission to perform this action.');
  } else if (error.statusCode === 404) {
    // Toast error('Resource not found.');
  } else {
    // Toast error(error.message || 'An error occurred');
  }
};

// Extend AxiosRequestConfig for retry flag
declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}