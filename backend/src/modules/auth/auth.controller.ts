import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { clientIp } from '../../common/utils/client-ip.util';
import { SessionsService } from '../sessions/sessions.service';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../../database/prisma.service';
import {
  Controller,
  Post,
  Get,
  Body,
  Req, Delete, Param,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ok } from '../../common/dto/api-response.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService, private sessions: SessionsService, private events: EventsGateway, private prisma: PrismaService) {}

  @Public()
  @UseGuards(LoginThrottleGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan access + refresh token' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, { ipAddress: clientIp(req), userAgent: req.headers['user-agent'] });

    // Simpan refresh token sebagai httpOnly cookie
    res.cookie('refresh_token', result.tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: result.tokens.refreshExpiresIn * 1000 });

    const { refreshToken: _, ...tokens } = result.tokens;
    return ok({ ...result, tokens }, 'Login berhasil');
  }

  // @Public: lewati global JwtAuthGuard (access token bisa saja sudah expired);
  // keamanan tetap dijaga JwtRefreshGuard via refresh token.
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perbarui access token menggunakan refresh token' })
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(user.sub, user.sid, user.refreshToken);

    res.cookie('refresh_token', result.tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: result.tokens.refreshExpiresIn * 1000 });

    const { refreshToken: _, ...tokens } = result.tokens;
    return ok({ tokens }, 'Token diperbarui');
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout dan hapus refresh token cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ids = await this.sessions.revokeToken(req.cookies?.refresh_token ?? req.headers.authorization?.replace(/^Bearer /, ''));
    this.events.disconnectSessions(ids);
    const { maxAge: _, ...cookieOptions } = COOKIE_OPTIONS;
    res.clearCookie('refresh_token', cookieOptions);
    return ok(null, 'Logout berhasil');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Data pengguna yang sedang login' })
  async getMe(@CurrentUser() user: any) {
    const data = await this.authService.getMe(user.id);
    return ok(data);
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: any) {
    return ok(await this.sessions.list(user.id, user.sessionId));
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: any, @Param('id') id: string) {
    this.events.disconnectSessions(await this.sessions.revoke(user.id, id));
    return ok(null, 'Sesi berhasil dicabut');
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    this.events.disconnectSessions(await this.sessions.revoke(user.id));
    const { maxAge: _, ...options } = COOKIE_OPTIONS;
    res.clearCookie('refresh_token', options);
    return ok(null, 'Semua sesi telah dicabut');
  }

  @Get('login-attempts')
  async loginAttempts(@CurrentUser() user: any) {
    return ok(await this.prisma.loginAttempt.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email.toLowerCase() }] },
      select: { id: true, success: true, ipAddress: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 30,
    }));
  }

}
