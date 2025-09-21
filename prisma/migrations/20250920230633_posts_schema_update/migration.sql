/*
  Warnings:

  - You are about to drop the column `channelType` on the `schedules` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `schedules` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `schedules` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `schedules` table. All the data in the column will be lost.
  - The `status` column on the `schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[postId]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `posts` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `posts` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `content` on the `posts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `runAt` to the `schedules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PostStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
-- First add tenantId as nullable
ALTER TABLE "posts" ADD COLUMN     "tenantId" TEXT;

-- Update existing posts with the demo tenant ID (assuming it exists)
UPDATE "posts" SET "tenantId" = 'demo-tenant' WHERE "tenantId" IS NULL;

-- Now make tenantId required
ALTER TABLE "posts" ALTER COLUMN "tenantId" SET NOT NULL;

-- Handle title column
UPDATE "posts" SET "title" = 'Untitled Post' WHERE "title" IS NULL;
ALTER TABLE "posts" ALTER COLUMN "title" SET NOT NULL;

-- Handle content column transformation
-- First add new JSONB column as nullable
ALTER TABLE "posts" ADD COLUMN "content_new" JSONB;

-- Transform existing content to JSON format
UPDATE "posts" SET "content_new" = jsonb_build_object(
  'hook', COALESCE("content", ''),
  'body', COALESCE("content", ''),
  'hashtags', '[]'::jsonb,
  'platforms', '["INSTAGRAM"]'::jsonb
) WHERE "content_new" IS NULL;

-- Drop old content column and rename new one
ALTER TABLE "posts" DROP COLUMN "content";
ALTER TABLE "posts" RENAME COLUMN "content_new" TO "content";
ALTER TABLE "posts" ALTER COLUMN "content" SET NOT NULL;

-- AlterTable
-- Handle schedules table transformation
-- First add new columns as nullable
ALTER TABLE "schedules" ADD COLUMN "runAt" TIMESTAMP(3);
ALTER TABLE "schedules" ADD COLUMN "timezone" TEXT DEFAULT 'UTC';

-- Update existing schedules with data from scheduledAt
UPDATE "schedules" SET "runAt" = "scheduledAt" WHERE "runAt" IS NULL;

-- Set default runAt for any remaining null values
UPDATE "schedules" SET "runAt" = NOW() + INTERVAL '1 day' WHERE "runAt" IS NULL;

-- Now make runAt required
ALTER TABLE "schedules" ALTER COLUMN "runAt" SET NOT NULL;
ALTER TABLE "schedules" ALTER COLUMN "timezone" SET NOT NULL;

-- Drop old columns
ALTER TABLE "schedules" DROP COLUMN "channelType";
ALTER TABLE "schedules" DROP COLUMN "errorMessage";
ALTER TABLE "schedules" DROP COLUMN "publishedAt";
ALTER TABLE "schedules" DROP COLUMN "scheduledAt";

-- Handle status column
ALTER TABLE "schedules" DROP COLUMN "status";
ALTER TABLE "schedules" ADD COLUMN "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "schedules_postId_key" ON "schedules"("postId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
