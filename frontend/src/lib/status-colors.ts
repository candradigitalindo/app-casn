import {
  LocationStatus,
  TicketSeverity,
  ShipmentStatus,
} from '@/types/enums';

export const locationStatusColors: Record<LocationStatus, string> = {
  [LocationStatus.READY]: 'bg-emerald-500',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'bg-amber-500',
  [LocationStatus.PREPARATION]: 'bg-slate-400',
  [LocationStatus.CLOSED]: 'bg-slate-300',
};

export const locationStatusTextColors: Record<LocationStatus, string> = {
  [LocationStatus.READY]: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'text-amber-700 bg-amber-50 border-amber-200',
  [LocationStatus.PREPARATION]: 'text-slate-600 bg-slate-50 border-slate-200',
  [LocationStatus.CLOSED]: 'text-slate-500 bg-slate-50 border-slate-200',
};

export const ticketSeverityColors: Record<TicketSeverity, string> = {
  [TicketSeverity.LOW]: 'text-blue-700 bg-blue-50 border-blue-200',
  [TicketSeverity.MEDIUM]: 'text-amber-700 bg-amber-50 border-amber-200',
  [TicketSeverity.HIGH]: 'text-orange-700 bg-orange-50 border-orange-200',
  [TicketSeverity.CRITICAL]: 'text-red-700 bg-red-50 border-red-200',
};

export const shipmentStatusColors: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PACKING]: 'text-slate-700 bg-slate-50 border-slate-200',
  [ShipmentStatus.IN_TRANSIT]: 'text-blue-700 bg-blue-50 border-blue-200',
  [ShipmentStatus.ARRIVED]: 'text-amber-700 bg-amber-50 border-amber-200',
  [ShipmentStatus.RECEIVED]: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  [ShipmentStatus.RETURNED]: 'text-purple-700 bg-purple-50 border-purple-200',
};
