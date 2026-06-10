import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SlaMonitorProcessor, SLA_QUEUE } from './sla-monitor.processor';
import { JobsScheduler } from './jobs.scheduler';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: SLA_QUEUE,
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SlaMonitorProcessor, JobsScheduler],
  exports: [BullModule],
})
export class JobsModule {}
