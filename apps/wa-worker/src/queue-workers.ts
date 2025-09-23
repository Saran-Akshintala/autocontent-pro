import {
  QueueFactory,
  QueueNames,
  ContentGenerateMonthlyJobData,
  ContentRegenSingleJobData,
  ApprovalNotifyJobData,
  PublishDispatchJobData,
  AnalyticsPullJobData,
  ImageGenerateJobData,
  defaultQueueConfig,
} from '@autocontent-pro/queue';
import { WhatsAppJobData } from '@autocontent-pro/types';
import { Job } from 'bullmq';

// Initialize queue factory
const queueFactory = new QueueFactory(defaultQueueConfig);

// Content Generation Workers
const contentGenerateWorker = queueFactory
  .getQueueManager()
  .createWorker<ContentGenerateMonthlyJobData>(
    QueueNames.CONTENT_GENERATE_MONTHLY,
    async (job: Job<ContentGenerateMonthlyJobData>) => {
      console.log(
        `🎨 Processing monthly content generation for tenant: ${job.data.tenantId}`
      );
      console.log(
        `📅 Generating ${job.data.contentCount} posts for ${job.data.month}/${job.data.year}`
      );
      console.log(`🎯 Platforms: ${job.data.platforms.join(', ')}`);

      // Simulate content generation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log(`✅ Monthly content generation completed for job ${job.id}`);
      return {
        success: true,
        postsGenerated: job.data.contentCount,
        message: `Generated ${job.data.contentCount} posts successfully`,
      };
    },
    { concurrency: parseInt(process.env.CONTENT_WORKER_CONCURRENCY || '2') }
  );

const contentRegenWorker = queueFactory
  .getQueueManager()
  .createWorker<ContentRegenSingleJobData>(
    QueueNames.CONTENT_REGEN_SINGLE,
    async (job: Job<ContentRegenSingleJobData>) => {
      console.log(`🔄 Regenerating content for post: ${job.data.postId}`);
      console.log(`🎭 Regeneration type: ${job.data.regenerationType}`);
      console.log(`📱 Platform: ${job.data.platform}`);

      // Simulate content regeneration
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log(`✅ Content regeneration completed for job ${job.id}`);
      return {
        success: true,
        postId: job.data.postId,
        regenerationType: job.data.regenerationType,
        message: 'Content regenerated successfully',
      };
    },
    { concurrency: parseInt(process.env.CONTENT_WORKER_CONCURRENCY || '2') }
  );

// Approval Notification Worker
const approvalWorker = queueFactory
  .getQueueManager()
  .createWorker<ApprovalNotifyJobData>(
    QueueNames.APPROVAL_NOTIFY,
    async (job: Job<ApprovalNotifyJobData>) => {
      console.log(
        `📧 Sending approval notifications for post: ${job.data.postId}`
      );
      console.log(`👥 Notifying ${job.data.approverIds.length} approvers`);
      console.log(`📬 Notification type: ${job.data.notificationType}`);

      // Simulate sending notifications
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`✅ Approval notifications sent for job ${job.id}`);
      return {
        success: true,
        notificationsSent: job.data.approverIds.length,
        message: 'Approval notifications sent successfully',
      };
    }
  );

// Publish Dispatch Worker
const publishWorker = queueFactory
  .getQueueManager()
  .createWorker<PublishDispatchJobData>(
    QueueNames.PUBLISH_DISPATCH,
    async (job: Job<PublishDispatchJobData>) => {
      console.log(`🚀 Publishing post: ${job.data.postId}`);
      console.log(
        `📱 Platforms: ${job.data.platforms.map(p => p.platform).join(', ')}`
      );
      console.log(`⏰ Scheduled time: ${job.data.scheduledTime}`);

      // Simulate publishing to platforms
      for (const platform of job.data.platforms) {
        console.log(`📤 Publishing to ${platform.platform}...`);
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log(`✅ Published to ${platform.platform}`);
      }

      console.log(`✅ Post publishing completed for job ${job.id}`);
      return {
        success: true,
        platformsPublished: job.data.platforms.length,
        message: 'Post published to all platforms successfully',
      };
    },
    { concurrency: parseInt(process.env.PUBLISH_WORKER_CONCURRENCY || '3') }
  );

// Analytics Pull Worker
const analyticsWorker = queueFactory
  .getQueueManager()
  .createWorker<AnalyticsPullJobData>(
    QueueNames.ANALYTICS_PULL,
    async (job: Job<AnalyticsPullJobData>) => {
      console.log(`📊 Pulling analytics for tenant: ${job.data.tenantId}`);
      console.log(`📱 Platforms: ${job.data.platforms.join(', ')}`);
      console.log(
        `📅 Date range: ${job.data.dateRange.startDate} to ${job.data.dateRange.endDate}`
      );

      // Simulate analytics pulling
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`✅ Analytics pull completed for job ${job.id}`);
      return {
        success: true,
        metricsCollected: job.data.metrics.length,
        platformsProcessed: job.data.platforms.length,
        message: 'Analytics data pulled successfully',
      };
    }
  );

// Image Generation Worker
const imageWorker = queueFactory
  .getQueueManager()
  .createWorker<ImageGenerateJobData>(
    QueueNames.IMAGE_GENERATE,
    async (job: Job<ImageGenerateJobData>) => {
      console.log(`🎨 Generating image for brand: ${job.data.brandId}`);
      console.log(`🖼️ Style: ${job.data.style}`);
      console.log(
        `📐 Dimensions: ${job.data.dimensions.width}x${job.data.dimensions.height}`
      );
      console.log(`💭 Prompt: ${job.data.prompt}`);

      // Simulate image generation
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log(`✅ Image generation completed for job ${job.id}`);
      return {
        success: true,
        imageUrl: `https://generated-images.example.com/${job.id}.jpg`,
        message: 'Image generated successfully',
      };
    }
  );

// WhatsApp Worker
const whatsappWorker = queueFactory.whatsapp.createWorker(
  async (job: Job<WhatsAppJobData>) => {
    console.log(`📱 Sending WhatsApp message to: ${job.data.to}`);
    console.log(`💬 Message: ${job.data.message}`);

    // Simulate WhatsApp message sending
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`✅ WhatsApp message sent for job ${job.id}`);
    // WhatsApp worker expects void return
  }
);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down queue workers...');
  await queueFactory.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down queue workers...');
  await queueFactory.close();
  process.exit(0);
});

console.log('🚀 Queue workers started successfully!');
console.log('📋 Active workers:');
console.log('  - Content Generation (Monthly)');
console.log('  - Content Regeneration (Single)');
console.log('  - Approval Notifications');
console.log('  - Publish Dispatch');
console.log('  - Analytics Pull');
console.log('  - Image Generation');
console.log('  - WhatsApp Messages');
console.log('⏳ Waiting for jobs...');
