import { Client } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { createRedisRemoteAuth, RedisStore } from './redis-auth';
import { ApprovalBot } from './approval-bot';
import { QueueFactory, QueueNames, ApprovalNotifyJobData, defaultQueueConfig } from '@autocontent-pro/queue';
import { Job } from 'bullmq';
import axios from 'axios';

export class WhatsAppWorker {
  private client: Client;
  private approvalBot: ApprovalBot;
  private queueFactory: QueueFactory;
  private redisStore: RedisStore;
  private isRunning = false;
  private sessionId: string;
  private apiBaseUrl: string;

  constructor(sessionId: string = 'main-session') {
    this.sessionId = sessionId;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
    
    try {
      // Initialize Redis store
      this.redisStore = new RedisStore({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      });

      // Initialize WhatsApp client with Redis-backed auth
      this.client = new Client({
        authStrategy: createRedisRemoteAuth(sessionId),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });
      console.log('✅ WhatsApp client initialized with Redis auth');
    } catch (error) {
      console.error('❌ Redis connection failed, using local auth strategy:', error.message);
      // Fallback to local auth if Redis fails
      this.client = new Client({
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });
      console.log('⚠️ WhatsApp client initialized with local auth (no Redis)');
    }

    // Initialize approval bot
    this.approvalBot = new ApprovalBot(this.client, this.apiBaseUrl);

    // Initialize queue factory
    try {
      this.queueFactory = new QueueFactory(defaultQueueConfig);
      console.log('✅ Queue factory initialized');
    } catch (error) {
      console.error('❌ Queue factory initialization failed:', error.message);
      console.log('⚠️ WhatsApp notifications will not work without queue system');
    }

    this.setupEventHandlers();
    this.setupQueueWorkers();
  }

  private setupEventHandlers(): void {
    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code received, scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
      
      // Store QR code in Redis for audit (if Redis is available)
      try {
        if (this.redisStore) {
          await this.redisStore.storeQRCode(qr);
        }
      } catch (error) {
        console.log('⚠️ Could not store QR code in Redis (Redis not available)');
      }
    });

    this.client.on('ready', async () => {
      console.log('✅ WhatsApp client is ready!');
      
      const info = this.client.info;
      await this.sendHeartbeat('authenticated', {
        phoneNumber: info.wid.user,
        pushName: info.pushname,
        platform: info.platform,
      });
    });

    this.client.on('authenticated', async () => {
      console.log('🔐 WhatsApp client authenticated');
      await this.sendHeartbeat('authenticated');
    });

    this.client.on('auth_failure', async (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      await this.sendHeartbeat('disconnected', { error: msg });
    });

    this.client.on('disconnected', async (reason) => {
      console.log('📴 WhatsApp client disconnected:', reason);
      await this.sendHeartbeat('disconnected', { reason });
    });

    this.client.on('loading_screen', async (percent, message) => {
      console.log(`⏳ Loading: ${percent}% - ${message}`);
      const percentNum = typeof percent === 'string' ? parseInt(percent) : percent;
      if (percentNum < 100) {
        await this.sendHeartbeat('connecting', { loadingPercent: percentNum, loadingMessage: message });
      }
    });

    // Set up periodic heartbeat
    setInterval(async () => {
      if (this.isRunning) {
        const state = await this.client.getState();
        await this.sendHeartbeat(state as any, {
          isOnline: true,
          lastSeen: new Date().toISOString(),
        });
      }
    }, 60000); // Every minute
  }

  private async sendHeartbeat(status: string, metadata?: any): Promise<void> {
    try {
      // Update Redis heartbeat (if Redis is available)
      if (this.redisStore) {
        try {
          await this.redisStore.updateHeartbeat(this.sessionId, {
            status,
            ...metadata,
          });
        } catch (redisError) {
          console.log('⚠️ Could not update Redis heartbeat (Redis not available)');
        }
      }

      // Send to API
      await axios.post(`${this.apiBaseUrl}/wa/sessions/heartbeat`, {
        sessionId: this.sessionId,
        status,
        metadata,
      }).catch(error => {
        console.error('❌ Failed to send heartbeat to API:', error.message);
      });
    } catch (error) {
      console.error('❌ Error sending heartbeat:', error);
    }
  }

  private setupQueueWorkers(): void {
    try {
      if (!this.queueFactory) {
        console.log('⚠️ Queue factory not available, skipping queue worker setup');
        return;
      }

      // Subscribe to approval.notify queue
      const approvalWorker = this.queueFactory.getQueueManager().createWorker<ApprovalNotifyJobData>(
        QueueNames.APPROVAL_NOTIFY,
        async (job: Job<ApprovalNotifyJobData>) => {
          console.log(`📧 Processing approval notification for post: ${job.data.postId}`);
          
          try {
          // For demo purposes, we'll send to a demo number
          // In production, you'd look up phone numbers from user profiles
          const demoRecipientNumber = '+1234567890'; // Replace with actual approver phone number
          
          console.log(`📧 Sending approval notification for post: ${job.data.postId}`);
          console.log(`👥 Brand: ${job.data.brandId}`);
          console.log(`📱 Notification type: ${job.data.notificationType}`);
          console.log(`💬 Message: ${job.data.message || 'Post requires approval'}`);

          // Send approval request via WhatsApp
          await this.approvalBot.sendApprovalRequest(job.data.postId, demoRecipientNumber);
          
          console.log(`✅ Approval notification sent for post ${job.data.postId}`);
          return {
            success: true,
            postId: job.data.postId,
            recipientCount: 1, // For demo, sending to one recipient
          };
        } catch (error) {
          console.error(`❌ Failed to send approval notification for post ${job.data.postId}:`, error);
          throw error;
        }
        },
        { concurrency: 1 } // Process one at a time to respect rate limits
      );

      console.log('🔔 Approval notification queue worker started');
    } catch (error) {
      console.error('❌ Failed to setup queue workers (Redis issue):', error.message);
      console.log('⚠️ WhatsApp client will still work for QR code and messaging');
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ WhatsApp worker is already running');
      return;
    }

    try {
      console.log('🚀 Starting WhatsApp client...');
      await this.sendHeartbeat('connecting');
      
      await this.client.initialize();
      this.isRunning = true;
      
      console.log('✅ WhatsApp worker started successfully');
    } catch (error) {
      console.error('❌ Failed to start WhatsApp client:', error);
      await this.sendHeartbeat('disconnected', { error: (error as Error).message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ WhatsApp worker is not running');
      return;
    }

    try {
      console.log('🛑 Stopping WhatsApp client...');
      await this.sendHeartbeat('disconnected', { reason: 'Manual shutdown' });
      
      await this.client.destroy();
      await this.queueFactory.close();
      await this.redisStore.close();
      
      this.isRunning = false;
      console.log('✅ WhatsApp client stopped');
    } catch (error) {
      console.error('❌ Error stopping WhatsApp client:', error);
      throw error;
    }
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('WhatsApp client is not running');
    }

    try {
      const chatId = `${to}@c.us`;
      await this.client.sendMessage(chatId, message);
      console.log(`✅ Message sent to ${to}: ${message.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  getApprovalBot(): ApprovalBot {
    return this.approvalBot;
  }

  isClientReady(): boolean {
    return this.isRunning;
  }

  async getStatus() {
    const queueStats = await this.queueFactory.getAllStats();
    const rateLimiterStats = this.approvalBot.getRateLimiterStats();
    const latestQR = await this.redisStore.getLatestQR();

    return {
      sessionId: this.sessionId,
      isRunning: this.isRunning,
      clientState: this.isRunning ? await this.client.getState() : 'stopped',
      queueStats,
      rateLimiterStats,
      lastQRGenerated: latestQR?.timestamp,
      qrAttempts: latestQR?.attempts || 0,
    };
  }
}
