/*
  Warnings:

  - The values [SUCCESS] on the enum `JobMasterState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobMasterState_new" AS ENUM ('PENDING', 'PROCESSING', 'CONSENSUS_REACHED', 'DETAIL_FETCHED', 'ERROR', 'COMPLETE');
ALTER TABLE "public"."JobMaster" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "JobMaster" ALTER COLUMN "state" TYPE "JobMasterState_new" USING ("state"::text::"JobMasterState_new");
ALTER TYPE "JobMasterState" RENAME TO "JobMasterState_old";
ALTER TYPE "JobMasterState_new" RENAME TO "JobMasterState";
DROP TYPE "public"."JobMasterState_old";
ALTER TABLE "JobMaster" ALTER COLUMN "state" SET DEFAULT 'PENDING';
COMMIT;
