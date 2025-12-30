/*
  Warnings:

  - Added the required column `appName` to the `JobMaster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobMaster" ADD COLUMN     "appName" VARCHAR(255) NOT NULL;
