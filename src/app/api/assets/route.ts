import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assets, quotes } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { fetchYahooQuote } from "@/lib/quotes/yahoo";
import { fetchCoinGecko } from "@/lib/quotes/coingecko";

const createAssetSchema = z.object({
  ticker: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
  name: z.string().min(1).max(100),
  type: z.enum(["cedear", "arg_stock", "stock", "crypto", "stablecoin"]),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  yahooTicker: z.string().optional(),
  coingeckoId: z.string().optional(),
  underlyingTicker: z.string().optional(),
  conversionRatio: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allAssets = await db.query.assets.findMany({
      orderBy: [assets.type, assets.ticker],
    });

    // Get latest quote for each asset
    const assetsWithQuotes = await Promise.all(
      allAssets.map(async (asset) => {
        const [latestQuote] = await db
          .select()
          .from(quotes)
          .where(eq(quotes.assetId, asset.id))
          .orderBy(desc(quotes.date))
          .limit(1);

        return {
          ...asset,
          latestPrice: latestQuote ? Number(latestQuote.price) : null,
          quoteDate: latestQuote?.date || null,
        };
      })
    );

    return NextResponse.json(assetsWithQuotes);
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate ticker + type combination
    const existing = await db.query.assets.findFirst({
      where: and(
        eq(assets.ticker, parsed.data.ticker),
        eq(assets.type, parsed.data.type)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Asset ${parsed.data.ticker} of type ${parsed.data.type} already exists` },
        { status: 409 }
      );
    }

    // Auto-generate yahooTicker based on type
    let yahooTicker = parsed.data.yahooTicker;
    if (!yahooTicker) {
      if (parsed.data.type === "cedear" || parsed.data.type === "arg_stock") {
        // Argentine market uses .BA suffix
        yahooTicker = `${parsed.data.ticker}.BA`;
      } else if (parsed.data.type === "stock") {
        // US/International stocks use ticker directly
        yahooTicker = parsed.data.ticker;
      }
    }

    // Auto-set underlyingTicker for CEDEARs if not provided
    let underlyingTicker = parsed.data.underlyingTicker;
    if (!underlyingTicker && parsed.data.type === "cedear") {
      underlyingTicker = parsed.data.ticker;
    }

    // Auto-set currency for stocks to USD
    let currency = parsed.data.currency;
    if (parsed.data.type === "stock") {
      currency = "USD";
    }

    const [result] = await db
      .insert(assets)
      .values({
        ticker: parsed.data.ticker,
        name: parsed.data.name,
        type: parsed.data.type,
        currency,
        yahooTicker,
        coingeckoId: parsed.data.coingeckoId,
        underlyingTicker,
        conversionRatio: parsed.data.conversionRatio,
      })
      .returning();

    // Sync price for the newly created asset
    const today = new Date().toISOString().split("T")[0];
    let syncedPrice: number | null = null;

    try {
      if (yahooTicker && (parsed.data.type === "cedear" || parsed.data.type === "arg_stock" || parsed.data.type === "stock")) {
        // Fetch from Yahoo Finance
        const quote = await fetchYahooQuote(yahooTicker);
        if (quote) {
          await db
            .insert(quotes)
            .values({
              assetId: result.id,
              date: today,
              price: String(quote.price),
            })
            .onConflictDoUpdate({
              target: [quotes.assetId, quotes.date],
              set: { price: String(quote.price) },
            });
          syncedPrice = quote.price;
          console.log(`[Asset] Synced price for ${parsed.data.ticker}: ${quote.price}`);
        }
      } else if (parsed.data.coingeckoId && (parsed.data.type === "crypto" || parsed.data.type === "stablecoin")) {
        // Fetch from CoinGecko
        const prices = await fetchCoinGecko([parsed.data.coingeckoId]);
        const price = prices[parsed.data.coingeckoId];
        if (price) {
          await db
            .insert(quotes)
            .values({
              assetId: result.id,
              date: today,
              price: String(price),
            })
            .onConflictDoUpdate({
              target: [quotes.assetId, quotes.date],
              set: { price: String(price) },
            });
          syncedPrice = price;
          console.log(`[Asset] Synced price for ${parsed.data.ticker}: ${price}`);
        }
      }
    } catch (syncError) {
      console.error(`[Asset] Failed to sync price for ${parsed.data.ticker}:`, syncError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      ...result,
      latestPrice: syncedPrice,
      quoteDate: syncedPrice ? today : null,
    });
  } catch (error) {
    console.error("Failed to create asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Asset ID required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = createAssetSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [result] = await db
      .update(assets)
      .set(parsed.data)
      .where(eq(assets.id, id))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update asset:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Asset ID required" },
        { status: 400 }
      );
    }

    // Note: This will fail if transactions exist due to foreign key constraint
    const [result] = await db
      .delete(assets)
      .where(eq(assets.id, id))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return NextResponse.json(
      { error: "Cannot delete asset with existing transactions" },
      { status: 409 }
    );
  }
}
