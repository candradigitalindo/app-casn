import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { paginate } from '../../common/dto/api-response.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  instansi: true,
  locationId: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 20, role, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: SAFE_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const hashed = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: SAFE_SELECT,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // throws 404 if not found

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: SAFE_SELECT,
    });

    return user;
  }

  async remove(id: string) {
    await this.findOne(id); // throws 404 if not found
    await this.prisma.user.delete({ where: { id } });
    return null;
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: SAFE_SELECT,
    });

    return updated;
  }
}
