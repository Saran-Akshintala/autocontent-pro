import { Injectable, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { 
  QueueFactory, 
  QueueNames,
  ContentGenerateMonthlyJobData,
  ContentRegenSingleJobData,
  ApprovalNotifyJobData,
  PublishDispatchJobData,
  AnalyticsPullJobData,
  ImageGenerateJobData
} from '@autocontent-pro/queue';

@Injectable()
export class QueueService {
  constructor(
    @Inject('QUEUE_FACTORY') private queueFactory: QueueFactory | null
  ) {}

  // Content Generation
  async generateMonthlyContent(data: ContentGenerateMonthlyJobData): Promise<Job<ContentGenerateMonthlyJobData>> {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.content.generateMonthlyContent(data);
  }
  async regenerateSingleContent(data: ContentRegenSingleJobData) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.content.regenerateSingleContent(data);
  }

  // Approval Notifications
  async notifyApprovers(data: ApprovalNotifyJobData) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.approval.notifyApprovers(data);
  }

  // Publishing
  async dispatchPost(data: PublishDispatchJobData) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.publish.dispatchPost(data);
  }

  // Analytics
  async pullAnalytics(data: AnalyticsPullJobData) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.analytics.pullAnalytics(data);
  }

  // Image Generation
  async generateImage(data: ImageGenerateJobData) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.image.generateImage(data);
  }

  // WhatsApp
  async sendWhatsAppMessage(to: string, message: string, options?: any) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.whatsapp.sendMessage(to, message, options);
  }

  // Queue Management
  async getAllQueueStats() {
    if (!this.queueFactory) {
      return []; // Return empty array when queue not available
    }
    return this.queueFactory.getAllStats();
  }

  async getQueueStats(queueName: string) {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.getQueueManager().getQueueStats(queueName);
  }

  async clearQueue(queueName: string, status?: 'wait' | 'active' | 'completed' | 'failed') {
    if (!this.queueFactory) {
      throw new Error('Queue service not available - Redis not configured');
    }
    return this.queueFactory.getQueueManager().clearQueue(queueName, status);
  }

  // Health Check
  async getQueueHealth() {
    if (!this.queueFactory) {
      return {
        status: 'unavailable',
        message: 'Queue service not configured - Redis not available',
        totalJobs: 0,
        activeJobs: 0,
        failedJobs: 0,
      };
    }

    const stats = await this.getAllQueueStats();
    const totalJobs = stats.reduce((sum, queue) => sum + queue.total, 0);
    const failedJobs = stats.reduce((sum, queue) => sum + queue.failed, 0);
    const activeJobs = stats.reduce((sum, queue) => sum + queue.active, 0);

    return {
      status: failedJobs > 100 ? 'unhealthy' : 'healthy',
      totalJobs,
      activeJobs,
      failedJobs,
    };
  }
}
