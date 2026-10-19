import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';
import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ok } from '../../common/dto/api-response.dto';

// Upload generik (foto/video/PDF) ke penyimpanan disk server.
// File ditulis ke folder uploads/ (lihat UploadsModule) dengan nama uuid,
// lalu URL relatif `/uploads/<file>` dikembalikan untuk dicatat di entitas terkait.
@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('v1/uploads')
export class UploadsController {
  constructor(private files: UploadsService) {}
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
  ) {
    if (!file)
      throw new BadRequestException('File wajib diunggah (field: file)');
    return ok(
      await this.files.save(file, user, locationId),
      'File berhasil diunggah',
    );
  }
}
