-- AlterTable
ALTER TABLE "whatsapp_sessions" ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "phoneNumber" TEXT;
