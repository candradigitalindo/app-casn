import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
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
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan access + refresh token' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Simpan refresh token sebagai httpOnly cookie
    res.cookie('refresh_token', result.tokens.refreshToken, COOKIE_OPTIONS);

    return ok(result, 'Login berhasil');
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
    const result = await this.authService.refresh(user.sub, user.email, user.role);

    res.cookie('refresh_token', result.tokens.refreshToken, COOKIE_OPTIONS);

    return ok(result, 'Token diperbarui');
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout dan hapus refresh token cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
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
}
