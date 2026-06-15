import {
  UserRole,
  LocationStatus,
  InstallationMilestone,
  TicketSeverity,
  TicketCategory,
  TicketStatus,
  ShipmentStatus,
  InventoryCategory,
  StagePhase,
  StageStatus,
  StagePhotoCategory,
  BeritaAcaraType,
  BeritaAcaraStatus,
  TransportMode,
  DeliveryType,
  ItemOwnership,
  ItemCondition,
} from './enums';

// ============================================
// USER
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  locationId?: string;
  instansi?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// LOCATION
// ============================================

export interface Location {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  coordinatorId?: string;
  coordinator?: User;
  status: LocationStatus;
  capacity: number;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INSTALLATION PROGRESS
// ============================================

export interface InstallationProgress {
  id: string;
  locationId: string;
  location?: Location;
  milestone: InstallationMilestone;
  percentage: number;
  notes?: string;
  photos?: Array<{
    url: string;
    lat: number;
    lng: number;
    timestamp: string;
  }>;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INCIDENT TICKET
// ============================================

export interface IncidentTicket {
  id: string;
  ticketNumber: string;
  locationId: string;
  location?: Location;
  reportedBy: string;
  reporterName: string;
  assignedTo?: string;
  assignee?: User;
  severity: TicketSeverity;
  category: TicketCategory;
  status: TicketStatus;
  title: string;
  description: string;
  photos?: string[];
  slaMinutes: number;
  slaExpiresAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INVENTORY
// ============================================

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: InventoryCategory;
  standardQty: number;
  specifications?: Record<string, unknown>;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryChecklist {
  id: string;
  locationId: string;
  location?: Location;
  itemId: string;
  item?: InventoryItem;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  missingQty: number;
  notes?: string;
  photos?: string[];
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// LOGISTICS
// ============================================

export interface LogisticsShipment {
  id: string;
  shipmentNumber: string;
  originWarehouseId: string;
  destinationLocationId: string;
  destination?: Location;
  createdById: string;
  createdBy?: User;
  status: ShipmentStatus;
  manifestItems: Array<{ itemId: string; qty: number }>;
  shippedAt?: string;
  arrivedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  trackingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ATTENDANCE
// ============================================

export interface AttendanceLog {
  id: string;
  locationId: string;
  location?: Location;
  participantId: string;
  barcodeValue: string;
  participantName: string;
  session: number;
  scanTime: string;
  scannedBy: string;
  scanner?: User;
  notes?: string;
  createdAt: string;
}

// ============================================
// TAHAPAN PEKERJAAN PER TITIK LOKASI
// ============================================

export interface StagePhoto {
  id: string;
  url: string;
  caption: string;
  category: StagePhotoCategory;
  takenAt: string;
  uploadedBy: string;
}

export interface LocationStage {
  id: string;
  locationId: string;
  phase: StagePhase;
  status: StageStatus;
  progress: number; // 0-100
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  photos: StagePhoto[];
  updatedAt: string;
}

// ============================================
// BERITA ACARA (standar surat dinas)
// ============================================

export interface BeritaAcaraParty {
  nama: string;
  jabatan: string;
  instansi: string;
}

export interface BeritaAcara {
  id: string;
  documentNumber: string; // contoh: 001/BA-PGT/ANDALAN/VI/2026
  type: BeritaAcaraType;
  status: BeritaAcaraStatus;
  locationId: string;
  location?: Location;
  title: string;
  date: string; // tanggal berita acara
  body: string; // isi/uraian berita acara
  fileUrl?: string; // file fisik yang di-upload, base64 data URL (PDF/gambar)
  fileName?: string; // nama file asli saat di-upload
  // Alur approval pengawas lapangan
  approvedBy?: { id: string; name: string } | null;
  approvedAt?: string | null;
  rejectionNote?: string | null;
  // Khusus BA Pengantaran (surat jalan)
  transportMode?: TransportMode;
  deliveryType?: DeliveryType;
  courierName?: string;
  vehicleInfo?: string;
  items?: Array<{ name: string; qty: number; unit: string }>;
  // Pihak yang menandatangani
  pihakPertama: BeritaAcaraParty;
  pihakKedua: BeritaAcaraParty;
  photos: StagePhoto[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// BARANG DI TITIK LOKASI
// ============================================

export interface LocationItem {
  id: string;
  locationId: string;
  name: string;
  qty: number;
  unit: string;
  ownership: ItemOwnership;
  condition: ItemCondition;
  installationPct: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface DashboardStats {
  totalLocations: number;
  activeLocations: number;
  totalParticipants: number;
  checkedInParticipants: number;
  openTickets: number;
  resolvedTickets: number;
  installationProgress: number;
  shipmentInTransit: number;
}

export interface ProvinceStats {
  province: string;
  totalLocations: number;
  readyCount: number;
  activeCount: number;
  issuesCount: number;
  preparationCount: number;
}

export interface LocationStatusSummary {
  total: number;
  byStatus: Record<LocationStatus, number>;
  byProvince: Record<string, number>;
}
// ============================================
// PERSONEL SDM
// ============================================

import type { PersonnelRole } from '@/types/enums';

export interface Personnel {
  id: string;
  locationId: string;
  name: string;
  role: PersonnelRole;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonnelAttendance {
  id: string;
  personnelId: string;
  locationId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
  notes?: string;
  fileUrl?: string; // bukti kehadiran, base64 data URL
  fileName?: string;
  createdAt: string;
}

// ============================================
// DOKUMEN LOKASI (upload generik)
// ============================================

import type { DocumentCategory } from '@/types/enums';

export interface LocationDocument {
  id: string;
  locationId: string;
  category: DocumentCategory;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSizeKb?: number;
  uploadedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
