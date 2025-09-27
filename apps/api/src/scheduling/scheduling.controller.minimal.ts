import { Controller, Post, Get, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../app/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../app/auth/guards/roles.guard';
import { Roles } from '../app/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CronService } from './services/cron.service.minimal';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  private readonly logger = new Logger(SchedulingController.name);

  constructor(private readonly cronService: CronService) {}

  /**
   * Manually trigger the scheduled posts check (for testing)
   */
  @Post('trigger')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async triggerScheduledCheck() {
    this.logger.log('🔄 Manual trigger requested for scheduled posts check');
    await this.cronService.triggerScheduledPostsCheck();
    
    return {
      success: true,
      message: 'Scheduled posts check triggered successfully',
    };
  }

  /**
   * Get scheduling status and statistics
   */
  @Get('status')
  async getSchedulingStatus(@Req() req: any) {
    const stats = await this.cronService.getSchedulingStats(req.user.tenantId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get cron system health
   */
  @Get('health')
  async getSchedulingHealth() {
    return {
      success: true,
      status: 'healthy',
      message: 'Cron scheduling system is operational',
      data: {
        cronEnabled: true,
        runInterval: 'Every minute',
        features: [
          'Automatic post publishing',
          'Auto-approval for overdue posts',
          'Mock analytics generation',
          'Failed post handling',
        ],
      },
    };
  }
}
