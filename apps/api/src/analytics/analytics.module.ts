import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsWorker } from './workers/analytics.worker';
import { PrismaService } from '../app/prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analytics.pull',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsWorker,
    PrismaService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
