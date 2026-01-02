ALTER TYPE "public"."asset_type" ADD VALUE 'stock' BEFORE 'crypto';--> statement-breakpoint
ALTER TABLE "assets" DROP CONSTRAINT "assets_ticker_unique";--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "unique_ticker_type" UNIQUE("ticker","type");