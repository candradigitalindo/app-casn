import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { INDONESIA_PROVINCES } from './data/indonesia';
import {
  CreateProvinceDto,
  UpdateProvinceDto,
  CreateRegencyDto,
  UpdateRegencyDto,
  CreateMasterItemDto,
  UpdateMasterItemDto,
  CreatePersonnelRequirementDto,
  UpdatePersonnelRequirementDto,
} from './master-data.dto';

@Injectable()
export class MasterDataService implements OnModuleInit {
  private readonly logger = new Logger(MasterDataService.name);

  constructor(private prisma: PrismaService) {}

  // Auto-seed wilayah Indonesia saat boot bila tabel masih kosong —
  // pola yang sama dengan auto-seed InventoryItem dari MasterItem.
  async onModuleInit() {
    try {
      const count = await this.prisma.province.count();
      if (count > 0) return;

      for (const prov of INDONESIA_PROVINCES) {
        const created = await this.prisma.province.create({
          data: { code: prov.code, name: prov.name },
        });
        await this.prisma.regency.createMany({
          data: prov.regencies.map((r) => ({
            code: r.code,
            name: r.name,
            type: r.type,
            provinceId: created.id,
          })),
          skipDuplicates: true,
        });
      }
      const total = await this.prisma.regency.count();
      this.logger.log(
        `Seed wilayah selesai: ${INDONESIA_PROVINCES.length} provinsi, ${total} kabupaten/kota`,
      );
    } catch (err) {
      // Jangan gagalkan boot aplikasi hanya karena seed wilayah gagal.
      this.logger.error('Seed wilayah gagal', err instanceof Error ? err.stack : String(err));
    }
  }

  // ── PROVINSI ────────────────────────────────────────────────

  async findProvinces(search?: string) {
    return this.prisma.province.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search } },
            ],
          }
        : undefined,
      include: { _count: { select: { regencies: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createProvince(dto: CreateProvinceDto) {
    await this.assertProvinceUnique(dto.code, dto.name);
    return this.prisma.province.create({ data: dto });
  }

  async updateProvince(id: string, dto: UpdateProvinceDto) {
    const existing = await this.prisma.province.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Provinsi tidak ditemukan');
    await this.assertProvinceUnique(dto.code, dto.name, id);
    return this.prisma.province.update({ where: { id }, data: dto });
  }

  async removeProvince(id: string) {
    const existing = await this.prisma.province.findUnique({
      where: { id },
      include: { _count: { select: { regencies: true } } },
    });
    if (!existing) throw new NotFoundException('Provinsi tidak ditemukan');
    // Cascade delete akan ikut menghapus seluruh kabupaten/kota di dalamnya.
    await this.prisma.province.delete({ where: { id } });
    return { deletedRegencies: existing._count.regencies };
  }

  private async assertProvinceUnique(code?: string, name?: string, excludeId?: string) {
    if (!code && !name) return;
    const clash = await this.prisma.province.findFirst({
      where: {
        OR: [...(code ? [{ code }] : []), ...(name ? [{ name }] : [])],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (clash) throw new ConflictException('Kode atau nama provinsi sudah digunakan');
  }

  // ── KABUPATEN / KOTA ────────────────────────────────────────

  async findRegencies(query: { provinceId?: string; type?: string; search?: string }) {
    const { provinceId, type, search } = query;
    return this.prisma.regency.findMany({
      where: {
        ...(provinceId ? { provinceId } : {}),
        ...(type === 'KABUPATEN' || type === 'KOTA' ? { type } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search } },
              ],
            }
          : {}),
      },
      include: { province: { select: { id: true, code: true, name: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createRegency(dto: CreateRegencyDto) {
    const province = await this.prisma.province.findUnique({ where: { id: dto.provinceId } });
    if (!province) throw new NotFoundException('Provinsi tidak ditemukan');
    await this.assertRegencyUnique(dto.code, dto.name, dto.provinceId);
    return this.prisma.regency.create({
      data: dto,
      include: { province: { select: { id: true, code: true, name: true } } },
    });
  }

  async updateRegency(id: string, dto: UpdateRegencyDto) {
    const existing = await this.prisma.regency.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kabupaten/kota tidak ditemukan');
    if (dto.provinceId) {
      const province = await this.prisma.province.findUnique({ where: { id: dto.provinceId } });
      if (!province) throw new NotFoundException('Provinsi tidak ditemukan');
    }
    await this.assertRegencyUnique(
      dto.code,
      dto.name,
      dto.provinceId ?? existing.provinceId,
      id,
    );
    return this.prisma.regency.update({
      where: { id },
      data: dto,
      include: { province: { select: { id: true, code: true, name: true } } },
    });
  }

  async removeRegency(id: string) {
    const existing = await this.prisma.regency.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kabupaten/kota tidak ditemukan');
    await this.prisma.regency.delete({ where: { id } });
  }

  private async assertRegencyUnique(
    code: string | undefined,
    name: string | undefined,
    provinceId: string,
    excludeId?: string,
  ) {
    if (!code && !name) return;
    const clash = await this.prisma.regency.findFirst({
      where: {
        OR: [
          ...(code ? [{ code }] : []),
          ...(name ? [{ name, provinceId }] : []),
        ],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (clash) throw new ConflictException('Kode atau nama kabupaten/kota sudah digunakan');
  }

  // ── MASTER ITEM SARANA PRASARANA (Lampiran E Kepsesma 240/2026) ──

  async findMasterItems(
    query: { search?: string; includeInactive?: boolean; category?: string } = {},
  ) {
    const { search, includeInactive, category } = query;
    return this.prisma.masterItem.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(category === 'SARPRAS_IT' || category === 'SARPRAS_NON_IT' ? { category } : {}),
      },
      orderBy: { no: 'asc' },
    });
  }

  async createMasterItem(dto: CreateMasterItemDto) {
    await this.assertMasterItemNoUnique(dto.no);
    return this.prisma.masterItem.create({ data: dto });
  }

  async updateMasterItem(id: string, dto: UpdateMasterItemDto) {
    const existing = await this.prisma.masterItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item master tidak ditemukan');
    if (dto.no && dto.no !== existing.no) await this.assertMasterItemNoUnique(dto.no, id);
    return this.prisma.masterItem.update({ where: { id }, data: dto });
  }

  async removeMasterItem(id: string) {
    const existing = await this.prisma.masterItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item master tidak ditemukan');
    await this.prisma.masterItem.delete({ where: { id } });
  }

  private async assertMasterItemNoUnique(no: number, excludeId?: string) {
    const clash = await this.prisma.masterItem.findFirst({
      where: { no, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (clash) throw new ConflictException(`Nomor urut ${no} sudah digunakan oleh item lain`);
  }

  // ── MASTER KEBUTUHAN TENAGA TEKNIS (huruf D.4.e Kepsesma 240/2026) ──

  async findPersonnelRequirements() {
    return this.prisma.masterPersonnelRequirement.findMany({
      orderBy: { capacity: 'asc' },
    });
  }

  async createPersonnelRequirement(dto: CreatePersonnelRequirementDto) {
    await this.assertRequirementCapacityUnique(dto.capacity);
    return this.prisma.masterPersonnelRequirement.create({ data: dto });
  }

  async updatePersonnelRequirement(id: string, dto: UpdatePersonnelRequirementDto) {
    const existing = await this.prisma.masterPersonnelRequirement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kebutuhan tenaga teknis tidak ditemukan');
    if (dto.capacity && dto.capacity !== existing.capacity) {
      await this.assertRequirementCapacityUnique(dto.capacity, id);
    }
    return this.prisma.masterPersonnelRequirement.update({ where: { id }, data: dto });
  }

  async removePersonnelRequirement(id: string) {
    const existing = await this.prisma.masterPersonnelRequirement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kebutuhan tenaga teknis tidak ditemukan');
    await this.prisma.masterPersonnelRequirement.delete({ where: { id } });
  }

  private async assertRequirementCapacityUnique(capacity: number, excludeId?: string) {
    const clash = await this.prisma.masterPersonnelRequirement.findFirst({
      where: { capacity, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (clash) throw new ConflictException(`Tier kapasitas ${capacity} sudah terdaftar`);
  }
}
