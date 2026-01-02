import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, quotes, dollarRates, assets } from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

interface Holding {
  ticker: string;
  name: string;
  type: string;
  currency: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  valueUsd: number;
  returnPct: number;
  returnAbs: number;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get holdings aggregated by asset
    const holdings = await db
      .select({
        assetId: transactions.assetId,
        quantity: sql<string>`sum(
          case when ${transactions.type} = 'buy'
          then ${transactions.quantity}::numeric
          else -${transactions.quantity}::numeric end
        )`,
        totalBought: sql<string>`sum(
          case when ${transactions.type} = 'buy'
          then ${transactions.quantity}::numeric
          else 0 end
        )`,
        totalCost: sql<string>`sum(
          case when ${transactions.type} = 'buy'
          then ${transactions.quantity}::numeric * ${transactions.unitPrice}::numeric
          else 0 end
        )`,
      })
      .from(transactions)
      .where(eq(transactions.userId, session.user.id))
      .groupBy(transactions.assetId)
      .having(
        sql`sum(
          case when ${transactions.type} = 'buy'
          then ${transactions.quantity}::numeric
          else -${transactions.quantity}::numeric end
        ) > 0`
      );

    // Early return if no holdings
    if (holdings.length === 0) {
      return NextResponse.json({
        totalValueUsd: 0,
        totalCostUsd: 0,
        totalReturnAbs: 0,
        totalReturnPct: 0,
        totalValueArs: 0,
        totalCostArs: 0,
        totalReturnAbsArs: 0,
        dollarRates: { oficial: 1, mep: 1, blue: 1 },
        holdings: [],
        updatedAt: new Date().toISOString(),
      });
    }

    // Get all asset IDs
    const assetIds = holdings.map((h) => h.assetId);

    // Batch fetch: all assets and all latest quotes in parallel
    const [allAssets, allDollarRates, latestQuotesRaw] = await Promise.all([
      // Fetch all assets at once
      db.select().from(assets).where(inArray(assets.id, assetIds)),

      // Fetch all dollar rates at once (get latest of each type)
      db
        .select()
        .from(dollarRates)
        .orderBy(desc(dollarRates.date))
        .limit(10), // Get recent rates, we'll filter by type

      // Fetch latest quote for each asset using a subquery
      db.execute(sql`
        SELECT DISTINCT ON (asset_id)
          asset_id, price, date
        FROM quotes
        WHERE asset_id = ANY(ARRAY[${sql.join(
          assetIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )}])
        ORDER BY asset_id, date DESC
      `),
    ]);

    // Create lookup maps
    const assetMap = new Map(allAssets.map((a) => [a.id, a]));

    // Parse latest quotes into a map
    const quotesMap = new Map<string, number>();
    if (latestQuotesRaw.rows) {
      for (const row of latestQuotesRaw.rows as Array<{
        asset_id: string;
        price: string;
      }>) {
        quotesMap.set(row.asset_id, Number(row.price));
      }
    }

    // Parse dollar rates
    let dollarOficial = 1;
    let dollarMep = 1;
    let dollarBlue = 1;

    const ratesByType: Record<string, number> = {};
    for (const rate of allDollarRates) {
      if (!ratesByType[rate.type]) {
        ratesByType[rate.type] = Number(rate.sellPrice);
      }
    }

    dollarOficial = ratesByType["oficial"] || ratesByType["mep"] || 1;
    dollarMep = ratesByType["mep"] || 1;
    dollarBlue = ratesByType["blue"] || 1;

    // Build response
    const result: Holding[] = [];
    let totalValueUsd = 0;
    let totalCostUsd = 0;

    for (const h of holdings) {
      const asset = assetMap.get(h.assetId);
      if (!asset) continue;

      const quantity = Number(h.quantity);
      const totalBought = Number(h.totalBought);
      const totalCost = Number(h.totalCost);
      const avgPrice = totalBought > 0 ? totalCost / totalBought : 0;
      const currentPrice = quotesMap.get(h.assetId) ?? avgPrice;
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;

      // Convert to USD based on currency
      let valueUsd = currentValue;
      let costUsd = costBasis;
      if (asset.currency === "ARS") {
        valueUsd = currentValue / dollarOficial;
        costUsd = costBasis / dollarOficial;
      }

      totalValueUsd += valueUsd;
      totalCostUsd += costUsd;

      const returnPct =
        avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
      const returnAbs = (currentPrice - avgPrice) * quantity;

      result.push({
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        currency: asset.currency,
        quantity,
        avgPrice,
        currentPrice,
        currentValue,
        costBasis,
        valueUsd,
        returnPct,
        returnAbs,
      });
    }

    // Sort by value (largest first)
    result.sort((a, b) => b.valueUsd - a.valueUsd);

    // Calculate global returns
    const totalReturnAbs = totalValueUsd - totalCostUsd;
    const totalReturnPct =
      totalCostUsd > 0
        ? ((totalValueUsd - totalCostUsd) / totalCostUsd) * 100
        : 0;

    // Calculate ARS values
    const totalValueArs = totalValueUsd * dollarOficial;
    const totalCostArs = totalCostUsd * dollarOficial;
    const totalReturnAbsArs = totalReturnAbs * dollarOficial;

    return NextResponse.json({
      totalValueUsd,
      totalCostUsd,
      totalReturnAbs,
      totalReturnPct,
      totalValueArs,
      totalCostArs,
      totalReturnAbsArs,
      dollarRates: {
        oficial: dollarOficial,
        mep: dollarMep,
        blue: dollarBlue,
      },
      holdings: result,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}
