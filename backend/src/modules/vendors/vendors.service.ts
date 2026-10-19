import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateVendorDto, UpdateVendorDto, VendorItemInputDto } from './vendors.dto';
import { Prisma } from '@prisma/client';

const VENDOR_INCLUDE = {
  province: { select: { id: true, code: true, name: true } },
  coverages: {
    include: { province: { select: { id: true, code: true, name: true } } },
    orderBy: { province: { code: 'asc' as const } },
  },
  _count: { select: { items: true } },
} as const;

const VENDOR_ITEM_INCLUDE = {
  masterItem: { select: { id: true, no: true, name: true, unit: true, category: true } },
} as const;

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    search?: string;
    category?: string;
    provinceId?: string;
    includeInactive?: boolean;
  }) {
    const { search, category, provinceId, includeInactive } = query;
    return this.prisma.vendor.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(category === 'SARPRAS_IT' || category === 'SARPRAS_NON_IT'
          ? { categories: { has: category } }
          : {}),
        // Filter "vendor yang melayani provinsi X" — dasar kandidat alokasi per lokasi
        ...(provinceId ? { coverages: { some: { provinceId } } } : {}),
      },
      include: VENDOR_INCLUDE,
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: VENDOR_INCLUDE,
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');
    return vendor;
  }

  async create(dto: CreateVendorDto) {
    const { coverageProvinceIds, ...data } = dto;
    await this.assertProvincesExist(coverageProvinceIds);
    return this.prisma.$transaction(async (tx) => {
      // Kode berurutan harus dialokasikan dalam lock transaksi yang sama.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(1397313616)::text`;
      const code = await this.nextCode(tx);
      const vendor = await tx.vendor.create({ data: { ...data, code } });
      if (coverageProvinceIds?.length) {
        await tx.vendorCoverage.createMany({
          data: coverageProvinceIds.map((provinceId) => ({ vendorId: vendor.id, provinceId })),
          skipDuplicates: true,
        });
      }
      return tx.vendor.findUniqueOrThrow({ where: { id: vendor.id }, include: VENDOR_INCLUDE });
    });
  }

  async update(id: string, dto: UpdateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendor tidak ditemukan');

    const { coverageProvinceIds, ...data } = dto;
    await this.assertProvincesExist(coverageProvinceIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.vendor.update({ where: { id }, data });
      if (coverageProvinceIds !== undefined) {
        await tx.vendorCoverage.deleteMany({ where: { vendorId: id } });
        if (coverageProvinceIds.length) {
          await tx.vendorCoverage.createMany({
            data: coverageProvinceIds.map((provinceId) => ({ vendorId: id, provinceId })),
            skipDuplicates: true,
          });
        }
      }
      return tx.vendor.findUniqueOrThrow({ where: { id }, include: VENDOR_INCLUDE });
    });
  }

  async setCoverages(id: string, provinceIds: string[]) {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendor tidak ditemukan');
    await this.assertProvincesExist(provinceIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.vendorCoverage.deleteMany({ where: { vendorId: id } });
      if (provinceIds.length) {
        await tx.vendorCoverage.createMany({
          data: provinceIds.map((provinceId) => ({ vendorId: id, provinceId })),
          skipDuplicates: true,
        });
      }
      return tx.vendor.findUniqueOrThrow({ where: { id }, include: VENDOR_INCLUDE });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
      include: { _count: { select: { coverages: true } } },
    });
    if (!existing) throw new NotFoundException('Vendor tidak ditemukan');
    // Cascade menghapus seluruh coverage vendor ini.
    await this.prisma.vendor.delete({ where: { id } });
  }

  // ── Perbandingan harga antar vendor per item ───────────────
  // Sumber data penyusunan penawaran: untuk tiap item master, daftar
  // vendor yang menawarkan beserta jumlah & harganya. Karena satuan
  // harga bisa PER_HARI atau PER_EVENT, urutan termurah dihitung dari
  // BIAYA EFEKTIF PER EVENT: per hari × jumlah hari vs harga flat.
  async getItemComparison(query: {
    category?: string;
    provinceId?: string;
    search?: string;
    days?: number;
  }) {
    const { category, provinceId, search } = query;
    // Minimal 5 hari kegiatan sesuai Kepsesma — default perbandingan 5 hari.
    const days = query.days ?? 5;
    if (!Number.isSafeInteger(days) || days < 1) {
      throw new BadRequestException('Jumlah hari harus berupa bilangan bulat positif');
    }

    const masterItems = await this.prisma.masterItem.findMany({
      where: {
        isActive: true,
        ...(category === 'SARPRAS_IT' || category === 'SARPRAS_NON_IT' ? { category } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { no: 'asc' },
      select: { id: true, no: true, name: true, unit: true, category: true },
    });

    const offers = await this.prisma.vendorItem.findMany({
      where: {
        masterItemId: { in: masterItems.map((m) => m.id) },
        vendor: {
          isActive: true,
          ...(provinceId ? { coverages: { some: { provinceId } } } : {}),
        },
      },
      include: {
        vendor: { select: { id: true, code: true, name: true, rating: true } },
      },
    });

    const byItem = new Map<string, typeof offers>();
    for (const o of offers) {
      const list = byItem.get(o.masterItemId) ?? [];
      list.push(o);
      byItem.set(o.masterItemId, list);
    }

    const effective = (o: (typeof offers)[number]) =>
      o.priceUnit === 'PER_EVENT' ? Number(o.unitPrice) : Number(o.unitPrice) * days;

    return masterItems.map((m) => ({
      ...m,
      days,
      offers: (byItem.get(m.id) ?? [])
        .sort((a, b) => effective(a) - effective(b))
        .map((o) => ({
          vendorItemId: o.id,
          vendorId: o.vendor.id,
          vendorCode: o.vendor.code,
          vendorName: o.vendor.name,
          vendorRating: o.vendor.rating,
          qty: o.qty,
          unitPrice: o.unitPrice,
          priceUnit: o.priceUnit,
          // Estimasi biaya per unit untuk satu event `days` hari —
          // dasar pengurutan agar per-hari vs per-event apple-to-apple.
          effectivePerEvent: effective(o),
          notes: o.notes,
        })),
    }));
  }

  // ── Katalog barang & harga vendor ──────────────────────────

  async getItems(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');
    return this.prisma.vendorItem.findMany({
      where: { vendorId },
      include: VENDOR_ITEM_INCLUDE,
      orderBy: { masterItem: { no: 'asc' } },
    });
  }

  // Replace-all daftar barang vendor. Validasi: item harus ada di master
  // dan kategorinya sesuai kategori vendor (vendor IT tidak bisa memasok
  // barang Non IT, dan sebaliknya).
  async setItems(vendorId: string, items: VendorItemInputDto[]) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    const ids = [...new Set(items.map((i) => i.masterItemId))];
    if (ids.length !== items.length) {
      throw new BadRequestException('Terdapat item duplikat dalam daftar');
    }

    if (ids.length) {
      const masters = await this.prisma.masterItem.findMany({
        where: { id: { in: ids } },
        select: { id: true, no: true, name: true, category: true },
      });
      if (masters.length !== ids.length) {
        throw new BadRequestException('Terdapat masterItemId yang tidak valid');
      }
      const invalid = masters.filter((m) => !vendor.categories.includes(m.category));
      if (invalid.length) {
        throw new BadRequestException(
          `Kategori item tidak sesuai kategori vendor: ${invalid
            .map((m) => `No ${m.no} ${m.name}`)
            .join(', ')}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.vendorItem.deleteMany({ where: { vendorId } });
      if (items.length) {
        await tx.vendorItem.createMany({
          data: items.map((i) => ({
            vendorId,
            masterItemId: i.masterItemId,
            qty: i.qty,
            unitPrice: i.unitPrice,
            priceUnit: i.priceUnit ?? 'PER_HARI',
            notes: i.notes ?? null,
          })),
        });
      }
      return tx.vendorItem.findMany({
        where: { vendorId },
        include: VENDOR_ITEM_INCLUDE,
        orderBy: { masterItem: { no: 'asc' } },
      });
    });
  }

  // Kode berurutan VDR-0001, VDR-0002, ... berbasis kode terbesar yang ada.
  private async nextCode(tx: Prisma.TransactionClient): Promise<string> {
    const [result] = await tx.$queryRaw<{ maxCode: bigint }[]>`
      SELECT COALESCE(MAX(SUBSTRING("code" FROM '^VDR-([0-9]+)$')::bigint), 0) AS "maxCode" FROM "Vendor"
    `;
    return `VDR-${String(result.maxCode + 1n).padStart(4, '0')}`;
  }

  private async assertProvincesExist(provinceIds?: string[]) {
    if (!provinceIds?.length) return;
    const unique = [...new Set(provinceIds)];
    const count = await this.prisma.province.count({ where: { id: { in: unique } } });
    if (count !== unique.length) {
      throw new BadRequestException('Terdapat provinceId cakupan yang tidak valid');
    }
  }
}
