import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './auth/decorators/public.decorator';
import { SkipTenantScoping } from './common/decorators/tenant-scoping.decorator';
import { QueueService } from './queue/queue.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService,
    private readonly queueService: QueueService
  ) {}

  @Get()
  @Public()
  @SkipTenantScoping()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @SkipTenantScoping()
  @Get('health')
  async getHealth() {
    try {
      const [dbHealth, queueHealth] = await Promise.all([
        this.prismaService.healthCheck(),
        this.queueService.getQueueHealth().catch(() => ({ status: 'unavailable', message: 'Queue service not available' }))
      ]);
      
      // Consider system healthy if database is healthy, queue unavailable is acceptable
      const overallStatus = dbHealth.status === 'healthy' ? 'ok' : 'degraded';
      
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
