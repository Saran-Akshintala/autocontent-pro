import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// For now, use simple WhatsApp worker to get QR code working
console.log('🚀 Starting Simple WhatsApp Worker (no Redis required)...');
console.log('📱 This will display QR code for WhatsApp connection');
console.log('⚠️ Queue-based approval notifications temporarily disabled');

// Import and run the simple worker
import('./simple-wa-worker');
