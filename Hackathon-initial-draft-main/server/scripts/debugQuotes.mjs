import "../src/envLoad.js";
import { fetchStockData } from "../src/dataService.js";
import { fetchGoogleFinanceBundle } from "../src/googleFinance.js";
import yahooFinance from "yahoo-finance2";

async function run() {
  try {
    const q = await yahooFinance.quote("AAPL", undefined, { validateResult: false });
    console.log("raw_yahoo_quote_AAPL_keys", Object.keys(q || {}).slice(0, 40));
    console.log("raw_yahoo_quote_AAPL_regularMarketPrice", q?.regularMarketPrice);
    console.log("raw_yahoo_quote_AAPL_currency", q?.currency);
    console.log("raw_yahoo_quote_AAPL_error", q?.error || null);
  } catch (e) {
    console.log("raw_yahoo_quote_AAPL_ERR", e?.message || String(e));
  }
  try {
    const c = await yahooFinance.chart("AAPL", { period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), interval: "5m" }, { validateResult: false });
    console.log("raw_yahoo_chart_AAPL_meta_currency", c?.meta?.currency);
    console.log("raw_yahoo_chart_AAPL_quotes_len", (c?.quotes || []).length);
  } catch (e) {
    console.log("raw_yahoo_chart_AAPL_ERR", e?.message || String(e));
  }

  const symbols = ["RELIANCE.BSE", "RELIANCE.BO", "RELIANCE.NS", "AAPL", "USDINR"];
  for (const sym of symbols) {
    try {
      const api = await fetchStockData(sym, { mode: "api", forceRefresh: true });
      console.log("api", sym, "->", api.source, api.currency, api.price, api.symbol);
    } catch (e) {
      console.log("api", sym, "ERR", e?.message || String(e));
    }
    try {
      const live = await fetchStockData(sym, { mode: "live", forceRefresh: true });
      console.log("live", sym, "->", live.source, live.currency, live.price, live.symbol);
    } catch (e) {
      console.log("live", sym, "ERR", e?.message || String(e));
    }
    console.log("---");
  }

  try {
    const g = await fetchGoogleFinanceBundle("RELIANCE.BSE");
    console.log("googleBundle", g.source, g.currency, g.price, g.symbol);
  } catch (e) {
    console.log("googleBundle ERR", e?.message || String(e));
  }
}

run().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});

