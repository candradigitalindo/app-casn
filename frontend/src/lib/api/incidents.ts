import { apiClient, ApiResponse } from '../api-client';
import type { IncidentTicket } from '@/types/models';
import { TicketStatus, TicketSeverity } from '@/types/enums';

// Types
export interface CreateTicketDto {
  locationId: string;
  severity: TicketSeverity;
  category: string;
  title: string;
  description: string;
  photos?: string[];
}

export interface UpdateTicketDto {
  status?: TicketStatus;
  assignedTo?: string;
  resolutionNote?: string;
}

export interface TicketQuery {
  locationId?: string;
  status?: TicketStatus;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SLAOverdueResponse {
  overdue: number;
  critical: number;
  warning: number;
}

// API Service
export const incidentsApi = {
  // Get all tickets with filtering
  getTickets: (query: TicketQuery = {}) =>
    apiClient.get<IncidentTicket[]>('/api/v1/incidents/tickets', {
      params: query,
    }),

  // Get ticket detail
  getTicket: (id: string) =>
    apiClient.get<IncidentTicket>(`/api/v1/incidents/tickets/${id}`),

  // Create new ticket
  createTicket: (data: CreateTicketDto) =>
    apiClient.post<IncidentTicket>('/api/v1/incidents/tickets', data),

  // Assign ticket to technician
  assignTicket: (id: string, technicianId: string) =>
    apiClient.patch<IncidentTicket>(`/api/v1/incidents/tickets/${id}/assign`, {
      assignedTo: technicianId,
    }),

  // Update ticket status
  updateTicketStatus: (id: string, data: UpdateTicketDto) =>
    apiClient.patch<IncidentTicket>(`/api/v1/incidents/tickets/${id}/status`, data),

  // Get overdue SLA tickets
  getOverdueTickets: () =>
    apiClient.get<IncidentTicket[]>('/api/v1/incidents/tickets/sla/overdue'),

  // Get SLA stats
  getSLAStats: (): Promise<ApiResponse<SLAOverdueResponse>> =>
    apiClient.get('/api/v1/incidents/tickets/sla/stats'),

  // Add note to ticket
  addTicketNote: (id: string, note: string) =>
    apiClient.post<IncidentTicket>(`/api/v1/incidents/tickets/${id}/notes`, { note }),

  // Upload photo for ticket
  uploadTicketPhoto: (id: string, file: File) =>
    apiClient.uploadFile<{ url: string }>(`/api/v1/incidents/tickets/${id}/photos`, file),

  // Escalate ticket
  escalateTicket: (id: string, reason: string) =>
    apiClient.post<IncidentTicket>(`/api/v1/incidents/tickets/${id}/escalate`, { reason }),

  // Delete ticket
  deleteTicket: (id: string) =>
    apiClient.delete<null>(`/api/v1/incidents/tickets/${id}`),
  };