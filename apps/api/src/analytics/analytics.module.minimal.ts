import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.minimal';
import { AnalyticsService } from './services/analytics.service.minimal';
import { PrismaService } from '../app/prisma/prisma.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    PrismaService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
