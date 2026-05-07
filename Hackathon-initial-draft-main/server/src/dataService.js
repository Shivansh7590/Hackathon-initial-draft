import axios from "axios";
import yahooFinance from "yahoo-finance2";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { fetchGoogleFinanceBundle } from "./googleFinance.js";
import { fetchNewsArticlesForSymbol } from "./newsApi.js";
import { FOREX_SIX } from "./forexSymbols.js";

yahooFinance.suppressNotices(["yahooSurvey"]);

const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
const marketstackKey = process.env.MARKETSTACK_API_KEY;
const finnhubKey = process.env.FINNHUB_API_KEY;
const indianStockApiBase = process.env.INDIAN_STOCK_API_BASE_URL || "http://65.0.104.9";
const newsApiKey = process.env.NEWSAPI_API_KEY;

const API_CACHE_MS = Number(process.env.STOCK_API_CACHE_MS) || 60_000;
const LIVE_CACHE_MS = Number(process.env.LIVE_QUOTE_CACHE_MS) || 20_000;
const AV_MIN_GAP_MS = Number(process.env.ALPHA_VANTAGE_MIN_GAP_MS) || 1200;
const useGoogleFinance = process.env.USE_GOOGLE_FINANCE !== "false";
const useAlphaIntraday = process.env.ALPHA_VANTAGE_USE_INTRADAY === "true";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, "../data/priceHistory.json");
const MAX_HISTORY_POINTS = 240;
const historyStore = new Map();
let historyLoaded = false;
let historyWriteTimer = null;

/** Deterministic pseudo-random 0-1 from string */
function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

function buildMockIntraday(symbol) {
  const rnd = seedFromString(symbol);
  const isInr = inferEquityCurrency(symbol) === "INR";
  const base = isInr ? 800 + rnd() * 3000 : 50 + rnd() * 400;
  const points = [];
  let price = base;
  const bias = (rnd() - 0.48) * 0.08;
  for (let i = 0; i < 30; i += 1) {
    const drift = (rnd() - 0.5) * 1.2 + bias;
    price = Math.max(5, Number((price + drift).toFixed(4)));
    const label = `${String(9 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}`;
    points.push({ time: label, price, sentiment: null });
  }
  const latest = points[points.length - 1].price;
  const prev = points[points.length - 2]?.price ?? latest;
  const changePercent = Number((((latest - prev) / prev) * 100).toFixed(2));
  return {
    symbol,
    price: latest,
    changePercent,
    currency: isInr ? "INR" : "USD",
    points,
    asOf: new Date().toISOString(),
    source: "mock"
  };
}

/** BSE symbols in catalog → Yahoo suffix .BO; NSE .NS unchanged; FX → Yahoo =X */
export function toYahooSymbol(symbol) {
  const s = String(symbol || "").trim().toUpperCase();
  if (s.endsWith(".BSE")) {
    return `${s.slice(0, -4)}.BO`;
  }
  if (s.endsWith(".NS")) {
    return s;
  }
  if (FOREX_SIX.has(s)) {
    return `${s}=X`;
  }
  return s;
}

function inferEquityCurrency(sym) {
  const s = String(sym || "").toUpperCase();
  if (s.endsWith(".NS") || s.endsWith(".BO") || s.endsWith(".BSE")) {
    return "INR";
  }
  // For crypto pairs and most US/global equities, USD is a reasonable default.
  return "USD";
}

function yahooSymbolCandidates(symbol) {
  const s = String(symbol || "").trim().toUpperCase();
  if (!s) return ["AAPL"];
  if (s.endsWith(".BSE")) {
    const root = s.slice(0, -4);
    // Try both BSE and NSE variants to reduce fallback-to-mock for Indian names.
    return [`${root}.BO`, `${root}.NS`, root];
  }
  if (s.endsWith(".NS")) {
    const root = s.slice(0, -3);
    return [s, `${root}.BO`, root];
  }
  return [toYahooSymbol(s)];
}

function parseForexPair(six) {
  if (!FOREX_SIX.has(six)) {
    return null;
  }
  return { from: six.slice(0, 3), to: six.slice(3, 6) };
}

function indianApiSymbol(sym) {
  const s = String(sym || "").toUpperCase();
  if (s.endsWith(".BSE")) return `${s.slice(0, -4)}.BO`;
  if (s.endsWith(".BO") || s.endsWith(".NS")) return s;
  return s;
}

function indianApiCandidates(sym) {
  const s = String(sym || "").toUpperCase();
  if (s.endsWith(".BSE")) {
    const root = s.slice(0, -4);
    return [`${root}.BO`, `${root}.NS`, root];
  }
  if (s.endsWith(".BO")) {
    const root = s.slice(0, -3);
    return [s, `${root}.NS`, root];
  }
  if (s.endsWith(".NS")) {
    const root = s.slice(0, -3);
    return [s, `${root}.BO`, root];
  }
  return [indianApiSymbol(s)];
}

const cacheApi = new Map();
const cacheLive = new Map();
let lastAvCallAt = 0;
let lastYahooCallAt = 0;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(e) {
  const msg = String(e?.message || "").toLowerCase();
  return msg.includes("too many requests") || msg.includes("429");
}

async function throttleYahoo() {
  const minGap = Number(process.env.YAHOO_MIN_GAP_MS) || 1400;
  const now = Date.now();
  const wait = lastYahooCallAt + minGap - now;
  if (wait > 0) {
    await sleep(wait);
  }
  lastYahooCallAt = Date.now();
}

async function throttleAlphaVantage() {
  const now = Date.now();
  const wait = lastAvCallAt + AV_MIN_GAP_MS - now;
  if (wait > 0) {
    await sleep(wait);
  }
  lastAvCallAt = Date.now();
}

async function fetchAlphaForex(sym) {
  const pair = parseForexPair(sym);
  if (!pair || !alphaVantageKey) {
    return null;
  }
  await throttleAlphaVantage();
  const { data } = await axios.get("https://www.alphavantage.co/query", {
    params: {
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: pair.from,
      to_currency: pair.to,
      apikey: alphaVantageKey
    },
    timeout: 15000
  });
  const rate = data?.["Realtime Currency Exchange Rate"];
  const price = Number(rate?.["5. Exchange Rate"]);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }
  return {
    symbol: sym,
    price,
    changePercent: 0,
    currency: pair.to,
    points: [
      { time: new Date().toISOString().slice(11, 16), price, sentiment: null },
      { time: "live", price, sentiment: null }
    ],
    asOf: rate?.["6. Last Refreshed"] || new Date().toISOString(),
    source: "Alpha Vantage (FX)"
  };
}

async function fetchAlphaEquityIntraday(sym, interval = "5min") {
  if (!alphaVantageKey) {
    return null;
  }
  await throttleAlphaVantage();
  const { data } = await axios.get("https://www.alphavantage.co/query", {
    params: {
      function: "TIME_SERIES_INTRADAY",
      symbol: sym,
      interval,
      outputsize: "compact",
      apikey: alphaVantageKey
    },
    timeout: 15000
  });
  const key = `Time Series (${interval})`;
  const raw = data[key] || {};
  const entries = Object.entries(raw).slice(0, 80).reverse();
  if (!entries.length) {
    return null;
  }
  const points = entries.map(([ts, candle]) => ({
    time: ts.slice(11, 16),
    price: Number(candle["4. close"]),
    sentiment: null
  }));
  const latest = points[points.length - 1].price;
  const prev = points[points.length - 2]?.price ?? latest;
  const changePercent = Number((((latest - prev) / prev) * 100).toFixed(2));
  return { points, latest, prev, changePercent, asOf: entries[entries.length - 1][0] };
}

async function fetchAlphaGlobalQuote(sym) {
  if (!alphaVantageKey) {
    return null;
  }
  await throttleAlphaVantage();
  const { data } = await axios.get("https://www.alphavantage.co/query", {
    params: {
      function: "GLOBAL_QUOTE",
      symbol: sym,
      apikey: alphaVantageKey
    },
    timeout: 15000
  });
  const gq = data?.["Global Quote"];
  const price = Number(gq?.["05. price"]);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }
  const pctRaw = gq?.["10. change percent"] || "0";
  const changePercent = Number(String(pctRaw).replace("%", ""));
  return {
    price,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    asOf: gq?.["07. latest trading day"] || new Date().toISOString()
  };
}

async function fetchAlphaGlobalQuoteBundle(sym) {
  const gq = await fetchAlphaGlobalQuote(sym);
  if (!gq) return null;
  const price = gq.price;
  const now = new Date();
  const time = now.toISOString().slice(11, 16);
  const points = [
    { time, price, sentiment: null }
  ];
  return {
    symbol: sym,
    price,
    changePercent: gq.changePercent,
    currency: inferEquityCurrency(sym),
    points,
    asOf: gq.asOf || now.toISOString(),
    source: "Alpha Vantage (GLOBAL_QUOTE)"
  };
}

function marketstackCandidates(sym) {
  const s = String(sym || "").toUpperCase();
  if (s.endsWith(".BSE") || s.endsWith(".BO")) {
    const root = s.replace(".BSE", "").replace(".BO", "");
    return [`${root}.XBOM`, root];
  }
  if (s.endsWith(".NS")) {
    const root = s.replace(".NS", "");
    return [`${root}.XNSE`, root];
  }
  return [s];
}

async function fetchMarketstackQuote(sym) {
  if (!marketstackKey) return null;
  let lastErr = null;
  for (const candidate of marketstackCandidates(sym)) {
    try {
      const { data } = await axios.get("https://api.marketstack.com/v1/eod/latest", {
        params: {
          access_key: marketstackKey,
          symbols: candidate,
          limit: 1
        },
        timeout: 20000
      });
      const row = Array.isArray(data?.data) ? data.data[0] : null;
      const close = Number(row?.close);
      if (!Number.isFinite(close) || close <= 0) {
        continue;
      }
      const open = Number(row?.open);
      const changePercent = Number.isFinite(open) && open > 0 ? Number((((close - open) / open) * 100).toFixed(2)) : 0;
      const asOf = row?.date || new Date().toISOString();
      return {
        symbol: sym,
        price: close,
        changePercent,
        currency: inferEquityCurrency(sym),
        points: [
          { time: new Date(asOf).toISOString().slice(11, 16), price: close, sentiment: null }
        ],
        asOf,
        source: "Marketstack"
      };
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

async function fetchIndianStockApiQuote(sym, options = {}) {
  const s = String(sym || "").toUpperCase();
  if (!s || parseForexPair(s)) return null;
  if (!(s.endsWith(".BSE") || s.endsWith(".BO") || s.endsWith(".NS"))) return null;
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 15000;
  for (const candidate of indianApiCandidates(s)) {
    try {
      const { data } = await axios.get(`${indianStockApiBase}/stock`, {
        params: {
          symbol: candidate,
          res: "num"
        },
        timeout: timeoutMs
      });
      if (String(data?.status || "").toLowerCase() !== "success") {
        continue;
      }
      const payload = data?.data || {};
      const price = Number(payload?.last_price);
      if (!Number.isFinite(price) || price <= 0) {
        continue;
      }
      const changePercent = Number(payload?.percent_change);
      const asOfRaw = payload?.timestamp || payload?.last_update || new Date().toISOString();
      const asOf = new Date(asOfRaw).toISOString();
      return {
        symbol: s,
        price,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
        currency: String(payload?.currency || "INR").toUpperCase(),
        points: [{ time: asOf.slice(11, 16), price, sentiment: null }],
        asOf,
        source: "Indian Stock API"
      };
    } catch {
      // try next exchange variant
    }
  }
  return null;
}

async function fetchFinnhubQuote(sym) {
  if (!finnhubKey) return null;
  const symbol = String(sym || "").toUpperCase();
  if (!symbol || symbol.endsWith(".BSE") || symbol.endsWith(".NS") || symbol.endsWith(".BO")) {
    return null;
  }
  const { data } = await axios.get("https://finnhub.io/api/v1/quote", {
    params: {
      symbol,
      token: finnhubKey
    },
    timeout: 15000
  });
  const price = Number(data?.c);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }
  const prev = Number(data?.pc);
  const changePercent = Number.isFinite(prev) && prev > 0 ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0;
  const asOf = Number(data?.t) > 0 ? new Date(Number(data.t) * 1000).toISOString() : new Date().toISOString();
  return {
    symbol,
    price,
    changePercent,
    currency: inferEquityCurrency(symbol),
    points: [{ time: new Date(asOf).toISOString().slice(11, 16), price, sentiment: null }],
    asOf,
    source: "Finnhub"
  };
}

async function fetchYahooBundleOnce(sym) {
  const yOpts = { validateResult: false };
  let quote = null;
  let chart = null;
  let lastErr = null;
  for (const ySym of yahooSymbolCandidates(sym)) {
    try {
      await throttleYahoo();
      const q = await yahooFinance.quote(ySym, undefined, yOpts);
      quote = q;
      try {
        await throttleYahoo();
        chart = await yahooFinance.chart(
          ySym,
          {
            period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            interval: "5m"
          },
          yOpts
        );
      } catch {
        chart = null;
      }
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!quote) {
    throw lastErr || new Error("Yahoo: no quote");
  }

  const price =
    quote.regularMarketPrice ??
    quote.postMarketPrice ??
    quote.preMarketPrice ??
    chart?.meta?.regularMarketPrice;
  if (!Number.isFinite(Number(price))) {
    throw new Error("Yahoo: no price");
  }

  const changePercent =
    quote.regularMarketChangePercent ??
    (quote.regularMarketPreviousClose
      ? ((price - quote.regularMarketPreviousClose) / quote.regularMarketPreviousClose) * 100
      : 0);

  const rows = (chart?.quotes || []).filter((q) => q.close != null && q.date);
  const points = rows.slice(-80).map((q) => ({
    time: q.date instanceof Date ? q.date.toISOString().slice(11, 16) : String(q.date).slice(11, 16),
    price: Number(q.close),
    sentiment: null
  }));

  const latest = Number(price);
  if (!points.length) {
    points.push({
      time: new Date().toISOString().slice(11, 16),
      price: latest,
      sentiment: null
    });
  } else {
    const last = points[points.length - 1];
    points[points.length - 1] = { ...last, price: latest };
  }

  const currency = quote.currency || chart?.meta?.currency || inferEquityCurrency(sym);
  const lastTs = quote.regularMarketTime || chart?.meta?.regularMarketTime || new Date();

  return {
    symbol: sym,
    price: latest,
    changePercent: Number((Number(changePercent) || 0).toFixed(2)),
    currency,
    points,
    asOf: lastTs instanceof Date ? lastTs.toISOString() : new Date().toISOString(),
    source: "Yahoo Finance"
  };
}

async function fetchYahooBundle(sym) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchYahooBundleOnce(sym);
    } catch (err) {
      lastErr = err;
      if (attempt === 0) {
        await sleep(2500);
      }
    }
  }
  throw lastErr;
}

function withTimeoutReject(promise, ms, label = "timeout") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    })
  ]);
}

async function fetchBestFreeBundle(sym, mode) {
  const timeoutMs = mode === "live" ? 12_000 : 18_000;
  const jobs = [];

  // For Indian symbols, Yahoo tends to be more stable with exchange suffixes.
  jobs.push(withTimeoutReject(fetchYahooBundle(sym), timeoutMs, "yahoo-timeout"));
  if (useGoogleFinance) {
    jobs.push(withTimeoutReject(fetchGoogleFinanceBundle(sym), timeoutMs, "google-timeout"));
  }

  const settled = await Promise.allSettled(jobs);
  const ok = settled.find((r) => r.status === "fulfilled" && Number.isFinite(Number(r.value?.price)));
  if (ok && ok.status === "fulfilled") {
    return ok.value;
  }
  const firstErr = settled.find((r) => r.status === "rejected");
  throw (firstErr && firstErr.status === "rejected" ? firstErr.reason : new Error("No free provider data"));
}

async function fetchBestAvailableQuote(sym, mode, isForex, options = {}) {
  const budget = String(options.budget || "");
  const timeoutMs = budget === "bulk" ? 8_000 : mode === "live" ? 12_000 : 18_000;
  const indianTimeoutMs = budget === "bulk" ? 8_000 : 15_000;
  const isIndian = String(sym || "").toUpperCase().match(/\.(BSE|BO|NS)$/);
  const providers = [
    ...(isIndian ? [() => fetchIndianStockApiQuote(sym, { timeoutMs: indianTimeoutMs })] : []),
    () => fetchYahooBundle(sym),
    ...(useGoogleFinance ? [() => fetchGoogleFinanceBundle(sym)] : []),
    ...(!isForex ? [() => fetchFinnhubQuote(sym), () => fetchMarketstackQuote(sym)] : []),
    () => (isForex ? fetchAlphaForex(sym) : fetchAlphaGlobalQuoteBundle(sym))
  ];

  let lastErr = null;
  for (const run of providers) {
    try {
      const out = await withTimeoutReject(run(), timeoutMs, "provider-timeout");
      if (out && Number.isFinite(Number(out.price))) {
        return out;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No provider returned valid quote");
}

function readCache(map, key, ttl) {
  const row = map.get(key);
  if (!row) {
    return null;
  }
  if (Date.now() - row.ts > ttl) {
    map.delete(key);
    return null;
  }
  return row.data;
}

function readAnyCache(map, key) {
  const row = map.get(key);
  return row ? row.data : null;
}

function writeCache(map, key, data) {
  map.set(key, { ts: Date.now(), data });
}

async function ensureHistoryLoaded() {
  if (historyLoaded) return;
  historyLoaded = true;
  try {
    const raw = await fs.readFile(HISTORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    for (const [sym, rows] of Object.entries(parsed || {})) {
      if (!Array.isArray(rows)) continue;
      historyStore.set(sym, rows.filter((r) => r && r.time && Number.isFinite(Number(r.price))).slice(-MAX_HISTORY_POINTS));
    }
  } catch {
    // no persisted history yet
  }
}

function scheduleHistoryWrite() {
  if (historyWriteTimer) return;
  historyWriteTimer = setTimeout(async () => {
    historyWriteTimer = null;
    try {
      await fs.mkdir(path.dirname(HISTORY_PATH), { recursive: true });
      const out = {};
      for (const [sym, rows] of historyStore.entries()) out[sym] = rows.slice(-MAX_HISTORY_POINTS);
      await fs.writeFile(HISTORY_PATH, JSON.stringify(out), "utf8");
    } catch {
      // non-fatal
    }
  }, 1200);
}

function mergeQuoteHistory(prev, next) {
  if (!next || !Number.isFinite(Number(next.price))) return next;
  const prevPoints = Array.isArray(prev?.points) ? prev.points : [];
  const nextPoints = Array.isArray(next?.points) ? next.points : [];
  const fallbackTime = new Date(next.asOf || Date.now()).toISOString().slice(11, 16);
  const currentPoint = nextPoints.length
    ? nextPoints[nextPoints.length - 1]
    : { time: fallbackTime, price: Number(next.price), sentiment: null };

  if (!prevPoints.length) {
    const cp = Number(next.changePercent);
    if (Number.isFinite(cp) && Math.abs(cp) > 0.001) {
      const prevPrice = Number(next.price) / (1 + cp / 100);
      if (Number.isFinite(prevPrice) && prevPrice > 0) {
        const at = new Date(next.asOf || Date.now());
        const before = new Date(at.getTime() - 5 * 60 * 1000).toISOString().slice(11, 16);
        return {
          ...next,
          points: [
            { time: before, price: Number(prevPrice.toFixed(4)), sentiment: null },
            currentPoint
          ]
        };
      }
    }
    return { ...next, points: [currentPoint] };
  }
  const out = prevPoints.slice(-99);
  const last = out[out.length - 1];
  if (last?.time === currentPoint.time) {
    out[out.length - 1] = { ...last, price: Number(next.price), sentiment: null };
  } else {
    out.push({ time: currentPoint.time, price: Number(next.price), sentiment: null });
  }
  return { ...next, points: out.slice(-100) };
}

/**
 * @param {string} symbol
 * @param {{ forceRefresh?: boolean, mode?: "api" | "live" }} [options]
 *   mode "api" — HTTP routes; Alpha Vantage first if key, then Yahoo.
 *   mode "live" — Socket ticks; Yahoo first (rate-limit friendly), then AV global quote.
 */
export async function fetchStockData(symbol, options = {}) {
  await ensureHistoryLoaded();
  const sym = String(symbol || "AAPL").toUpperCase().replace(/[^A-Z0-9.\-=]/g, "") || "AAPL";
  const mode = options.mode || "api";
  const force = Boolean(options.forceRefresh);
  const cache = mode === "live" ? cacheLive : cacheApi;
  const ttl = mode === "live" ? LIVE_CACHE_MS : API_CACHE_MS;

  const freshHit = !force ? readCache(cache, sym, ttl) : null;
  if (freshHit) {
    if (!(freshHit?.source === "mock")) {
      return freshHit;
    }
  }
  const staleHit = readAnyCache(cache, sym);

  const isForex = parseForexPair(sym) !== null;
  const requireIndianSource = Boolean(options.requireIndianSource);
  const allowMock = options.allowMock !== false;
  const isIndianSymbol = /\.(BSE|BO|NS)$/i.test(sym);

  try {
    const best = await fetchBestAvailableQuote(sym, mode, isForex, options);
    if (requireIndianSource && isIndianSymbol && String(best?.source || "") !== "Indian Stock API") {
      throw new Error("INDIAN_SOURCE_REQUIRED");
    }
    const merged = mergeQuoteHistory(staleHit, best);
    const historical = historyStore.get(sym) || [];
    const mergedPoints = mergeQuoteHistory({ points: historical }, merged)?.points || merged.points || [];
    merged.points = mergedPoints.slice(-MAX_HISTORY_POINTS);
    historyStore.set(sym, merged.points);
    scheduleHistoryWrite();
    writeCache(cache, sym, merged);
    return merged;
  } catch (e) {
    // If upstream rate-limits, serve last-known cached value instead of switching to mock.
    if (staleHit && isRateLimitError(e)) {
      return staleHit;
    }
    // Prefer stale cache to mock for better correctness.
    if (staleHit) {
      if (requireIndianSource && isIndianSymbol && String(staleHit?.source || "") !== "Indian Stock API") {
        return null;
      }
      return staleHit;
    }
    if (!allowMock) {
      return null;
    }
    const mock = buildMockIntraday(sym);
    writeCache(cache, sym, mock);
    return mock;
  }
}

const MOCK_HEADLINES = [
  { tone: "pos", t: "{sym} shows strong quarterly momentum and raised guidance." },
  { tone: "pos", t: "Analysts upgrade {sym} citing robust demand and margin expansion." },
  { tone: "neg", t: "{sym} faces regulatory scrutiny amid sector-wide probe." },
  { tone: "neg", t: "Investors weigh recession risk after soft macro prints." },
  { tone: "neu", t: "{sym} trades mixed as markets digest Fed commentary." },
  { tone: "pos", t: "Partnership news fuels optimism around {sym} growth outlook." },
  { tone: "neg", t: "Supply chain delays pressure {sym} near-term shipments." },
  { tone: "pos", t: "Earnings beat expectations; {sym} rallies on strong cash flow." }
];

function buildMockNews(symbol) {
  const rnd = seedFromString(symbol + "-news");
  const sym = symbol.toUpperCase();
  const out = [];
  for (let i = 0; i < 8; i += 1) {
    const template = MOCK_HEADLINES[Math.floor(rnd() * MOCK_HEADLINES.length)];
    const title = template.t.replace(/\{sym\}/g, sym);
    out.push({
      title,
      summary: title,
      source: rnd() > 0.5 ? "Reuters" : "Bloomberg",
      url: `https://example.com/news/${sym}-${i}`,
      publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
      sentimentTag: template.tone === "pos" ? "positive" : template.tone === "neg" ? "negative" : "neutral"
    });
  }
  return out;
}

export async function fetchNewsData(symbol) {
  const sym = String(symbol || "AAPL").toUpperCase();

  if (newsApiKey) {
    try {
      const articles = await fetchNewsArticlesForSymbol(sym, 12);
      if (articles.length) {
        return articles;
      }
    } catch {
      // try next source
    }
  }

  // Finnhub fallback for fresher headlines when NewsAPI key is absent.
  if (finnhubKey) {
    try {
      const baseSym = sym.replace(/\.BSE$|\.BO$|\.NS$/g, "");
      const to = new Date();
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const { data } = await axios.get("https://finnhub.io/api/v1/company-news", {
        params: {
          symbol: baseSym,
          from: fmt(from),
          to: fmt(to),
          token: finnhubKey
        },
        timeout: 15000
      });
      const rows = Array.isArray(data) ? data : [];
      if (rows.length) {
        return rows.slice(0, 12).map((r) => ({
          title: r.headline || `${baseSym} market update`,
          summary: r.summary || r.headline || "",
          source: r.source || "Finnhub",
          url: r.url || "",
          publishedAt: r.datetime ? new Date(Number(r.datetime) * 1000).toISOString() : new Date().toISOString(),
          sentimentTag: "neutral"
        }));
      }
    } catch {
      // try general news endpoint next
    }

    try {
      const { data } = await axios.get("https://finnhub.io/api/v1/news", {
        params: {
          category: "general",
          token: finnhubKey
        },
        timeout: 15000
      });
      const rows = Array.isArray(data) ? data : [];
      if (rows.length) {
        return rows.slice(0, 12).map((r) => ({
          title: r.headline || `${sym} market news`,
          summary: r.summary || r.headline || "",
          source: r.source || "Finnhub",
          url: r.url || "",
          publishedAt: r.datetime ? new Date(Number(r.datetime) * 1000).toISOString() : new Date().toISOString(),
          sentimentTag: "neutral"
        }));
      }
    } catch {
      // fallback below
    }
  }

  return buildMockNews(sym);
}
