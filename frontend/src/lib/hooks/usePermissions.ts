import { useAuthStore } from '@/lib/stores/auth';
import { UserRole } from '@/types/enums';

export function usePermissions() {
  const { user } = useAuthStore();
  const isSupervisor = user?.role === UserRole.SUPERVISOR;

  return {
    canWrite: !isSupervisor,      // create / update / delete umum
    canCreateTicket: true,         // semua role boleh buat tiket
    isSupervisor,
  };
}
