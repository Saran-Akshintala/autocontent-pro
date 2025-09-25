import { Module, Global, forwardRef } from '@nestjs/common';
import { ContentWorker } from './content-worker';
import { QueueFactory, defaultQueueConfig } from '@autocontent-pro/queue';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { ContentModule } from '../content/content.module';

@Global()
@Module({
  imports: [forwardRef(() => ContentModule)],
  providers: [
    {
      provide: 'QUEUE_FACTORY',
      useFactory: (): QueueFactory | null => {
        const redisEnabled = (process.env.ENABLE_REDIS || '').toLowerCase() === 'true';
        
        if (!redisEnabled) {
          console.log('⚠️ Redis disabled - Queue functionality will be limited');
          return null;
        }

        try {
          return new QueueFactory(defaultQueueConfig);
        } catch (error) {
          console.error('❌ Failed to initialize queue factory:', error);
          return null;
        }
      },
    },
    QueueService,
    ContentWorker,
  ],
  controllers: [QueueController],
  exports: ['QUEUE_FACTORY', QueueService],
})
export class QueueModule {}
