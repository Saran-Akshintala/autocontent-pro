import { Injectable, Logger } from '@nestjs/common';
import { Platform, Publisher, PublisherFactory } from '../interfaces/publisher.interface';
import {
  FacebookPublisher,
  InstagramPublisher,
  LinkedInPublisher,
  XPublisher,
  YouTubeShortsPublisher,
  TikTokPublisher,
} from '../publishers/platform-publishers';

@Injectable()
export class PublisherFactoryService implements PublisherFactory {
  private readonly logger = new Logger(PublisherFactoryService.name);
  private readonly publishers = new Map<Platform, Publisher>();

  constructor(
    private readonly facebookPublisher: FacebookPublisher,
    private readonly instagramPublisher: InstagramPublisher,
    private readonly linkedInPublisher: LinkedInPublisher,
    private readonly xPublisher: XPublisher,
    private readonly youtubeShortsPublisher: YouTubeShortsPublisher,
    private readonly tiktokPublisher: TikTokPublisher,
  ) {
    this.initializePublishers();
  }

  createPublisher(platform: Platform): Publisher {
    const publisher = this.publishers.get(platform);
    
    if (!publisher) {
      throw new Error(`No publisher available for platform: ${platform}`);
    }
    
    return publisher;
  }

  getSupportedPlatforms(): Platform[] {
    return Array.from(this.publishers.keys());
  }

  async getConfiguredPublishers(): Promise<{ platform: Platform; configured: boolean }[]> {
    const results = [];
    
    for (const [platform, publisher] of this.publishers) {
      const configured = await publisher.isConfigured();
      results.push({ platform, configured });
    }
    
    return results;
  }

  private initializePublishers(): void {
    this.publishers.set(Platform.FACEBOOK, this.facebookPublisher);
    this.publishers.set(Platform.INSTAGRAM, this.instagramPublisher);
    this.publishers.set(Platform.LINKEDIN, this.linkedInPublisher);
    this.publishers.set(Platform.X, this.xPublisher);
    this.publishers.set(Platform.YT_SHORTS, this.youtubeShortsPublisher);
    this.publishers.set(Platform.TIKTOK, this.tiktokPublisher);
    
    this.logger.log(`Initialized ${this.publishers.size} platform publishers`);
  }
}
