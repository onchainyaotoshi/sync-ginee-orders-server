-- AlterTable
ALTER TABLE "IncrementalSyncHistory" ADD COLUMN     "executionEnd" TIMESTAMPTZ,
ADD COLUMN     "executionStart" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "executionTimeMs" INTEGER;
