import { fetchStockData } from "./dataService.js";
import { getTrendingCategoryById } from "./trendingCategories.js";

const CHUNK = 8;
const GAP_MS = 250;
const HOT_CACHE_MS = 20_000;

const categoryCache = new Map();
const inFlightByCategory = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function alternateIndianSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  if (s.endsWith(".BSE")) return `${s.slice(0, -4)}.NS`;
  if (s.endsWith(".BO")) return `${s.slice(0, -3)}.NS`;
  if (s.endsWith(".NS")) return `${s.slice(0, -3)}.BO`;
  return null;
}

async function fetchSingleQuote(symbol, name, categoryId) {
  // Avoid hammering upstream providers: use API mode (cached) for large category grids.
  const isIndianCategory = String(categoryId || "").toLowerCase() === "indian";
  const indianOpts = isIndianCategory ? { requireIndianSource: true, allowMock: false } : {};
  let q = await fetchStockData(symbol, { mode: "api", budget: "bulk", ...indianOpts }).catch(() => null);
  if (!q) {
    const alt = alternateIndianSymbol(symbol);
    if (alt) {
      q = await fetchStockData(alt, { mode: "api", budget: "bulk", ...indianOpts }).catch(() => null);
      if (q) q = { ...q, symbol };
    }
  }
  if (!q) {
    return {
      symbol,
      name,
      price: null,
      changePercent: null,
      currency: null,
      source: null,
      asOf: null,
      error: true
    };
  }
  return {
    symbol: q.symbol || symbol,
    name,
    price: q.price,
    changePercent: q.changePercent,
    currency: q.currency,
    source: q.source,
    asOf: q.asOf
  };
}

async function buildCategoryQuotesPayload(cat) {
  const quotes = [];
  const { symbols } = cat;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const slice = symbols.slice(i, i + CHUNK);
    const batch = await Promise.all(
      slice.map(async ({ symbol, name }) => {
        try {
          return await fetchSingleQuote(symbol, name, cat.id);
        } catch {
          return {
            symbol,
            name,
            price: null,
            changePercent: null,
            currency: null,
            source: null,
            asOf: null,
            error: true
          };
        }
      })
    );
    quotes.push(...batch);
    if (i + CHUNK < symbols.length) {
      await sleep(GAP_MS);
    }
  }
  return {
    categoryId: cat.id,
    title: cat.title,
    description: cat.description,
    quotes
  };
}

function maybeRefreshCategory(categoryId) {
  if (inFlightByCategory.has(categoryId)) {
    return inFlightByCategory.get(categoryId);
  }
  const cat = getTrendingCategoryById(categoryId);
  if (!cat) {
    return Promise.resolve(null);
  }
  const task = buildCategoryQuotesPayload(cat)
    .then((payload) => {
      categoryCache.set(categoryId, { ts: Date.now(), payload });
      return payload;
    })
    .finally(() => {
      inFlightByCategory.delete(categoryId);
    });
  inFlightByCategory.set(categoryId, task);
  return task;
}

/**
 * Fetches live quotes for all symbols in a trending category (batched to reduce burst load).
 */
export async function fetchTrendingCategoryQuotes(categoryId) {
  const cat = getTrendingCategoryById(categoryId);
  if (!cat) {
    return null;
  }
  const cached = categoryCache.get(categoryId);
  if (cached) {
    const age = Date.now() - cached.ts;
    if (age <= HOT_CACHE_MS) {
      return cached.payload;
    }
    // Serve stale immediately and refresh in background for near-realtime UX.
    maybeRefreshCategory(categoryId);
    return cached.payload;
  }

  const fresh = await maybeRefreshCategory(categoryId);
  return fresh;
}
