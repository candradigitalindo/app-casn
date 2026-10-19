import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserRole } from '@prisma/client';
import { statfs } from 'fs/promises';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ok } from '../../common/dto/api-response.dto';
import { SLA_QUEUE } from '../../jobs/sla-monitor.processor';
import { operationState } from './operations-state';

@Controller('v1/health')
export class OperationsController {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(SLA_QUEUE) private queue: Queue,
  ) {}
  @Public() @Get('live') live() {
    return { status: 'ok', version: process.env.APP_VERSION ?? 'development' };
  }
  @Public() @Get('ready') async ready() {
    let timer: NodeJS.Timeout | undefined;
    try {
      const checks = Promise.all([
        this.prisma.$queryRaw`SELECT 1`,
        this.queue
          .waitUntilReady()
          .then((client) =>
            (client as unknown as { ping(): Promise<string> }).ping(),
          ),
      ]);
      await Promise.race([
        checks,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Readiness timeout')),
            3000,
          );
        }),
      ]);
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Layanan pendukung belum siap');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async diagnostics() {
    const ready = await this.ready();
    const [disk, backup, restore, monitor] = await Promise.all([
      statfs(process.cwd()),
      operationState('latest-backup'),
      operationState('latest-restore-check'),
      operationState('latest-health'),
    ]);
    return ok({
      ...ready,
      version: process.env.APP_VERSION ?? 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      storage: {
        totalBytes: disk.blocks * disk.bsize,
        availableBytes: disk.bavail * disk.bsize,
      },
      backup,
      restore,
      monitor,
    });
  }
}
