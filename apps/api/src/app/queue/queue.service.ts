import { Injectable, Inject } from '@nestjs/common';
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
    @Inject('QUEUE_FACTORY') private queueFactory: QueueFactory
  ) {}

  // Content Generation
  async generateMonthlyContent(data: ContentGenerateMonthlyJobData) {
    return this.queueFactory.content.generateMonthlyContent(data);
  }

  async regenerateSingleContent(data: ContentRegenSingleJobData) {
    return this.queueFactory.content.regenerateSingleContent(data);
  }

  // Approval Notifications
  async notifyApprovers(data: ApprovalNotifyJobData) {
    return this.queueFactory.approval.notifyApprovers(data);
  }

  // Publishing
  async dispatchPost(data: PublishDispatchJobData) {
    return this.queueFactory.publish.dispatchPost(data);
  }

  // Analytics
  async pullAnalytics(data: AnalyticsPullJobData) {
    return this.queueFactory.analytics.pullAnalytics(data);
  }

  // Image Generation
  async generateImage(data: ImageGenerateJobData) {
    return this.queueFactory.image.generateImage(data);
  }

  // WhatsApp
  async sendWhatsAppMessage(to: string, message: string, options?: { delay?: number; campaignId?: string }) {
    return this.queueFactory.whatsapp.sendMessage(to, message, options);
  }

  // Queue Management
  async getAllQueueStats() {
    return this.queueFactory.getAllStats();
  }

  async getQueueStats(queueName: string) {
    return this.queueFactory.getQueueManager().getQueueStats(queueName);
  }

  async clearQueue(queueName: string, status?: 'wait' | 'active' | 'completed' | 'failed') {
    return this.queueFactory.getQueueManager().clearQueue(queueName, status);
  }

  // Health Check
  async getQueueHealth() {
    const stats = await this.getAllQueueStats();
    const totalJobs = stats.reduce((sum, queue) => sum + queue.total, 0);
    const failedJobs = stats.reduce((sum, queue) => sum + queue.failed, 0);
    const activeJobs = stats.reduce((sum, queue) => sum + queue.active, 0);

    return {
      status: failedJobs > 100 ? 'unhealthy' : 'healthy',
      totalJobs,
      activeJobs,
      failedJobs,
      queues: stats,
    };
  }
}
