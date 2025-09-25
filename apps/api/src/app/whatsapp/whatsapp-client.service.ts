import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

interface WhatsAppSession {
  id: string;
  client: Client;
  status:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'authenticated'
    | 'ready';
  qrCode?: string;
  connectedNumber?: string;
  connectedName?: string;
  lastActivity?: Date;
}

@Injectable()
export class WhatsAppClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppClientService.name);
  private sessions = new Map<string, WhatsAppSession>();
  private pendingApprovals = new Map<
    string,
    { postId: string; tenantId: string }
  >();
  private readonly sessionsDir = path.join(process.cwd(), '.wwebjs_auth');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('🚀 WhatsApp Client Service initialized');
    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Shutting down WhatsApp sessions...');
    for (const [sessionId, session] of this.sessions) {
      try {
        await session.client.destroy();
        this.logger.log(`✅ Session ${sessionId} destroyed`);
      } catch (error) {
        this.logger.error(`❌ Error destroying session ${sessionId}:`, error);
      }
    }
    this.sessions.clear();
  }

  async createSession(
    tenantId: string,
    userId: string
  ): Promise<{ sessionId: string; qrCode?: string }> {
    const sessionId = `${tenantId}-${userId}-${Date.now()}`;

    this.logger.log(`📱 Creating WhatsApp session: ${sessionId}`);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionId,
        dataPath: this.sessionsDir,
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
          '--disable-gpu',
        ],
      },
    });

    const session: WhatsAppSession = {
      id: sessionId,
      client,
      status: 'disconnected',
    };

    this.sessions.set(sessionId, session);

    // Set up event handlers
    this.setupClientEventHandlers(sessionId, session, tenantId);

    // Initialize the client
    try {
      await client.initialize();
      session.status = 'connecting';

      // Save session to database
      await this.saveSessionToDatabase(
        sessionId,
        tenantId,
        userId,
        'connecting'
      );

      return { sessionId };
    } catch (error) {
      this.logger.error(
        `❌ Error initializing WhatsApp client for session ${sessionId}:`,
        error
      );
      this.sessions.delete(sessionId);
      throw error;
    }
  }

  private setupClientEventHandlers(
    sessionId: string,
    session: WhatsAppSession,
    tenantId: string
  ) {
    const { client } = session;

    client.on('qr', async qr => {
      this.logger.log(`📱 QR Code generated for session ${sessionId}`);

      // Generate QR code as data URL for frontend display
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        session.qrCode = qrCodeDataUrl;
        session.status = 'connecting';

        // Still log QR code to console for debugging
        console.log(`\n🔗 QR Code for session ${sessionId}:`);
        qrcode.generate(qr, { small: true });

        // Update database
        this.updateSessionInDatabase(sessionId, {
          status: 'connecting',
          qrCode: qrCodeDataUrl,
        });

        this.logger.log(
          `✅ QR Code generated as data URL for session ${sessionId}`
        );
      } catch (error) {
        this.logger.error('Error generating QR code:', error);
        session.qrCode = qr; // fallback to string
        session.status = 'connecting';
        this.updateSessionInDatabase(sessionId, {
          status: 'connecting',
          qrCode: qr,
        });
      }
    });

    client.on('authenticated', () => {
      this.logger.log(`✅ WhatsApp authenticated for session ${sessionId}`);
      session.status = 'authenticated';
      session.qrCode = undefined; // Clear QR code after authentication
      this.updateSessionInDatabase(sessionId, { status: 'authenticated' });
    });

    client.on('ready', () => {
      this.logger.log(`🚀 WhatsApp client ready for session ${sessionId}`);
      session.status = 'ready';
      session.lastActivity = new Date();

      const info = client.info;
      if (info) {
        session.connectedNumber = info.wid.user;
        session.connectedName = info.pushname;
        this.logger.log(`📱 Connected as: ${info.pushname} (${info.wid.user})`);
      }

      this.updateSessionInDatabase(sessionId, {
        status: 'ready',
        connectedNumber: session.connectedNumber,
        connectedName: session.connectedName,
      });
    });

    client.on('disconnected', reason => {
      this.logger.warn(
        `📴 WhatsApp disconnected for session ${sessionId}: ${reason}`
      );
      session.status = 'disconnected';
      this.updateSessionInDatabase(sessionId, { status: 'disconnected' });
    });

    client.on('auth_failure', message => {
      this.logger.error(
        `❌ Authentication failed for session ${sessionId}: ${message}`
      );
      session.status = 'disconnected';
      this.updateSessionInDatabase(sessionId, { status: 'disconnected' });
    });

    // Handle incoming messages for approval commands
    client.on('message', async message => {
      try {
        await this.handleIncomingMessage(sessionId, message);
      } catch (error) {
        this.logger.error(
          `❌ Error handling message for session ${sessionId}:`,
          error
        );
      }
    });
  }

  private async handleIncomingMessage(sessionId: string, message: any) {
    this.logger.log(
      `📩 Message received in session ${sessionId}: ${message.body}`
    );

    let command = message.body;
    const senderId = message.from;
    const normalizedCommand = (command || '').trim().toLowerCase();

    // Handle button responses
    if (message.type === 'buttons_response' && message.selectedButtonId) {
      command = message.selectedButtonId;
      this.logger.log(`🔘 Button clicked: ${command}`);
    }

    const pending = this.pendingApprovals.get(senderId);

    // Process approval commands
    if (normalizedCommand.startsWith('approve')) {
      const { postId } = this.parseIncomingCommand(command, 'approve');
      const effectivePostId = postId || pending?.postId;

      if (!effectivePostId) {
        await message.reply(
          '❗ Please include the post ID, e.g. `approve:POST_ID`.'
        );
        return;
      }

      await this.processApprovalCommand(
        sessionId,
        message,
        'approve',
        effectivePostId,
        undefined,
        senderId
      );
    } else if (normalizedCommand.startsWith('reject')) {
      const { postId, feedback } = this.parseIncomingCommand(command, 'reject');
      const effectivePostId = postId || pending?.postId;
      const rejectionFeedback = feedback || 'Rejected via WhatsApp';

      if (!effectivePostId) {
        await message.reply(
          '❗ Please include the post ID, e.g. `reject:POST_ID`.'
        );
        return;
      }

      await this.processApprovalCommand(
        sessionId,
        message,
        'reject',
        effectivePostId,
        rejectionFeedback,
        senderId
      );
    } else if (normalizedCommand.startsWith('change')) {
      const { postId, feedback } = this.parseIncomingCommand(command, 'change');
      const effectivePostId = postId || pending?.postId;
      const guidance = feedback || 'Please make changes as discussed.';

      if (!effectivePostId) {
        await message.reply(
          '❗ Please include the post ID, e.g. `change:POST_ID:feedback here`.'
        );
        return;
      }

      await this.processApprovalCommand(
        sessionId,
        message,
        'change',
        effectivePostId,
        guidance,
        senderId
      );
    }
  }

  private async processApprovalCommand(
    sessionId: string,
    message: any,
    action: 'approve' | 'reject' | 'change',
    postId: string,
    feedback?: string,
    senderId?: string
  ) {
    try {
      this.logger.log(
        `🔄 Processing ${action} command for post ${postId} in session ${sessionId}`
      );

      let result;
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
      switch (action) {
        case 'approve':
          // Call the WhatsApp approvals endpoint
          const approveResponse = await fetch(
            `${baseUrl}/wa/approvals/approve`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId }),
            }
          );
          result = await approveResponse.json();
          break;

        case 'reject':
          const rejectResponse = await fetch(
            `${baseUrl}/wa/approvals/request-change`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId, guidance: feedback }),
            }
          );
          result = await rejectResponse.json();
          break;

        case 'change':
          const changeResponse = await fetch(
            `${baseUrl}/wa/approvals/request-change`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId, guidance: feedback }),
            }
          );
          result = await changeResponse.json();
          break;
      }

      if (!result?.success) {
        this.logger.error(
          `❌ ${action} command failed for post ${postId}: ${JSON.stringify(
            result
          )}`
        );
        throw new Error(result?.message || 'Unknown error');
      }

      // Send confirmation message
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'ready') {
        let confirmationMessage = '';
        switch (action) {
          case 'approve':
            confirmationMessage = `✅ **Post Approved Successfully!**\n\n🚀 Post ${postId} has been approved and will be scheduled for publishing.`;
            break;
          case 'reject':
            confirmationMessage = `❌ **Post Rejected**\n\n📝 Post ${postId} has been rejected and moved back to drafts.`;
            break;
          case 'change':
            confirmationMessage = `🔄 **Changes Requested**\n\n📝 Post ${postId} needs revisions.\n\n💬 **Feedback:** ${feedback}`;
            break;
        }

        await message.reply(confirmationMessage);
        this.logger.log(`✅ Confirmation sent for ${action} on post ${postId}`);
      }

      if (senderId) {
        this.pendingApprovals.delete(senderId);
      }
    } catch (error) {
      this.logger.error(`❌ Error processing ${action} command:`, error);
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'ready') {
        await message.reply(
          `❌ **Action Failed**\n\nSorry, there was an error processing the ${action} request for post ${postId}. Please try using the web interface.`
        );
      }
    }
  }

  private parseIncomingCommand(
    rawCommand: string,
    action: 'approve' | 'reject' | 'change'
  ): { postId?: string; feedback?: string } {
    if (!rawCommand) {
      return {};
    }

    const trimmed = rawCommand.trim();
    const lowerTrimmed = trimmed.toLowerCase();

    if (lowerTrimmed.startsWith(`${action}:`)) {
      const withoutAction = trimmed.slice(action.length + 1);
      const parts = withoutAction.split(':');
      const postPart = parts.shift();
      const feedbackPart = parts.length ? parts.join(':') : undefined;
      return {
        postId: postPart?.trim() || undefined,
        feedback: feedbackPart?.trim() || undefined,
      };
    }

    const tokens = trimmed.split(/\s+/);
    let postId: string | undefined;
    let feedback: string | undefined;

    if (tokens.length > 1) {
      postId = tokens[1];
    }

    if (action === 'change' && tokens.length > 2) {
      feedback = tokens.slice(2).join(' ');
    }

    return { postId, feedback };
  }

  async sendApprovalNotification(
    tenantId: string,
    postId: string,
    title: string,
    message: string
  ): Promise<boolean> {
    // Find an active session for this tenant
    const activeSession = Array.from(this.sessions.values()).find(
      session => session.status === 'ready' && session.id.startsWith(tenantId)
    );

    if (!activeSession) {
      this.logger.warn(
        `⚠️ No active WhatsApp session found for tenant ${tenantId}`
      );
      return false;
    }

    try {
      const approvalMessage = `📋 *New Post Requires Approval*\n\n📝 Title: ${title}\n🆔 Post ID: ${postId}\n\n${
        message || 'Please review and approve this post.'
      }`;

      const formatChatId = (
        phone: string | undefined | null
      ): string | null => {
        if (!phone) {
          return null;
        }

        const trimmed = phone.trim();
        if (!trimmed) {
          return null;
        }

        if (trimmed.endsWith('@c.us') || trimmed.endsWith('@g.us')) {
          return trimmed;
        }

        const digits = trimmed.replace(/\D/g, '');
        if (!digits) {
          return null;
        }

        return `${digits}@c.us`;
      };

      const recipientSet = new Set<string>();

      const configuredNumbers = (process.env.WHATSAPP_APPROVER_NUMBERS || '')
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);

      configuredNumbers.forEach(number => {
        const chatId = formatChatId(number);
        if (chatId) {
          recipientSet.add(chatId);
        }
      });

      if (activeSession.client.info?.wid?._serialized) {
        recipientSet.add(activeSession.client.info.wid._serialized);
      } else if (activeSession.connectedNumber) {
        const chatId = formatChatId(activeSession.connectedNumber);
        if (chatId) {
          recipientSet.add(chatId);
        }
      }

      if (recipientSet.size === 0) {
        this.logger.warn(
          '⚠️ No WhatsApp recipients configured for approval notifications. Set WHATSAPP_APPROVER_NUMBERS or reconnect the WhatsApp session.'
        );
        return false;
      }

      const recipients = Array.from(recipientSet);
      this.logger.debug(
        `📨 Sending approval notification for post ${postId} to recipients: ${recipients.join(
          ', '
        )}`
      );
      let successfulSends = 0;

      for (const chatId of recipients) {
        let resolvedChatId = chatId;
        try {
          const numericTarget = chatId.replace(/@.+$/, '');
          const numberId = await activeSession.client.getNumberId(
            numericTarget
          );

          if (!numberId) {
            this.logger.warn(
              `⚠️ WhatsApp number ${chatId} is not registered. Skipping.`
            );
            continue;
          }

          resolvedChatId = numberId._serialized || chatId;
          this.pendingApprovals.set(resolvedChatId, { postId, tenantId });

          // Try to send with interactive buttons first
          try {
            const { Buttons } = require('whatsapp-web.js');

            const button1 = { body: '✅ Approve', id: `approve:${postId}` };
            const button2 = { body: '❌ Reject', id: `reject:${postId}` };
            const button3 = {
              body: '🔄 Request Changes',
              id: `change:${postId}`,
            };

            const buttons = new Buttons(
              `🤖 *AutoContent Pro - Approval Required*\n\n${approvalMessage}\n\n👆 *Use buttons below or reply manually:*`,
              [button1, button2, button3],
              'Approval Actions',
              'AutoContent Pro Approval System'
            );

            await activeSession.client.sendMessage(resolvedChatId, buttons);
            this.logger.log(
              `✅ Interactive approval notification sent for post ${postId} to ${resolvedChatId}`
            );
          } catch (buttonError) {
            this.logger.warn(
              `⚠️ Interactive buttons failed for ${resolvedChatId}, will send text fallback: ${buttonError.message}`
            );
          }

          const textMessage =
            `🤖 *AutoContent Pro - Approval Required*\n\n${approvalMessage}\n\n` +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '*📱 QUICK ACTIONS:*\n\n' +
            `✅ Type: \`approve:${postId}\`\n` +
            `❌ Type: \`reject:${postId}\`\n` +
            `🔄 Type: \`change:${postId}:your feedback here\`\n` +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '💡 *Tip: Copy and paste the commands above*';

          await activeSession.client.sendMessage(resolvedChatId, textMessage);
          this.logger.log(
            `✅ Text approval notification sent for post ${postId} to ${resolvedChatId}`
          );
          successfulSends += 1;
        } catch (sendError) {
          this.logger.error(
            `❌ Failed to send approval notification for post ${postId} to ${resolvedChatId}:`,
            sendError
          );
        }
      }

      if (successfulSends === 0) {
        this.logger.error(
          `❌ Failed to deliver approval notification for post ${postId} to all recipients`
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `❌ Error sending approval notification for post ${postId}:`,
        error
      );
      return false;
    }
  }

  async getSessionStatus(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { sessionId, status: 'not_found' };
    }

    return {
      sessionId,
      status: session.status,
      qrCode: session.qrCode, // This will be the QR string from whatsapp-web.js
      connectedNumber: session.connectedNumber,
      connectedName: session.connectedName,
      lastActivity: session.lastActivity,
      isReady: session.status === 'ready',
    };
  }

  async getAllSessions(tenantId?: string): Promise<any> {
    const sessions = Array.from(this.sessions.values());
    const filteredSessions = tenantId
      ? sessions.filter(session => session.id.startsWith(tenantId))
      : sessions;

    return {
      sessions: filteredSessions.map(session => ({
        id: session.id,
        status: session.status,
        connectedNumber: session.connectedNumber,
        connectedName: session.connectedName,
        lastActivity: session.lastActivity,
        isReady: session.status === 'ready',
      })),
      total: filteredSessions.length,
      active: filteredSessions.filter(s => s.status === 'ready').length,
    };
  }

  async disconnectSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      await session.client.destroy();
      this.sessions.delete(sessionId);

      // Update database
      await this.updateSessionInDatabase(sessionId, { status: 'disconnected' });

      this.logger.log(`✅ Session ${sessionId} disconnected and removed`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error disconnecting session ${sessionId}:`, error);
      return false;
    }
  }

  private async saveSessionToDatabase(
    sessionId: string,
    tenantId: string,
    userId: string,
    status: string
  ) {
    try {
      await this.prisma.whatsAppSession.create({
        data: {
          sessionId,
          tenantId,
          status,
          lastHeartbeat: new Date(),
          metadata: { userId },
        },
      });
    } catch (error) {
      this.logger.error(`❌ Error saving session to database:`, error);
    }
  }

  private async updateSessionInDatabase(sessionId: string, updates: any) {
    try {
      await this.prisma.whatsAppSession.updateMany({
        where: { sessionId },
        data: {
          ...updates,
          lastHeartbeat: new Date(),
          metadata: updates.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error(`❌ Error updating session in database:`, error);
    }
  }
}
