import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { ContentGenerateMonthlyJobData } from '@autocontent-pro/queue';
import { Job } from 'bullmq';

@Injectable()
export class ContentWorker {
  private readonly logger = new Logger(ContentWorker.name);

  constructor(
    @Inject(forwardRef(() => ContentService))
    private contentService: ContentService
  ) {}

  async processMonthlyContentGeneration(job: Job<ContentGenerateMonthlyJobData>) {
    this.logger.log(`🚀 Processing monthly content generation job ${job.id}`);
    
    try {
      const result = await this.contentService.processMonthlyContentGeneration(job.data);
      
      this.logger.log(`✅ Monthly content generation completed for job ${job.id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Monthly content generation failed for job ${job.id}:`, error);
      throw error;
    }
  }
}
