import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QueueNames } from '@autocontent-pro/queue';

@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('health')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async getQueueHealth() {
    return this.queueService.getQueueHealth();
  }

  @Get('stats')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async getAllQueueStats() {
    return this.queueService.getAllQueueStats();
  }

  @Get('stats/:queueName')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async getQueueStats(@Param('queueName') queueName: string) {
    return this.queueService.getQueueStats(queueName);
  }

  // Admin endpoints to enqueue test jobs
  @Post('test/content/generate-monthly')
  @Roles('OWNER', 'ADMIN')
  async testGenerateMonthlyContent(@Request() req: any, @Body() body: any) {
    const tenantId = req.tenantId;
    const testData = {
      tenantId,
      brandId: body.brandId || 'test-brand',
      month: body.month || new Date().getMonth() + 1,
      year: body.year || new Date().getFullYear(),
      contentCount: body.contentCount || 10,
      platforms: body.platforms || ['instagram', 'facebook'],
      preferences: body.preferences || { tone: 'professional' },
    };

    const job = await this.queueService.generateMonthlyContent(testData);
    return { message: 'Monthly content generation job enqueued', jobId: job.id };
  }

  @Post('test/content/regenerate-single')
  @Roles('OWNER', 'ADMIN')
  async testRegenerateSingleContent(@Request() req: any, @Body() body: any) {
    const tenantId = req.tenantId;
    const testData = {
      tenantId,
      postId: body.postId || 'test-post-id',
      brandId: body.brandId || 'test-brand',
      platform: body.platform || 'instagram',
      regenerationType: body.regenerationType || 'full',
      preferences: body.preferences || { tone: 'casual' },
    };

    const job = await this.queueService.regenerateSingleContent(testData);
    return { message: 'Single content regeneration job enqueued', jobId: job.id };
  }

  @Post('test/approval/notify')
  @Roles('OWNER', 'ADMIN')
  async testNotifyApprovers(@Request() req: any, @Body() body: any) {
    const tenantId = req.tenantId;
    const testData = {
      tenantId,
      postId: body.postId || 'test-post-id',
      brandId: body.brandId || 'test-brand',
      approverIds: body.approverIds || ['approver-1', 'approver-2'],
      notificationType: body.notificationType || 'email',
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      message: body.message || 'Please review this post for approval',
    };

    const job = await this.queueService.notifyApprovers(testData);
    return { message: 'Approval notification job enqueued', jobId: job.id };
  }

  @Post('test/publish/dispatch')
  @Roles('OWNER', 'ADMIN')
  async testDispatchPost(@Request() req: any, @Body() body: any) {
    const tenantId = req.tenantId;
    const testData = {
      tenantId,
      postId: body.postId || 'test-post-id',
      scheduleId: body.scheduleId || 'test-schedule-id',
      platforms: body.platforms || [
        {
          platform: 'instagram',
          accountId: 'test-account',
          credentials: { accessToken: 'test-token' },
        },
      ],
      content: body.content || {
        hook: 'Test post hook',
        body: 'This is a test post body',
        hashtags: ['#test', '#autocontent'],
      },
      scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : new Date(Date.now() + 60 * 1000),
    };

    const job = await this.queueService.dispatchPost(testData);
    return { message: 'Post dispatch job enqueued', jobId: job.id };
  }

  @Post('test/analytics/pull')
  @Roles('OWNER', 'ADMIN')
  async testPullAnalytics(@Request() req: any, @Body() body: any) {
    const tenantId = req.tenantId;
    const testData = {
      tenantId,
      brandId: body.brandId || 'test-brand',
      platforms: body.platforms || ['instagram', 'facebook'],
      dateRange: {
        startDate: body.startDate ? new Date(body.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: body.endDate ? new Date(body.endDate) : new Date(),
      },
      metrics: body.metrics || ['likes', 'comments', 'shares', 'reach'],
      postIds: body.postIds,
    };

    const job = await this.queueService.pullAnalytics(testData);
    return { message: 'Analytics pull job enqueued', jobId: job.id };
  }

  @Post('test/image/generate')
  @Roles('OWNER', 'ADMIN')
  async testGenerateImage(@Request() req: any, @Body() body: any) {
    const tenantId = req.tenantId;
    const testData = {
      tenantId,
      postId: body.postId,
      brandId: body.brandId || 'test-brand',
      prompt: body.prompt || 'A professional business image with modern design',
      style: body.style || 'realistic',
      dimensions: body.dimensions || { width: 1080, height: 1080 },
      brandColors: body.brandColors || ['#3498db', '#2ecc71'],
      brandFonts: body.brandFonts || ['Arial', 'Helvetica'],
    };

    const job = await this.queueService.generateImage(testData);
    return { message: 'Image generation job enqueued', jobId: job.id };
  }

  @Post('test/whatsapp/send')
  @Roles('OWNER', 'ADMIN')
  async testSendWhatsApp(@Request() req: any, @Body() body: any) {
    const testData = {
      to: body.to || '+1234567890',
      message: body.message || 'Test WhatsApp message from AutoContent Pro',
      delay: body.delay || 0,
      campaignId: body.campaignId,
    };

    const job = await this.queueService.sendWhatsAppMessage(
      testData.to,
      testData.message,
      { delay: testData.delay, campaignId: testData.campaignId }
    );
    return { message: 'WhatsApp message job enqueued', jobId: job.id };
  }

  // Queue management endpoints
  @Delete(':queueName/clear')
  @Roles('OWNER', 'ADMIN')
  async clearQueue(
    @Param('queueName') queueName: string,
    @Query('status') status?: 'wait' | 'active' | 'completed' | 'failed'
  ) {
    await this.queueService.clearQueue(queueName, status);
    return { message: `Queue ${queueName} cleared${status ? ` (${status} jobs)` : ''}` };
  }
}
