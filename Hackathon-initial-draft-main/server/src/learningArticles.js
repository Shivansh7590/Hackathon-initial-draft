import axios from "axios";

const newsApiKey = process.env.NEWSAPI_API_KEY;

/** NewsAPI search queries per learning topic */
const TOPIC_QUERIES = {
  "stock-market": '("stock market" OR "stock exchange") AND (beginner OR basics OR explained OR introduction)',
  "how-to-invest": '("how to invest" OR "start investing" OR brokerage OR "first investment") AND (beginner OR guide OR tips)',
  "risk-management": '("risk management" OR "stop loss" OR diversification OR "position sizing") AND (investing OR trading)',
  "index-funds": '("index fund" OR "passive investing" OR ETF OR "S&P 500 index") AND (explained OR beginner OR guide)',
  "chart-patterns": '("chart pattern" OR "technical analysis" OR candlestick OR support resistance) AND (explained OR beginner)',
  "crypto-basics": '("cryptocurrency" OR bitcoin OR blockchain) AND (beginner OR explained OR introduction)',
  "market-basics": '("stock market" OR investing OR "financial markets") AND (education OR beginner OR basics)',
  "risk-management-track":
    '("portfolio risk" OR drawdown OR "risk reward" OR "capital preservation") AND (investing OR trading)',
  "macro-plan": '("macroeconomics" OR "fed policy" OR "economic indicators" OR "trade plan") AND (market OR investing)'
};

function mapArticle(a) {
  return {
    title: a.title,
    summary: (a.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    url: a.url,
    source: a.source?.name || "News",
    publishedAt: a.publishedAt
  };
}

export async function fetchArticlesForTopic(topicKey, limit = 8) {
  const q = TOPIC_QUERIES[topicKey];
  if (!q || !newsApiKey) {
    return { articles: [], source: newsApiKey ? "none" : "no_api_key" };
  }
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  try {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q,
        language: "en",
        sortBy: "relevancy",
        pageSize: Math.min(30, limit + 10),
        from,
        apiKey: newsApiKey
      },
      timeout: 14000
    });
    if (data.status === "error") {
      return { articles: [], source: "newsapi_error" };
    }
    const raw = (data.articles || []).filter((x) => x?.title && x?.url);
    const seen = new Set();
    const out = [];
    for (const a of raw) {
      const key = a.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(mapArticle(a));
      if (out.length >= limit) break;
    }
    return { articles: out, source: "newsapi" };
  } catch {
    try {
      const { data } = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q,
          language: "en",
          sortBy: "publishedAt",
          pageSize: Math.min(20, limit + 5),
          apiKey: newsApiKey
        },
        timeout: 14000
      });
      const raw = (data.articles || []).filter((x) => x?.title && x?.url);
      return {
        articles: raw.slice(0, limit).map(mapArticle),
        source: "newsapi_fallback"
      };
    } catch {
      return { articles: [], source: "fetch_failed" };
    }
  }
}
