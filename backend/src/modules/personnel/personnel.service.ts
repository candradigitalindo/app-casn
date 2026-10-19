import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { CreatePersonnelDto, UpdatePersonnelDto, UpsertAttendanceDto } from './personnel.dto';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  // Daftar tenaga teknis. Tanpa filter = seluruh master (untuk halaman
  // Data Tenaga Teknis); dengan locationId = personel di tilok tsb.
  // (dipakai halaman Presensi); unassigned=true = belum ditugaskan.
  async findAll(query: {
    locationId?: string;
    search?: string;
    role?: string;
    unassigned?: boolean;
  }) {
    const { locationId, search, role, unassigned } = query;
    const data = await this.prisma.personnel.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
        ...(unassigned ? { locationId: null } : {}),
        ...(role && Object.keys(this.roleFilter(role)).length ? this.roleFilter(role) : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { nik: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: {
        attendances: { orderBy: { date: 'desc' }, take: 30 },
        location: { select: { id: true, code: true, name: true } },
      },
    });
    return ok(data);
  }

  private roleFilter(role: string) {
    const valid = ['KOORDINATOR', 'TENAGA_IT', 'ELEKTRIKAL', 'TENAGA_SARPRAS', 'PENGAWAS_INSTANSI'];
    return valid.includes(role) ? { role: role as never } : {};
  }

  // String kosong → null agar kolom nullable benar-benar kosong, dan
  // birthDate string ISO → Date.
  private sanitize<T extends object>(dto: T): T {
    const out = { ...(dto as Record<string, unknown>) };
    for (const key of Object.keys(out)) {
      if (out[key] === '') out[key] = null;
    }
    if (typeof out.birthDate === 'string') out.birthDate = new Date(out.birthDate);
    return out as T;
  }

  async create(dto: CreatePersonnelDto) {
    const data = await this.prisma.personnel.create({ data: this.sanitize(dto) as never });
    return ok(data, 'Personel berhasil ditambahkan');
  }

  async update(id: string, dto: UpdatePersonnelDto) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundException('Personel tidak ditemukan');
    const data = await this.prisma.personnel.update({
      where: { id },
      data: this.sanitize(dto) as never,
      include: { location: { select: { id: true, code: true, name: true } } },
    });
    return ok(data, 'Personel diperbarui');
  }

  async remove(id: string) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundException('Personel tidak ditemukan');
    await this.prisma.personnel.delete({ where: { id } });
    return ok(null, 'Personel dihapus');
  }

  async getAttendance(locationId: string, date?: string) {
    if (!locationId) throw new BadRequestException('Lokasi wajib diisi');
    const where: any = { locationId };
    if (date) where.date = this.attendanceDate(date);
    const data = await this.prisma.personnelAttendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { personnel: { select: { id: true, name: true, role: true } } },
    });
    return ok(data);
  }

  async upsertAttendance(dto: UpsertAttendanceDto) {
    const date = this.attendanceDate(dto.date);
    const [personnel, existing] = await Promise.all([
      this.prisma.personnel.findUnique({ where: { id: dto.personnelId } }),
      this.prisma.personnelAttendance.findUnique({
        where: { personnelId_date: { personnelId: dto.personnelId, date } },
      }),
    ]);
    if (!personnel) throw new NotFoundException('Personel tidak ditemukan');
    if (existing && existing.locationId !== dto.locationId) {
      throw new ConflictException('Personel sudah memiliki presensi di lokasi lain pada tanggal tersebut');
    }
    if (!existing && personnel.locationId !== dto.locationId) {
      throw new BadRequestException('Personel belum ditugaskan ke lokasi tersebut');
    }

    const data = await this.prisma.personnelAttendance.upsert({
      where: { personnelId_date: { personnelId: dto.personnelId, date } },
      create: {
        personnelId: dto.personnelId,
        locationId: dto.locationId,
        date,
        present: dto.present,
        notes: dto.notes,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
      },
      update: {
        present: dto.present,
        notes: dto.notes,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
      },
    });
    return ok(data, 'Kehadiran disimpan');
  }

  private attendanceDate(value: string): Date {
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Tanggal presensi harus valid dengan format YYYY-MM-DD');
    }
    return date;
  }

  async deleteAttendance(id: string) {
    const att = await this.prisma.personnelAttendance.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Catatan kehadiran tidak ditemukan');
    await this.prisma.personnelAttendance.delete({ where: { id } });
    return ok(null, 'Catatan kehadiran dihapus');
  }

  // Kebutuhan tenaga teknis per tier kapasitas (BAB 4 atribut 2.3
  // dokumen spesifikasi instansi penyelenggara). Jika capacity diberikan, kembalikan tier
  // yang sesuai (dibulatkan ke atas), selain itu semua tier.
  async getRequirements(capacity?: number) {
    if (capacity) {
      const tier = Math.min(Math.max(Math.ceil(capacity / 100) * 100, 100), 500);
      const req = await this.prisma.masterPersonnelRequirement.findUnique({
        where: { capacity: tier },
      });
      return ok(req);
    }
    const all = await this.prisma.masterPersonnelRequirement.findMany({
      orderBy: { capacity: 'asc' },
    });
    return ok(all);
  }

  async getSummary(locationId?: string) {
    // "Hari ini" mengikuti kalender WIB (UTC+7) — kunci tanggal presensi
    // disimpan pada UTC midnight dari string yyyy-MM-dd yang dikirim frontend.
    const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const today = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()));

    const [total, presentToday, locations, presentByLocation] = await Promise.all([
      this.prisma.personnel.count({ where: locationId ? { locationId } : {} }),
      this.prisma.personnelAttendance.count({
        where: { ...(locationId ? { locationId } : {}), date: today, present: true },
      }),
      this.prisma.location.findMany({
        where: locationId ? { id: locationId } : {},
        select: { id: true, name: true, _count: { select: { personnel: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.personnelAttendance.groupBy({
        by: ['locationId'],
        where: { ...(locationId ? { locationId } : {}), date: today, present: true },
        _count: { _all: true },
      }),
    ]);

    const presentMap = new Map(presentByLocation.map((p) => [p.locationId, p._count._all]));
    const byLocation = locations
      .filter((l) => l._count.personnel > 0)
      .map((l) => ({
        locationId: l.id,
        locationName: l.name,
        total: l._count.personnel,
        present: presentMap.get(l.id) ?? 0,
      }));

    return ok({ total, presentToday, byLocation });
  }
}
