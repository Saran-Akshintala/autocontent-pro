import { Controller, Post, Param, Get, UseGuards, Req, Logger, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../app/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../app/auth/guards/roles.guard';
import { Roles } from '../app/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PublishingService } from './services/publishing.service';
import { PublisherFactoryService } from './services/publisher.factory';

@Controller('publish')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublishingController {
  private readonly logger = new Logger(PublishingController.name);

  constructor(
    private readonly publishingService: PublishingService,
    private readonly publisherFactory: PublisherFactoryService,
  ) {}

  /**
   * Force publish a post immediately (Admin only)
   */
  @Post('dispatch/:postId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async dispatchPost(@Param('postId') postId: string, @Req() req: any) {
    try {
      this.logger.log(`🚀 Force publish requested for post ${postId} by ${req.user.email}`);
      
      const result = await this.publishingService.dispatchPost(postId, req.user.tenantId);
      
      this.logger.log(`📊 Publish dispatch completed: ${result.successfulPlatforms}/${result.totalPlatforms} successful`);
      
      return {
        success: true,
        message: `Published to ${result.successfulPlatforms} of ${result.totalPlatforms} platforms`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to dispatch post ${postId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to publish post: ${error.message}`);
    }
  }

  /**
   * Get publishing status for a post
   */
  @Get('status/:postId')
  async getPublishingStatus(@Param('postId') postId: string, @Req() req: any) {
    try {
      const status = await this.publishingService.getPublishingStatus(postId, req.user.tenantId);
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Failed to get publishing status for ${postId}: ${error.message}`);
      throw new BadRequestException(`Failed to get publishing status: ${error.message}`);
    }
  }

  /**
   * Get available publishers and their configuration status
   */
  @Get('publishers')
  async getPublishers() {
    try {
      const supportedPlatforms = this.publisherFactory.getSupportedPlatforms();
      const configuredPublishers = await this.publisherFactory.getConfiguredPublishers();
      
      return {
        success: true,
        data: {
          supportedPlatforms,
          publishers: configuredPublishers,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get publishers: ${error.message}`);
      throw new BadRequestException(`Failed to get publishers: ${error.message}`);
    }
  }

  /**
   * Health check for publishing system
   */
  @Get('health')
  async getPublishingHealth() {
    try {
      const publishers = await this.publisherFactory.getConfiguredPublishers();
      const totalPublishers = publishers.length;
      const configuredPublishers = publishers.filter(p => p.configured).length;
      
      return {
        success: true,
        status: configuredPublishers > 0 ? 'healthy' : 'degraded',
        data: {
          totalPublishers,
          configuredPublishers,
          publishers,
        },
      };
    } catch (error) {
      this.logger.error(`Publishing health check failed: ${error.message}`);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}
