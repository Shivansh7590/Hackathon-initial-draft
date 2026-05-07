import { fetchNewsData, fetchStockData } from "./dataService.js";
import {
  buildRecommendation,
  generateSentimentScore,
  sentimentMeterLabel
} from "./sentimentEngine.js";
import { marketCatalog } from "./marketData.js";
import { buildModelRecommendation } from "./recommendationAdvisor.js";

export const TRENDING_SYMBOLS = ["TSLA", "AAPL", "NVDA", "MSFT", "GOOGL", "META"];
const PEER_LIMIT = 6;

function normalizeSymbol(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\.BO$/g, ".BSE");
}

function peersFromCatalog(baseSymbol) {
  const target = normalizeSymbol(baseSymbol);
  if (!target) return TRENDING_SYMBOLS;

  const orderedGroups = [
    marketCatalog.india || [],
    marketCatalog.foreign || [],
    marketCatalog.minerals || [],
    marketCatalog.forex || [],
    marketCatalog.dashboard || []
  ];

  const group = orderedGroups.find((rows) =>
    rows.some((row) => normalizeSymbol(row.symbol) === target)
  );
  if (!group?.length) return TRENDING_SYMBOLS;

  const peers = [target];
  for (const row of group) {
    const sym = normalizeSymbol(row.symbol);
    if (sym && !peers.includes(sym)) peers.push(sym);
    if (peers.length >= PEER_LIMIT) break;
  }
  return peers.slice(0, PEER_LIMIT);
}

function alignSentimentToSeries(points, sentimentScore) {
  if (!points?.length) return [];
  const clamped = Math.max(0, Math.min(100, Math.round(Number(sentimentScore) || 0)));
  // Keep sentiment line truthful: constant aggregate score over the sampled period.
  return points.map((p) => ({
    time: p.time,
    price: p.price,
    sentiment: clamped
  }));
}

function buildAlerts(stock, sentiment) {
  const alerts = [];
  if (Math.abs(stock.changePercent) >= 3) {
    alerts.push({
      type: "volatility",
      message: `Elevated price volatility: ${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent}% vs prior bar.`,
      severity: "high"
    });
  }
  if (sentiment.sentimentScore >= 75) {
    alerts.push({
      type: "sentiment",
      message: "Strong positive sentiment cluster detected in recent headlines.",
      severity: "medium"
    });
  } else if (sentiment.sentimentScore <= 25) {
    alerts.push({
      type: "sentiment",
      message: "Negative headline skew — defensive positioning may be prudent.",
      severity: "medium"
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      message: "No critical alerts. Monitoring liquidity and headline flow.",
      severity: "low"
    });
  }
  return alerts;
}

/**
 * Full dashboard payload for AI Sentiment Dashboard UI.
 */
export async function buildDashboardBundle(symbol) {
  const sym = String(symbol || "AAPL").toUpperCase();
  const [stock, news, usdInr] = await Promise.all([
    fetchStockData(sym),
    fetchNewsData(sym),
    fetchStockData("USDINR", { mode: "live" }).catch(() => null)
  ]);

  const sentiment = generateSentimentScore(news);
  const ruleRecommendation = buildRecommendation(sentiment.sentimentScore, sentiment, news);
  const recommendation = await buildModelRecommendation({
    symbol: sym,
    stock,
    sentiment,
    news,
    ruleRecommendation
  });
  const effectiveSentimentScore = Number(recommendation?.sentimentScore ?? sentiment.sentimentScore);

  const newsEnriched = news.map((article, i) => {
    const row = sentiment.articleBreakdown[i];
    return {
      ...article,
      sentimentTag: row?.sentimentTag || "Neutral"
    };
  });

  const series = alignSentimentToSeries(stock.points, effectiveSentimentScore);

  const keyFactors = [
    `News sample size: ${news.length} articles`,
    `Headline polarity: ${sentiment.positivePercent}% positive / ${sentiment.negativePercent}% negative`,
    `Aggregate tone: ${sentiment.sentimentLabel} (${sentiment.sentimentScore}/100)`
  ];

  const alerts = buildAlerts(stock, sentiment);

  const sentimentMeter = {
    score: effectiveSentimentScore,
    label: sentimentMeterLabel(effectiveSentimentScore)
  };

  return {
    symbol: sym,
    stock: {
      ...stock,
      points: series,
      asOf: stock.asOf,
      source: stock.source
    },
    news: newsEnriched,
    sentiment: {
      ...sentiment,
      sentimentScore: effectiveSentimentScore,
      keyFactors
    },
    recommendation,
    sentimentMeter,
    alerts,
    meta: {
      asOf: stock.asOf,
      fx: {
        usdInr: Number.isFinite(Number(usdInr?.price)) ? Number(usdInr.price) : null,
        source: usdInr?.source || null
      },
      dataSource: {
        stock: stock.source || (process.env.ALPHA_VANTAGE_API_KEY ? "Alpha Vantage" : "Yahoo Finance / mock"),
        news: process.env.NEWSAPI_API_KEY ? "NewsAPI (relevancy + symbol/ticker queries)" : "Structured mock (set NEWSAPI_API_KEY)",
        recommendation: recommendation?.source || "rules"
      }
    }
  };
}

/**
 * Trending list with live sentiment per symbol (parallel fetch).
 */
export async function buildTrendingList(baseSymbol) {
  const symbols = peersFromCatalog(baseSymbol);
  const items = await Promise.all(
    symbols.map(async (sym) => {
      const symbol = String(sym).toUpperCase();
      const [stock, news] = await Promise.all([
        fetchStockData(symbol, { budget: "bulk" }),
        fetchNewsData(symbol)
      ]);
      const s = generateSentimentScore(news);
      return {
        symbol: stock.symbol,
        changePercent: stock.changePercent,
        price: stock.price,
        sentimentScore: s.sentimentScore,
        sentimentLabel: s.sentimentLabel
      };
    })
  );
  return { items };
}
