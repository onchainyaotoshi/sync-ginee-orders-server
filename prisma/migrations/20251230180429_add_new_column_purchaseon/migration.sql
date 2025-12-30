/*
  Warnings:

  - Added the required column `totalQuantity` to the `GineeOrderMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GineeOrderMaster" ADD COLUMN     "closeAt" TIMESTAMPTZ,
ADD COLUMN     "totalQuantity" BIGINT NOT NULL;
