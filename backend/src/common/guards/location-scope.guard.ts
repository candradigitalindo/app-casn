import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// Filter daftar dan pemeriksaan kepemilikan harus berjalan di server.
// user.locationId kosong berarti pengguna dapat memantau seluruh lokasi.
@Injectable()
export class LocationScopeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const locationId = req.user?.locationId;
    if (!locationId) return true;

    const [, , module, ...path] = req.path.split('/').filter(Boolean);
    if (!['locations', 'stages', 'installations', 'incidents', 'logistics', 'documents', 'berita-acara', 'personnel', 'reports'].includes(module)) return true;

    const assertLocation = (value: unknown) => {
      if (value !== undefined && value !== locationId) {
        throw new ForbiddenException('Anda hanya dapat mengakses lokasi penugasan Anda');
      }
    };
    assertLocation(req.params.locationId);
    assertLocation(req.query.locationId);
    assertLocation(req.body?.locationId);
    assertLocation(req.query.destinationLocationId);
    assertLocation(req.body?.destinationLocationId);

    if (module === 'locations') {
      if (!path.length && req.method === 'POST') throw new ForbiddenException('Pembuatan lokasi memerlukan akun dengan cakupan seluruh lokasi');
      if (req.params.id) assertLocation(req.params.id);
    }

    let record: { locationId?: string | null; destinationLocationId?: string } | null = null;
    const id = req.params.id;
    if (module === 'stages' && (id || req.params.stageId)) {
      record = await this.prisma.locationStage.findUnique({ where: { id: id ?? req.params.stageId }, select: { locationId: true } });
    } else if (module === 'installations' && id) {
      record = await this.prisma.installationProgress.findUnique({ where: { id }, select: { locationId: true } });
    } else if (module === 'incidents' && id) {
      record = await this.prisma.incidentTicket.findUnique({ where: { id }, select: { locationId: true } });
    } else if (module === 'logistics' && id) {
      record = path[0] === 'shipments'
        ? await this.prisma.logisticsShipment.findUnique({ where: { id }, select: { destinationLocationId: true } })
        : await this.prisma.inventoryChecklist.findUnique({ where: { id }, select: { locationId: true } });
    } else if (module === 'documents' && id) {
      record = await this.prisma.locationDocument.findUnique({ where: { id }, select: { locationId: true } });
    } else if (module === 'berita-acara' && id) {
      record = await this.prisma.beritaAcara.findUnique({ where: { id }, select: { locationId: true } });
    } else if (module === 'personnel' && id) {
      record = path[0] === 'attendance'
        ? await this.prisma.personnelAttendance.findUnique({ where: { id }, select: { locationId: true } })
        : await this.prisma.personnel.findUnique({ where: { id }, select: { locationId: true } });
    }
    if (record) assertLocation(record.destinationLocationId ?? record.locationId);
    if (module === 'personnel' && path[0] === 'attendance' && req.body?.personnelId) {
      const person = await this.prisma.personnel.findUnique({ where: { id: req.body.personnelId }, select: { locationId: true } });
      if (person) assertLocation(person.locationId);
    }

    // Guard berjalan sebelum DTO dibuat oleh ValidationPipe.
    req.query.locationId = locationId;
    if (module === 'logistics') req.query.destinationLocationId = locationId;
    if (module === 'personnel') {
      req.query.unassigned = 'false';
      if (req.method === 'POST' && !path.length) req.body.locationId = locationId;
    }
    return true;
  }
}
