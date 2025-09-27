import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './services/cron.service.minimal';
import { SchedulingController } from './scheduling.controller.minimal';
import { PrismaService } from '../app/prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SchedulingController],
  providers: [
    CronService,
    PrismaService,
  ],
  exports: [CronService],
})
export class SchedulingModule {}
