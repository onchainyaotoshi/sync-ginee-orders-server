-- DropForeignKey
ALTER TABLE "GineeOrderMaster" DROP CONSTRAINT "GineeOrderMaster_jobMasterId_fkey";

-- CreateTable
CREATE TABLE "GineeOrderItem" (
    "itemId" VARCHAR(64) NOT NULL,
    "orderId" VARCHAR(64) NOT NULL,
    "jobMasterId" BIGINT,
    "productName" VARCHAR(256),
    "productImageUrl" VARCHAR(512),
    "variationName" VARCHAR(256),
    "spu" VARCHAR(64),
    "sku" VARCHAR(64),
    "masterSku" VARCHAR(64),
    "masterSkuType" VARCHAR(16),
    "quantity" INTEGER NOT NULL,
    "actualPrice" DECIMAL(18,2),
    "actualTotalPrice" DECIMAL(18,2),
    "originalPrice" DECIMAL(18,2),
    "originalTotalPrice" DECIMAL(18,2),
    "discountedPrice" DECIMAL(18,2),
    "externalItemId" VARCHAR(64),
    "externalVariationId" VARCHAR(64),
    "externalProductId" VARCHAR(64),
    "externalOrderItemStatus" VARCHAR(64),
    "isGift" BOOLEAN,
    "isFulfilByPlatform" BOOLEAN,
    "bundleSkus" JSONB,
    "invoiceInfo" JSONB,
    "shippingDocumentInfo" JSONB,
    "shipInfo" JSONB,
    "printInfo" JSONB,
    "extraInfo" JSONB,
    "cancelInfo" JSONB,
    "logisticsInfos" JSONB,
    "shippingAddressInfo" JSONB,
    "paymentInfo" JSONB,
    "customerInfo" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GineeOrderItem_pkey" PRIMARY KEY ("itemId")
);

-- CreateIndex
CREATE INDEX "GineeOrderItem_orderId_idx" ON "GineeOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "GineeOrderItem_jobMasterId_idx" ON "GineeOrderItem"("jobMasterId");

-- CreateIndex
CREATE INDEX "GineeOrderItem_sku_idx" ON "GineeOrderItem"("sku");

-- CreateIndex
CREATE INDEX "GineeOrderItem_masterSku_idx" ON "GineeOrderItem"("masterSku");

-- CreateIndex
CREATE INDEX "GineeOrderItem_externalItemId_idx" ON "GineeOrderItem"("externalItemId");

-- AddForeignKey
ALTER TABLE "GineeOrderMaster" ADD CONSTRAINT "GineeOrderMaster_jobMasterId_fkey" FOREIGN KEY ("jobMasterId") REFERENCES "JobMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GineeOrderItem" ADD CONSTRAINT "GineeOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GineeOrderMaster"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GineeOrderItem" ADD CONSTRAINT "GineeOrderItem_jobMasterId_fkey" FOREIGN KEY ("jobMasterId") REFERENCES "JobMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
