import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const assetTypeEnum = pgEnum("asset_type", [
  "cedear",
  "arg_stock",
  "stock",
  "crypto",
  "stablecoin",
]);

export const transactionTypeEnum = pgEnum("transaction_type", ["buy", "sell"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  currency: text("currency").notNull().default("ARS"),
  // For CEDEARs: the Yahoo Finance ticker (e.g., "AAPL.BA")
  yahooTicker: text("yahoo_ticker"),
  // For crypto: the CoinGecko ID (e.g., "bitcoin")
  coingeckoId: text("coingecko_id"),
  // CEDEAR specific fields
  underlyingTicker: text("underlying_ticker"),
  conversionRatio: numeric("conversion_ratio"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_ticker_type").on(table.ticker, table.type),
]);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "restrict" }),
  date: date("date").notNull(),
  type: transactionTypeEnum("type").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  fee: numeric("fee").default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    price: numeric("price").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique("unique_asset_date").on(table.assetId, table.date)]
);

export const dollarRates = pgTable(
  "dollar_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    type: text("type").notNull(), // 'mep', 'contadoconliqui', 'blue', 'oficial'
    buyPrice: numeric("buy_price").notNull(),
    sellPrice: numeric("sell_price").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique("unique_date_type").on(table.date, table.type)]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  transactions: many(transactions),
  quotes: many(quotes),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [transactions.assetId],
    references: [assets.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  asset: one(assets, {
    fields: [quotes.assetId],
    references: [assets.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type DollarRate = typeof dollarRates.$inferSelect;
export type NewDollarRate = typeof dollarRates.$inferInsert;
