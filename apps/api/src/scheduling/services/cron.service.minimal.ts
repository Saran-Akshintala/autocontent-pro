import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../app/prisma/prisma.service';
import { PostStatus } from '@prisma/client';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every minute to check for posts that need to be published
   * Simplified version without complex dependencies
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPosts() {
    this.logger.log('🕐 Running scheduled posts check (minimal version)...');

    try {
      const now = new Date();
      
      // Find posts that are scheduled and ready to publish
      const readyPosts = await this.prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          schedule: {
            runAt: {
              lte: now,
            },
            status: 'PENDING',
          },
        },
        include: {
          schedule: true,
          brand: true,
        },
      });

      this.logger.log(`📋 Found ${readyPosts.length} posts ready for publishing`);

      for (const post of readyPosts) {
        try {
          this.logger.log(`🚀 Processing scheduled post: ${post.title}`);
          
          // Simulate publishing process (mock implementation)
          await this.simulatePublishing(post);
          
          // Update post status to published
          await this.prisma.post.update({
            where: { id: post.id },
            data: { 
              status: PostStatus.PUBLISHED,
              publishedAt: new Date(),
            },
          });

          // Update schedule status
          if (post.schedule) {
            await this.prisma.schedule.update({
              where: { id: post.schedule.id },
              data: { status: 'COMPLETED' },
            });
          }

          // Create mock analytics
          await this.createMockAnalytics(post);
          
          this.logger.log(`✅ Successfully published post: ${post.title}`);
          
        } catch (error) {
          this.logger.error(`❌ Failed to publish post ${post.id}:`, error.message);
          
          // Mark as failed
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: PostStatus.FAILED },
          });

          if (post.schedule) {
            await this.prisma.schedule.update({
              where: { id: post.schedule.id },
              data: { status: 'FAILED' },
            });
          }
        }
      }

      // Check for posts that need auto-approval (simplified)
      await this.processAutoApproval(now);
      
    } catch (error) {
      this.logger.error('❌ Error in scheduled posts check:', error.message, error.stack);
    }
  }

  /**
   * Process posts that might need auto-approval
   */
  private async processAutoApproval(now: Date) {
    // Look for posts that are 1 hour away from their runAt time and still pending approval
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    const pendingPosts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PENDING_APPROVAL,
        schedule: {
          runAt: {
            gte: now,
            lte: oneHourFromNow,
          },
          status: 'PENDING',
        },
      },
      include: {
        schedule: true,
        brand: true,
      },
    });

    this.logger.log(`⏰ Found ${pendingPosts.length} posts approaching auto-approval window`);

    for (const post of pendingPosts) {
      try {
        // Simple auto-approval logic (can be enhanced with brand settings later)
        this.logger.log(`🔄 Auto-approving post ${post.id} - T-1h reached`);
        
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: PostStatus.SCHEDULED },
        });

        // Log the auto-approval
        await this.prisma.approvalLog.create({
          data: {
            postId: post.id,
            action: 'APPROVED',
            status: PostStatus.SCHEDULED,
            feedback: 'Auto-approved due to no response within 1 hour of scheduled time',
            metadata: {
              autoApproved: true,
              approvedAt: new Date().toISOString(),
              reason: 'No response within 1 hour window',
            },
          },
        });

        this.logger.log(`✅ Auto-approved post ${post.id}`);
        
      } catch (error) {
        this.logger.error(`❌ Failed to auto-approve post ${post.id}:`, error.message);
      }
    }
  }

  /**
   * Simulate publishing process
   */
  private async simulatePublishing(post: any) {
    const content = post.content as any;
    const platforms = content?.platforms || [];
    
    this.logger.log(`📤 Simulating publish to platforms: ${platforms.join(', ')}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Simulated publishing failure');
    }
  }

  /**
   * Create mock analytics for published posts
   */
  private async createMockAnalytics(post: any) {
    const content = post.content as any;
    const platforms = content?.platforms || [];
    
    for (const platform of platforms) {
      try {
        // Map platform names to ChannelType
        const channelTypeMap: Record<string, string> = {
          'FACEBOOK': 'FACEBOOK',
          'INSTAGRAM': 'INSTAGRAM', 
          'LINKEDIN': 'LINKEDIN',
          'TWITTER': 'TWITTER',
          'X': 'TWITTER',
        };

        const channelType = channelTypeMap[platform.toUpperCase()] || 'FACEBOOK';

        await this.prisma.postAnalytics.create({
          data: {
            postId: post.id,
            channelType: channelType as any,
            impressions: Math.floor(Math.random() * 1000) + 100,
            engagement: Math.floor(Math.random() * 100) + 10,
            clicks: Math.floor(Math.random() * 50) + 5,
            shares: Math.floor(Math.random() * 20) + 1,
            comments: Math.floor(Math.random() * 15) + 1,
            likes: Math.floor(Math.random() * 80) + 10,
            metadata: {
              publishedVia: 'AutoContent Pro Cron',
              platformPostId: `cron_${platform.toLowerCase()}_${Date.now()}`,
              mockData: true,
              publishedAt: new Date().toISOString(),
            },
            recordedAt: new Date(),
          },
        });

        this.logger.log(`📈 Created mock analytics for ${platform}`);
      } catch (error) {
        this.logger.warn(`Failed to create analytics for ${platform}: ${error.message}`);
      }
    }
  }

  /**
   * Manual method to trigger scheduled posts check (for testing)
   */
  async triggerScheduledPostsCheck() {
    this.logger.log('🔄 Manually triggering scheduled posts check...');
    await this.handleScheduledPosts();
  }

  /**
   * Get scheduling statistics
   */
  async getSchedulingStats(tenantId: string) {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const [
      pendingApproval,
      scheduledPosts,
      readyToPublish,
      autoApprovalCandidates,
      failedPosts,
    ] = await Promise.all([
      this.prisma.post.count({
        where: {
          tenantId,
          status: 'PENDING_APPROVAL',
        },
      }),
      this.prisma.post.count({
        where: {
          tenantId,
          status: 'SCHEDULED',
        },
      }),
      this.prisma.post.count({
        where: {
          tenantId,
          status: 'SCHEDULED',
          schedule: {
            runAt: { lte: now },
            status: 'PENDING',
          },
        },
      }),
      this.prisma.post.count({
        where: {
          tenantId,
          status: 'PENDING_APPROVAL',
          schedule: {
            runAt: { gte: now, lte: oneHourFromNow },
            status: 'PENDING',
          },
        },
      }),
      this.prisma.post.count({
        where: {
          tenantId,
          status: 'FAILED',
        },
      }),
    ]);

    return {
      currentTime: now,
      counts: {
        pendingApproval,
        scheduledPosts,
        readyToPublish,
        autoApprovalCandidates,
        failedPosts,
      },
      cronStatus: 'active',
    };
  }
}
