export interface YahooQuote {
  ticker: string;
  price: number;
  currency: string;
  name: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchYahooQuote(yahooTicker: string, retries = 2): Promise<YahooQuote | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use query2 endpoint which is more permissive
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;
      console.log(`[Yahoo] Fetching: ${yahooTicker} (attempt ${attempt + 1})`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Origin": "https://finance.yahoo.com",
          "Referer": "https://finance.yahoo.com/",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);

      const text = await res.text();
      
      // Check for rate limiting
      if (text.includes("Too Many Requests") || text.includes("Edge: Too Many") || res.status === 429) {
        console.warn(`[Yahoo] Rate limited for ${yahooTicker}, waiting ${(attempt + 1) * 3}s...`);
        await delay(3000 * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        console.error(`[Yahoo] HTTP ${res.status} for ${yahooTicker}: ${text.substring(0, 200)}`);
        if (attempt < retries) {
          await delay(1500);
          continue;
        }
        return null;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error(`[Yahoo] Invalid JSON for ${yahooTicker}:`, text.substring(0, 200));
        if (attempt < retries) {
          await delay(1500);
          continue;
        }
        return null;
      }
      
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta) {
        console.error(`[Yahoo] No meta for ${yahooTicker}:`, JSON.stringify(data).substring(0, 300));
        return null;
      }
      
      // Try regularMarketPrice first, then previousClose as fallback
      const price = meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose;
      
      if (typeof price !== 'number') {
        console.error(`[Yahoo] No price for ${yahooTicker}, meta:`, JSON.stringify(meta).substring(0, 300));
        return null;
      }

      console.log(`[Yahoo] Success ${yahooTicker}: ${price} ${meta.currency}`);
      
      return {
        ticker: yahooTicker,
        price: price,
        currency: meta.currency || "ARS",
        name: meta.longName || meta.shortName || yahooTicker,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Yahoo] Exception for ${yahooTicker}: ${message}`);
      if (attempt < retries) {
        await delay(1500);
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function fetchYahooQuotes(
  yahooTickers: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // Fetch sequentially with delays to avoid rate limiting
  for (let i = 0; i < yahooTickers.length; i++) {
    const ticker = yahooTickers[i];
    
    // Add delay before each request (except first)
    if (i > 0) {
      await delay(1000);
    }
    
    const quote = await fetchYahooQuote(ticker);
    
    if (quote) {
      results[quote.ticker] = quote.price;
    }
  }

  return results;
}
