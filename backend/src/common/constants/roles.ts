import { UserRole } from '@prisma/client';

// Role pengawasan dapat membuat tiket, tetapi tidak mengubah data operasional.
export const OPERATIONAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.LOGISTICS,
  UserRole.COORDINATOR,
  UserRole.TECHNICAL_IT,
  UserRole.TECHNICAL_ELECTRICAL,
  UserRole.TECHNICAL_SARPRAS,
  UserRole.REGISTRAR,
] as const;
