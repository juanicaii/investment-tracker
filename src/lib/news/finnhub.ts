const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export interface NewsArticle {
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  url: string;
}

export async function searchNews(symbol: string): Promise<NewsArticle[]> {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not configured");
    return [];
  }

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const from = weekAgo.toISOString().split("T")[0];
  const to = today.toISOString().split("T")[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Finnhub API error: ${res.status}`);
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, 5).map((article: NewsArticle) => ({
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      datetime: article.datetime,
      url: article.url,
    }));
  } catch (error) {
    console.error("Error fetching news from Finnhub:", error);
    return [];
  }
}

export async function getMarketNews(
  category: string = "general"
): Promise<NewsArticle[]> {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not configured");
    return [];
  }

  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${FINNHUB_API_KEY}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Finnhub API error: ${res.status}`);
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.slice(0, 5).map((article: NewsArticle) => ({
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      datetime: article.datetime,
      url: article.url,
    }));
  } catch (error) {
    console.error("Error fetching market news from Finnhub:", error);
    return [];
  }
}
