import { db } from "./index";
import { assets, users } from "./schema";
import bcrypt from "bcryptjs";

const initialAssets = [
  // CEDEARs
  {
    ticker: "AAPL",
    name: "Apple",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "AAPL.BA",
    underlyingTicker: "AAPL",
    conversionRatio: "10",
  },
  {
    ticker: "GOOGL",
    name: "Google",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "GOOGL.BA",
    underlyingTicker: "GOOGL",
    conversionRatio: "9",
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "MSFT.BA",
    underlyingTicker: "MSFT",
    conversionRatio: "5",
  },
  {
    ticker: "MELI",
    name: "MercadoLibre",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "MELI.BA",
    underlyingTicker: "MELI",
    conversionRatio: "2",
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "TSLA.BA",
    underlyingTicker: "TSLA",
    conversionRatio: "15",
  },
  {
    ticker: "NVDA",
    name: "Nvidia",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "NVDA.BA",
    underlyingTicker: "NVDA",
    conversionRatio: "5",
  },
  {
    ticker: "AMZN",
    name: "Amazon",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "AMZN.BA",
    underlyingTicker: "AMZN",
    conversionRatio: "12",
  },
  {
    ticker: "META",
    name: "Meta",
    type: "cedear" as const,
    currency: "ARS",
    yahooTicker: "META.BA",
    underlyingTicker: "META",
    conversionRatio: "6",
  },
  // Argentine Stocks
  {
    ticker: "GGAL",
    name: "Grupo Financiero Galicia",
    type: "arg_stock" as const,
    currency: "ARS",
    yahooTicker: "GGAL.BA",
  },
  {
    ticker: "YPFD",
    name: "YPF",
    type: "arg_stock" as const,
    currency: "ARS",
    yahooTicker: "YPFD.BA",
  },
  {
    ticker: "PAMP",
    name: "Pampa Energia",
    type: "arg_stock" as const,
    currency: "ARS",
    yahooTicker: "PAMP.BA",
  },
  // Crypto
  {
    ticker: "BTC",
    name: "Bitcoin",
    type: "crypto" as const,
    currency: "USD",
    coingeckoId: "bitcoin",
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    type: "crypto" as const,
    currency: "USD",
    coingeckoId: "ethereum",
  },
  {
    ticker: "SOL",
    name: "Solana",
    type: "crypto" as const,
    currency: "USD",
    coingeckoId: "solana",
  },
  // Stablecoins
  {
    ticker: "DAI",
    name: "DAI",
    type: "stablecoin" as const,
    currency: "USD",
    coingeckoId: "dai",
  },
  {
    ticker: "USDT",
    name: "Tether",
    type: "stablecoin" as const,
    currency: "USD",
    coingeckoId: "tether",
  },
  {
    ticker: "USDC",
    name: "USD Coin",
    type: "stablecoin" as const,
    currency: "USD",
    coingeckoId: "usd-coin",
  },
];

async function seed() {
  console.log("Seeding database...");

  // Seed assets
  console.log("Seeding assets...");
  for (const asset of initialAssets) {
    await db.insert(assets).values(asset).onConflictDoNothing();
  }
  console.log(`Seeded ${initialAssets.length} assets`);

  // Seed default user
  console.log("Seeding default user...");
  const hashedPassword = await bcrypt.hash("password123", 10);
  await db
    .insert(users)
    .values({
      email: "test@example.com",
      password: hashedPassword,
    })
    .onConflictDoNothing();
  console.log('Created user: test@example.com / password123');

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
