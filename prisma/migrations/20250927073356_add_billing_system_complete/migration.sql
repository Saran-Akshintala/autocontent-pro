/*
  Warnings:

  - The values [FREE,PROFESSIONAL,ENTERPRISE] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('POST_GENERATION', 'IMAGE_GENERATION', 'BRAND_CREATION', 'API_CALL');

-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('STARTER', 'GROWTH', 'AGENCY');
ALTER TABLE "tenants" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "tenants" ALTER COLUMN "plan" TYPE "PlanType_new" USING ("plan"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "PlanType_old";
ALTER TABLE "tenants" ALTER COLUMN "plan" SET DEFAULT 'STARTER';
COMMIT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "brandsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imageCreditsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postCreditsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "razorpayCustomerId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "usageResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "plan" SET DEFAULT 'STARTER';

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usageType" "UsageType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
