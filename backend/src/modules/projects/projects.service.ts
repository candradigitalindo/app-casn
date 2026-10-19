import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, StagePhase } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { paginate } from '../../common/dto/api-response.dto';
import {
  AllocationInputDto,
  CreateProjectDto,
  ProjectLocationDto,
  QueryProjectDto,
  UpdateProjectDto,
  UpdateProjectLocationDto,
} from './projects.dto';
import { allocationCost, capacityTier, sellingPrice } from './project-cost';

const INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  proposals: {
    select: {
      id: true,
      version: true,
      documentNumber: true,
      costTotal: true,
      sellTotal: true,
      createdAt: true,
    },
    orderBy: { version: 'desc' as const },
  },
  locations: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      province: { select: { id: true, name: true, code: true } },
      regency: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, status: true } },
      requirements: {
        orderBy: { masterItem: { no: 'asc' as const } },
        include: {
          masterItem: { select: { no: true, category: true, isActive: true } },
          allocations: {
            include: {
              vendor: {
                select: { id: true, code: true, name: true, isActive: true },
              },
            },
            orderBy: { vendor: { code: 'asc' as const } },
          },
        },
      },
    },
  },
} as const;
type DetailedProject = Prisma.ProjectGetPayload<{ include: typeof INCLUDE }>;
const EDITABLE: ProjectStatus[] = ['DRAFT', 'PENYUSUNAN_PENAWARAN'];

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async list(query: QueryProjectDto) {
    const { page = 1, limit = 20, status, search } = query;
    const where: Prisma.ProjectWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: ['name', 'code', 'agencyName'].map((field) => ({
              [field]: { contains: search, mode: 'insensitive' },
            })),
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { locations: true, proposals: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async get(id: string) {
    return this.view(await this.load(id));
  }
  private async load(id: string, tx: Prisma.TransactionClient = this.prisma) {
    const project = await tx.project.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    return project;
  }
  private async lock(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${id} FOR UPDATE`;
    return this.load(id, tx);
  }
  private editable(project: { status: ProjectStatus }) {
    if (!EDITABLE.includes(project.status))
      throw new ConflictException(
        'Proyek sudah diajukan atau ditutup. Gunakan revisi untuk mengubah penawaran yang diajukan.',
      );
  }
  private dates<T extends CreateProjectDto | UpdateProjectDto>(
    dto: T,
    current?: DetailedProject,
  ) {
    const date = (value?: string) => value === null ? null : value ? new Date(value) : undefined;
    const start = dto.startDate === undefined ? current?.startDate : date(dto.startDate);
    const end = dto.endDate === undefined ? current?.endDate : date(dto.endDate);
    if (start && end && start > end)
      throw new BadRequestException(
        'Tanggal selesai harus setelah tanggal mulai',
      );
    return {
      ...dto,
      startDate: date(dto.startDate),
      endDate: date(dto.endDate),
      submissionDeadline: date(dto.submissionDeadline),
    };
  }

  async create(dto: CreateProjectDto, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(1397313640)::text`;
      const pattern = `^PRJ-${dto.fiscalYear}-([0-9]+)$`;
      const [row] = await tx.$queryRaw<
        { n: bigint }[]
      >`SELECT COALESCE(MAX(SUBSTRING("code" FROM ${pattern})::bigint),0) AS n FROM "Project"`;
      return tx.project.create({
        data: {
          ...this.dates(dto),
          code: `PRJ-${dto.fiscalYear}-${String(row.n + 1n).padStart(4, '0')}`,
          createdById: userId,
        },
      });
    });
    this.changed(result.id);
    return this.get(result.id);
  }
  async update(id: string, dto: UpdateProjectDto) {
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lock(tx, id);
      this.editable(p);
      await tx.project.update({ where: { id }, data: this.dates(dto, p) });
    });
    this.changed(id);
    return this.get(id);
  }

  async saveLocation(
    id: string,
    dto: ProjectLocationDto | UpdateProjectLocationDto,
    locationId?: string,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const p = await this.lock(tx, id);
        this.editable(p);
        const existing = locationId
          ? p.locations.find((loc) => loc.id === locationId)
          : null;
        if (locationId && !existing)
          throw new NotFoundException('Lokasi rencana tidak ditemukan');
        const provinceId = dto.provinceId ?? existing?.provinceId;
        if (
          !provinceId ||
          !(await tx.province.count({ where: { id: provinceId } }))
        )
          throw new BadRequestException('Provinsi tidak valid');
        const regencyId =
          dto.regencyId ??
          (dto.provinceId && dto.provinceId !== existing?.provinceId
            ? null
            : existing?.regencyId);
        const regency = regencyId
          ? await tx.regency.findUnique({ where: { id: regencyId } })
          : null;
        if (regencyId && (!regency || regency.provinceId !== provinceId))
          throw new BadRequestException(
            'Kabupaten/kota tidak berada di provinsi tersebut',
          );
        const values = {
          ...dto,
          provinceId,
          regencyId,
          ...(regency ? { city: regency.name } : {}),
        };
        const loc = existing
          ? await tx.projectLocation.update({
              where: { id: existing.id },
              data: values,
            })
          : await tx.projectLocation.create({
              data: { ...(values as ProjectLocationDto), projectId: id },
            });
        const masters = await tx.masterItem.findMany({
          where: { isActive: true },
          orderBy: { no: 'asc' },
        });
        if (!masters.length)
          throw new BadRequestException('Master barang belum diisi');
        const field = `qty${capacityTier(loc.capacity)}` as 'qty100';
        for (const master of masters) {
          const prior = existing?.requirements.find(
            (r) => r.masterItemId === master.id,
          );
          if (
            prior &&
            prior.allocations.reduce((n, a) => n + a.qty, 0) > master[field]
          )
            throw new ConflictException(
              `Alokasi ${master.name} melebihi kebutuhan kapasitas baru. Kurangi alokasi terlebih dahulu.`,
            );
          await tx.projectRequirement.upsert({
            where: {
              projectLocationId_masterItemId: {
                projectLocationId: loc.id,
                masterItemId: master.id,
              },
            },
            create: {
              projectLocationId: loc.id,
              masterItemId: master.id,
              name: master.name,
              unit: master.unit,
              ownership: master.ownership,
              qty: master[field],
            },
            update: {
              name: master.name,
              unit: master.unit,
              qty: master[field],
            },
          });
        }
        await tx.project.update({
          where: { id },
          data: { status: 'PENYUSUNAN_PENAWARAN' },
        });
      },
      { timeout: 30_000 },
    );
    this.changed(id);
    return this.get(id);
  }
  async deleteLocation(id: string, locationId: string) {
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lock(tx, id);
      this.editable(p);
      if (!p.locations.some((loc) => loc.id === locationId))
        throw new NotFoundException('Lokasi rencana tidak ditemukan');
      await tx.projectLocation.delete({ where: { id: locationId } });
    });
    this.changed(id);
    return this.get(id);
  }

  private requirement(project: DetailedProject, id: string) {
    for (const location of project.locations) {
      const requirement = location.requirements.find((r) => r.id === id);
      if (requirement) return { location, requirement };
    }
    throw new NotFoundException('Kebutuhan barang tidak ditemukan');
  }
  private async offers(
    masterItemId: string,
    provinceId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.vendorItem.findMany({
      where: {
        masterItemId,
        masterItem: { isActive: true },
        vendor: { isActive: true, coverages: { some: { provinceId } } },
      },
      include: {
        vendor: {
          select: { id: true, name: true, code: true, categories: true },
        },
        masterItem: { select: { category: true } },
      },
    });
  }
  async candidates(id: string, requirementId: string) {
    const p = await this.load(id);
    const { location, requirement } = this.requirement(p, requirementId);
    const offers = await this.offers(
      requirement.masterItemId,
      location.provinceId,
    );
    const used = await this.prisma.projectAllocation.groupBy({
      by: ['vendorId'],
      where: {
        requirementId: { not: requirementId },
        requirement: {
          masterItemId: requirement.masterItemId,
          projectLocation: { projectId: id },
        },
      },
      _sum: { qty: true },
    });
    const quantities = new Map(
      used.map((row) => [row.vendorId, row._sum.qty ?? 0]),
    );
    return offers
      .filter((offer) =>
        offer.vendor.categories.includes(offer.masterItem.category),
      )
      .map((offer) => ({
        ...offer,
        availableQty: Math.max(
          0,
          offer.qty - (quantities.get(offer.vendorId) ?? 0),
        ),
        effectivePerEvent: allocationCost(
          1,
          offer.unitPrice,
          offer.priceUnit,
          location.days,
        ).toFixed(2),
      }))
      .sort((a, b) =>
        new Prisma.Decimal(a.effectivePerEvent).cmp(b.effectivePerEvent),
      );
  }

  async setAllocations(
    id: string,
    requirementId: string,
    inputs: AllocationInputDto[],
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const p = await this.lock(tx, id);
        this.editable(p);
        const { location, requirement } = this.requirement(p, requirementId);
        if (inputs.reduce((n, input) => n + input.qty, 0) > requirement.qty)
          throw new BadRequestException(
            'Jumlah alokasi melebihi kebutuhan barang',
          );
        const available = await this.offers(
          requirement.masterItemId,
          location.provinceId,
          tx,
        );
        const vendors = new Set<string>();
        const rows: Prisma.ProjectAllocationCreateManyInput[] = [];
        for (const input of inputs) {
          const offer = available.find(
            (item) => item.id === input.vendorItemId,
          );
          if (
            !offer ||
            !offer.vendor.categories.includes(offer.masterItem.category)
          )
            throw new BadRequestException(
              'Vendor/item tidak aktif, berbeda kategori, atau tidak melayani provinsi lokasi',
            );
          if (vendors.has(offer.vendorId))
            throw new BadRequestException(
              'Satu vendor hanya boleh muncul sekali per item',
            );
          vendors.add(offer.vendorId);
          const usage = await tx.projectAllocation.aggregate({
            where: {
              vendorId: offer.vendorId,
              requirementId: { not: requirementId },
              requirement: {
                masterItemId: requirement.masterItemId,
                projectLocation: { projectId: id },
              },
            },
            _sum: { qty: true },
          });
          if ((usage._sum.qty ?? 0) + input.qty > offer.qty)
            throw new ConflictException(
              `Kapasitas ${offer.vendor.name} tidak mencukupi kebutuhan proyek`,
            );
          rows.push({
            requirementId,
            vendorId: offer.vendorId,
            vendorItemId: offer.id,
            qty: input.qty,
            unitPrice: input.unitPrice ?? offer.unitPrice,
            priceUnit: input.priceUnit ?? offer.priceUnit,
            notes: input.notes,
          });
        }
        await tx.projectAllocation.deleteMany({ where: { requirementId } });
        if (rows.length) await tx.projectAllocation.createMany({ data: rows });
        await tx.project.update({
          where: { id },
          data: { status: 'PENYUSUNAN_PENAWARAN' },
        });
      },
      { timeout: 30_000 },
    );
    this.changed(id);
    return this.get(id);
  }

  async margin(id: string, requirementId: string, marginPct?: number) {
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lock(tx, id);
      this.editable(p);
      this.requirement(p, requirementId);
      await tx.projectRequirement.update({
        where: { id: requirementId },
        data: { marginPct: marginPct ?? null },
      });
    });
    this.changed(id);
    return this.get(id);
  }

  async autoAllocate(id: string, locationId?: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const p = await this.lock(tx, id);
        this.editable(p);
        if (locationId && !p.locations.some((loc) => loc.id === locationId))
          throw new NotFoundException('Lokasi rencana tidak ditemukan');
        const used = new Map<string, number>();
        for (const loc of p.locations)
          for (const req of loc.requirements)
            for (const a of req.allocations) {
              const key = `${a.vendorId}:${req.masterItemId}`;
              used.set(key, (used.get(key) ?? 0) + a.qty);
            }
        let added = 0;
        const missing: { location: string; item: string; qty: number }[] = [];
        for (const loc of p.locations.filter(
          (loc) => !locationId || loc.id === locationId,
        )) {
          for (const req of loc.requirements) {
            let remaining =
              req.qty -
              req.allocations.reduce((n, allocation) => n + allocation.qty, 0);
            if (remaining <= 0) continue;
            const offers = (
              await this.offers(req.masterItemId, loc.provinceId, tx)
            )
              .filter((o) =>
                o.vendor.categories.includes(o.masterItem.category),
              )
              .sort((a, b) => {
                const priorA = req.allocations.find(
                  (item) => item.vendorId === a.vendorId,
                );
                const priorB = req.allocations.find(
                  (item) => item.vendorId === b.vendorId,
                );
                return allocationCost(
                  1,
                  priorA?.unitPrice ?? a.unitPrice,
                  priorA?.priceUnit ?? a.priceUnit,
                  loc.days,
                ).cmp(
                  allocationCost(
                    1,
                    priorB?.unitPrice ?? b.unitPrice,
                    priorB?.priceUnit ?? b.priceUnit,
                    loc.days,
                  ),
                );
              });
            for (const offer of offers) {
              const key = `${offer.vendorId}:${req.masterItemId}`;
              const qty = Math.min(
                remaining,
                Math.max(0, offer.qty - (used.get(key) ?? 0)),
              );
              if (!qty) continue;
              const prior = req.allocations.find(
                (a) => a.vendorId === offer.vendorId,
              );
              if (prior)
                await tx.projectAllocation.update({
                  where: { id: prior.id },
                  data: { qty: prior.qty + qty },
                });
              else
                await tx.projectAllocation.create({
                  data: {
                    requirementId: req.id,
                    vendorId: offer.vendorId,
                    vendorItemId: offer.id,
                    qty,
                    unitPrice: offer.unitPrice,
                    priceUnit: offer.priceUnit,
                  },
                });
              used.set(key, (used.get(key) ?? 0) + qty);
              remaining -= qty;
              added++;
              if (!remaining) break;
            }
            if (remaining)
              missing.push({
                location: loc.name,
                item: req.name,
                qty: remaining,
              });
          }
        }
        await tx.project.update({
          where: { id },
          data: { status: 'PENYUSUNAN_PENAWARAN' },
        });
        return { added, missing };
      },
      { timeout: 60_000 },
    );
    this.changed(id);
    return { ...result, project: await this.get(id) };
  }

  async submit(id: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const p = await this.lock(tx, id);
        this.editable(p);
        if (!p.locations.length)
          throw new BadRequestException(
            'Tambahkan minimal satu lokasi rencana',
          );
        const view = this.view(p);
        if (view.summary.missingLines)
          throw new BadRequestException(
            `${view.summary.missingLines} item belum memiliki alokasi lengkap`,
          );
        if (view.summary.overHps)
          throw new BadRequestException('Total penawaran melebihi HPS proyek');
        if ([view.summary.costTotal, view.summary.sellTotal].some((total) => new Prisma.Decimal(total).gt('9999999999999999.99')))
          throw new BadRequestException('Total proyek melebihi batas nilai yang dapat disimpan');
        const usage = new Map<string, number>();
        for (const loc of p.locations)
          for (const req of loc.requirements) {
            const offers = await this.offers(
              req.masterItemId,
              loc.provinceId,
              tx,
            );
            for (const allocation of req.allocations) {
              const offer = offers.find(
                (o) =>
                  o.vendorId === allocation.vendorId &&
                  o.vendor.categories.includes(o.masterItem.category),
              );
              if (!offer)
                throw new ConflictException(
                  `Pemasok ${allocation.vendor.name} untuk ${req.name} tidak lagi tersedia di wilayah tersebut`,
                );
              const key = `${offer.vendorId}:${req.masterItemId}`;
              const total = (usage.get(key) ?? 0) + allocation.qty;
              usage.set(key, total);
              if (total > offer.qty)
                throw new ConflictException(
                  `Kapasitas vendor ${offer.vendor.name} tidak mencukupi proyek`,
                );
            }
          }
        const version = (p.proposals[0]?.version ?? 0) + 1;
        const documentNumber = `PNW-${p.code}-${String(version).padStart(2, '0')}`;
        const { proposals: _, ...snapshot } = view;
        await tx.projectProposal.create({
          data: {
            projectId: id,
            version,
            documentNumber,
            snapshot: JSON.parse(
              JSON.stringify({ ...snapshot, version, documentNumber }),
            ),
            costTotal: view.summary.costTotal,
            sellTotal: view.summary.sellTotal,
          },
        });
        await tx.project.update({
          where: { id },
          data: { status: 'DIAJUKAN', submittedAt: new Date() },
        });
      },
      { timeout: 60_000 },
    );
    this.changed(id);
    return this.get(id);
  }

  async revise(id: string, reason: string) {
    if (reason.trim().length < 5)
      throw new BadRequestException('Isi alasan revisi minimal lima karakter');
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lock(tx, id);
      if (p.status !== 'DIAJUKAN')
        throw new ConflictException(
          'Hanya penawaran diajukan yang dapat direvisi',
        );
      await tx.project.update({
        where: { id },
        data: { status: 'PENYUSUNAN_PENAWARAN' },
      });
    });
    this.changed(id);
    return this.get(id);
  }

  async status(id: string, status: ProjectStatus) {
    const allowed: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
      DRAFT: ['DIBATALKAN'],
      PENYUSUNAN_PENAWARAN: ['DIBATALKAN'],
      DIAJUKAN: ['MENANG', 'KALAH', 'DIBATALKAN'],
      MENANG: ['DIBATALKAN'],
      OPERASIONAL: ['SELESAI'],
    };
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lock(tx, id);
      if (!allowed[p.status]?.includes(status))
        throw new ConflictException(
          `Perubahan ${p.status} menjadi ${status} tidak diizinkan`,
        );
      if (
        status === 'SELESAI' &&
        (!p.locations.length ||
          p.locations.some((loc) => loc.location?.status !== 'CLOSED'))
      )
        throw new ConflictException(
          'Selesaikan serah terima seluruh lokasi sebelum menutup proyek',
        );
      await tx.project.update({ where: { id }, data: { status } });
    });
    this.changed(id);
    return this.get(id);
  }

  async activate(id: string) {
    const ids = await this.prisma.$transaction(
      async (tx) => {
        const p = await this.lock(tx, id);
        if (p.status === 'OPERASIONAL')
          return p.locations
            .map((loc) => loc.locationId)
            .filter((id): id is string => !!id);
        if (p.status !== 'MENANG')
          throw new ConflictException(
            'Aktivasi hanya untuk proyek yang menang',
          );
        if (!p.locations.length || this.view(p).summary.missingLines)
          throw new ConflictException(
            'Lengkapi kebutuhan lokasi sebelum aktivasi',
          );
        const ids: string[] = [];
        for (const loc of p.locations) {
          if (
            !loc.address?.trim() ||
            loc.latitude === null ||
            loc.longitude === null
          )
            throw new BadRequestException(
              `Lengkapi alamat dan koordinat ${loc.name} sebelum aktivasi`,
            );
          if (loc.locationId) {
            ids.push(loc.locationId);
            continue;
          }
          const operational = await tx.location.create({
            data: {
              code: `LOC-${p.code}-${loc.id.slice(0, 8)}`,
              name: loc.name,
              province: loc.province.name,
              city: loc.city,
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude,
              capacity: loc.capacity,
              startDate: p.startDate,
              endDate: p.endDate,
              metadata: { projectId: p.id, projectLocationId: loc.id },
            },
          });
          const items = await tx.locationItem.createManyAndReturn({
            data: loc.requirements.map((req) => ({
              locationId: operational.id,
              masterItemId: req.masterItemId,
              name: req.name,
              qty: req.qty,
              unit: req.unit,
              ownership: req.ownership,
            })),
            select: { id: true, masterItemId: true },
          });
          const itemMap = new Map(
            items.map((item) => [item.masterItemId, item.id]),
          );
          const supplies: Prisma.LocationSupplyAllocationCreateManyInput[] =
            loc.requirements.flatMap((req) =>
              req.allocations.map((allocation) => ({
                locationItemId: itemMap.get(req.masterItemId)!,
                projectAllocationId: allocation.id,
                vendorId: allocation.vendorId,
                qty: allocation.qty,
                unitPrice: allocation.unitPrice,
                priceUnit: allocation.priceUnit,
              })),
            );
          if (supplies.length)
            await tx.locationSupplyAllocation.createMany({ data: supplies });
          await tx.locationStage.createMany({
            data: Object.values(StagePhase).map((phase) => ({
              locationId: operational.id,
              phase,
            })),
          });
          await tx.projectLocation.update({
            where: { id: loc.id },
            data: { locationId: operational.id },
          });
          ids.push(operational.id);
        }
        await tx.project.update({
          where: { id },
          data: { status: 'OPERASIONAL' },
        });
        return ids;
      },
      { timeout: 60_000 },
    );
    for (const locationId of ids)
      this.events.emitLocationUpdated(locationId, null);
    this.changed(id);
    return this.get(id);
  }

  async proposal(id: string, version: number) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { projectId_version: { projectId: id, version } },
    });
    if (!proposal)
      throw new NotFoundException('Versi penawaran tidak ditemukan');
    return proposal;
  }

  private view(project: DetailedProject) {
    let costTotal = new Prisma.Decimal(0),
      sellTotal = new Prisma.Decimal(0),
      missingLines = 0;
    const locations = project.locations.map((location) => {
      let locationCost = new Prisma.Decimal(0),
        locationSell = new Prisma.Decimal(0);
      const requirements = location.requirements.map((requirement) => {
        const cost = requirement.allocations.reduce(
          (sum, allocation) =>
            sum.plus(
              allocationCost(
                allocation.qty,
                allocation.unitPrice,
                allocation.priceUnit,
                location.days,
              ),
            ),
          new Prisma.Decimal(0),
        );
        const markup = requirement.marginPct ?? project.defaultMarginPct;
        const sell = sellingPrice(cost, markup);
        const allocatedQty = requirement.allocations.reduce(
          (n, allocation) => n + allocation.qty,
          0,
        );
        const missingQty = Math.max(0, requirement.qty - allocatedQty);
        if (missingQty) missingLines++;
        locationCost = locationCost.plus(cost);
        locationSell = locationSell.plus(sell);
        return {
          ...requirement,
          effectiveMarginPct: markup.toFixed(2),
          allocatedQty,
          missingQty,
          costTotal: cost.toFixed(2),
          sellTotal: sell.toFixed(2),
          allocations: requirement.allocations.map((allocation) => ({
            ...allocation,
            subtotal: allocationCost(
              allocation.qty,
              allocation.unitPrice,
              allocation.priceUnit,
              location.days,
            ).toFixed(2),
          })),
        };
      });
      costTotal = costTotal.plus(locationCost);
      sellTotal = sellTotal.plus(locationSell);
      return {
        ...location,
        requirements,
        costTotal: locationCost.toFixed(2),
        sellTotal: locationSell.toFixed(2),
      };
    });
    return {
      ...project,
      locations,
      summary: {
        costTotal: costTotal.toFixed(2),
        sellTotal: sellTotal.toFixed(2),
        profit: sellTotal.minus(costTotal).toFixed(2),
        missingLines,
        overHps: project.hpsAmount !== null && sellTotal.gt(project.hpsAmount),
      },
    };
  }

  private changed(id: string) {
    this.events.server?.to('global').emit('project:updated', { projectId: id });
  }
}
