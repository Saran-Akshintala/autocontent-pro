import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '../interfaces/publisher.interface';
import { Publisher, PublishPayload, PublishResult } from '../interfaces/publisher.interface';

@Injectable()
export class MockPublisher implements Publisher {
  private readonly logger = new Logger(MockPublisher.name);

  constructor(public readonly platform: Platform) {}

  async publish(payload: PublishPayload): Promise<PublishResult> {
    this.logger.log(`📤 Publishing to ${this.platform} for post ${payload.postId}`);
    
    try {
      // Simulate platform-specific processing time
      await this.simulateProcessingDelay();
      
      // Format content for the platform
      const formattedContent = await this.formatContent(payload);
      
      // Log the complete payload for debugging
      this.logPublishPayload(payload, formattedContent);
      
      // Simulate occasional failures for testing retry logic
      if (Math.random() < 0.1) { // 10% failure rate
        throw new Error(`Simulated ${this.platform} API error`);
      }
      
      // Generate mock platform post ID
      const platformPostId = this.generateMockPostId();
      
      const result: PublishResult = {
        success: true,
        platformPostId,
        publishedAt: new Date(),
        metadata: {
          platform: this.platform,
          contentLength: formattedContent.length,
          assetCount: payload.assets?.length || 0,
          simulatedPublish: true,
        },
      };
      
      this.logger.log(`✅ Successfully published to ${this.platform}: ${platformPostId}`);
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Failed to publish to ${this.platform}: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          platform: this.platform,
          failedAt: new Date(),
          simulatedPublish: true,
        },
      };
    }
  }

  async validateContent(payload: PublishPayload): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    
    // Platform-specific validation rules
    switch (this.platform) {
      case Platform.X:
        if (payload.content.body.length > 280) {
          errors.push('Content exceeds X character limit (280)');
        }
        break;
        
      case Platform.INSTAGRAM:
        if (!payload.assets || payload.assets.length === 0) {
          errors.push('Instagram posts require at least one image');
        }
        break;
        
      case Platform.LINKEDIN:
        if (payload.content.body.length > 3000) {
          errors.push('Content exceeds LinkedIn character limit (3000)');
        }
        break;
        
      case Platform.FACEBOOK:
        if (payload.content.body.length > 63206) {
          errors.push('Content exceeds Facebook character limit (63206)');
        }
        break;
        
      case Platform.YT_SHORTS:
        if (!payload.assets || !payload.assets.some(a => a.mimeType.startsWith('video/'))) {
          errors.push('YouTube Shorts requires a video asset');
        }
        break;
        
      case Platform.TIKTOK:
        if (!payload.assets || !payload.assets.some(a => a.mimeType.startsWith('video/'))) {
          errors.push('TikTok requires a video asset');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async formatContent(payload: PublishPayload): Promise<string> {
    const { content } = payload;
    let formatted = '';
    
    // Platform-specific formatting
    switch (this.platform) {
      case Platform.X:
        // Twitter-style: hook + hashtags, keep it short
        formatted = content.hook || content.body;
        if (content.hashtags.length > 0) {
          const hashtags = content.hashtags.slice(0, 3).map(h => `#${h}`).join(' ');
          formatted += `\n\n${hashtags}`;
        }
        break;
        
      case Platform.INSTAGRAM:
        // Instagram-style: hook + body + hashtags
        formatted = content.hook ? `${content.hook}\n\n${content.body}` : content.body;
        if (content.hashtags.length > 0) {
          const hashtags = content.hashtags.map(h => `#${h}`).join(' ');
          formatted += `\n\n${hashtags}`;
        }
        break;
        
      case Platform.LINKEDIN:
        // LinkedIn-style: professional tone, full content
        formatted = content.hook ? `${content.hook}\n\n${content.body}` : content.body;
        if (content.hashtags.length > 0) {
          const hashtags = content.hashtags.slice(0, 5).map(h => `#${h}`).join(' ');
          formatted += `\n\n${hashtags}`;
        }
        break;
        
      case Platform.FACEBOOK:
        // Facebook-style: engaging hook + full content
        formatted = content.hook ? `${content.hook}\n\n${content.body}` : content.body;
        if (content.hashtags.length > 0) {
          const hashtags = content.hashtags.map(h => `#${h}`).join(' ');
          formatted += `\n\n${hashtags}`;
        }
        break;
        
      case Platform.YT_SHORTS:
      case Platform.TIKTOK:
        // Video platforms: short, catchy content
        formatted = content.hook || content.title;
        if (content.hashtags.length > 0) {
          const hashtags = content.hashtags.slice(0, 5).map(h => `#${h}`).join(' ');
          formatted += ` ${hashtags}`;
        }
        break;
        
      default:
        formatted = content.body;
    }
    
    return formatted;
  }

  async isConfigured(): Promise<boolean> {
    // Mock publishers are always "configured"
    return true;
  }

  private async simulateProcessingDelay(): Promise<void> {
    // Simulate realistic API response times
    const delay = Math.random() * 2000 + 500; // 500ms to 2.5s
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private generateMockPostId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.platform.toLowerCase()}_${timestamp}_${random}`;
  }

  private logPublishPayload(payload: PublishPayload, formattedContent: string): void {
    this.logger.log(`
📋 PUBLISH PAYLOAD for ${this.platform}:
┌─ Post ID: ${payload.postId}
├─ Brand: ${payload.brandInfo.name} (${payload.brandInfo.id})
├─ Platform: ${this.platform}
├─ Assets: ${payload.assets?.length || 0} files
├─ Scheduled: ${payload.scheduledFor || 'Immediate'}
└─ Content Preview:
${formattedContent.substring(0, 200)}${formattedContent.length > 200 ? '...' : ''}
    `);
  }
}
