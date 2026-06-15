// ============================================
// ENUMS
// ============================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  LOGISTICS = 'LOGISTICS',
  COORDINATOR = 'COORDINATOR',
  TECHNICAL_IT = 'TECHNICAL_IT',
  TECHNICAL_ELECTRICAL = 'TECHNICAL_ELECTRICAL',
  TECHNICAL_SARPRAS = 'TECHNICAL_SARPRAS',
  REGISTRAR = 'REGISTRAR',
  SUPERVISOR = 'SUPERVISOR',
  PIMPINAN = 'PIMPINAN',
  PPK = 'PPK',
  INSPEKTORAT = 'INSPEKTORAT',
}

export enum LocationStatus {
  PREPARATION = 'PREPARATION',
  INSTALLATION_IN_PROGRESS = 'INSTALLATION_IN_PROGRESS',
  READY = 'READY',
  CLOSED = 'CLOSED',
}

export enum InstallationMilestone {
  LAYOUT_20 = 'LAYOUT_20',
  INFRASTRUCTURE_50 = 'INFRASTRUCTURE_50',
  DEPLOYMENT_80 = 'DEPLOYMENT_80',
  COMPLETED_100 = 'COMPLETED_100',
}

export enum TicketSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  IT_SOFTWARE = 'IT_SOFTWARE',
  IT_HARDWARE = 'IT_HARDWARE',
  ELECTRICAL = 'ELECTRICAL',
  NETWORK = 'NETWORK',
  SARPRAS = 'SARPRAS',
  OTHER = 'OTHER',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED',
}

export enum ShipmentStatus {
  PACKING = 'PACKING',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  RECEIVED = 'RECEIVED',
  RETURNED = 'RETURNED',
}

export enum InventoryCategory {
  LAPTOP_CLIENT = 'LAPTOP_CLIENT',
  SERVER = 'SERVER',
  UPS = 'UPS',
  NETWORK = 'NETWORK',
  METAL_DETECTOR = 'METAL_DETECTOR',
  CCTV = 'CCTV',
  TENTA = 'TENTA',
  AC = 'AC',
  GENERATOR = 'GENERATOR',
  OTHER = 'OTHER',
}

export enum StagePhase {
  PERSIAPAN = 'PERSIAPAN',
  INSTALASI = 'INSTALASI',
  UJI_FUNGSI = 'UJI_FUNGSI',
  PELAKSANAAN = 'PELAKSANAAN',
  DEINSTALASI = 'DEINSTALASI',
  SERAH_TERIMA = 'SERAH_TERIMA',
}

export enum StageStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// Kategori dokumentasi foto/video (spesifikasi BKN: barang vs sesi ujian)
export enum StagePhotoCategory {
  BARANG = 'BARANG',
  SESI_UJIAN = 'SESI_UJIAN',
  UMUM = 'UMUM',
}

export enum BeritaAcaraType {
  BA_PENGANTARAN = 'BA_PENGANTARAN',
  BA_UJI_FUNGSI = 'BA_UJI_FUNGSI',
  BA_PERUBAHAN_VOLUME = 'BA_PERUBAHAN_VOLUME',
  BA_HARIAN = 'BA_HARIAN',
  BA_KENDALA = 'BA_KENDALA',
  BA_DEINSTALASI = 'BA_DEINSTALASI',
  BA_SERAH_TERIMA = 'BA_SERAH_TERIMA',
}

export enum BeritaAcaraStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  FINAL = 'FINAL',
  REJECTED = 'REJECTED',
}

export enum TransportMode {
  DARAT = 'DARAT',
  LAUT = 'LAUT',
  UDARA = 'UDARA',
}

export enum DeliveryType {
  CARGO = 'CARGO',
  EKSPEDISI = 'EKSPEDISI',
  DIANTAR_LANGSUNG = 'DIANTAR_LANGSUNG',
}

export enum ItemOwnership {
  MILIK_SENDIRI = 'MILIK_SENDIRI',
  SEWA = 'SEWA',
}

export enum ItemCondition {
  BAIK = 'BAIK',
  RUSAK_RINGAN = 'RUSAK_RINGAN',
  RUSAK_BERAT = 'RUSAK_BERAT',
}

// ============================================
// LABEL HELPERS
// ============================================

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.LOGISTICS]: 'Tim Logistik',
  [UserRole.COORDINATOR]: 'Koordinator Lokasi',
  [UserRole.TECHNICAL_IT]: 'Tenaga Teknis IT',
  [UserRole.TECHNICAL_ELECTRICAL]: 'Tenaga Teknis Elektrikal',
  [UserRole.TECHNICAL_SARPRAS]: 'Tenaga Teknis Sarpras',
  [UserRole.REGISTRAR]: 'Petugas Registrasi',
  [UserRole.SUPERVISOR]: 'Pengawas Lapangan',
  [UserRole.PIMPINAN]: 'Pimpinan BKN',
  [UserRole.PPK]: 'PPK',
  [UserRole.INSPEKTORAT]: 'Inspektorat',
};

export const LocationStatusLabels: Record<LocationStatus, string> = {
  [LocationStatus.PREPARATION]: 'Persiapan',
  [LocationStatus.INSTALLATION_IN_PROGRESS]: 'Instalasi Berjalan',
  [LocationStatus.READY]: 'Siap',
  [LocationStatus.CLOSED]: 'Ditutup',
};

export const InstallationMilestoneLabels: Record<InstallationMilestone, string> = {
  [InstallationMilestone.LAYOUT_20]: 'Tata Letak (20%)',
  [InstallationMilestone.INFRASTRUCTURE_50]: 'Infrastruktur Dasar (50%)',
  [InstallationMilestone.DEPLOYMENT_80]: 'Deployment Perangkat (80%)',
  [InstallationMilestone.COMPLETED_100]: 'Uji Coba & Siap (100%)',
};

export const TicketSeverityLabels: Record<TicketSeverity, string> = {
  [TicketSeverity.LOW]: 'Rendah',
  [TicketSeverity.MEDIUM]: 'Sedang',
  [TicketSeverity.HIGH]: 'Tinggi',
  [TicketSeverity.CRITICAL]: 'Kritis',
};

export const TicketStatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Terbuka',
  [TicketStatus.ASSIGNED]: 'Ditugaskan',
  [TicketStatus.IN_PROGRESS]: 'Dalam Proses',
  [TicketStatus.RESOLVED]: 'Terselesaikan',
  [TicketStatus.ESCALATED]: 'Dieskalasi',
  [TicketStatus.CLOSED]: 'Ditutup',
};

export const TicketCategoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.IT_SOFTWARE]: 'IT Software',
  [TicketCategory.IT_HARDWARE]: 'IT Hardware',
  [TicketCategory.ELECTRICAL]: 'Kelistrikan',
  [TicketCategory.NETWORK]: 'Jaringan',
  [TicketCategory.SARPRAS]: 'Sarana Prasarana',
  [TicketCategory.OTHER]: 'Lainnya',
};

export const ShipmentStatusLabels: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PACKING]: 'Sedang Dikemas',
  [ShipmentStatus.IN_TRANSIT]: 'Dalam Perjalanan',
  [ShipmentStatus.ARRIVED]: 'Tiba di Lokasi',
  [ShipmentStatus.RECEIVED]: 'Diterima',
  [ShipmentStatus.RETURNED]: 'Dikembalikan',
};

export const StagePhaseLabels: Record<StagePhase, string> = {
  [StagePhase.PERSIAPAN]: 'Persiapan',
  [StagePhase.INSTALASI]: 'Instalasi',
  [StagePhase.UJI_FUNGSI]: 'Uji Fungsi',
  [StagePhase.PELAKSANAAN]: 'Pelaksanaan Seleksi',
  [StagePhase.DEINSTALASI]: 'Deinstalasi',
  [StagePhase.SERAH_TERIMA]: 'Serah Terima',
};

export const StagePhaseDescriptions: Record<StagePhase, string> = {
  [StagePhase.PERSIAPAN]: 'Pengantaran logistik barang ke titik lokasi, dilengkapi surat jalan dan berita acara pengantaran',
  [StagePhase.INSTALASI]: 'Instalasi peralatan di titik lokasi dengan progres persentase dan dokumentasi foto',
  [StagePhase.UJI_FUNGSI]: 'Pengujian seluruh peralatan terinstalasi, dituangkan dalam berita acara uji fungsi',
  [StagePhase.PELAKSANAAN]: 'Pelaksanaan kegiatan seleksi dengan berita acara harian pengecekan peralatan',
  [StagePhase.DEINSTALASI]: 'Pembongkaran/pencabutan peralatan yang telah dipasang dengan berita acara deinstalasi',
  [StagePhase.SERAH_TERIMA]: 'Pertanggungjawaban pekerjaan melalui berita acara serah terima pekerjaan (BAST)',
};

export const StageStatusLabels: Record<StageStatus, string> = {
  [StageStatus.NOT_STARTED]: 'Belum Dimulai',
  [StageStatus.IN_PROGRESS]: 'Sedang Berjalan',
  [StageStatus.COMPLETED]: 'Selesai',
};

export const StagePhotoCategoryLabels: Record<StagePhotoCategory, string> = {
  [StagePhotoCategory.BARANG]: 'Dokumentasi Barang',
  [StagePhotoCategory.SESI_UJIAN]: 'Dokumentasi Sesi Ujian',
  [StagePhotoCategory.UMUM]: 'Umum',
};

export const StagePhotoCategoryColors: Record<StagePhotoCategory, string> = {
  [StagePhotoCategory.BARANG]: 'bg-blue-100 text-blue-700 border-blue-200',
  [StagePhotoCategory.SESI_UJIAN]: 'bg-violet-100 text-violet-700 border-violet-200',
  [StagePhotoCategory.UMUM]: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const BeritaAcaraTypeLabels: Record<BeritaAcaraType, string> = {
  [BeritaAcaraType.BA_PENGANTARAN]: 'BA Penerimaan / Pengantaran',
  [BeritaAcaraType.BA_UJI_FUNGSI]: 'BA Uji Fungsi',
  [BeritaAcaraType.BA_PERUBAHAN_VOLUME]: 'BA Perubahan Volume',
  [BeritaAcaraType.BA_HARIAN]: 'BA Harian Pelaksanaan',
  [BeritaAcaraType.BA_KENDALA]: 'BA Kendala',
  [BeritaAcaraType.BA_DEINSTALASI]: 'BA Pembongkaran / Deinstalasi',
  [BeritaAcaraType.BA_SERAH_TERIMA]: 'BA Serah Terima Pekerjaan (BAST)',
};

export const BeritaAcaraTypeCodes: Record<BeritaAcaraType, string> = {
  [BeritaAcaraType.BA_PENGANTARAN]: 'BA-PGT',
  [BeritaAcaraType.BA_UJI_FUNGSI]: 'BA-UF',
  [BeritaAcaraType.BA_PERUBAHAN_VOLUME]: 'BA-PV',
  [BeritaAcaraType.BA_HARIAN]: 'BA-HRN',
  [BeritaAcaraType.BA_KENDALA]: 'BA-KDL',
  [BeritaAcaraType.BA_DEINSTALASI]: 'BA-DIN',
  [BeritaAcaraType.BA_SERAH_TERIMA]: 'BAST',
};

export const BeritaAcaraStatusLabels: Record<BeritaAcaraStatus, string> = {
  [BeritaAcaraStatus.DRAFT]: 'Draft',
  [BeritaAcaraStatus.PENDING_APPROVAL]: 'Menunggu Persetujuan',
  [BeritaAcaraStatus.FINAL]: 'Disetujui',
  [BeritaAcaraStatus.REJECTED]: 'Ditolak',
};

export const TransportModeLabels: Record<TransportMode, string> = {
  [TransportMode.DARAT]: 'Darat',
  [TransportMode.LAUT]: 'Laut',
  [TransportMode.UDARA]: 'Udara',
};

export const DeliveryTypeLabels: Record<DeliveryType, string> = {
  [DeliveryType.CARGO]: 'Cargo',
  [DeliveryType.EKSPEDISI]: 'Ekspedisi',
  [DeliveryType.DIANTAR_LANGSUNG]: 'Diantar Langsung',
};

export const ItemOwnershipLabels: Record<ItemOwnership, string> = {
  [ItemOwnership.MILIK_SENDIRI]: 'Milik Sendiri',
  [ItemOwnership.SEWA]: 'Sewa',
};

export const ItemConditionLabels: Record<ItemCondition, string> = {
  [ItemCondition.BAIK]: 'Baik',
  [ItemCondition.RUSAK_RINGAN]: 'Rusak Ringan',
  [ItemCondition.RUSAK_BERAT]: 'Rusak Berat',
};

// Pemetaan tahap → jenis BA yang berlaku pada tahap tersebut
export const StageBeritaAcaraTypes: Record<StagePhase, BeritaAcaraType[]> = {
  [StagePhase.PERSIAPAN]: [BeritaAcaraType.BA_PENGANTARAN],
  [StagePhase.INSTALASI]: [BeritaAcaraType.BA_PERUBAHAN_VOLUME],
  [StagePhase.UJI_FUNGSI]: [BeritaAcaraType.BA_UJI_FUNGSI],
  [StagePhase.PELAKSANAAN]: [BeritaAcaraType.BA_HARIAN, BeritaAcaraType.BA_KENDALA],
  [StagePhase.DEINSTALASI]: [BeritaAcaraType.BA_DEINSTALASI],
  [StagePhase.SERAH_TERIMA]: [BeritaAcaraType.BA_SERAH_TERIMA],
};

export const StagePhaseOrder: StagePhase[] = [
  StagePhase.PERSIAPAN,
  StagePhase.INSTALASI,
  StagePhase.UJI_FUNGSI,
  StagePhase.PELAKSANAAN,
  StagePhase.DEINSTALASI,
  StagePhase.SERAH_TERIMA,
];
// ============================================
// PERSONEL SDM
// ============================================

export enum PersonnelRole {
  KOORDINATOR = 'KOORDINATOR',
  TENAGA_IT = 'TENAGA_IT',
  ELEKTRIKAL = 'ELEKTRIKAL',
  TENAGA_SARPRAS = 'TENAGA_SARPRAS',
  PENGAWAS_BKN = 'PENGAWAS_BKN',
}

export const PersonnelRoleLabels: Record<PersonnelRole, string> = {
  [PersonnelRole.KOORDINATOR]: 'Koordinator',
  [PersonnelRole.TENAGA_IT]: 'Tenaga IT',
  [PersonnelRole.ELEKTRIKAL]: 'Elektrikal',
  [PersonnelRole.TENAGA_SARPRAS]: 'Tenaga Sarpras',
  [PersonnelRole.PENGAWAS_BKN]: 'Pengawas Lapangan BKN',
};

export const PersonnelRoleColors: Record<PersonnelRole, string> = {
  [PersonnelRole.KOORDINATOR]: 'bg-purple-100 text-purple-700 border-purple-200',
  [PersonnelRole.TENAGA_IT]: 'bg-blue-100 text-blue-700 border-blue-200',
  [PersonnelRole.ELEKTRIKAL]: 'bg-amber-100 text-amber-700 border-amber-200',
  [PersonnelRole.TENAGA_SARPRAS]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [PersonnelRole.PENGAWAS_BKN]: 'bg-rose-100 text-rose-700 border-rose-200',
};

// Kebutuhan SDM berdasarkan kapasitas (dari dokumen BKN)
export const STAFF_REQUIREMENTS: Record<number, Record<PersonnelRole, number>> = {
  100: { [PersonnelRole.PENGAWAS_BKN]: 1, [PersonnelRole.KOORDINATOR]: 1, [PersonnelRole.TENAGA_IT]: 1, [PersonnelRole.ELEKTRIKAL]: 1, [PersonnelRole.TENAGA_SARPRAS]: 1 },
  200: { [PersonnelRole.PENGAWAS_BKN]: 1, [PersonnelRole.KOORDINATOR]: 1, [PersonnelRole.TENAGA_IT]: 2, [PersonnelRole.ELEKTRIKAL]: 2, [PersonnelRole.TENAGA_SARPRAS]: 1 },
  300: { [PersonnelRole.PENGAWAS_BKN]: 1, [PersonnelRole.KOORDINATOR]: 1, [PersonnelRole.TENAGA_IT]: 3, [PersonnelRole.ELEKTRIKAL]: 3, [PersonnelRole.TENAGA_SARPRAS]: 2 },
  400: { [PersonnelRole.PENGAWAS_BKN]: 1, [PersonnelRole.KOORDINATOR]: 1, [PersonnelRole.TENAGA_IT]: 4, [PersonnelRole.ELEKTRIKAL]: 4, [PersonnelRole.TENAGA_SARPRAS]: 3 },
  500: { [PersonnelRole.PENGAWAS_BKN]: 1, [PersonnelRole.KOORDINATOR]: 1, [PersonnelRole.TENAGA_IT]: 5, [PersonnelRole.ELEKTRIKAL]: 5, [PersonnelRole.TENAGA_SARPRAS]: 3 },
};

// ============================================
// DOKUMEN LOKASI
// ============================================

export enum DocumentCategory {
  KONTRAK = 'KONTRAK',
  SURAT_TUGAS = 'SURAT_TUGAS',
  BERITA_ACARA = 'BERITA_ACARA',
  LAPORAN = 'LAPORAN',
  FOTO_DOKUMENTASI = 'FOTO_DOKUMENTASI',
  LAINNYA = 'LAINNYA',
}

export const DocumentCategoryLabels: Record<DocumentCategory, string> = {
  [DocumentCategory.KONTRAK]: 'Kontrak / SPK',
  [DocumentCategory.SURAT_TUGAS]: 'Surat Tugas',
  [DocumentCategory.BERITA_ACARA]: 'Berita Acara',
  [DocumentCategory.LAPORAN]: 'Laporan',
  [DocumentCategory.FOTO_DOKUMENTASI]: 'Foto Dokumentasi',
  [DocumentCategory.LAINNYA]: 'Lainnya',
};

export const DocumentCategoryColors: Record<DocumentCategory, string> = {
  [DocumentCategory.KONTRAK]: 'bg-purple-100 text-purple-700 border-purple-200',
  [DocumentCategory.SURAT_TUGAS]: 'bg-blue-100 text-blue-700 border-blue-200',
  [DocumentCategory.BERITA_ACARA]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [DocumentCategory.LAPORAN]: 'bg-amber-100 text-amber-700 border-amber-200',
  [DocumentCategory.FOTO_DOKUMENTASI]: 'bg-pink-100 text-pink-700 border-pink-200',
  [DocumentCategory.LAINNYA]: 'bg-gray-100 text-gray-600 border-gray-200',
};
