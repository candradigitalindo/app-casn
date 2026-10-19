import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { UploadsService, UPLOAD_ROOT } from './uploads.service';

@Controller('uploads')
export class MediaController {
  constructor(private files: UploadsService) {}
  @Public()
  @Get(':filename')
  async download(
    @Param('filename') filename: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const file = await this.files.download(filename, token);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    const disposition =
      /^(image|video)\//.test(file.mimeType) ||
      file.mimeType === 'application/pdf'
        ? 'inline'
        : 'attachment';
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.sendFile(file.filename, {
      root: UPLOAD_ROOT,
      dotfiles: 'deny',
      cacheControl: false,
    });
  }
}
