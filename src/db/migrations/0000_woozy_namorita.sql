CREATE TYPE "public"."asset_type" AS ENUM('cedear', 'arg_stock', 'crypto', 'stablecoin');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"currency" text DEFAULT 'ARS' NOT NULL,
	"yahoo_ticker" text,
	"coingecko_id" text,
	"underlying_ticker" text,
	"conversion_ratio" numeric,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "assets_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "dollar_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"buy_price" numeric NOT NULL,
	"sell_price" numeric NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_date_type" UNIQUE("date","type")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"date" date NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_asset_date" UNIQUE("asset_id","date")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" "transaction_type" NOT NULL,
	"quantity" numeric NOT NULL,
	"unit_price" numeric NOT NULL,
	"fee" numeric DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;