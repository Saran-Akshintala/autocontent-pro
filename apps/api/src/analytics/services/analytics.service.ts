import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../app/prisma/prisma.service';
import { 
  BrandAnalyticsResponse, 
  AnalyticsPullJobData, 
  AnalyticsTotals, 
  AnalyticsTimeseriesPoint, 
  TopPost 
} from '@autocontent-pro/types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('analytics.pull') private readonly analyticsQueue: Queue<AnalyticsPullJobData>,
  ) {}

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
   * Trigger analytics pull for a brand
   */
  async triggerAnalyticsPull(
    brandId: string, 
    tenantId: string, 
    postIds?: string[], 
    forceRefresh: boolean = false
  ): Promise<{ jobId: string }> {
    
    const jobData: AnalyticsPullJobData = {
      brandId,
      tenantId,
      postIds,
      forceRefresh,
    };

    const job = await this.analyticsQueue.add('pull-analytics', jobData, {
      priority: 10,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`🔄 Queued analytics pull job ${job.id} for brand ${brandId}`);

    return { jobId: job.id };
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
    
    // Generate daily aggregates
    const dailyData = await this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE(recorded_at) as date,
        SUM(impressions) as impressions,
        SUM(engagement) as engagement,
        SUM(clicks) as clicks,
        SUM(reach) as reach
      FROM post_analytics pa
      JOIN posts p ON pa.post_id = p.id
      WHERE p.brand_id = ${brandId}
        AND pa.recorded_at >= ${startDate}
        AND pa.recorded_at <= ${endDate}
      GROUP BY DATE(recorded_at)
      ORDER BY date ASC
    `;

    // Fill in missing dates with zeros
    const timeseries: AnalyticsTimeseriesPoint[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.find(d => d.date === dateStr);
      
      timeseries.push({
        date: dateStr,
        impressions: dayData?.impressions || 0,
        engagement: dayData?.engagement || 0,
        clicks: dayData?.clicks || 0,
        reach: dayData?.reach || 0,
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
        p.published_at,
        p.status,
        SUM(pa.impressions) as total_impressions,
        SUM(pa.engagement) as total_engagement,
        CASE 
          WHEN SUM(pa.impressions) > 0 
          THEN (SUM(pa.engagement)::float / SUM(pa.impressions)) * 100 
          ELSE 0 
        END as engagement_rate
      FROM posts p
      JOIN post_analytics pa ON p.id = pa.post_id
      WHERE p.brand_id = ${brandId}
        AND p.published_at >= ${startDate}
        AND p.published_at <= ${endDate}
        AND p.status = 'PUBLISHED'
      GROUP BY p.id, p.title, p.content, p.published_at, p.status
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
        pa.channel_type as platform,
        SUM(pa.impressions) as impressions,
        SUM(pa.engagement) as engagement,
        COUNT(DISTINCT pa.post_id) as posts
      FROM post_analytics pa
      JOIN posts p ON pa.post_id = p.id
      WHERE p.brand_id = ${brandId}
        AND pa.recorded_at >= ${startDate}
        AND pa.recorded_at <= ${endDate}
      GROUP BY pa.channel_type
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
   * Get analytics job status
   */
  async getJobStatus(jobId: string) {
    try {
      const job = await this.analyticsQueue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress,
        data: job.data,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}: ${error.message}`);
      return { status: 'error', error: error.message };
    }
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
