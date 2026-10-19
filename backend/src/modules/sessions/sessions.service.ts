import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { User, UserSession } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export const SESSION_USER_SELECT = {
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

export interface AccessPayload {
  sub: string;
  sid: string;
  email?: string;
  role?: string;
  exp?: number;
}
export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}
type SessionUser = Pick<User, 'id' | 'email' | 'role'>;
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async create(user: SessionUser, metadata: SessionMetadata = {}) {
    const id = randomUUID();
    const refreshId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: id, jti: refreshId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );
    const times = this.jwt.decode<{ iat: number; exp: number }>(refreshToken);
    const session = await this.prisma.userSession.create({
      data: {
        id,
        userId: user.id,
        refreshId,
        refreshIssuedAt: new Date(times.iat * 1000),
        expiresAt: new Date(times.exp * 1000),
        refreshTokenHash: digest(refreshToken),
        ipAddress: metadata.ipAddress?.slice(0, 100),
        userAgent: metadata.userAgent?.slice(0, 1000),
      },
    });
    return this.tokens(user, session, refreshToken);
  }

  async refresh(userId: string, sessionId: string, token: string) {
    if (!sessionId || !token)
      throw new UnauthorizedException('Silakan login kembali');
    // Lock mencegah dua tab memutar token yang sama secara bersamaan.
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "UserSession" WHERE "id" = ${sessionId} FOR UPDATE`;
      const session = await tx.userSession.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });
      const now = new Date();
      if (
        !session ||
        session.userId !== userId ||
        session.revokedAt ||
        session.expiresAt <= now ||
        !session.user.isActive
      ) {
        return null;
      }
      const hash = digest(token);
      if (hash !== session.refreshTokenHash) {
        // Toleransi singkat untuk request dari tab lain; token baru direkonstruksi
        // dari nonce/iat/exp yang sama, tanpa menyimpan token plaintext.
        if (
          hash === session.previousTokenHash &&
          session.previousValidUntil &&
          session.previousValidUntil > now
        ) {
          return {
            user: session.user,
            session,
            refreshToken: await this.signRefresh(session),
          };
        }
        await tx.userSession.update({
          where: { id: sessionId },
          data: { revokedAt: now },
        });
        return null;
      }
      const rotated = {
        ...session,
        refreshId: randomUUID(),
        refreshIssuedAt: new Date(Math.floor(now.getTime() / 1000) * 1000),
      };
      const refreshToken = await this.signRefresh(rotated);
      const updated = await tx.userSession.update({
        where: { id: sessionId },
        data: {
          refreshId: rotated.refreshId,
          refreshIssuedAt: rotated.refreshIssuedAt,
          previousTokenHash: session.refreshTokenHash,
          previousValidUntil: new Date(now.getTime() + 10_000),
          refreshTokenHash: digest(refreshToken),
          lastUsedAt: now,
        },
      });
      return { user: session.user, session: updated, refreshToken };
    });
    if (!result)
      throw new UnauthorizedException(
        'Sesi berakhir atau telah dicabut. Silakan login kembali.',
      );
    return this.tokens(result.user, result.session, result.refreshToken);
  }

  async validate(payload: AccessPayload) {
    if (!payload.sid) throw new UnauthorizedException('Silakan login kembali');
    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sid },
      include: { user: { select: SESSION_USER_SELECT } },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException('Sesi tidak aktif');
    }
    return { ...session.user, sessionId: session.id };
  }

  async list(userId: string, currentId: string) {
    const rows = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
    return rows.map((row) => ({ ...row, current: row.id === currentId }));
  }

  async revoke(userId: string, id?: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, ...(id ? { id } : {}), revokedAt: null },
      select: { id: true },
    });
    if (id && !sessions.length)
      throw new ForbiddenException(
        'Sesi tidak ditemukan atau bukan milik Anda',
      );
    await this.prisma.userSession.updateMany({
      where: { userId, ...(id ? { id } : {}), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return sessions.map((session) => session.id);
  }

  async revokeToken(token?: string): Promise<string[]> {
    if (!token) return [];
    for (const key of ['jwt.refreshSecret', 'jwt.secret']) {
      let payload: AccessPayload;
      try {
        payload = await this.jwt.verifyAsync<AccessPayload>(token, {
          secret: this.config.get<string>(key),
          ignoreExpiration: true,
        });
      } catch {
        continue;
      }
      if (!payload.sid || !payload.sub) return [];
      const session = await this.prisma.userSession.findUnique({
        where: { id: payload.sid },
      });
      if (!session || session.userId !== payload.sub || session.revokedAt)
        return [];
      return this.revoke(payload.sub, payload.sid);
    }
    return [];
  }

  private signRefresh(session: UserSession) {
    return this.jwt.signAsync(
      {
        sub: session.userId,
        sid: session.id,
        jti: session.refreshId,
        iat: Math.floor(session.refreshIssuedAt.getTime() / 1000),
        exp: Math.floor(session.expiresAt.getTime() / 1000),
      },
      { secret: this.config.get<string>('jwt.refreshSecret') },
    );
  }

  private async tokens(
    user: SessionUser,
    session: UserSession,
    refreshToken: string,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: session.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      },
    );
    const times = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return {
      accessToken,
      refreshToken,
      expiresIn: times.exp - times.iat,
      refreshExpiresIn: Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
      ),
    };
  }
}
