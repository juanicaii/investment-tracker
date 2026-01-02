import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { quotes, dollarRates, assets } from "@/db/schema";
import { or, eq } from "drizzle-orm";
import { fetchCoinGecko, fetchDollarRates, fetchYahooQuotes } from "@/lib/quotes";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const errors: string[] = [];
  let updated = 0;
  const sources: Record<string, string> = {
    dolarapi: "pending",
    coingecko: "pending",
    yahoo: "pending",
  };

  // 1. Sync dollar rates
  try {
    const rates = await fetchDollarRates();
    for (const rate of rates) {
      await db
        .insert(dollarRates)
        .values({
          date: today,
          type: rate.type,
          buyPrice: String(rate.buyPrice),
          sellPrice: String(rate.sellPrice),
        })
        .onConflictDoUpdate({
          target: [dollarRates.date, dollarRates.type],
          set: {
            buyPrice: String(rate.buyPrice),
            sellPrice: String(rate.sellPrice),
          },
        });
      updated++;
    }
    sources.dolarapi = "ok";
  } catch (e) {
    sources.dolarapi = "error";
    const message = e instanceof Error ? e.message : "Unknown error";
    errors.push(`Dollar rates: ${message}`);
  }

  // 2. Sync crypto/stablecoins via CoinGecko
  try {
    const cryptoAssets = await db.query.assets.findMany({
      where: or(eq(assets.type, "crypto"), eq(assets.type, "stablecoin")),
    });

    const coingeckoIds = cryptoAssets
      .filter((a) => a.coingeckoId)
      .map((a) => a.coingeckoId!);

    if (coingeckoIds.length > 0) {
      const prices = await fetchCoinGecko(coingeckoIds);

      for (const asset of cryptoAssets) {
        if (asset.coingeckoId && prices[asset.coingeckoId]) {
          await db
            .insert(quotes)
            .values({
              assetId: asset.id,
              date: today,
              price: String(prices[asset.coingeckoId]),
            })
            .onConflictDoUpdate({
              target: [quotes.assetId, quotes.date],
              set: { price: String(prices[asset.coingeckoId]) },
            });
          updated++;
        }
      }
    }
    sources.coingecko = "ok";
  } catch (e) {
    sources.coingecko = "error";
    const message = e instanceof Error ? e.message : "Unknown error";
    errors.push(`CoinGecko: ${message}`);
  }

  // 3. Sync CEDEARs, Argentine stocks, and international stocks via Yahoo Finance
  const yahooDetails: { ticker: string; yahooTicker: string | null; price: number | null }[] = [];
  try {
    const yahooAssets = await db.query.assets.findMany({
      where: or(eq(assets.type, "cedear"), eq(assets.type, "arg_stock"), eq(assets.type, "stock")),
    });

    console.log(`[Sync] Found ${yahooAssets.length} Yahoo assets to sync`);

    const yahooTickers = yahooAssets
      .filter((a) => a.yahooTicker)
      .map((a) => a.yahooTicker!);

    if (yahooTickers.length > 0) {
      console.log(`[Sync] Fetching prices for: ${yahooTickers.join(", ")}`);
      const prices = await fetchYahooQuotes(yahooTickers);
      console.log(`[Sync] Got prices:`, prices);

      for (const asset of yahooAssets) {
        const price = asset.yahooTicker ? prices[asset.yahooTicker] : null;
        yahooDetails.push({
          ticker: asset.ticker,
          yahooTicker: asset.yahooTicker,
          price: price ?? null,
        });

        if (asset.yahooTicker && price) {
          await db
            .insert(quotes)
            .values({
              assetId: asset.id,
              date: today,
              price: String(price),
            })
            .onConflictDoUpdate({
              target: [quotes.assetId, quotes.date],
              set: { price: String(price) },
            });
          updated++;
        } else if (asset.yahooTicker && !price) {
          errors.push(`Yahoo: No price for ${asset.ticker} (${asset.yahooTicker})`);
        } else if (!asset.yahooTicker) {
          errors.push(`Yahoo: ${asset.ticker} has no yahooTicker configured`);
        }
      }
    }
    sources.yahoo = "ok";
  } catch (e) {
    sources.yahoo = "error";
    const message = e instanceof Error ? e.message : "Unknown error";
    errors.push(`Yahoo Finance: ${message}`);
  }

  return NextResponse.json({
    updated,
    errors,
    sources,
    yahoo: yahooDetails,
    syncedAt: new Date().toISOString(),
  });
}
