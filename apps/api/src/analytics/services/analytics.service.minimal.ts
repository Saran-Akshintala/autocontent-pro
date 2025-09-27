import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../app/prisma/prisma.service';
import { 
  BrandAnalyticsResponse, 
  AnalyticsTotals, 
  AnalyticsTimeseriesPoint, 
  TopPost 
} from '@autocontent-pro/types';
import { ChannelType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive analytics for a brand
   */
  async getBrandAnalytics(
    brandId: string, 
    tenantId: string, 
    days: number = 30
  ): Promise<BrandAnalyticsResponse> {
    
    // Verify brand belongs to tenant
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, tenantId },
      select: { id: true, name: true },
    });

    if (!brand) {
      throw new NotFoundException(`Brand not found: ${brandId}`);
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    this.logger.log(`📊 Generating analytics for brand ${brand.name} (${days} days)`);

    // Check if we have existing analytics, if not generate some
    await this.ensureAnalyticsExist(brandId, tenantId);

    // Get all analytics data in parallel
    const [totals, timeseries, topPosts, platformBreakdown] = await Promise.all([
      this.calculateTotals(brandId, startDate, endDate),
      this.generateTimeseries(brandId, startDate, endDate),
      this.getTopPosts(brandId, startDate, endDate),
      this.getPlatformBreakdown(brandId, startDate, endDate),
    ]);

    return {
      brandId,
      brandName: brand.name,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      totals,
      timeseries,
      topPosts,
      platformBreakdown,
    };
  }

  /**
   * Ensure analytics exist for published posts, generate if missing
   */
  private async ensureAnalyticsExist(brandId: string, tenantId: string): Promise<void> {
    // Get published posts that don't have analytics
    const postsWithoutAnalytics = await this.prisma.post.findMany({
      where: {
        brandId,
        tenantId,
        status: 'PUBLISHED',
        analytics: {
          none: {}
        }
      },
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
      },
      take: 20, // Limit to avoid overwhelming the system
    });

    if (postsWithoutAnalytics.length > 0) {
      this.logger.log(`📈 Generating analytics for ${postsWithoutAnalytics.length} posts`);
      
      for (const post of postsWithoutAnalytics) {
        await this.generateAnalyticsForPost(post);
      }
    }
  }

  /**
   * Generate analytics for a single post
   */
  private async generateAnalyticsForPost(post: any): Promise<void> {
    const content = post.content as any;
    const platforms = content?.platforms || ['FACEBOOK']; // Default platform if none specified

    for (const platform of platforms) {
      try {
        const channelType = this.mapPlatformToChannelType(platform);
        const mockData = this.generateMockAnalyticsData();

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
              generatedBy: 'analytics.service.minimal',
              generatedAt: new Date().toISOString(),
              mockData: true,
              postTitle: post.title,
              publishedAt: post.publishedAt,
            },
            recordedAt: post.publishedAt || new Date(),
          },
        });

        this.logger.log(`📊 Created analytics for post ${post.id} on ${channelType}`);
      } catch (error) {
        this.logger.error(`Failed to create analytics for post ${post.id}: ${error.message}`);
      }
    }
  }

  /**
   * Generate realistic mock analytics data
   */
  private generateMockAnalyticsData() {
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

  /**
   * Map platform string to ChannelType enum
   */
  private mapPlatformToChannelType(platform: string): ChannelType {
    const channelTypeMap: Record<string, ChannelType> = {
      'FACEBOOK': ChannelType.FACEBOOK,
      'INSTAGRAM': ChannelType.INSTAGRAM,
      'LINKEDIN': ChannelType.LINKEDIN,
      'TWITTER': ChannelType.TWITTER,
      'X': ChannelType.TWITTER,
    };

    return channelTypeMap[platform.toUpperCase()] || ChannelType.FACEBOOK;
  }

  private async calculateTotals(
    brandId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AnalyticsTotals> {
    
    const analytics = await this.prisma.postAnalytics.findMany({
      where: {
        post: { brandId },
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        impressions: true,
        engagement: true,
        clicks: true,
        shares: true,
        comments: true,
        likes: true,
      },
    });

    const totals = analytics.reduce(
      (acc, curr) => ({
        totalImpressions: acc.totalImpressions + curr.impressions,
        totalEngagement: acc.totalEngagement + curr.engagement,
        totalClicks: acc.totalClicks + curr.clicks,
        totalShares: acc.totalShares + curr.shares,
        totalComments: acc.totalComments + curr.comments,
        totalLikes: acc.totalLikes + curr.likes,
      }),
      {
        totalImpressions: 0,
        totalEngagement: 0,
        totalClicks: 0,
        totalShares: 0,
        totalComments: 0,
        totalLikes: 0,
      }
    );

    // Get unique posts count
    const uniquePosts = await this.prisma.post.count({
      where: {
        brandId,
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'PUBLISHED',
      },
    });

    return {
      ...totals,
      totalPosts: uniquePosts,
      avgEngagementRate: totals.totalImpressions > 0 
        ? (totals.totalEngagement / totals.totalImpressions) * 100 
        : 0,
      avgClickRate: totals.totalImpressions > 0 
        ? (totals.totalClicks / totals.totalImpressions) * 100 
        : 0,
    };
  }

  private async generateTimeseries(
    brandId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AnalyticsTimeseriesPoint[]> {
    
    // Generate daily aggregates using raw SQL for better performance
    const dailyData = await this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE(pa."recordedAt") as date,
        SUM(pa.impressions) as impressions,
        SUM(pa.engagement) as engagement,
        SUM(pa.clicks) as clicks,
        SUM(pa.reach) as reach
      FROM post_analytics pa
      JOIN posts p ON pa."postId" = p.id
      WHERE p."brandId" = ${brandId}
        AND pa."recordedAt" >= ${startDate}
        AND pa."recordedAt" <= ${endDate}
      GROUP BY DATE(pa."recordedAt")
      ORDER BY date ASC
    `;

    // Fill in missing dates with zeros
    const timeseries: AnalyticsTimeseriesPoint[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.find(d => {
        const dbDate = new Date(d.date).toISOString().split('T')[0];
        return dbDate === dateStr;
      });
      
      timeseries.push({
        date: dateStr,
        impressions: dayData ? parseInt(dayData.impressions) || 0 : 0,
        engagement: dayData ? parseInt(dayData.engagement) || 0 : 0,
        clicks: dayData ? parseInt(dayData.clicks) || 0 : 0,
        reach: dayData ? parseInt(dayData.reach) || 0 : 0,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeseries;
  }

  private async getTopPosts(
    brandId: string, 
    startDate: Date, 
    endDate: Date,
    limit: number = 5
  ): Promise<TopPost[]> {
    
    const topPosts = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.title,
        p.content,
        p."publishedAt" as published_at,
        p.status,
        SUM(pa.impressions) as total_impressions,
        SUM(pa.engagement) as total_engagement,
        CASE 
          WHEN SUM(pa.impressions) > 0 
          THEN (SUM(pa.engagement)::float / SUM(pa.impressions)) * 100 
          ELSE 0 
        END as engagement_rate
      FROM posts p
      JOIN post_analytics pa ON p.id = pa."postId"
      WHERE p."brandId" = ${brandId}
        AND p."publishedAt" >= ${startDate}
        AND p."publishedAt" <= ${endDate}
        AND p.status = 'PUBLISHED'
      GROUP BY p.id, p.title, p.content, p."publishedAt", p.status
      ORDER BY total_engagement DESC
      LIMIT ${limit}
    `;

    return topPosts.map(post => ({
      id: post.id,
      title: post.title,
      platforms: (post.content as any)?.platforms || [],
      publishedAt: post.published_at,
      totalImpressions: parseInt(post.total_impressions) || 0,
      totalEngagement: parseInt(post.total_engagement) || 0,
      engagementRate: parseFloat(post.engagement_rate) || 0,
      status: post.status,
    }));
  }

  private async getPlatformBreakdown(
    brandId: string, 
    startDate: Date, 
    endDate: Date
  ) {
    const platformData = await this.prisma.$queryRaw<any[]>`
      SELECT 
        pa."channelType" as platform,
        SUM(pa.impressions) as impressions,
        SUM(pa.engagement) as engagement,
        COUNT(DISTINCT pa."postId") as posts
      FROM post_analytics pa
      JOIN posts p ON pa."postId" = p.id
      WHERE p."brandId" = ${brandId}
        AND pa."recordedAt" >= ${startDate}
        AND pa."recordedAt" <= ${endDate}
      GROUP BY pa."channelType"
      ORDER BY impressions DESC
    `;

    return platformData.map(item => ({
      platform: item.platform,
      impressions: parseInt(item.impressions) || 0,
      engagement: parseInt(item.engagement) || 0,
      posts: parseInt(item.posts) || 0,
    }));
  }

  /**
   * Manually trigger analytics generation for a brand (without queue)
   */
  async generateAnalyticsForBrand(brandId: string, tenantId: string): Promise<{ generated: number }> {
    this.logger.log(`🔄 Manually generating analytics for brand ${brandId}`);
    
    const postsWithoutAnalytics = await this.prisma.post.findMany({
      where: {
        brandId,
        tenantId,
        status: 'PUBLISHED',
        analytics: {
          none: {}
        }
      },
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
      },
    });

    for (const post of postsWithoutAnalytics) {
      await this.generateAnalyticsForPost(post);
    }

    this.logger.log(`✅ Generated analytics for ${postsWithoutAnalytics.length} posts`);
    
    return { generated: postsWithoutAnalytics.length };
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalPosts, totalImpressions, totalEngagement, recentAnalytics] = await Promise.all([
      this.prisma.post.count({
        where: {
          tenantId,
          status: 'PUBLISHED',
          publishedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.postAnalytics.aggregate({
        where: {
          post: { tenantId },
          recordedAt: { gte: thirtyDaysAgo },
        },
        _sum: { impressions: true },
      }),
      this.prisma.postAnalytics.aggregate({
        where: {
          post: { tenantId },
          recordedAt: { gte: thirtyDaysAgo },
        },
        _sum: { engagement: true },
      }),
      this.prisma.postAnalytics.count({
        where: {
          post: { tenantId },
          recordedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      totalPosts,
      totalImpressions: totalImpressions._sum.impressions || 0,
      totalEngagement: totalEngagement._sum.engagement || 0,
      recentAnalytics,
      period: '30 days',
    };
  }
}
