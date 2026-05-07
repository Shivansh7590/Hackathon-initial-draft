import axios from "axios";
import { marketCatalog } from "./marketData.js";
import { FOREX_SIX } from "./forexSymbols.js";

const newsApiKey = process.env.NEWSAPI_API_KEY;

/**
 * Resolve ticker to company name / market from catalog (all categories).
 */
export function lookupCompanyContext(symbol) {
  const sym = String(symbol || "").trim().toUpperCase();
  for (const companies of Object.values(marketCatalog)) {
    const row = companies.find((c) => String(c.symbol).toUpperCase() === sym);
    if (row) {
      return { symbol: row.symbol, name: row.name, market: row.market };
    }
  }
  return { symbol: sym, name: "", market: "unknown" };
}

/**
 * Primary NewsAPI `q` string: ticker + company + finance keywords (under 500 chars).
 */
export function buildSymbolNewsQuery(symbol) {
  const { symbol: sym, name, market } = lookupCompanyContext(symbol);
  const ticker = String(sym).toUpperCase();
  const shortTicker = ticker.replace(/\.BSE$/i, "").replace(/\.NS$/i, "");

  if (FOREX_SIX.has(ticker)) {
    const base = ticker.slice(0, 3);
    const quote = ticker.slice(3, 6);
    return `(${base} ${quote} OR ${base}/${quote} OR "${base} ${quote}") AND (forex OR currency OR "exchange rate" OR FX OR central bank)`;
  }

  const namePhrase = name ? `"${name}"` : "";
  const firstWord = name ? `"${name.split(/\s+/)[0]}"` : "";

  const indiaBoost =
    market === "india"
      ? " OR India OR NSE OR BSE"
      : "";

  const tickerOrName = name
    ? `(${ticker} OR ${shortTicker} OR ${namePhrase} OR ${firstWord})`
    : `(${ticker} OR ${shortTicker})`;

  return `${tickerOrName} AND (stock OR shares OR earnings OR revenue OR analyst OR investor OR CEO OR forecast OR quarterly OR dividend OR guidance)${indiaBoost}`;
}

/** Broader fallback if primary returns few hits */
export function buildSymbolNewsQueryFallback(symbol) {
  const { symbol: sym, name } = lookupCompanyContext(symbol);
  const ticker = String(sym).toUpperCase();
  if (FOREX_SIX.has(ticker)) {
    return `${ticker.slice(0, 3)} ${ticker.slice(3, 6)} forex`;
  }
  const shortTicker = ticker.replace(/\.BSE$/i, "");
  return name ? `${shortTicker} OR "${name}"` : `${shortTicker} stock`;
}

function scoreArticleRelevance(article, symbol, companyName) {
  const t = `${article.title || ""} ${article.description || ""}`.toLowerCase();
  const sym = symbol.toLowerCase();
  const shortSym = sym.replace(".bse", "");
  let score = 0;
  if (t.includes(sym) || t.includes(shortSym)) {
    score += 5;
  }
  if (companyName && t.includes(companyName.toLowerCase().slice(0, 12))) {
    score += 3;
  }
  if (/stock|share|earnings|revenue|analyst|quarter|ceo|forecast|investor/i.test(t)) {
    score += 1;
  }
  return score;
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const key = (a.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 80);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Fetches relevant articles for a symbol via NewsAPI `/v2/everything`.
 * Uses relevancy sort + recent window when supported.
 */
export async function fetchNewsArticlesForSymbol(symbol, limit = 12) {
  if (!newsApiKey) {
    return [];
  }

  const { symbol: sym, name } = lookupCompanyContext(symbol);
  const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const queries = [buildSymbolNewsQuery(symbol), buildSymbolNewsQueryFallback(symbol)];

  const collected = [];

  async function fetchEverything(q, sortBy) {
    const base = {
      q,
      language: "en",
      sortBy,
      pageSize: Math.min(100, limit + 8),
      apiKey: newsApiKey
    };
    try {
      const { data } = await axios.get("https://newsapi.org/v2/everything", {
        params: { ...base, from },
        timeout: 14000
      });
      if (data.status === "error") {
        return [];
      }
      return data.articles || [];
    } catch {
      const { data } = await axios.get("https://newsapi.org/v2/everything", {
        params: base,
        timeout: 14000
      });
      if (data.status === "error") {
        return [];
      }
      return data.articles || [];
    }
  }

  for (const q of queries) {
    if (collected.length >= limit) {
      break;
    }
    try {
      let batch = await fetchEverything(q, "relevancy");
      if (!batch.length) {
        batch = await fetchEverything(q, "publishedAt");
      }
      collected.push(...batch);
    } catch {
      try {
        const batch = await fetchEverything(q, "publishedAt");
        collected.push(...batch);
      } catch {
        /* try next query */
      }
    }
  }

  const mapped = collected
    .filter((a) => a?.title && a?.url)
    .map((a) => ({
      title: a.title,
      summary: (a.description || a.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      source: a.source?.name || "News",
      url: a.url,
      publishedAt: a.publishedAt
    }));

  const unique = dedupeArticles(mapped);
  const symU = String(sym).toUpperCase();
  unique.sort(
    (a, b) =>
      scoreArticleRelevance({ title: b.title, description: b.summary }, symU, name) -
      scoreArticleRelevance({ title: a.title, description: a.summary }, symU, name)
  );

  return unique.slice(0, limit);
}
