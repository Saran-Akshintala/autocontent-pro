import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PostStatus, ChannelType } from '@prisma/client';
import { PrismaService } from '../../app/prisma/prisma.service';
import { PublisherFactoryService } from './publisher.factory';
import { Platform, PublishPayload, PublishResult } from '../interfaces/publisher.interface';

export interface DispatchResult {
  postId: string;
  success: boolean;
  results: {
    platform: Platform;
    success: boolean;
    platformPostId?: string;
    error?: string;
    retryCount: number;
  }[];
  totalPlatforms: number;
  successfulPlatforms: number;
  failedPlatforms: number;
}

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisherFactory: PublisherFactoryService,
  ) {}

  async dispatchPost(postId: string, tenantId: string): Promise<DispatchResult> {
    this.logger.log(`🚀 Dispatching post ${postId} for publishing`);

    // Load post with all necessary data
    const post = await this.loadPostForPublishing(postId, tenantId);
    
    if (!post) {
      throw new NotFoundException(`Post not found: ${postId}`);
    }

    // Extract platforms from post content
    const platforms = this.extractPlatformsFromPost(post);
    
    if (platforms.length === 0) {
      this.logger.warn(`No platforms specified for post ${postId}`);
      return {
        postId,
        success: true,
        results: [],
        totalPlatforms: 0,
        successfulPlatforms: 0,
        failedPlatforms: 0,
      };
    }

    this.logger.log(`Publishing to ${platforms.length} platforms: ${platforms.join(', ')}`);

    // Update post status to scheduled (closest to publishing)
    await this.updatePostStatus(postId, PostStatus.SCHEDULED);

    // Publish to each platform
    const results = [];
    let successfulPlatforms = 0;
    let failedPlatforms = 0;

    for (const platform of platforms) {
      try {
        const payload = this.createPublishPayload(post, platform);
        const result = await this.publishToPlatformWithRetry(payload);
        
        results.push({
          platform,
          success: result.success,
          platformPostId: result.platformPostId,
          error: result.error,
          retryCount: result.retryCount || 0,
        });

        if (result.success) {
          successfulPlatforms++;
          // Create PostAnalytics stub
          await this.createPostAnalyticsStub(postId, platform, result);
        } else {
          failedPlatforms++;
        }
      } catch (error) {
        this.logger.error(`Failed to publish to ${platform}: ${error.message}`);
        results.push({
          platform,
          success: false,
          error: error.message,
          retryCount: this.maxRetries,
        });
        failedPlatforms++;
      }
    }

    // Update final post status
    const finalStatus = successfulPlatforms > 0 ? PostStatus.PUBLISHED : PostStatus.FAILED;
    await this.updatePostStatus(postId, finalStatus);

    const dispatchResult: DispatchResult = {
      postId,
      success: successfulPlatforms > 0,
      results,
      totalPlatforms: platforms.length,
      successfulPlatforms,
      failedPlatforms,
    };

    this.logger.log(`📊 Dispatch complete for ${postId}: ${successfulPlatforms}/${platforms.length} successful`);
    return dispatchResult;
  }

  private async loadPostForPublishing(postId: string, tenantId: string) {
    return await this.prisma.post.findFirst({
      where: {
        id: postId,
        tenantId,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        assets: {
          select: {
            id: true,
            url: true,
            mimeType: true,
            filename: true,
          },
        },
      },
    });
  }

  private extractPlatformsFromPost(post: any): Platform[] {
    // Extract platforms from post content
    const content = post.content as any;
    const platforms = content?.platforms || [];
    
    // Validate platforms
    const validPlatforms = platforms.filter((p: string) => 
      Object.values(Platform).includes(p as Platform)
    ) as Platform[];
    
    return validPlatforms;
  }

  private createPublishPayload(post: any, platform: Platform): PublishPayload {
    const content = post.content as any;
    
    return {
      postId: post.id,
      platform,
      content: {
        title: post.title,
        hook: content?.hook,
        body: content?.body || post.title,
        hashtags: content?.hashtags || [],
      },
      assets: post.assets || [],
      brandInfo: {
        id: post.brand.id,
        name: post.brand.name,
        handle: undefined, // Brand model doesn't have handle field
      },
      scheduledFor: post.scheduledDate,
    };
  }

  private async publishToPlatformWithRetry(payload: PublishPayload): Promise<PublishResult & { retryCount: number }> {
    const publisher = this.publisherFactory.createPublisher(payload.platform);
    let lastError: string | undefined;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Validate content before publishing
        const validation = await publisher.validateContent(payload);
        if (!validation.valid) {
          return {
            success: false,
            error: `Content validation failed: ${validation.errors?.join(', ')}`,
            retryCount: attempt,
          };
        }

        // Attempt to publish
        const result = await publisher.publish(payload);
        
        if (result.success) {
          return { ...result, retryCount: attempt };
        }
        
        lastError = result.error;
        
        // Don't retry validation errors
        if (result.error?.includes('validation') || result.error?.includes('character limit')) {
          break;
        }
        
        // Wait before retry
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
        
      } catch (error) {
        lastError = error.message;
        this.logger.warn(`Attempt ${attempt + 1} failed for ${payload.platform}: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }
    
    return {
      success: false,
      error: lastError || 'Unknown error after all retries',
      retryCount: this.maxRetries,
    };
  }

  private async updatePostStatus(postId: string, status: PostStatus): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { 
        status,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  private async createPostAnalyticsStub(
    postId: string, 
    platform: Platform, 
    result: PublishResult
  ): Promise<void> {
    try {
      // Map Platform to ChannelType
      const channelType = this.mapPlatformToChannelType(platform);
      
      await this.prisma.postAnalytics.create({
        data: {
          postId,
          channelType,
          impressions: Math.floor(Math.random() * 1000) + 100, // Mock data
          engagement: Math.floor(Math.random() * 100) + 10,
          clicks: Math.floor(Math.random() * 50) + 5,
          shares: Math.floor(Math.random() * 20) + 1,
          comments: Math.floor(Math.random() * 15) + 1,
          likes: Math.floor(Math.random() * 80) + 10,
          metadata: {
            publishedVia: 'AutoContent Pro',
            publishResult: result.metadata,
            platformPostId: result.platformPostId,
            mockData: true,
          },
          recordedAt: new Date(),
        },
      });
      
      this.logger.log(`📈 Created analytics stub for ${platform} post ${result.platformPostId}`);
    } catch (error) {
      this.logger.error(`Failed to create analytics stub: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mapPlatformToChannelType(platform: Platform): ChannelType {
    switch (platform) {
      case Platform.FACEBOOK:
        return ChannelType.FACEBOOK;
      case Platform.INSTAGRAM:
        return ChannelType.INSTAGRAM;
      case Platform.LINKEDIN:
        return ChannelType.LINKEDIN;
      case Platform.X:
        return ChannelType.TWITTER;
      case Platform.YT_SHORTS:
      case Platform.TIKTOK:
        // These don't exist in ChannelType, default to FACEBOOK
        return ChannelType.FACEBOOK;
      default:
        return ChannelType.FACEBOOK;
    }
  }

  async getPublishingStatus(postId: string, tenantId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        content: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post not found: ${postId}`);
    }

    const analytics = await this.prisma.postAnalytics.findMany({
      where: { postId },
      select: {
        channelType: true,
        impressions: true,
        engagement: true,
        recordedAt: true,
        metadata: true,
      },
    });

    return {
      post: {
        id: post.id,
        status: post.status,
        publishedAt: post.publishedAt,
        platforms: (post.content as any)?.platforms || [],
      },
      analytics,
    };
  }
}
