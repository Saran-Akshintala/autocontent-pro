import { Controller, Get, Post, Param, Query, UseGuards, Req, Logger, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../app/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../app/auth/guards/roles.guard';
import { Roles } from '../app/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './services/analytics.service';
import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

class AnalyticsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  days?: number = 30;

  @IsOptional()
  @IsString()
  postIds?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  forceRefresh?: boolean = false;
}

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get comprehensive analytics for a brand
   */
  @Get('brand/:brandId')
  async getBrandAnalytics(
    @Param('brandId') brandId: string,
    @Query() query: AnalyticsQueryDto,
    @Req() req: any
  ) {
    try {
      this.logger.log(`📊 Analytics requested for brand ${brandId} (${query.days} days)`);
      
      const analytics = await this.analyticsService.getBrandAnalytics(
        brandId,
        req.user.tenantId,
        query.days
      );

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      this.logger.error(`Failed to get brand analytics: ${error.message}`);
      throw new BadRequestException(`Failed to get analytics: ${error.message}`);
    }
  }

  /**
   * Trigger analytics pull for a brand
   */
  @Post('brand/:brandId/pull')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async triggerAnalyticsPull(
    @Param('brandId') brandId: string,
    @Query() query: AnalyticsQueryDto,
    @Req() req: any
  ) {
    try {
      this.logger.log(`🔄 Analytics pull triggered for brand ${brandId}`);
      
      const postIds = query.postIds ? query.postIds.split(',') : undefined;
      
      const result = await this.analyticsService.triggerAnalyticsPull(
        brandId,
        req.user.tenantId,
        postIds,
        query.forceRefresh
      );

      return {
        success: true,
        message: 'Analytics pull job queued successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to trigger analytics pull: ${error.message}`);
      throw new BadRequestException(`Failed to trigger analytics pull: ${error.message}`);
    }
  }

  /**
   * Get analytics job status
   */
  @Get('jobs/:jobId/status')
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      const status = await this.analyticsService.getJobStatus(jobId);
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw new BadRequestException(`Failed to get job status: ${error.message}`);
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  @Get('summary')
  async getAnalyticsSummary(@Req() req: any) {
    try {
      const summary = await this.analyticsService.getAnalyticsSummary(req.user.tenantId);
      
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics summary: ${error.message}`);
      throw new BadRequestException(`Failed to get analytics summary: ${error.message}`);
    }
  }

  /**
   * Get analytics system health
   */
  @Get('health')
  async getAnalyticsHealth() {
    return {
      success: true,
      status: 'healthy',
      message: 'Analytics system is operational',
      features: [
        'Brand analytics aggregation',
        'Time-series data generation',
        'Top posts analysis',
        'Platform breakdown',
        'Queue-based analytics pulling',
        'Mock data generation',
      ],
    };
  }
}
