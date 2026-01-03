-- CreateTable
CREATE TABLE "IncrementalSyncHistory" (
    "id" BIGSERIAL NOT NULL,
    "appName" VARCHAR(256) NOT NULL DEFAULT 'default',
    "start" TIMESTAMPTZ,
    "end" TIMESTAMPTZ,
    "error" JSONB,
    "consensusKey" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "IncrementalSyncHistory_pkey" PRIMARY KEY ("id")
);
