import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { QueueService } from './queue/queue.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService
  ) {}

  @Public()
  @Get()
  getData() {
    return this.appService.getData();
  }

  @Public()
  @Get('health')
  async getHealth() {
    try {
      const [dbHealth, queueHealth] = await Promise.all([
        this.prismaService.healthCheck(),
        this.queueService.getQueueHealth().catch(() => ({ status: 'unavailable', error: 'Queue service not available' }))
      ]);
      
      const overallStatus = dbHealth.status === 'healthy' && queueHealth.status !== 'unavailable' ? 'ok' : 'degraded';
      
      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        database: dbHealth,
        queues: queueHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    }
  }

  @Public()
  @Get('db/status')
  async getDatabaseStatus() {
    try {
      const [healthCheck, stats] = await Promise.all([
        this.prismaService.healthCheck(),
        this.prismaService.getDatabaseStats(),
      ]);

      return {
        status: 'ok',
        health: healthCheck,
        statistics: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
