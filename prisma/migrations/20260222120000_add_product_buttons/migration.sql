-- AlterTable (idempotent: column already added by previous migration if present)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "buttons" JSONB;
