-- CreateTable
CREATE TABLE "GineeOrderMaster" (
    "orderId" VARCHAR(64) NOT NULL,
    "jobMasterId" BIGINT,
    "country" CHAR(2) NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "shopId" VARCHAR(64) NOT NULL,
    "orderType" VARCHAR(32),
    "orderStatus" VARCHAR(32) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "paymentMethod" VARCHAR(64),
    "isCod" BOOLEAN NOT NULL,
    "externalOrderId" VARCHAR(64),
    "externalOrderSn" VARCHAR(64),
    "externalBookingSn" VARCHAR(64),
    "externalOrderStatus" VARCHAR(32),
    "externalCreateAt" TIMESTAMPTZ,
    "externalUpdateAt" TIMESTAMPTZ,
    "problemOrderTypes" VARCHAR(64)[],
    "createAt" TIMESTAMPTZ NOT NULL,
    "payAt" TIMESTAMPTZ,
    "lastUpdateAt" TIMESTAMPTZ NOT NULL,
    "promisedToShipBefore" TIMESTAMPTZ,
    "customerName" VARCHAR(128),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GineeOrderMaster_pkey" PRIMARY KEY ("orderId")
);

-- CreateIndex
CREATE INDEX "GineeOrderMaster_jobMasterId_idx" ON "GineeOrderMaster"("jobMasterId");

-- CreateIndex
CREATE INDEX "GineeOrderMaster_shopId_createAt_idx" ON "GineeOrderMaster"("shopId", "createAt");

-- CreateIndex
CREATE INDEX "GineeOrderMaster_channel_createAt_idx" ON "GineeOrderMaster"("channel", "createAt");

-- CreateIndex
CREATE INDEX "GineeOrderMaster_orderStatus_idx" ON "GineeOrderMaster"("orderStatus");

-- CreateIndex
CREATE INDEX "GineeOrderMaster_externalOrderId_idx" ON "GineeOrderMaster"("externalOrderId");

-- AddForeignKey
ALTER TABLE "GineeOrderMaster" ADD CONSTRAINT "GineeOrderMaster_jobMasterId_fkey" FOREIGN KEY ("jobMasterId") REFERENCES "JobMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
