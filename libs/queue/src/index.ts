// BullMQ client wrappers for AutoContent Pro

import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { WhatsAppJobData } from '@autocontent-pro/types';

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
      retryDelayOnFailover: 100,
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
      backoff?: string | { type: string; delay: number };
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
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
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

// WhatsApp specific queue helpers
export class WhatsAppQueue {
  private queueManager: QueueManager;
  private queueName = 'whatsapp-messages';

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
  }

  /**
   * Adds a WhatsApp message to the queue
   */
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
      this.queueName,
      'send-message',
      jobData,
      {
        delay: options?.delay,
        priority: options?.priority || 0,
      }
    );
  }

  /**
   * Creates a worker to process WhatsApp messages
   */
  createWorker(
    processor: (job: Job<WhatsAppJobData>) => Promise<void>
  ): Worker<WhatsAppJobData> {
    return this.queueManager.createWorker(
      this.queueName,
      processor,
      {
        concurrency: 3, // Limit concurrency for WhatsApp to avoid rate limits
      }
    );
  }

  /**
   * Gets WhatsApp queue statistics
   */
  async getStats() {
    return this.queueManager.getQueueStats(this.queueName);
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
