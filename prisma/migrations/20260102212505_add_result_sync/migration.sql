/*
  Warnings:

  - You are about to drop the column `executionEnd` on the `IncrementalSyncHistory` table. All the data in the column will be lost.
  - You are about to drop the column `executionStart` on the `IncrementalSyncHistory` table. All the data in the column will be lost.
  - You are about to drop the column `executionTimeMs` on the `IncrementalSyncHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "IncrementalSyncHistory" DROP COLUMN "executionEnd",
DROP COLUMN "executionStart",
DROP COLUMN "executionTimeMs",
ADD COLUMN     "result" JSONB;
