import { Module, forwardRef } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AIModule, BillingModule, forwardRef(() => QueueModule)],
  controllers: [ContentController],
  providers: [ContentService, PrismaService],
  exports: [ContentService],
})
export class ContentModule {}
