-- CreateTable
CREATE TABLE "brand_settings" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "autoApproveIfNoReply" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveHours" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_settings_brandId_key" ON "brand_settings"("brandId");

-- AddForeignKey
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
