import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { QueueService } from '../queue/queue.service';
import { BillingService } from '../billing/billing.service';
import {
  GenerateContentRequest,
  GenerateVariantsRequest,
  MonthlyContentPlanSchema,
  ContentVariantsSchema,
  MonthlyContentPlan,
  ContentVariants,
} from '../ai/schemas/content.schema';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private billingService: BillingService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService
  ) {}

  async generateMonthlyContent(
    tenantId: string,
    userId: string,
    request: GenerateContentRequest
  ) {
    this.logger.log(`🚀 Starting monthly content generation for brand ${request.brandId}`);
    
    // Calculate total posts to be generated (30 days * platforms)
    const totalPosts = 30 * request.platforms.length;
    
    // Check usage limits before proceeding
    const usageCheck = await this.billingService.canUseFeature(tenantId, 'POST_GENERATION', totalPosts);
    if (!usageCheck.allowed) {
      throw new ForbiddenException({
        message: usageCheck.reason,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: usageCheck.usage
      });
    }

    // Verify brand access
    const brand = await this.prisma.brand.findFirst({
      where: {
        id: request.brandId,
        tenantId,
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found or access denied');
    }

    // Enqueue the content generation job
    const job = await this.queueService.generateMonthlyContent({
      tenantId,
      userId,
      brandId: request.brandId,
      niche: request.niche,
      persona: request.persona,
      tone: request.tone,
      ctaGoals: request.ctaGoals,
      platforms: request.platforms,
      startDate: new Date(request.startDate),
    });

    this.logger.log(`✅ Monthly content generation job enqueued: ${job.id}`);

    return {
      success: true,
      message: 'Monthly content generation started',
      jobId: job.id,
      estimatedCompletion: '2-5 minutes',
    };
  }

  async processMonthlyContentGeneration(jobData: {
    tenantId: string;
    userId: string;
    brandId: string;
    niche: string;
    persona: string;
    tone: string;
    ctaGoals: string[];
    platforms: string[];
    startDate: Date;
  }) {
    this.logger.log(`🤖 Processing AI content generation for brand ${jobData.brandId}`);

    try {
      // Generate content plan using AI
      const aiResponse = await this.aiService.generateMonthlyContentPlan({
        brandId: jobData.brandId,
        niche: jobData.niche,
        persona: jobData.persona,
        tone: jobData.tone,
        ctaGoals: jobData.ctaGoals,
        platforms: jobData.platforms,
        startDate: jobData.startDate,
      });

      // Parse and validate AI response
      let contentPlan: MonthlyContentPlan;
      try {
        const parsedResponse = JSON.parse(aiResponse);
        contentPlan = MonthlyContentPlanSchema.parse(parsedResponse);
      } catch (parseError) {
        this.logger.error('Failed to parse AI response:', parseError);
        throw new BadRequestException('AI generated invalid content format');
      }

      // Create posts and schedules in database
      const createdPosts = await this.createPostsFromPlan(
        jobData.tenantId,
        jobData.userId,
        jobData.brandId,
        contentPlan,
        jobData.startDate
      );

      this.logger.log(`✅ Created ${createdPosts.length} posts for brand ${jobData.brandId}`);

      return {
        success: true,
        postsCreated: createdPosts.length,
        posts: createdPosts,
      };
    } catch (error) {
      this.logger.error('Failed to process monthly content generation:', error);
      throw error;
    }
  }

  async generateVariants(
    tenantId: string,
    postId: string,
    request: GenerateVariantsRequest
  ) {
    this.logger.log(`🔄 Generating ${request.variantCount} variants for post ${postId}`);
    
    // Check usage limits for variant generation (treat as post generation)
    const usageCheck = await this.billingService.canUseFeature(tenantId, 'POST_GENERATION', request.variantCount);
    if (!usageCheck.allowed) {
      throw new ForbiddenException({
        message: usageCheck.reason,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: usageCheck.usage
      });
    }

    // Verify post access
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        tenantId,
      },
      include: {
        brand: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found or access denied');
    }

    const content = post.content as any;
    if (!content?.hook || !content?.body) {
      throw new BadRequestException('Post content is incomplete');
    }

    try {
      // Generate variants using AI
      const aiResponse = await this.aiService.generateContentVariants({
        originalContent: {
          hook: content.hook,
          body: content.body,
          hashtags: content.hashtags || [],
        },
        platform: content.platforms?.[0] || 'INSTAGRAM',
        variantCount: request.variantCount,
        tone: request.tone || 'professional',
        niche: post.brand?.name || 'general',
      });

      // Parse and validate AI response
      let variants: ContentVariants;
      try {
        const parsedResponse = JSON.parse(aiResponse);
        variants = ContentVariantsSchema.parse(parsedResponse);
      } catch (parseError) {
        this.logger.error('Failed to parse AI variants response:', parseError);
        throw new BadRequestException('AI generated invalid variants format');
      }

      this.logger.log(`✅ Generated ${variants.variants.length} variants for post ${postId}`);
      
      // Track usage for variant generation
      try {
        await this.billingService.trackUsage(
          tenantId,
          'POST_GENERATION',
          variants.variants.length,
          {
            postId,
            brandId: post.brandId,
            contentType: 'variants',
            originalPostTitle: post.title
          }
        );
        this.logger.log(`📊 Tracked usage: ${variants.variants.length} variants generated`);
      } catch (error) {
        this.logger.error('Failed to track variant usage:', error);
        // Don't fail the entire operation if usage tracking fails
      }

      return {
        success: true,
        originalPost: {
          id: post.id,
          title: post.title,
          content: content,
        },
        variants: variants.variants,
      };
    } catch (error) {
      this.logger.error('Content variant generation failed:', error);
      throw error;
    }
  }

  private async createPostsFromPlan(
    tenantId: string,
    userId: string,
    brandId: string,
    contentPlan: MonthlyContentPlan,
    startDate: Date
  ) {
    const createdPosts = [];

    for (const day of contentPlan.days) {
      const postDate = new Date(startDate);
      postDate.setDate(startDate.getDate() + day.dayIndex - 1);

      for (const [platform, platformContent] of Object.entries(day.platforms)) {
        try {
          // Create post
          const post = await this.prisma.post.create({
            data: {
              title: `${platform} - Day ${day.dayIndex}`,
              content: {
                hook: platformContent.hook,
                body: platformContent.body,
                hashtags: platformContent.hashtags,
                platforms: [platform],
                visualIdea: platformContent.visualIdea,
              },
              status: 'DRAFT',
              tenantId,
              brandId,
            },
          });

          // Create schedule for the post
          const scheduleTime = new Date(postDate);
          scheduleTime.setHours(9, 0, 0, 0); // Default to 9 AM

          await this.prisma.schedule.create({
            data: {
              postId: post.id,
              runAt: scheduleTime,
              timezone: 'UTC',
              status: 'PENDING',
            },
          });

          createdPosts.push({
            id: post.id,
            title: post.title,
            platform,
            scheduledFor: scheduleTime,
            dayIndex: day.dayIndex,
          });

          this.logger.debug(`📝 Created post for ${platform} - Day ${day.dayIndex}`);
        } catch (error) {
          this.logger.error(`Failed to create post for ${platform} - Day ${day.dayIndex}:`, error);
          // Continue with other posts even if one fails
        }
      }
    }

    // Track usage for all created posts
    if (createdPosts.length > 0) {
      try {
        await this.billingService.trackUsage(
          tenantId,
          'POST_GENERATION',
          createdPosts.length,
          {
            brandId,
            contentType: 'monthly_plan',
            postIds: createdPosts.map(p => p.id)
          }
        );
        this.logger.log(`📊 Tracked usage: ${createdPosts.length} posts generated`);
      } catch (error) {
        this.logger.error('Failed to track usage:', error);
        // Don't fail the entire operation if usage tracking fails
      }
    }

    return createdPosts;
  }

  async getContentGenerationStatus(tenantId: string, jobId: string) {
    // This would integrate with your queue system to check job status
    // For now, return a placeholder response
    return {
      jobId,
      status: 'processing',
      message: 'Content generation in progress...',
    };
  }

  async testAIConnection() {
    try {
      const isConnected = await this.aiService.testConnection();
      return {
        success: true,
        connected: isConnected,
        message: isConnected ? 'AI service is connected and working' : 'AI service connection failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('AI connection test failed:', error);
      return {
        success: false,
        connected: false,
        message: `AI connection test failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
