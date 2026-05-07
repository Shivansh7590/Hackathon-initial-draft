import "../src/envLoad.js";
import axios from "axios";

const key = process.env.ALPHA_VANTAGE_API_KEY;
if (!key) {
  console.log("No ALPHA_VANTAGE_API_KEY loaded");
  process.exit(1);
}

async function get(params) {
  const { data } = await axios.get("https://www.alphavantage.co/query", {
    params: { ...params, apikey: key },
    timeout: 20000
  });
  return data;
}

function preview(obj) {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj);
  return s.length > 600 ? s.slice(0, 600) + "…(truncated)" : s;
}

async function run() {
  for (const sym of ["AAPL", "RELIANCE.BSE", "RELIANCE.NS", "USDINR"]) {
    try {
      const gq = await get({ function: "GLOBAL_QUOTE", symbol: sym });
      console.log("GLOBAL_QUOTE", sym, preview(gq));
    } catch (e) {
      console.log("GLOBAL_QUOTE", sym, "ERR", e?.message || String(e));
    }
    console.log("---");
  }

  for (const sym of ["AAPL", "RELIANCE.BSE"]) {
    try {
      const intraday = await get({ function: "TIME_SERIES_INTRADAY", symbol: sym, interval: "5min", outputsize: "compact" });
      console.log("INTRADAY", sym, Object.keys(intraday || {}).slice(0, 8), preview(intraday?.["Error Message"] || intraday?.Note || intraday?.Information || intraday?.["Meta Data"] || intraday));
    } catch (e) {
      console.log("INTRADAY", sym, "ERR", e?.message || String(e));
    }
    console.log("---");
  }

  try {
    const fx = await get({ function: "CURRENCY_EXCHANGE_RATE", from_currency: "USD", to_currency: "INR" });
    console.log("FX USDINR", preview(fx));
  } catch (e) {
    console.log("FX USDINR ERR", e?.message || String(e));
  }
}

run().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});

