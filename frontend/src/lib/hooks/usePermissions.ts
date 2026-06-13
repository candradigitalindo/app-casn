import { useAuthStore } from '@/lib/stores/auth';
import { UserRole } from '@/types/enums';

// Role BKN bersifat pengawasan: hanya lihat dashboard, monitoring, dan laporan.
const READ_ONLY_ROLES: UserRole[] = [
  UserRole.SUPERVISOR,
  UserRole.PIMPINAN,
  UserRole.PPK,
  UserRole.INSPEKTORAT,
];

export function usePermissions() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;
  const isReadOnly = !!role && READ_ONLY_ROLES.includes(role);
  const isSupervisor = role === UserRole.SUPERVISOR;

  return {
    canWrite: !isReadOnly,         // create / update / delete umum
    canCreateTicket: true,          // semua role boleh buat tiket
    // Pengawas lapangan (dan super admin) menyetujui/menolak berita acara
    canApproveBA: role === UserRole.SUPERVISOR || role === UserRole.SUPER_ADMIN,
    isSupervisor,
    isReadOnly,
  };
}
