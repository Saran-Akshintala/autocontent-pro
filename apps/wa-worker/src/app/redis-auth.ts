import { RemoteAuth } from 'whatsapp-web.js';
import { Redis } from 'ioredis';

export class RedisStore {
  private redis: Redis;

  constructor(redisConfig: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  }) {
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db || 0,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected for WhatsApp session storage');
    });
  }

  async sessionExists(options: { session: string }): Promise<boolean> {
    try {
      const exists = await this.redis.exists(`wa:session:${options.session}`);
      return exists === 1;
    } catch (error) {
      console.error('❌ Error checking session existence:', error);
      return false;
    }
  }

  async save(options: { session: string }): Promise<void> {
    try {
      // WhatsApp session data is stored in the .wwebjs_auth folder
      // We'll store metadata and heartbeat info in Redis
      const sessionData = {
        session: options.session,
        lastSaved: new Date().toISOString(),
        status: 'active'
      };

      await this.redis.setex(
        `wa:session:${options.session}`,
        86400 * 7, // 7 days TTL
        JSON.stringify(sessionData)
      );

      console.log(`💾 Session ${options.session} saved to Redis`);
    } catch (error) {
      console.error('❌ Error saving session to Redis:', error);
      throw error;
    }
  }

  async extract(options: { session: string, path: string }): Promise<void> {
    try {
      // This method is called when WhatsApp needs to restore session
      // We'll update the session metadata
      const sessionData = {
        session: options.session,
        path: options.path,
        lastExtracted: new Date().toISOString(),
        status: 'restored'
      };

      await this.redis.setex(
        `wa:session:${options.session}`,
        86400 * 7,
        JSON.stringify(sessionData)
      );

      console.log(`📤 Session ${options.session} extracted from path: ${options.path}`);
    } catch (error) {
      console.error('❌ Error extracting session:', error);
      throw error;
    }
  }

  async delete(options: { session: string }): Promise<void> {
    try {
      await this.redis.del(`wa:session:${options.session}`);
      console.log(`🗑️ Session ${options.session} deleted from Redis`);
    } catch (error) {
      console.error('❌ Error deleting session from Redis:', error);
      throw error;
    }
  }

  // Custom methods for session management
  async getSessionInfo(sessionId: string): Promise<any> {
    try {
      const data = await this.redis.get(`wa:session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error getting session info:', error);
      return null;
    }
  }

  async updateHeartbeat(sessionId: string, metadata: any): Promise<void> {
    try {
      const heartbeatData = {
        sessionId,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      await this.redis.setex(
        `wa:heartbeat:${sessionId}`,
        300, // 5 minutes TTL
        JSON.stringify(heartbeatData)
      );

      console.log(`💓 Heartbeat updated for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Error updating heartbeat:', error);
    }
  }

  async storeQRCode(qrCode: string): Promise<void> {
    try {
      const qrData = {
        qrCode,
        timestamp: new Date().toISOString(),
        attempts: await this.getQRAttempts() + 1
      };

      await this.redis.setex('wa:qr:latest', 300, JSON.stringify(qrData)); // 5 minutes TTL
      await this.redis.lpush('wa:qr:history', JSON.stringify(qrData));
      await this.redis.ltrim('wa:qr:history', 0, 9); // Keep last 10 QR codes

      console.log(`📱 QR code stored (attempt ${qrData.attempts})`);
    } catch (error) {
      console.error('❌ Error storing QR code:', error);
    }
  }

  async getLatestQR(): Promise<any> {
    try {
      const data = await this.redis.get('wa:qr:latest');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error getting latest QR:', error);
      return null;
    }
  }

  private async getQRAttempts(): Promise<number> {
    try {
      const latest = await this.getLatestQR();
      return latest ? latest.attempts : 0;
    } catch (error) {
      return 0;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export function createRedisRemoteAuth(sessionId: string): RemoteAuth {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  };

  const store = new RedisStore(redisConfig);

  return new RemoteAuth({
    store,
    clientId: sessionId,
    backupSyncIntervalMs: 300000, // 5 minutes
  });
}
