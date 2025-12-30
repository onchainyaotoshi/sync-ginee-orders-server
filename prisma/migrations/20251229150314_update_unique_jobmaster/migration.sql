/*
  Warnings:

  - A unique constraint covering the columns `[jobDate,appName]` on the table `JobMaster` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "JobMaster_jobDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "JobMaster_jobDate_appName_key" ON "JobMaster"("jobDate", "appName");
