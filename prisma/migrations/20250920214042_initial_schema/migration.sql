-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "WhatsAppMode" AS ENUM ('DISABLED', 'BASIC', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'WHATSAPP', 'TELEGRAM');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "whatsappMode" "WhatsAppMode" NOT NULL DEFAULT 'DISABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_kits" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "colors" JSONB,
    "fonts" JSONB,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_connections" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "channelId" TEXT NOT NULL,
    "accessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "qrCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "postId" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_analytics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_userId_tenantId_key" ON "user_tenants"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_kits_brandId_key" ON "brand_kits"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_connections_brandId_channelType_channelId_key" ON "channel_connections"("brandId", "channelType", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_sessionId_key" ON "whatsapp_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "post_analytics_postId_channelType_recordedAt_key" ON "post_analytics"("postId", "channelType", "recordedAt");

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
