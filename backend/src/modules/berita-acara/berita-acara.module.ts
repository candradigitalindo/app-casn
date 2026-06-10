import { Module } from '@nestjs/common';
import { BeritaAcaraController } from './berita-acara.controller';
import { BeritaAcaraService } from './berita-acara.service';

@Module({
  controllers: [BeritaAcaraController],
  providers: [BeritaAcaraService],
})
export class BeritaAcaraModule {}
