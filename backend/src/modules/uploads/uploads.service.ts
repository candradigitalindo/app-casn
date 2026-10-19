import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { open, unlink } from 'fs/promises';
import { basename, extname, join } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import {
  MIME_BY_EXTENSION,
  SAFE_FILENAME,
  validateFileSignature,
} from './file-types';

type FileUser = { id: string; locationId?: string | null; sessionId: string };
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private sessions: SessionsService,
  ) {}

  async save(
    file: Express.Multer.File,
    user: FileUser,
    requestedLocation?: string,
  ) {
    try {
      if (
        requestedLocation &&
        user.locationId &&
        requestedLocation !== user.locationId
      )
        throw new ForbiddenException('Lokasi unggahan tidak sesuai penugasan');
      const extension = extname(file.filename).toLowerCase();
      const handle = await open(file.path, 'r');
      try {
        const head = Buffer.alloc(Math.min(file.size, 128));
        const tail = Buffer.alloc(Math.min(file.size, 65536));
        await handle.read(head, 0, head.length, 0);
        await handle.read(
          tail,
          0,
          tail.length,
          Math.max(0, file.size - tail.length),
        );
        validateFileSignature(extension, head, tail);
      } finally {
        await handle.close();
      }
      const locationId = user.locationId ?? requestedLocation ?? null;
      if (
        locationId &&
        !(await this.prisma.location.count({ where: { id: locationId } }))
      )
        throw new BadRequestException('Lokasi tidak ditemukan');
      await this.prisma.uploadedFile.create({
        data: {
          filename: file.filename,
          originalName: basename(file.originalname)
            .replace(/[\r\n\x00-\x1f]/g, '')
            .slice(0, 200),
          mimeType: MIME_BY_EXTENSION[extension],
          sizeBytes: file.size,
          uploadedById: user.id,
          locationId,
        },
      });
      return { url: `/uploads/${file.filename}` };
    } catch (error) {
      await unlink(file.path).catch(() => {});
      throw error;
    }
  }

  sign(path: string, user: FileUser) {
    const filename = path.split('?')[0].slice('/uploads/'.length);
    if (!SAFE_FILENAME.test(filename)) return path;
    const token = this.jwt.sign(
      { purpose: 'file', sub: user.id, sid: user.sessionId, filename },
      {
        secret: `${this.config.get<string>('jwt.secret')}:file-access`,
        expiresIn: '15m',
      },
    );
    return `/uploads/${filename}?token=${token}`;
  }

  async authorize(path: string, user: FileUser) {
    const filename = path.split('?')[0].slice('/uploads/'.length);
    if (!SAFE_FILENAME.test(filename))
      throw new BadRequestException('Nama file tidak valid');
    const file = await this.prisma.uploadedFile.findUnique({
      where: { filename },
    });
    if (!user.locationId) return file;
    if (file?.locationId) {
      if (file.locationId !== user.locationId)
        throw new ForbiddenException('File berasal dari lokasi lain');
      return file;
    }
    if (file?.uploadedById === user.id) return file;
    // Kompatibilitas unggahan lama: hak akses berasal dari entitas lokasi yang
    // merujuk file, bukan dari pengetahuan pengguna atas nama file.
    const url = `/uploads/${filename}`;
    const locationId = user.locationId;
    const references = await Promise.all([
      this.prisma.locationDocument.count({
        where: { locationId, fileUrl: url },
      }),
      this.prisma.beritaAcara.count({ where: { locationId, fileUrl: url } }),
      this.prisma.stagePhoto.count({ where: { url, stage: { locationId } } }),
      this.prisma.personnel.count({
        where: { locationId, diplomaFileUrl: url },
      }),
      this.prisma.personnelAttendance.count({
        where: { locationId, fileUrl: url },
      }),
      this.prisma.incidentTicket.count({
        where: { locationId, photos: { array_contains: [url] } },
      }),
      this.prisma.inventoryChecklist.count({
        where: { locationId, photos: { array_contains: [url] } },
      }),
      this.prisma.installationProgress.count({
        where: { locationId, photos: { array_contains: [{ url }] } },
      }),
    ]);
    if (!references.some(Boolean))
      throw new ForbiddenException('Anda tidak memiliki akses ke file ini');
    return file;
  }

  async download(filename: string, token: string) {
    if (!SAFE_FILENAME.test(filename) || typeof token !== 'string' || !token)
      throw new UnauthorizedException('Tautan file wajib memiliki izin akses');
    let claims: { purpose: string; sub: string; sid: string; filename: string };
    try {
      claims = await this.jwt.verifyAsync(token, {
        secret: `${this.config.get<string>('jwt.secret')}:file-access`,
      });
    } catch {
      throw new UnauthorizedException(
        'Tautan file kedaluwarsa. Muat ulang data dokumen.',
      );
    }
    if (claims.purpose !== 'file' || claims.filename !== filename)
      throw new UnauthorizedException('Tautan file tidak valid');
    const user = await this.sessions.validate(claims);
    const file = await this.authorize(`/uploads/${filename}`, user);
    const handle = await open(join(UPLOAD_ROOT, filename), 'r').catch(() => {
      throw new NotFoundException('File tidak ditemukan');
    });
    await handle.close();
    return {
      filename,
      originalName: file?.originalName ?? filename,
      mimeType: MIME_BY_EXTENSION[extname(filename).toLowerCase()],
    };
  }
}
