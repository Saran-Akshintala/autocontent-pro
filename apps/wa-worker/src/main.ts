import * as dotenv from 'dotenv';
import { WhatsAppWorker } from './app/whatsapp-worker';

// Load environment variables
dotenv.config();

async function bootstrap() {
  console.log('🚀 Starting WhatsApp Worker Service...');
  
  const worker = new WhatsAppWorker();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('📴 Shutting down WhatsApp Worker...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('📴 Shutting down WhatsApp Worker...');
    await worker.stop();
    process.exit(0);
  });

  try {
    await worker.start();
    console.log('✅ WhatsApp Worker Service started successfully');
  } catch (error) {
    console.error('❌ Failed to start WhatsApp Worker:', error);
    process.exit(1);
  }
}

bootstrap();
