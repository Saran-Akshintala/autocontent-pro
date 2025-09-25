// BullMQ client wrappers for AutoContent Pro

import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { WhatsAppJobData } from '@autocontent-pro/types';

// Queue Names
export enum QueueNames {
  CONTENT_GENERATE_MONTHLY = 'content.generate.monthly',
  CONTENT_REGEN_SINGLE = 'content.regen.single',
  APPROVAL_NOTIFY = 'approval.notify',
  PUBLISH_DISPATCH = 'publish.dispatch',
  ANALYTICS_PULL = 'analytics.pull',
  IMAGE_GENERATE = 'image.generate',
  WHATSAPP_MESSAGES = 'whatsapp-messages'
}

// Typed Job Payloads
export interface ContentGenerateMonthlyJobData {
  tenantId: string;
  userId: string;
  brandId: string;
  niche: string;
  persona: string;
  tone: string;
  ctaGoals: string[];
  platforms: string[];
  startDate: Date;
  // Legacy fields for backward compatibility
  month?: number;
  year?: number;
  contentCount?: number;
  preferences?: {
    tone?: string;
    topics?: string[];
    hashtags?: string[];
  };
}

export interface ContentRegenSingleJobData {
  tenantId: string;
  postId: string;
  brandId: string;
  platform: string;
  regenerationType: 'hook' | 'body' | 'hashtags' | 'full';
  preferences?: {
    tone?: string;
    style?: string;
  };
}

export interface ApprovalNotifyJobData {
  tenantId: string;
  postId: string;
  brandId: string;
  approverIds: string[];
  notificationType: 'email' | 'whatsapp' | 'both';
  dueDate?: Date;
  message?: string;
}

export interface PublishDispatchJobData {
  tenantId: string;
  postId: string;
  scheduleId: string;
  platforms: {
    platform: string;
    accountId: string;
    credentials: Record<string, any>;
  }[];
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    mediaUrls?: string[];
  };
  scheduledTime: Date;
}

export interface AnalyticsPullJobData {
  tenantId: string;
  brandId?: string;
  platforms: string[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  metrics: string[];
  postIds?: string[];
}

export interface ImageGenerateJobData {
  tenantId: string;
  postId?: string;
  brandId: string;
  prompt: string;
  style: 'realistic' | 'cartoon' | 'abstract' | 'minimalist';
  dimensions: {
    width: number;
    height: number;
  };
  brandColors?: string[];
  brandFonts?: string[];
}

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export class QueueManager {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor(private config: QueueConfig) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * Creates or gets a queue
   */
  getQueue(name: string, options?: QueueOptions): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        ...options,
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  /**
   * Creates a worker for processing jobs
   */
  createWorker<T = any>(
    queueName: string,
    processor: (job: Job<T>) => Promise<any>,
    options?: WorkerOptions
  ): Worker<T> {
    const worker = new Worker<T>(queueName, processor, {
      connection: this.redis,
      concurrency: 5,
      ...options,
    });

    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed in queue ${queueName}:`, err);
    });

    worker.on('error', (err) => {
      console.error(`❌ Worker error in queue ${queueName}:`, err);
    });

    this.workers.set(`${queueName}-worker`, worker);
    return worker;
  }

  /**
   * Adds a job to a queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
      backoff?: { type: string; delay: number };
    }
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });
  }

  /**
   * Gets queue statistics
   */
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * Gets statistics for all registered queues
   */
  async getAllQueueStats() {
    const stats = [];
    for (const queueName of this.queues.keys()) {
      const queueStats = await this.getQueueStats(queueName);
      stats.push(queueStats);
    }
    return stats;
  }

  /**
   * Clears all jobs from a queue
   */
  async clearQueue(queueName: string, status?: 'wait' | 'active' | 'completed' | 'failed') {
    const queue = this.getQueue(queueName);
    if (status) {
      await queue.clean(0, 1000, status);
    } else {
      await queue.obliterate({ force: true });
    }
  }

  /**
   * Closes all connections
   */
  async close(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    // Close Redis connection
    await this.redis.quit();
  }
}

// Specific Queue Producers
export class ContentQueue {
  constructor(private queueManager: QueueManager) {}

  async generateMonthlyContent(data: ContentGenerateMonthlyJobData): Promise<Job<ContentGenerateMonthlyJobData>> {
    return this.queueManager.addJob(
      QueueNames.CONTENT_GENERATE_MONTHLY,
      'generate-monthly-content',
      data,
      { priority: 5 }
    );
  }

  async regenerateSingleContent(data: ContentRegenSingleJobData): Promise<Job<ContentRegenSingleJobData>> {
    return this.queueManager.addJob(
      QueueNames.CONTENT_REGEN_SINGLE,
      'regenerate-single-content',
      data,
      { priority: 8 }
    );
  }
}

export class ApprovalQueue {
  constructor(private queueManager: QueueManager) {}

  async notifyApprovers(data: ApprovalNotifyJobData): Promise<Job<ApprovalNotifyJobData>> {
    return this.queueManager.addJob(
      QueueNames.APPROVAL_NOTIFY,
      'notify-approvers',
      data,
      { priority: 7 }
    );
  }
}

export class PublishQueue {
  constructor(private queueManager: QueueManager) {}

  async dispatchPost(data: PublishDispatchJobData): Promise<Job<PublishDispatchJobData>> {
    const delay = data.scheduledTime.getTime() - Date.now();
    return this.queueManager.addJob(
      QueueNames.PUBLISH_DISPATCH,
      'dispatch-post',
      data,
      { 
        delay: Math.max(0, delay),
        priority: 10 
      }
    );
  }
}

export class AnalyticsQueue {
  constructor(private queueManager: QueueManager) {}

  async pullAnalytics(data: AnalyticsPullJobData): Promise<Job<AnalyticsPullJobData>> {
    return this.queueManager.addJob(
      QueueNames.ANALYTICS_PULL,
      'pull-analytics',
      data,
      { priority: 3 }
    );
  }
}

export class ImageQueue {
  constructor(private queueManager: QueueManager) {}

  async generateImage(data: ImageGenerateJobData): Promise<Job<ImageGenerateJobData>> {
    return this.queueManager.addJob(
      QueueNames.IMAGE_GENERATE,
      'generate-image',
      data,
      { priority: 6 }
    );
  }
}

// WhatsApp specific queue helpers
export class WhatsAppQueue {
  constructor(private queueManager: QueueManager) {}

  async sendMessage(
    to: string,
    message: string,
    options?: {
      delay?: number;
      priority?: number;
      campaignId?: string;
    }
  ): Promise<Job<WhatsAppJobData>> {
    const jobData: WhatsAppJobData = {
      to,
      message,
      campaignId: options?.campaignId,
    };

    return this.queueManager.addJob(
      QueueNames.WHATSAPP_MESSAGES,
      'send-message',
      jobData,
      {
        delay: options?.delay,
        priority: options?.priority || 0,
      }
    );
  }

  createWorker(
    processor: (job: Job<WhatsAppJobData>) => Promise<void>
  ): Worker<WhatsAppJobData> {
    return this.queueManager.createWorker(
      QueueNames.WHATSAPP_MESSAGES,
      processor,
      {
        concurrency: 3, // Limit concurrency for WhatsApp to avoid rate limits
      }
    );
  }

  async getStats() {
    return this.queueManager.getQueueStats(QueueNames.WHATSAPP_MESSAGES);
  }
}

// Queue Factory for easy initialization
export class QueueFactory {
  private queueManager: QueueManager;
  
  public content: ContentQueue;
  public approval: ApprovalQueue;
  public publish: PublishQueue;
  public analytics: AnalyticsQueue;
  public image: ImageQueue;
  public whatsapp: WhatsAppQueue;

  constructor(config: QueueConfig) {
    this.queueManager = new QueueManager(config);
    
    this.content = new ContentQueue(this.queueManager);
    this.approval = new ApprovalQueue(this.queueManager);
    this.publish = new PublishQueue(this.queueManager);
    this.analytics = new AnalyticsQueue(this.queueManager);
    this.image = new ImageQueue(this.queueManager);
    this.whatsapp = new WhatsAppQueue(this.queueManager);
  }

  getQueueManager(): QueueManager {
    return this.queueManager;
  }

  async getAllStats() {
    return this.queueManager.getAllQueueStats();
  }

  async close() {
    return this.queueManager.close();
  }
}

// Default queue configuration
export const defaultQueueConfig: QueueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};
