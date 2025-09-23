-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('CREATED', 'SUBMITTED_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGE_REQUESTED', 'RESUBMITTED', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "approvalNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "approval_logs" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "ApprovalAction" NOT NULL,
    "status" "PostStatus" NOT NULL,
    "feedback" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
