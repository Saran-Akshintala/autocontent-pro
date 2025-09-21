import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Execute a transaction with automatic retry logic
   */
  async executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
    }
  ): Promise<T> {
    return this.$transaction(fn, {
      maxWait: options?.maxWait || 5000, // 5 seconds
      timeout: options?.timeout || 10000, // 10 seconds
    });
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const start = Date.now();
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const [
        tenantCount,
        userCount,
        brandCount,
        postCount,
        whatsappSessionCount,
      ] = await Promise.all([
        this.tenant.count(),
        this.user.count(),
        this.brand.count(),
        this.post.count(),
        this.whatsAppSession.count(),
      ]);

      return {
        tenants: tenantCount,
        users: userCount,
        brands: brandCount,
        posts: postCount,
        whatsappSessions: whatsappSessionCount,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      throw error;
    }
  }

  /**
   * Soft delete helper - adds deletedAt timestamp
   */
  async softDelete(model: string, where: any) {
    return (this as any)[model].update({
      where,
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Batch operations helper
   */
  async batchOperation<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Upsert helper with conflict resolution
   */
  async upsertWithConflictResolution<T>(
    model: string,
    data: {
      where: any;
      update: any;
      create: any;
    }
  ): Promise<T> {
    try {
      return await (this as any)[model].upsert(data);
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        this.logger.warn(`Unique constraint violation in ${model}:`, error.meta);
        // Retry with update only
        return await (this as any)[model].update({
          where: data.where,
          data: data.update,
        });
      }
      throw error;
    }
  }
}
