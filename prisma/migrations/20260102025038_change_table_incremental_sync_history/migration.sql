/*
  Warnings:

  - You are about to drop the column `end` on the `IncrementalSyncHistory` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `IncrementalSyncHistory` table. All the data in the column will be lost.
  - Added the required column `parameters` to the `IncrementalSyncHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IncrementalSyncHistory" DROP COLUMN "end",
DROP COLUMN "start",
ADD COLUMN     "parameters" JSONB NOT NULL;
