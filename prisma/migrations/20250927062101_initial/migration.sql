-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "defaultWaSender" TEXT,
ADD COLUMN     "whiteLabel" JSONB;
