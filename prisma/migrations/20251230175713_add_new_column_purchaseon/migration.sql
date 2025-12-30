/*
  Warnings:

  - You are about to drop the column `purchaseOn` on the `GineeOrderMaster` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GineeOrderMaster" DROP COLUMN "purchaseOn",
ADD COLUMN     "purchasedOn" TIMESTAMPTZ;
