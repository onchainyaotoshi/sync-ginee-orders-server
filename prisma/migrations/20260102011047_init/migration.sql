/*
  Warnings:

  - The primary key for the `GineeOrderItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cancelInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `customerInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `logisticsInfos` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `paymentInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `printInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `shipInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `shippingDocumentInfo` on the `GineeOrderItem` table. All the data in the column will be lost.
  - The primary key for the `GineeOrderMaster` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "GineeOrderItem" DROP CONSTRAINT "GineeOrderItem_orderId_fkey";

-- AlterTable
ALTER TABLE "GineeOrderItem" DROP CONSTRAINT "GineeOrderItem_pkey",
DROP COLUMN "cancelInfo",
DROP COLUMN "customerInfo",
DROP COLUMN "extraInfo",
DROP COLUMN "invoiceInfo",
DROP COLUMN "logisticsInfos",
DROP COLUMN "paymentInfo",
DROP COLUMN "printInfo",
DROP COLUMN "shipInfo",
DROP COLUMN "shippingAddressInfo",
DROP COLUMN "shippingDocumentInfo",
ALTER COLUMN "itemId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "spu" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "sku" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "masterSku" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "masterSkuType" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalItemId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalVariationId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalProductId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalOrderItemStatus" SET DATA TYPE VARCHAR(256),
ADD CONSTRAINT "GineeOrderItem_pkey" PRIMARY KEY ("itemId");

-- AlterTable
ALTER TABLE "GineeOrderMaster" DROP CONSTRAINT "GineeOrderMaster_pkey",
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "channel" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "shopId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "orderType" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "orderStatus" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "paymentMethod" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalOrderId" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalOrderSn" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalBookingSn" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalOrderStatus" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "problemOrderTypes" SET DATA TYPE VARCHAR(256)[],
ALTER COLUMN "customerName" SET DATA TYPE VARCHAR(256),
ALTER COLUMN "externalShopId" SET DATA TYPE VARCHAR(256),
ADD CONSTRAINT "GineeOrderMaster_pkey" PRIMARY KEY ("orderId");

-- AlterTable
ALTER TABLE "JobMaster" ALTER COLUMN "appName" SET DATA TYPE VARCHAR(256);

-- CreateTable
CREATE TABLE "GineeOrderDetail" (
    "id" BIGSERIAL NOT NULL,
    "orderId" VARCHAR(256) NOT NULL,
    "jobMasterId" BIGINT,
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

    CONSTRAINT "GineeOrderDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GineeOrderDetail_orderId_idx" ON "GineeOrderDetail"("orderId");

-- CreateIndex
CREATE INDEX "GineeOrderDetail_jobMasterId_idx" ON "GineeOrderDetail"("jobMasterId");

-- CreateIndex
CREATE INDEX "GineeOrderMaster_externalOrderSn_idx" ON "GineeOrderMaster"("externalOrderSn");

-- CreateIndex
CREATE INDEX "GineeOrderMaster_externalBookingSn_idx" ON "GineeOrderMaster"("externalBookingSn");

-- AddForeignKey
ALTER TABLE "GineeOrderDetail" ADD CONSTRAINT "GineeOrderDetail_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GineeOrderMaster"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GineeOrderDetail" ADD CONSTRAINT "GineeOrderDetail_jobMasterId_fkey" FOREIGN KEY ("jobMasterId") REFERENCES "JobMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GineeOrderItem" ADD CONSTRAINT "GineeOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GineeOrderMaster"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;
