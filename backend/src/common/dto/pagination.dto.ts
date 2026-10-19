import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Default & max limit dinaikkan karena seluruh halaman frontend menampilkan
// daftar penuh (agregasi/statistik dihitung di klien) tanpa kontrol paginasi.
export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 500;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 500);
  }
}
