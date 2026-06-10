import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { EventsGateway } from '../modules/events/events.gateway';

export const SLA_QUEUE = 'sla-monitor';

@Processor(SLA_QUEUE)
export class SlaMonitorProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaMonitorProcessor.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'check-overdue') {
      await this.checkOverdue();
    }
  }

  private async checkOverdue() {
    const now = new Date();
    const warn15 = new Date(now.getTime() + 15 * 60_000);

    // Tickets that just became overdue (within last minute)
    const newlyOverdue = await this.prisma.incidentTicket.findMany({
      where: {
        slaExpiresAt: { gte: new Date(now.getTime() - 60_000), lte: now },
        status: { notIn: ['RESOLVED', 'CLOSED', 'ESCALATED'] },
      },
    });

    for (const ticket of newlyOverdue) {
      this.logger.warn(`SLA overdue: ${ticket.ticketNumber}`);
      this.events.emitTicketUpdated(ticket.id, 'SLA_OVERDUE', ticket);
    }

    // Tickets expiring in next 15 minutes
    const expiringSoon = await this.prisma.incidentTicket.findMany({
      where: {
        slaExpiresAt: { gte: now, lte: warn15 },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
    });

    if (expiringSoon.length) {
      this.logger.warn(`${expiringSoon.length} ticket(s) expiring in 15 min`);
    }
  }
}
