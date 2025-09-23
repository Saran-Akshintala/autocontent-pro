# AutoContent Pro Queue System

This document describes the Redis and BullMQ-based queue system implemented in AutoContent Pro.

## Overview

The queue system handles asynchronous job processing for various operations including content generation, publishing, analytics, and notifications. It uses Redis as the message broker and BullMQ for job management.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │    │   Redis Server  │    │  Worker Process │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ QueueService│ │───▶│ │    Queues   │ │◀───│ │   Workers   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Queue Types

### 1. Content Generation Queues

#### `content.generate.monthly`
- **Purpose**: Generate monthly content batches for brands
- **Payload**: `ContentGenerateMonthlyJobData`
- **Priority**: 5
- **Concurrency**: 2

```typescript
interface ContentGenerateMonthlyJobData {
  tenantId: string;
  brandId: string;
  month: number;
  year: number;
  contentCount: number;
  platforms: string[];
  preferences?: {
    tone?: string;
    topics?: string[];
    hashtags?: string[];
  };
}
```

#### `content.regen.single`
- **Purpose**: Regenerate individual post content
- **Payload**: `ContentRegenSingleJobData`
- **Priority**: 8
- **Concurrency**: 2

```typescript
interface ContentRegenSingleJobData {
  tenantId: string;
  postId: string;
  brandId: string;
  platform: string;
  regenerationType: 'hook' | 'body' | 'hashtags' | 'full';
  preferences?: {
    tone?: string;
    style?: string;
  };
}
```

### 2. Approval Queue

#### `approval.notify`
- **Purpose**: Send approval notifications to reviewers
- **Payload**: `ApprovalNotifyJobData`
- **Priority**: 7

```typescript
interface ApprovalNotifyJobData {
  tenantId: string;
  postId: string;
  brandId: string;
  approverIds: string[];
  notificationType: 'email' | 'whatsapp' | 'both';
  dueDate?: Date;
  message?: string;
}
```

### 3. Publishing Queue

#### `publish.dispatch`
- **Purpose**: Publish posts to social media platforms
- **Payload**: `PublishDispatchJobData`
- **Priority**: 10 (highest)
- **Concurrency**: 3

```typescript
interface PublishDispatchJobData {
  tenantId: string;
  postId: string;
  scheduleId: string;
  platforms: {
    platform: string;
    accountId: string;
    credentials: Record<string, any>;
  }[];
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    mediaUrls?: string[];
  };
  scheduledTime: Date;
}
```

### 4. Analytics Queue

#### `analytics.pull`
- **Purpose**: Pull analytics data from social platforms
- **Payload**: `AnalyticsPullJobData`
- **Priority**: 3

```typescript
interface AnalyticsPullJobData {
  tenantId: string;
  brandId?: string;
  platforms: string[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  metrics: string[];
  postIds?: string[];
}
```

### 5. Image Generation Queue

#### `image.generate`
- **Purpose**: Generate AI images for posts
- **Payload**: `ImageGenerateJobData`
- **Priority**: 6

```typescript
interface ImageGenerateJobData {
  tenantId: string;
  postId?: string;
  brandId: string;
  prompt: string;
  style: 'realistic' | 'cartoon' | 'abstract' | 'minimalist';
  dimensions: {
    width: number;
    height: number;
  };
  brandColors?: string[];
  brandFonts?: string[];
}
```

### 6. WhatsApp Queue

#### `whatsapp-messages`
- **Purpose**: Send WhatsApp messages
- **Payload**: `WhatsAppJobData`
- **Priority**: Variable
- **Concurrency**: 3

```typescript
interface WhatsAppJobData {
  to: string;
  message: string;
  campaignId?: string;
}
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Configuration
QUEUE_CONCURRENCY=5
WA_WORKER_CONCURRENCY=3
CONTENT_WORKER_CONCURRENCY=2
PUBLISH_WORKER_CONCURRENCY=3
```

### Queue Factory Usage

```typescript
import { QueueFactory, defaultQueueConfig } from '@autocontent-pro/queue';

const queueFactory = new QueueFactory(defaultQueueConfig);

// Add a job
await queueFactory.content.generateMonthlyContent({
  tenantId: 'demo-tenant',
  brandId: 'brand-123',
  month: 12,
  year: 2024,
  contentCount: 30,
  platforms: ['instagram', 'facebook']
});
```

## API Endpoints

### Queue Health and Statistics

- `GET /api/health` - Overall system health including queues
- `GET /api/queue/health` - Detailed queue health information
- `GET /api/queue/stats` - Statistics for all queues
- `GET /api/queue/stats/:queueName` - Statistics for specific queue

### Admin Test Endpoints

- `POST /api/queue/test/content/generate-monthly` - Test monthly content generation
- `POST /api/queue/test/content/regenerate-single` - Test single content regeneration
- `POST /api/queue/test/approval/notify` - Test approval notifications
- `POST /api/queue/test/publish/dispatch` - Test post publishing
- `POST /api/queue/test/analytics/pull` - Test analytics pulling
- `POST /api/queue/test/image/generate` - Test image generation
- `POST /api/queue/test/whatsapp/send` - Test WhatsApp messaging

### Queue Management

- `DELETE /api/queue/:queueName/clear` - Clear all jobs from a queue
- `DELETE /api/queue/:queueName/clear?status=failed` - Clear specific job status

## Worker Process

The worker process (`wa-worker`) handles job processing:

```bash
# Start the worker process
pnpm nx serve wa-worker

# Or in production
pnpm nx build wa-worker
node dist/apps/wa-worker/main.js
```

### Worker Features

- **Automatic Retry**: Failed jobs are retried with exponential backoff
- **Concurrency Control**: Each queue type has configurable concurrency limits
- **Graceful Shutdown**: Workers handle SIGINT/SIGTERM signals properly
- **Error Handling**: Comprehensive error logging and monitoring
- **Job Progress**: Real-time job progress tracking

## Monitoring

### Queue Statistics

```typescript
// Get all queue statistics
const stats = await queueService.getAllQueueStats();

// Example response
[
  {
    name: 'content.generate.monthly',
    waiting: 5,
    active: 2,
    completed: 150,
    failed: 3,
    total: 160
  }
]
```

### Health Checks

```typescript
// Queue health check
const health = await queueService.getQueueHealth();

// Example response
{
  status: 'healthy',
  totalJobs: 160,
  activeJobs: 7,
  failedJobs: 3,
  queues: [...]
}
```

## Development

### Adding New Queue Types

1. **Define Job Data Interface**:
```typescript
// In libs/queue/src/index.ts
export interface MyNewJobData {
  tenantId: string;
  // ... other fields
}
```

2. **Add Queue Name**:
```typescript
export enum QueueNames {
  // ... existing queues
  MY_NEW_QUEUE = 'my.new.queue'
}
```

3. **Create Queue Producer**:
```typescript
export class MyNewQueue {
  constructor(private queueManager: QueueManager) {}

  async processMyJob(data: MyNewJobData) {
    return this.queueManager.addJob(
      QueueNames.MY_NEW_QUEUE,
      'process-my-job',
      data,
      { priority: 5 }
    );
  }
}
```

4. **Add Worker**:
```typescript
// In apps/wa-worker/src/queue-workers.ts
const myNewWorker = queueFactory.getQueueManager().createWorker<MyNewJobData>(
  QueueNames.MY_NEW_QUEUE,
  async (job: Job<MyNewJobData>) => {
    // Process the job
    console.log('Processing job:', job.data);
    // ... processing logic
  }
);
```

### Testing

```bash
# Test queue functionality
curl -X POST http://localhost:3000/api/queue/test/content/generate-monthly \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: demo-tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "test-brand",
    "month": 12,
    "year": 2024,
    "contentCount": 10,
    "platforms": ["instagram", "facebook"]
  }'
```

## Production Deployment

### Redis Setup

1. **Install Redis**:
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

2. **Configure Redis** (optional):
```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Scaling Workers

```bash
# Run multiple worker instances
PM2_INSTANCES=4 pm2 start dist/apps/wa-worker/main.js --name "queue-worker"

# Or with Docker
docker run -d --name queue-worker-1 autocontent-pro-worker
docker run -d --name queue-worker-2 autocontent-pro-worker
```

### Monitoring in Production

- Use Redis monitoring tools (RedisInsight, redis-cli MONITOR)
- Set up alerts for queue depth and failed job counts
- Monitor worker process health and memory usage
- Use BullMQ Board for web-based queue monitoring

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**:
   - Check Redis server is running
   - Verify connection credentials
   - Check network connectivity

2. **Jobs Stuck in Queue**:
   - Ensure workers are running
   - Check worker process logs
   - Verify queue configuration

3. **High Memory Usage**:
   - Configure Redis maxmemory policy
   - Adjust job retention settings
   - Monitor queue depth

### Debugging

```bash
# Check Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check queue statistics
curl http://localhost:3000/api/queue/stats

# View worker logs
pnpm nx serve wa-worker
```
