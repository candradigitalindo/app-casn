import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SLA_QUEUE } from './sla-monitor.processor';

@Injectable()
export class JobsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(@InjectQueue(SLA_QUEUE) private slaQueue: Queue) {}

  async onApplicationBootstrap() {
    // Remove any existing repeatable jobs to avoid duplicates on restart
    const repeatables = await this.slaQueue.getRepeatableJobs();
    for (const job of repeatables) {
      await this.slaQueue.removeRepeatableByKey(job.key);
    }

    // Schedule SLA check every 60 seconds
    await this.slaQueue.add('check-overdue', {}, { repeat: { every: 60_000 } });
    this.logger.log('SLA monitor job scheduled (every 60s)');
  }
}
