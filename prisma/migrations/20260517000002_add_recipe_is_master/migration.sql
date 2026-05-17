-- AlterTable: add isMaster flag to recipes (idempotent)
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "isMaster" BOOLEAN NOT NULL DEFAULT false;
