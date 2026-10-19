import { apiClient } from '../api-client';
import type { LogisticsShipment, InventoryItem } from '@/types/models';
import { ShipmentStatus } from '@/types/enums';

// Types
export interface CreateShipmentDto {
  originWarehouseId: string;
  destinationLocationId: string;
  manifestItems: Array<{
    itemId: string;
    qty: number;
  }>;
}

export interface UpdateShipmentDto {
  status?: ShipmentStatus;
  trackingNotes?: string;
  receivedBy?: string;
}

// API Service
export const logisticsApi = {
  // Get all shipments
  getShipments: (query?: { status?: ShipmentStatus; destinationLocationId?: string; page?: number; limit?: number }) =>
    query?.page ? apiClient.get<LogisticsShipment[]>('/api/v1/logistics/shipments', { params: query }) : apiClient.getAll<LogisticsShipment>('/api/v1/logistics/shipments', { ...query }),

  // Create new shipment
  createShipment: (data: CreateShipmentDto) =>
    apiClient.post<LogisticsShipment>('/api/v1/logistics/shipments', data),

  // Update shipment status
  updateShipment: (id: string, data: UpdateShipmentDto) =>
    apiClient.patch<LogisticsShipment>(`/api/v1/logistics/shipments/${id}`, data),

  // Delete shipment
  deleteShipment: (id: string) =>
    apiClient.delete(`/api/v1/logistics/shipments/${id}`),

  // Get inventory items list
  getInventoryItems: () =>
    apiClient.get<InventoryItem[]>('/api/v1/logistics/inventory/items'),
};
