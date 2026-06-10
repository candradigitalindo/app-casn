import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ok } from '../../common/dto/api-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Daftar semua pengguna (Super Admin)' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail pengguna berdasarkan ID' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return ok(user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Buat pengguna baru (Super Admin)' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return ok(user, 'Pengguna berhasil dibuat');
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update data pengguna (Super Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return ok(user, 'Pengguna berhasil diperbarui');
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hapus pengguna (Super Admin)' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return ok(null, 'Pengguna berhasil dihapus');
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aktifkan / nonaktifkan pengguna (Super Admin)' })
  async toggleActive(@Param('id') id: string) {
    const user = await this.usersService.toggleActive(id);
    const msg = user.isActive ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan';
    return ok(user, msg);
  }
}
