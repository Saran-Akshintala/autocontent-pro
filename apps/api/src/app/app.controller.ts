import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService
  ) {}

  @Public()
  @Get()
  getData() {
    return this.appService.getData();
  }

  @Public()
  @Get('health')
  async getHealth() {
    const dbHealth = await this.prismaService.healthCheck();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
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
