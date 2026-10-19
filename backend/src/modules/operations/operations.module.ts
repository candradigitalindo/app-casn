import { Module } from '@nestjs/common';
import { JobsModule } from '../../jobs/jobs.module';
import { OperationsController } from './operations.controller';
@Module({ imports: [JobsModule], controllers: [OperationsController] })
export class OperationsModule {}
