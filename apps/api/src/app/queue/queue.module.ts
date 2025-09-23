import { Module, Global } from '@nestjs/common';
import { QueueFactory, QueueConfig } from '@autocontent-pro/queue';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';

@Global()
@Module({
  providers: [
    {
      provide: 'QUEUE_FACTORY',
      useFactory: (): QueueFactory => {
        const queueConfig: QueueConfig = {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
          },
        };
        return new QueueFactory(queueConfig);
      },
    },
    QueueService,
  ],
  controllers: [QueueController],
  exports: ['QUEUE_FACTORY', QueueService],
})
export class QueueModule {}
