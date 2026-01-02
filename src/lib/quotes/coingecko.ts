export async function fetchCoinGecko(
  coingeckoIds: string[]
): Promise<Record<string, number>> {
  if (coingeckoIds.length === 0) {
    return {};
  }

  const ids = coingeckoIds.join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    }
  );

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status}`);
  }

  const data = await res.json();

  const result: Record<string, number> = {};
  for (const id of coingeckoIds) {
    if (data[id]?.usd) {
      result[id] = data[id].usd;
    }
  }

  return result;
}
