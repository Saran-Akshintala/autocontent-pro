import { Controller, Get, Post, Param, Query, UseGuards, Req, Logger, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../app/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../app/auth/guards/roles.guard';
import { Roles } from '../app/auth/decorators/roles.decorator';
import { Public } from '../app/auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './services/analytics.service.minimal';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

class AnalyticsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  days?: number = 30;
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
   * Generate analytics for a brand (without queue)
   */
  @Post('brand/:brandId/generate')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async generateBrandAnalytics(
    @Param('brandId') brandId: string,
    @Req() req: any
  ) {
    try {
      this.logger.log(`🔄 Analytics generation triggered for brand ${brandId}`);
      
      const result = await this.analyticsService.generateAnalyticsForBrand(
        brandId,
        req.user.tenantId
      );

      return {
        success: true,
        message: `Generated analytics for ${result.generated} posts`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to generate analytics: ${error.message}`);
      throw new BadRequestException(`Failed to generate analytics: ${error.message}`);
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
  @Public()
  @Get('health')
  async getAnalyticsHealth() {
    return {
      success: true,
      status: 'healthy',
      message: 'Analytics system is operational (Redis-free mode)',
      features: [
        'Brand analytics aggregation',
        'Time-series data generation',
        'Top posts analysis',
        'Platform breakdown',
        'Direct analytics generation (no queue)',
        'Mock data generation',
      ],
      mode: 'redis-free',
    };
  }
}
