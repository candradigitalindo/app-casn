import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { CreatePersonnelDto, UpdatePersonnelDto, UpsertAttendanceDto } from './personnel.dto';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  async getByLocation(locationId: string) {
    const data = await this.prisma.personnel.findMany({
      where: { locationId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: { attendances: { orderBy: { date: 'desc' }, take: 30 } },
    });
    return ok(data);
  }

  async create(dto: CreatePersonnelDto) {
    const data = await this.prisma.personnel.create({ data: dto });
    return ok(data, 'Personel berhasil ditambahkan');
  }

  async update(id: string, dto: UpdatePersonnelDto) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundException('Personel tidak ditemukan');
    const data = await this.prisma.personnel.update({ where: { id }, data: dto });
    return ok(data, 'Personel diperbarui');
  }

  async remove(id: string) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundException('Personel tidak ditemukan');
    await this.prisma.personnel.delete({ where: { id } });
    return ok(null, 'Personel dihapus');
  }

  async getAttendance(locationId: string, date?: string) {
    const where: any = { locationId };
    if (date) where.date = new Date(date);
    const data = await this.prisma.personnelAttendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { personnel: { select: { id: true, name: true, role: true } } },
    });
    return ok(data);
  }

  async upsertAttendance(dto: UpsertAttendanceDto) {
    const date = new Date(dto.date);
    // Remove time part — attendance is date-only
    date.setUTCHours(0, 0, 0, 0);

    const data = await this.prisma.personnelAttendance.upsert({
      where: { personnelId_date: { personnelId: dto.personnelId, date } },
      create: {
        personnelId: dto.personnelId,
        locationId: dto.locationId,
        date,
        present: dto.present,
        notes: dto.notes,
      },
      update: { present: dto.present, notes: dto.notes },
    });
    return ok(data, 'Kehadiran disimpan');
  }

  // Kebutuhan tenaga teknis per tier kapasitas (BAB 4 atribut 2.3
  // Dok. Pengumuman BKN). Jika capacity diberikan, kembalikan tier
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

  async getSummary() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [total, presentToday] = await Promise.all([
      this.prisma.personnel.count(),
      this.prisma.personnelAttendance.count({
        where: { date: today, present: true },
      }),
    ]);
    return ok({ total, presentToday });
  }
}
