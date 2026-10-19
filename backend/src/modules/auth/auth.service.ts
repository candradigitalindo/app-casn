import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SessionsService, SessionMetadata } from '../sessions/sessions.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private sessions: SessionsService,
  ) {}

  async login(dto: LoginDto, metadata: SessionMetadata = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      await this.recordLogin(dto.email, false, metadata, user?.id);
      throw new UnauthorizedException('Email atau password salah');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      await this.recordLogin(dto.email, false, metadata, user.id);
      throw new UnauthorizedException('Email atau password salah');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.recordLogin(dto.email, true, metadata, user.id);
    const tokens = await this.sessions.create(updatedUser, metadata);

    const { password: _, ...safeUser } = updatedUser;

    return { user: safeUser, tokens };
  }

  async refresh(userId: string, sessionId: string, refreshToken: string) {
    return { tokens: await this.sessions.refresh(userId, sessionId, refreshToken) };
  }

  private recordLogin(email: string, success: boolean, metadata: SessionMetadata, userId?: string) {
    return this.prisma.loginAttempt.create({ data: {
      email: email.trim().toLowerCase().slice(0, 320), success, userId,
      ipAddress: metadata.ipAddress?.slice(0, 100), userAgent: metadata.userAgent?.slice(0, 1000),
    } });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
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
      },
    });

    if (!user) throw new UnauthorizedException('User tidak ditemukan');
    return user;
  }

  // Digunakan oleh prisma/seed.ts
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
}
