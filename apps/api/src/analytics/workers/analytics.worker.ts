import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChannelType } from '@prisma/client';
import { PrismaService } from '../../app/prisma/prisma.service';
import { AnalyticsPullJobData } from '@autocontent-pro/types';

@Processor('analytics.pull')
export class AnalyticsWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AnalyticsPullJobData>): Promise<void> {
    const { brandId, postIds, forceRefresh, tenantId } = job.data;
    
    this.logger.log(`📊 Processing analytics pull for brand ${brandId}`);

    try {
      // Get posts to generate analytics for
      const posts = await this.getPostsForAnalytics(brandId, tenantId, postIds);
      
      this.logger.log(`Found ${posts.length} posts to generate analytics for`);

      let analyticsCreated = 0;
      let analyticsUpdated = 0;

      for (const post of posts) {
        try {
          const platforms = this.extractPlatformsFromPost(post);
          
          for (const platform of platforms) {
            const result = await this.generateOrUpdateAnalytics(post, platform, forceRefresh);
            
            if (result.created) {
              analyticsCreated++;
            } else if (result.updated) {
              analyticsUpdated++;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to generate analytics for post ${post.id}: ${error.message}`);
        }
      }

      this.logger.log(`✅ Analytics pull completed: ${analyticsCreated} created, ${analyticsUpdated} updated`);
      
    } catch (error) {
      this.logger.error(`❌ Analytics pull failed for brand ${brandId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getPostsForAnalytics(brandId: string, tenantId: string, postIds?: string[]) {
    const where: any = {
      brandId,
      tenantId,
      status: 'PUBLISHED', // Only get published posts
    };

    if (postIds && postIds.length > 0) {
      where.id = { in: postIds };
    }

    return await this.prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        brandId: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });
  }

  private extractPlatformsFromPost(post: any): string[] {
    const content = post.content as any;
    return content?.platforms || [];
  }

  private async generateOrUpdateAnalytics(
    post: any, 
    platform: string, 
    forceRefresh: boolean = false
  ): Promise<{ created: boolean; updated: boolean }> {
    
    // Map platform to ChannelType
    const channelType = this.mapPlatformToChannelType(platform);
    
    // Check if analytics already exist
    const existing = await this.prisma.postAnalytics.findFirst({
      where: {
        postId: post.id,
        channelType,
      },
    });

    if (existing && !forceRefresh) {
      // Update existing analytics with fresh mock data
      await this.updateExistingAnalytics(existing.id);
      return { created: false, updated: true };
    } else if (existing && forceRefresh) {
      // Force refresh - update with new mock data
      await this.updateExistingAnalytics(existing.id);
      return { created: false, updated: true };
    } else {
      // Create new analytics
      await this.createNewAnalytics(post, channelType);
      return { created: true, updated: false };
    }
  }

  private async createNewAnalytics(post: any, channelType: ChannelType) {
    const mockData = this.generateMockAnalyticsData(post);
    
    await this.prisma.postAnalytics.create({
      data: {
        postId: post.id,
        channelType,
        impressions: mockData.impressions,
        engagement: mockData.engagement,
        clicks: mockData.clicks,
        shares: mockData.shares,
        comments: mockData.comments,
        likes: mockData.likes,
        reach: mockData.reach,
        metadata: {
          generatedBy: 'analytics.pull.worker',
          generatedAt: new Date().toISOString(),
          mockData: true,
          postTitle: post.title,
          publishedAt: post.publishedAt,
        },
        recordedAt: post.publishedAt || new Date(),
      },
    });

    this.logger.log(`📈 Created analytics for post ${post.id} on ${channelType}`);
  }

  private async updateExistingAnalytics(analyticsId: string) {
    // Generate fresh mock data for updates
    const mockData = this.generateMockAnalyticsData();
    
    await this.prisma.postAnalytics.update({
      where: { id: analyticsId },
      data: {
        impressions: mockData.impressions,
        engagement: mockData.engagement,
        clicks: mockData.clicks,
        shares: mockData.shares,
        comments: mockData.comments,
        likes: mockData.likes,
        reach: mockData.reach,
        metadata: {
          updatedBy: 'analytics.pull.worker',
          updatedAt: new Date().toISOString(),
          mockData: true,
        },
        updatedAt: new Date(),
      },
    });

    this.logger.log(`🔄 Updated analytics ${analyticsId}`);
  }

  private generateMockAnalyticsData(post?: any) {
    // Generate realistic mock data with some correlation
    const baseImpressions = Math.floor(Math.random() * 5000) + 500; // 500-5500
    const engagementRate = Math.random() * 0.08 + 0.01; // 1-9% engagement rate
    const clickRate = Math.random() * 0.03 + 0.005; // 0.5-3.5% click rate
    
    const engagement = Math.floor(baseImpressions * engagementRate);
    const clicks = Math.floor(baseImpressions * clickRate);
    const reach = Math.floor(baseImpressions * (Math.random() * 0.3 + 0.7)); // 70-100% of impressions
    
    // Distribute engagement across different types
    const likes = Math.floor(engagement * (Math.random() * 0.4 + 0.5)); // 50-90% of engagement
    const comments = Math.floor(engagement * (Math.random() * 0.15 + 0.05)); // 5-20% of engagement
    const shares = Math.floor(engagement * (Math.random() * 0.1 + 0.02)); // 2-12% of engagement
    
    return {
      impressions: baseImpressions,
      engagement,
      clicks,
      reach,
      likes,
      comments,
      shares,
    };
  }

  private mapPlatformToChannelType(platform: string): ChannelType {
    const channelTypeMap: Record<string, ChannelType> = {
      'FACEBOOK': ChannelType.FACEBOOK,
      'INSTAGRAM': ChannelType.INSTAGRAM,
      'LINKEDIN': ChannelType.LINKEDIN,
      'TWITTER': ChannelType.TWITTER,
      'X': ChannelType.TWITTER,
      'YT_SHORTS': ChannelType.FACEBOOK, // Fallback
      'TIKTOK': ChannelType.FACEBOOK, // Fallback
    };

    return channelTypeMap[platform.toUpperCase()] || ChannelType.FACEBOOK;
  }
}
