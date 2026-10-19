import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { mkdirSync } from 'fs';
import { MIME_BY_EXTENSION } from './file-types';
import { UploadsService } from './uploads.service';
import { FileAccessInterceptor } from './file-access.interceptor';
import { MediaController } from './media.controller';
import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    JwtModule.register({}),
    MulterModule.register({
      fileFilter: (_req, file, cb) => {
        const allowed =
          MIME_BY_EXTENSION[extname(file.originalname).toLowerCase()];
        cb(
          allowed
            ? null
            : new BadRequestException('Format file tidak diizinkan'),
          !!allowed,
        );
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  ],
  controllers: [UploadsController, MediaController],
  providers: [
    UploadsService,
    { provide: APP_INTERCEPTOR, useClass: FileAccessInterceptor },
  ],
  exports: [MulterModule],
})
export class UploadsModule {}
