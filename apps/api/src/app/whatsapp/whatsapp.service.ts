import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';
import { SessionHeartbeatDto, ApprovalActionDto } from './whatsapp.controller';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private redis: Redis | null = null;

  constructor(private prisma: PrismaService) {
    const redisEnabled = (process.env.ENABLE_REDIS || '').toLowerCase() === 'true';

    if (redisEnabled) {
      try {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          retryStrategy: () => null,
        });

        this.redis.on('error', (error) => {
          this.logger.warn(`Redis connection error (optional service): ${error.message}`);
          if (this.redis) {
            this.redis.disconnect();
            this.redis = null;
          }
        });

        this.redis.connect().catch((error) => {
          this.logger.warn(`Redis connection failed (optional service): ${error.message}`);
          if (this.redis) {
            this.redis.disconnect();
            this.redis = null;
          }
        });
      } catch (error) {
        this.logger.warn('Redis initialization failed (optional service):', error);
        this.redis = null;
      }
    } else {
      if (process.env.REDIS_HOST) {
        this.logger.log('Redis host detected but ENABLE_REDIS is not true. Skipping Redis initialization.');
      }
      this.logger.log('Redis disabled - using integrated WhatsApp client service');
    }
  }

  async updateSessionHeartbeat(heartbeatDto: SessionHeartbeatDto) {
    try {
      // Store heartbeat in Redis if available
      const heartbeatData = {
        ...heartbeatDto,
        timestamp: new Date().toISOString(),
        lastUpdated: Date.now(),
      };

      if (this.redis) {
        await this.redis.setex(
          `wa:heartbeat:${heartbeatDto.sessionId}`,
          300, // 5 minutes TTL
          JSON.stringify(heartbeatData)
        );
      }

      // Update WhatsApp session in database if it exists
      const existingSession = await this.prisma.whatsAppSession.findFirst({
        where: { sessionId: heartbeatDto.sessionId },
      });

      if (existingSession) {
        await this.prisma.whatsAppSession.update({
          where: { id: existingSession.id },
          data: {
            status: heartbeatDto.status,
            lastHeartbeat: new Date(),
            metadata: heartbeatDto.metadata as any,
          },
        });
      } else {
        // Create new session record
        await this.prisma.whatsAppSession.create({
          data: {
            sessionId: heartbeatDto.sessionId,
            status: heartbeatDto.status,
            lastHeartbeat: new Date(),
            metadata: heartbeatDto.metadata as any,
            tenantId: 'demo-tenant', // Default tenant for now
          },
        });
      }

      console.log(`💓 Heartbeat received for session ${heartbeatDto.sessionId}: ${heartbeatDto.status}`);

      return {
        success: true,
        message: 'Heartbeat updated successfully',
        timestamp: heartbeatData.timestamp,
      };
    } catch (error) {
      console.error('❌ Error updating session heartbeat:', error);
      throw error;
    }
  }

  async getSessionStatus(sessionId: string) {
    try {
      // Get from Redis first (most recent) if available
      let redisData = null;
      if (this.redis) {
        redisData = await this.redis.get(`wa:heartbeat:${sessionId}`);
      }
      
      // Get from database
      const dbSession = await this.prisma.whatsAppSession.findFirst({
        where: { sessionId },
      });

      const redisHeartbeat = redisData ? JSON.parse(redisData) : null;

      return {
        sessionId,
        redis: redisHeartbeat,
        database: dbSession,
        isActive: redisHeartbeat && (Date.now() - redisHeartbeat.lastUpdated) < 300000, // 5 minutes
      };
    } catch (error) {
      console.error('❌ Error getting session status:', error);
      throw error;
    }
  }

  async getAllSessions() {
    try {
      const dbSessions = await this.prisma.whatsAppSession.findMany({
        orderBy: { lastHeartbeat: 'desc' },
      });

      const sessionsWithStatus = await Promise.all(
        dbSessions.map(async (session) => {
          let redisData = null;
          if (this.redis) {
            redisData = await this.redis.get(`wa:heartbeat:${session.sessionId}`);
          }
          const redisHeartbeat = redisData ? JSON.parse(redisData) : null;
          
          return {
            ...session,
            isActive: redisHeartbeat && (Date.now() - redisHeartbeat.lastUpdated) < 300000,
            lastRedisHeartbeat: redisHeartbeat?.timestamp,
          };
        })
      );

      return {
        sessions: sessionsWithStatus,
        total: sessionsWithStatus.length,
        active: sessionsWithStatus.filter(s => s.isActive).length,
      };
    } catch (error) {
      console.error('❌ Error getting all sessions:', error);
      throw error;
    }
  }

  async restartSession(sessionId: string) {
    try {
      // Send restart command via Redis pub/sub if available
      if (this.redis) {
        await this.redis.publish(`wa:command:${sessionId}`, JSON.stringify({
          command: 'restart',
          timestamp: new Date().toISOString(),
        }));
        return {
          success: true,
          message: `Restart command sent to session ${sessionId}`,
        };
      } else {
        return {
          success: false,
          message: 'Redis not available - using integrated WhatsApp service instead',
        };
      }
    } catch (error) {
      console.error('❌ Error restarting session:', error);
      throw error;
    }
  }

  // Approval bot methods
  async approvePost(postId: string) {
    try {
      // Update post status to approved
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: { schedule: true },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Update post status
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'SCHEDULED' }, // Assuming SCHEDULED means approved
      });

      // Log the approval
      console.log(`✅ Post ${postId} approved via WhatsApp`);

      return {
        success: true,
        message: `Post ${postId} approved successfully`,
        post: {
          id: post.id,
          title: post.title,
          status: 'SCHEDULED',
        },
      };
    } catch (error) {
      console.error('❌ Error approving post:', error);
      throw error;
    }
  }

  async requestChange(postId: string, guidance?: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Update post status to needs changes
      await this.prisma.post.update({
        where: { id: postId },
        data: { 
          status: 'DRAFT', // Back to draft for changes
          // Store guidance in metadata or create a separate table
        },
      });

      // Store the change request guidance if Redis is available
      if (guidance && this.redis) {
        await this.redis.setex(
          `wa:change-request:${postId}`,
          86400, // 24 hours
          JSON.stringify({
            postId,
            guidance,
            requestedAt: new Date().toISOString(),
          })
        );
      }

      console.log(`🔄 Change requested for post ${postId}: ${guidance || 'No guidance provided'}`);

      return {
        success: true,
        message: `Change request submitted for post ${postId}`,
        guidance,
      };
    } catch (error) {
      console.error('❌ Error requesting change:', error);
      throw error;
    }
  }

  async pausePost(postId: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: { schedule: true },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Pause the scheduled post
      if (post.schedule) {
        await this.prisma.schedule.update({
          where: { id: post.schedule.id },
          data: { status: 'CANCELLED' },
        });
      }

      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PAUSED' },
      });

      console.log(`⏸️ Post ${postId} paused via WhatsApp`);

      return {
        success: true,
        message: `Post ${postId} paused successfully`,
      };
    } catch (error) {
      console.error('❌ Error pausing post:', error);
      throw error;
    }
  }

  async getPostPreview(postId: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          brand: {
            include: { brandKit: true },
          },
          schedule: true,
        },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      const content = post.content as any;

      return {
        id: post.id,
        title: post.title,
        content: {
          hook: content?.hook || '',
          body: content?.body || '',
          hashtags: content?.hashtags || [],
          platforms: content?.platforms || [],
        },
        brand: {
          name: post.brand?.name || 'Unknown Brand',
          logo: post.brand?.brandKit?.logoUrl,
        },
        schedule: post.schedule ? {
          runAt: post.schedule.runAt,
          timezone: post.schedule.timezone,
        } : null,
        status: post.status,
        createdAt: post.createdAt,
      };
    } catch (error) {
      console.error('❌ Error getting post preview:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
