import { useAuthStore } from '@/lib/stores/auth';
import { UserRole } from '@/types/enums';

// Role pengawasan instansi: hanya lihat dashboard, monitoring, dan laporan.
const READ_ONLY_ROLES: UserRole[] = [
  UserRole.SUPERVISOR,
  UserRole.PIMPINAN,
  UserRole.PPK,
  UserRole.INSPEKTORAT,
];

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role as UserRole | undefined;
  const isReadOnly = !!role && READ_ONLY_ROLES.includes(role);
  const isSupervisor = role === UserRole.SUPERVISOR;

  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const canManageLocations = isSuperAdmin || role === UserRole.LOGISTICS || role === UserRole.COORDINATOR;
  const canUpdateInstallation = canManageLocations || role === UserRole.TECHNICAL_IT || role === UserRole.TECHNICAL_ELECTRICAL || role === UserRole.TECHNICAL_SARPRAS;

  // Selaras dengan @Roles di backend — tombol tidak boleh aktif untuk aksi
  // yang pasti ditolak 403 oleh server.
  return {
    canWrite: !!role && !isReadOnly, // create / update / delete umum
    canCreateTicket: !!role,        // semua role terautentikasi boleh buat tiket
    canUpdateLocation: canManageLocations,
    canManageLocationItems: canManageLocations,
    canUpdateInstallation,
    canSeedStandardItems: isSuperAdmin || role === UserRole.LOGISTICS,
    // Pengawas lapangan (dan super admin) menyetujui/menolak berita acara
    canApproveBA: role === UserRole.SUPERVISOR || isSuperAdmin,
    // POST /locations: SUPER_ADMIN, LOGISTICS — DELETE /locations: SUPER_ADMIN
    canCreateLocation: isSuperAdmin || role === UserRole.LOGISTICS,
    canDeleteLocation: isSuperAdmin,
    // POST & DELETE /logistics/shipments: SUPER_ADMIN, LOGISTICS
    canManageShipments: isSuperAdmin || role === UserRole.LOGISTICS,
    // Modul Pengadaan (vendor rekanan, proyek lelang): SUPER_ADMIN, LOGISTICS
    canManageProcurement: isSuperAdmin || role === UserRole.LOGISTICS,
    isSuperAdmin,
    isSupervisor,
    isReadOnly,
  };
}
