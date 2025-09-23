-- AlterEnum
ALTER TYPE "PostStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "whatsapp_sessions" ADD COLUMN     "lastHeartbeat" TIMESTAMP(3),
ADD COLUMN     "status" TEXT;
