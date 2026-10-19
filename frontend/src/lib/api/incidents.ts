import { apiClient } from '../api-client';
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

// API Service
export const incidentsApi = {
  // Get all tickets with filtering
  getTickets: (query: TicketQuery = {}) =>
    query.page ? apiClient.get<IncidentTicket[]>('/api/v1/incidents/tickets', { params: query }) : apiClient.getAll<IncidentTicket>('/api/v1/incidents/tickets', { ...query }),

  // Create new ticket
  createTicket: (data: CreateTicketDto) =>
    apiClient.post<IncidentTicket>('/api/v1/incidents/tickets', data),

  // Update ticket status
  updateTicketStatus: (id: string, data: UpdateTicketDto) =>
    apiClient.patch<IncidentTicket>(`/api/v1/incidents/tickets/${id}/status`, data),

  // Get overdue SLA tickets
  getOverdueTickets: () =>
    apiClient.get<IncidentTicket[]>('/api/v1/incidents/tickets/sla/overdue'),

  // Delete ticket
  deleteTicket: (id: string) =>
    apiClient.delete<null>(`/api/v1/incidents/tickets/${id}`),
};
