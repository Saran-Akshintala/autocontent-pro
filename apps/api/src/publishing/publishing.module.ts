import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './services/publishing.service';
import { PublisherFactoryService } from './services/publisher.factory';
import {
  FacebookPublisher,
  InstagramPublisher,
  LinkedInPublisher,
  XPublisher,
  YouTubeShortsPublisher,
  TikTokPublisher,
} from './publishers/platform-publishers';
import { PrismaService } from '../app/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [PublishingController],
  providers: [
    PublishingService,
    PublisherFactoryService,
    FacebookPublisher,
    InstagramPublisher,
    LinkedInPublisher,
    XPublisher,
    YouTubeShortsPublisher,
    TikTokPublisher,
    PrismaService,
  ],
  exports: [
    PublishingService,
    PublisherFactoryService,
  ],
})
export class PublishingModule {}
