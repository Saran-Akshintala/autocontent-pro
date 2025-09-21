import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

export class WhatsAppWorker {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'autocontent-pro-worker'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code received, scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp Client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp Client authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('📴 WhatsApp Client disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('message', async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message) {
    // Only respond to messages that are not from status broadcast
    if (message.from === 'status@broadcast') return;

    // Simple echo bot for testing
    if (message.body.toLowerCase() === 'ping') {
      await message.reply('🏓 Pong! AutoContent Pro WhatsApp Worker is active!');
    }

    if (message.body.toLowerCase() === 'hello') {
      await message.reply('👋 Hello! Welcome to AutoContent Pro WhatsApp automation!');
    }

    // Log all messages for debugging
    console.log(`📨 Message from ${message.from}: ${message.body}`);
  }

  async start(): Promise<void> {
    console.log('🔄 Initializing WhatsApp Client...');
    await this.client.initialize();
  }

  async stop(): Promise<void> {
    if (this.client) {
      console.log('🔄 Destroying WhatsApp Client...');
      await this.client.destroy();
    }
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      await this.client.sendMessage(to, message);
      console.log(`✅ Message sent to ${to}: ${message}`);
    } catch (error) {
      console.error(`❌ Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  getStatus(): { ready: boolean } {
    return { ready: this.isReady };
  }
}
