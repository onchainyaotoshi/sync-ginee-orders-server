-- CreateEnum
CREATE TYPE "IncrementalSyncHistoryState" AS ENUM ('PROCESSING', 'ERROR', 'COMPLETE');

-- AlterTable
ALTER TABLE "IncrementalSyncHistory" ADD COLUMN     "state" "IncrementalSyncHistoryState" NOT NULL DEFAULT 'PROCESSING';
