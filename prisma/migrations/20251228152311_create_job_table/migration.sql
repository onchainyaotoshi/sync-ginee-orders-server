-- CreateEnum
CREATE TYPE "JobMasterState" AS ENUM ('PENDING', 'CONSENSUS_REACHED', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "JobMaster" (
    "id" BIGSERIAL NOT NULL,
    "jobDate" DATE NOT NULL,
    "parameters" JSONB NOT NULL,
    "state" "JobMasterState" NOT NULL DEFAULT 'PENDING',
    "error" JSONB,
    "consensusKey" TEXT,
    "consensusResult" JSONB,
    "consensusAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "finalizeAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDetail" (
    "id" BIGSERIAL NOT NULL,
    "jobMasterId" BIGINT NOT NULL,
    "executionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionEnd" TIMESTAMP(3),
    "executionTimeMs" INTEGER,
    "result" JSONB,
    "error" JSONB,
    "resultKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobMaster_state_idx" ON "JobMaster"("state");

-- CreateIndex
CREATE UNIQUE INDEX "JobMaster_jobDate_key" ON "JobMaster"("jobDate");

-- CreateIndex
CREATE INDEX "JobDetail_jobMasterId_idx" ON "JobDetail"("jobMasterId");

-- CreateIndex
CREATE INDEX "JobDetail_jobMasterId_resultKey_idx" ON "JobDetail"("jobMasterId", "resultKey");

-- AddForeignKey
ALTER TABLE "JobDetail" ADD CONSTRAINT "JobDetail_jobMasterId_fkey" FOREIGN KEY ("jobMasterId") REFERENCES "JobMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
