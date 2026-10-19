import { LocationStatus } from '@/types/enums';

export const locationStatusTextColors: Record<LocationStatus, string> = {
  [LocationStatus.READY]: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'text-amber-700 bg-amber-50 border-amber-200',
  [LocationStatus.PREPARATION]: 'text-slate-600 bg-slate-50 border-slate-200',
  [LocationStatus.CLOSED]: 'text-slate-500 bg-slate-50 border-slate-200',
};
