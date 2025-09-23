import { Client, Message, Buttons, MessageMedia } from 'whatsapp-web.js';
import { RateLimiter } from './rate-limiter';
import axios from 'axios';

export interface PostPreview {
  id: string;
  title: string;
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    platforms: string[];
  };
  brand: {
    name: string;
    logo?: string;
  };
  schedule?: {
    runAt: string;
    timezone: string;
  };
  status: string;
  createdAt: string;
}

export class ApprovalBot {
  private rateLimiter: RateLimiter;
  private apiBaseUrl: string;

  constructor(
    private client: Client,
    apiBaseUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.rateLimiter = new RateLimiter(12, 3); // 12s base delay, ±3s jitter
    this.apiBaseUrl = apiBaseUrl;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.client.on('message', async (message: Message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error('❌ Error handling message:', error);
      }
    });

    console.log('🤖 Approval bot message handlers setup complete');
  }

  private async handleMessage(message: Message): Promise<void> {
    // Only handle button replies
    if (!message.hasQuotedMsg && !message.body.startsWith('approve:') && 
        !message.body.startsWith('change:') && !message.body.startsWith('pause:')) {
      return;
    }

    const contact = await message.getContact();
    const chat = await message.getChat();
    
    console.log(`📱 Received message from ${contact.name || contact.number}: ${message.body}`);

    // Handle button-like commands
    if (message.body.startsWith('approve:')) {
      const postId = message.body.replace('approve:', '').trim();
      await this.handleApprove(postId, chat.id._serialized);
    } else if (message.body.startsWith('change:')) {
      const postId = message.body.replace('change:', '').trim();
      await this.handleChangeRequest(postId, chat.id._serialized, message);
    } else if (message.body.startsWith('pause:')) {
      const postId = message.body.replace('pause:', '').trim();
      await this.handlePause(postId, chat.id._serialized);
    }
  }

  private async handleApprove(postId: string, chatId: string): Promise<void> {
    try {
      console.log(`✅ Processing approval for post ${postId}`);
      
      const response = await axios.post(`${this.apiBaseUrl}/wa/approvals/approve`, {
        postId
      });

      await this.rateLimiter.waitForRateLimit(chatId);
      
      if (response.data.success) {
        await this.client.sendMessage(chatId, 
          `✅ *Post Approved!*\n\n` +
          `Post "${response.data.post.title}" has been approved and scheduled for publishing.\n\n` +
          `Status: ${response.data.post.status}`
        );
      } else {
        await this.client.sendMessage(chatId, 
          `❌ Failed to approve post ${postId}. Please try again or contact support.`
        );
      }
    } catch (error) {
      console.error(`❌ Error approving post ${postId}:`, error);
      await this.rateLimiter.waitForRateLimit(chatId);
      await this.client.sendMessage(chatId, 
        `❌ Error approving post ${postId}. Please try again later.`
      );
    }
  }

  private async handleChangeRequest(postId: string, chatId: string, message: Message): Promise<void> {
    try {
      console.log(`🔄 Processing change request for post ${postId}`);
      
      // Ask for guidance if not provided
      const parts = message.body.split(':');
      let guidance = parts.length > 2 ? parts.slice(2).join(':').trim() : '';
      
      if (!guidance) {
        await this.rateLimiter.waitForRateLimit(chatId);
        await this.client.sendMessage(chatId, 
          `🔄 *Change Request for Post ${postId}*\n\n` +
          `Please provide your feedback/guidance for the changes needed:\n\n` +
          `Reply with: change:${postId}:Your feedback here`
        );
        return;
      }

      const response = await axios.post(`${this.apiBaseUrl}/wa/approvals/request-change`, {
        postId,
        guidance
      });

      await this.rateLimiter.waitForRateLimit(chatId);
      
      if (response.data.success) {
        await this.client.sendMessage(chatId, 
          `🔄 *Change Request Submitted*\n\n` +
          `Post ${postId} has been marked for changes.\n\n` +
          `Your guidance: "${guidance}"\n\n` +
          `The content team will review and make the requested changes.`
        );
      } else {
        await this.client.sendMessage(chatId, 
          `❌ Failed to submit change request for post ${postId}. Please try again.`
        );
      }
    } catch (error) {
      console.error(`❌ Error requesting change for post ${postId}:`, error);
      await this.rateLimiter.waitForRateLimit(chatId);
      await this.client.sendMessage(chatId, 
        `❌ Error submitting change request for post ${postId}. Please try again later.`
      );
    }
  }

  private async handlePause(postId: string, chatId: string): Promise<void> {
    try {
      console.log(`⏸️ Processing pause request for post ${postId}`);
      
      const response = await axios.post(`${this.apiBaseUrl}/wa/approvals/pause`, {
        postId
      });

      await this.rateLimiter.waitForRateLimit(chatId);
      
      if (response.data.success) {
        await this.client.sendMessage(chatId, 
          `⏸️ *Post Paused*\n\n` +
          `Post ${postId} has been paused and will not be published as scheduled.\n\n` +
          `You can resume it later from the dashboard.`
        );
      } else {
        await this.client.sendMessage(chatId, 
          `❌ Failed to pause post ${postId}. Please try again.`
        );
      }
    } catch (error) {
      console.error(`❌ Error pausing post ${postId}:`, error);
      await this.rateLimiter.waitForRateLimit(chatId);
      await this.client.sendMessage(chatId, 
        `❌ Error pausing post ${postId}. Please try again later.`
      );
    }
  }

  async sendApprovalRequest(postId: string, recipientNumber: string): Promise<void> {
    try {
      console.log(`📤 Sending approval request for post ${postId} to ${recipientNumber}`);
      
      // Get post preview
      const postResponse = await axios.get(`${this.apiBaseUrl}/wa/posts/${postId}/preview`);
      const post: PostPreview = postResponse.data;

      const chatId = `${recipientNumber}@c.us`;
      
      await this.rateLimiter.waitForRateLimit(chatId);

      // Format the approval message
      const scheduleText = post.schedule 
        ? `\n📅 *Scheduled:* ${new Date(post.schedule.runAt).toLocaleString()}`
        : '';

      const platformsText = post.content.platforms.length > 0 
        ? `\n📱 *Platforms:* ${post.content.platforms.join(', ')}`
        : '';

      const hashtagsText = post.content.hashtags.length > 0 
        ? `\n🏷️ *Hashtags:* ${post.content.hashtags.join(' ')}`
        : '';

      const messageText = 
        `🎯 *New Post for Approval*\n\n` +
        `📝 *Title:* ${post.title}\n` +
        `🏢 *Brand:* ${post.brand.name}\n` +
        `📊 *Status:* ${post.status}${scheduleText}${platformsText}\n\n` +
        `📖 *Hook:* ${post.content.hook}\n\n` +
        `📄 *Body:* ${post.content.body}${hashtagsText}\n\n` +
        `*Please choose an action:*\n\n` +
        `✅ Reply "approve:${postId}" to approve\n` +
        `🔄 Reply "change:${postId}:your feedback" to request changes\n` +
        `⏸️ Reply "pause:${postId}" to pause this post`;

      await this.client.sendMessage(chatId, messageText);

      console.log(`✅ Approval request sent for post ${postId}`);
    } catch (error) {
      console.error(`❌ Error sending approval request for post ${postId}:`, error);
      throw error;
    }
  }

  async sendBulkApprovalRequests(postIds: string[], recipientNumbers: string[]): Promise<void> {
    console.log(`📤 Sending bulk approval requests for ${postIds.length} posts to ${recipientNumbers.length} recipients`);
    
    for (const postId of postIds) {
      for (const recipientNumber of recipientNumbers) {
        try {
          await this.sendApprovalRequest(postId, recipientNumber);
          // Add extra delay between bulk messages
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed to send approval request for post ${postId} to ${recipientNumber}:`, error);
        }
      }
    }
  }

  getRateLimiterStats() {
    return this.rateLimiter.getStats();
  }
}
