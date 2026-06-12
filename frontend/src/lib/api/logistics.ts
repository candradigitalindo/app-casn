import { apiClient, ApiResponse } from '../api-client';
import type { LogisticsShipment, InventoryChecklist, InventoryItem } from '@/types/models';
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

export interface InventoryChecklistDto {
  locationId: string;
  itemId: string;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  missingQty: number;
  notes?: string;
  photos?: string[];
}

// API Service
export const logisticsApi = {
  // Get all shipments
  getShipments: (query?: { status?: ShipmentStatus; destinationLocationId?: string }) =>
    apiClient.get<LogisticsShipment[]>('/api/v1/logistics/shipments', {
      params: query,
    }),

  // Get shipment detail
  getShipment: (id: string) =>
    apiClient.get<LogisticsShipment>(`/api/v1/logistics/shipments/${id}`),

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

  // Get inventory checklist for location
  getInventoryChecklist: (locationId: string) =>
    apiClient.get<InventoryChecklist[]>(`/api/v1/logistics/inventory/checklists/${locationId}`),

  // Submit inventory checklist
  submitInventoryChecklist: (data: InventoryChecklistDto) =>
    apiClient.post<InventoryChecklist>('/api/v1/logistics/inventory/checklists', data),

  // Update inventory checklist
  updateInventoryChecklist: (id: string, data: Partial<InventoryChecklistDto>) =>
    apiClient.patch<InventoryChecklist>(`/api/v1/logistics/inventory/checklists/${id}`, data),

  // Get buffer stock availability
  getBufferStock: (): Promise<ApiResponse<any[]>> =>
    apiClient.get('/api/v1/logistics/inventory/buffer-stock'),

  // Get shipment tracking summary
  getTrackingSummary: (): Promise<ApiResponse<{
    inTransit: number;
    packing: number;
    arrived: number;
    received: number;
    returned: number;
  }>> =>
    apiClient.get('/api/v1/logistics/shipments/summary'),
};