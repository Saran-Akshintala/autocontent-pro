import { Controller, Post, Param, Get, UseGuards, Req, Logger, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../app/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../app/auth/guards/roles.guard';
import { Roles } from '../app/auth/decorators/roles.decorator';
import { UserRole, PostStatus } from '@prisma/client';
import { PrismaService } from '../app/prisma/prisma.service';

@Controller('publish')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublishingController {
  private readonly logger = new Logger(PublishingController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Force publish a post immediately (Admin only) - Minimal implementation
   */
  @Post('dispatch/:postId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async dispatchPost(@Param('postId') postId: string, @Req() req: any) {
    try {
      this.logger.log(`🚀 Force publish requested for post ${postId} by ${req.user.email}`);
      
      // Load post to verify it exists and user has access
      const post = await this.prisma.post.findFirst({
        where: {
          id: postId,
          tenantId: req.user.tenantId,
        },
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
        },
      });

      if (!post) {
        throw new BadRequestException(`Post not found: ${postId}`);
      }

      // Extract platforms from post content
      const content = post.content as any;
      const platforms = content?.platforms || [];
      
      if (platforms.length === 0) {
        throw new BadRequestException('No platforms specified for this post');
      }

      // Simulate publishing process
      this.logger.log(`📤 Simulating publish to platforms: ${platforms.join(', ')}`);
      
      // Update post status to published
      await this.prisma.post.update({
        where: { id: postId },
        data: { 
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      // Create mock analytics for each platform
      for (const platform of platforms) {
        try {
          await this.createMockAnalytics(postId, platform);
        } catch (error) {
          this.logger.warn(`Failed to create analytics for ${platform}: ${error.message}`);
        }
      }

      const result = {
        postId,
        success: true,
        results: platforms.map((platform: string) => ({
          platform,
          success: true,
          platformPostId: `mock_${platform.toLowerCase()}_${Date.now()}`,
          retryCount: 0,
        })),
        totalPlatforms: platforms.length,
        successfulPlatforms: platforms.length,
        failedPlatforms: 0,
      };
      
      this.logger.log(`✅ Mock publish completed: ${platforms.length}/${platforms.length} successful`);
      
      return {
        success: true,
        message: `Successfully published to ${platforms.length} platforms (mock implementation)`,
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
      const post = await this.prisma.post.findFirst({
        where: { id: postId, tenantId: req.user.tenantId },
        select: {
          id: true,
          status: true,
          publishedAt: true,
          content: true,
        },
      });

      if (!post) {
        throw new BadRequestException(`Post not found: ${postId}`);
      }

      const analytics = await this.prisma.postAnalytics.findMany({
        where: { postId },
        select: {
          channelType: true,
          impressions: true,
          engagement: true,
          recordedAt: true,
        },
      });

      return {
        success: true,
        data: {
          post: {
            id: post.id,
            status: post.status,
            publishedAt: post.publishedAt,
            platforms: (post.content as any)?.platforms || [],
          },
          analytics,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get publishing status for ${postId}: ${error.message}`);
      throw new BadRequestException(`Failed to get publishing status: ${error.message}`);
    }
  }

  /**
   * Health check for publishing system
   */
  @Get('health')
  async getPublishingHealth() {
    return {
      success: true,
      status: 'healthy',
      message: 'Mock publishing system is operational',
      data: {
        totalPublishers: 6,
        configuredPublishers: 6,
        publishers: [
          { platform: 'FACEBOOK', configured: true },
          { platform: 'INSTAGRAM', configured: true },
          { platform: 'LINKEDIN', configured: true },
          { platform: 'TWITTER', configured: true },
          { platform: 'YT_SHORTS', configured: true },
          { platform: 'TIKTOK', configured: true },
        ],
      },
    };
  }

  private async createMockAnalytics(postId: string, platform: string): Promise<void> {
    // Map platform names to ChannelType
    const channelTypeMap: Record<string, string> = {
      'FACEBOOK': 'FACEBOOK',
      'INSTAGRAM': 'INSTAGRAM', 
      'LINKEDIN': 'LINKEDIN',
      'TWITTER': 'TWITTER',
      'X': 'TWITTER',
      'YT_SHORTS': 'FACEBOOK', // Fallback
      'TIKTOK': 'FACEBOOK', // Fallback
    };

    const channelType = channelTypeMap[platform.toUpperCase()] || 'FACEBOOK';

    await this.prisma.postAnalytics.create({
      data: {
        postId,
        channelType: channelType as any,
        impressions: Math.floor(Math.random() * 1000) + 100,
        engagement: Math.floor(Math.random() * 100) + 10,
        clicks: Math.floor(Math.random() * 50) + 5,
        shares: Math.floor(Math.random() * 20) + 1,
        comments: Math.floor(Math.random() * 15) + 1,
        likes: Math.floor(Math.random() * 80) + 10,
        metadata: {
          publishedVia: 'AutoContent Pro',
          platformPostId: `mock_${platform.toLowerCase()}_${Date.now()}`,
          mockData: true,
          publishedAt: new Date().toISOString(),
        },
        recordedAt: new Date(),
      },
    });

    this.logger.log(`📈 Created mock analytics for ${platform}`);
  }
}
