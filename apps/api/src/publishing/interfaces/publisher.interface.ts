import { ChannelType } from '@prisma/client';

// Platform enum for publishing (maps to ChannelType)
export enum Platform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  LINKEDIN = 'LINKEDIN',
  X = 'TWITTER', // Maps to TWITTER in ChannelType
  YT_SHORTS = 'YT_SHORTS',
  TIKTOK = 'TIKTOK',
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  metadata?: Record<string, any>;
  publishedAt?: Date;
  retryCount?: number;
}

export interface PublishPayload {
  postId: string;
  platform: Platform;
  content: {
    title: string;
    hook?: string;
    body: string;
    hashtags: string[];
  };
  assets?: {
    id: string;
    url: string;
    mimeType: string;
    filename: string;
  }[];
  brandInfo: {
    id: string;
    name: string;
    handle?: string;
  };
  scheduledFor?: Date;
}

export interface Publisher {
  readonly platform: Platform;
  
  /**
   * Publish content to the platform
   */
  publish(payload: PublishPayload): Promise<PublishResult>;
  
  /**
   * Validate if the content is suitable for this platform
   */
  validateContent(payload: PublishPayload): Promise<{ valid: boolean; errors?: string[] }>;
  
  /**
   * Get platform-specific content formatting
   */
  formatContent(payload: PublishPayload): Promise<string>;
  
  /**
   * Check if the publisher is properly configured
   */
  isConfigured(): Promise<boolean>;
}

export interface PublisherFactory {
  createPublisher(platform: Platform): Publisher;
  getSupportedPlatforms(): Platform[];
}
