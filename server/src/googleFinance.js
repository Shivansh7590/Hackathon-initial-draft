import axios from "axios";
import { FOREX_SIX } from "./forexSymbols.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const NYSE_TICKERS = new Set([
  "JPM",
  "XOM",
  "SHEL",
  "VALE",
  "BHP",
  "RIO",
  "SCCO"
]);

/**
 * URL slugs to try (Google Finance) until a quote page loads.
 */
export function buildGoogleFinanceSlugs(sym) {
  const s = String(sym).toUpperCase().replace(/[^A-Z0-9.\-=]/g, "");
  if (s.includes("=")) {
    return [];
  }
  if (FOREX_SIX.has(s)) {
    const a = s.slice(0, 3);
    const b = s.slice(3, 6);
    return [`${a}-${b}`];
  }
  if (s.endsWith(".NS")) {
    const root = s.slice(0, -3);
    return [`${root}:NSE`];
  }
  if (s.endsWith(".BSE")) {
    const root = s.replace(".BSE", "");
    return [`${root}:BOM`, `${root}:NSE`];
  }
  if (/^[A-Z0-9]+-USD$/.test(s)) {
    return [s];
  }
  if (NYSE_TICKERS.has(s)) {
    return [`${s}:NYSE`, `${s}:NASDAQ`];
  }
  return [`${s}:NASDAQ`, `${s}:NYSE`];
}

function parseMinuteCandlesFromHtml(html) {
  const keys = ["ds:10", "ds:12", "ds:11"];
  for (const key of keys) {
    const needle = `key: '${key}'`;
    const idx = html.indexOf(needle);
    if (idx === -1) {
      continue;
    }
    // Take a large window — the first `});</script>` after idx can belong to an inner structure.
    const chunk = html.slice(idx, idx + 2_500_000);
    // First bar uses [[[... ; continuation bars use [[...
    const reTriple =
      /\[\[\[(\d+),(\d+),(\d+),(\d+),(?:(\d+)|null),null,null,\[-?\d+\]\],\[([-+]?\d*\.?\d+(?:E-\d+)?),/g;
    const reDouble =
      /\[\[(\d+),(\d+),(\d+),(\d+),(?:(\d+)|null),null,null,\[-?\d+\]\],\[([-+]?\d*\.?\d+(?:E-\d+)?),/g;
    const raw = [];
    let m;
    while ((m = reTriple.exec(chunk)) !== null) {
      pushCandle(raw, m);
    }
    while ((m = reDouble.exec(chunk)) !== null) {
      pushCandle(raw, m);
    }
    function pushCandle(arr, match) {
      const y = Number(match[1]);
      const mo = Number(match[2]);
      const d = Number(match[3]);
      const h = Number(match[4]);
      const min = match[5] ? Number(match[5]) : 0;
      const price = Number(match[6]);
      if (!Number.isFinite(price)) {
        return;
      }
      const time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      arr.push({ y, mo, d, h, min, price, time, t: y * 1e9 + mo * 1e7 + d * 1e5 + h * 100 + min });
    }
    if (raw.length >= 8) {
      raw.sort((a, b) => a.t - b.t);
      const seen = new Set();
      const deduped = [];
      for (const row of raw) {
        const k = `${row.y}-${row.mo}-${row.d}-${row.h}-${row.min}`;
        if (seen.has(k)) {
          continue;
        }
        seen.add(k);
        deduped.push(row);
      }
      return deduped;
    }
  }
  return [];
}

function parseQuoteTuple(html, sym) {
  const esc = sym.replace(/\./g, "\\.");
  const re = new RegExp(
    `\\["${esc}","([A-Z0-9_]+)"\\],"[^"]*",\\d+,"([A-Z]{3})",\\[([\\d.]+),[-+\\d.eE]+,[-+\\d.eE]+,\\d+,\\d+,\\d+\\],null,([\\d.]+)`
  );
  const m = html.match(re);
  if (!m) {
    return null;
  }
  return {
    exchange: m[1],
    currency: m[2],
    sessionPrice: Number(m[3]),
    previousClose: Number(m[4])
  };
}

function parsePreviousCloseFromHtml(html) {
  const near = html.match(/Previous close[\s\S]{0,400}?>(?:\$|&#36;)?([\d.]+)</i);
  if (near?.[1]) {
    return Number(near[1]);
  }
  const blocks = [...html.matchAll(/class="P6K39c">(?:\$|&#36;)?([\d.]+)<\/div>/gi)];
  for (const b of blocks) {
    const n = Number(b[1]);
    if (n > 0 && n < 1e7) {
      return n;
    }
  }
  return null;
}

/**
 * Same numbers shown on google.com/finance (headline + 1D-style minute series when present).
 */
export async function fetchGoogleFinanceBundle(userSymbol) {
  const sym = String(userSymbol || "AAPL").toUpperCase().replace(/[^A-Z0-9.\-=]/g, "") || "AAPL";
  const slugs = buildGoogleFinanceSlugs(sym);

  let html = "";
  for (const slug of slugs) {
    try {
      const { data, status } = await axios.get(
        `https://www.google.com/finance/quote/${encodeURIComponent(slug)}`,
        {
          headers: {
            "User-Agent": UA,
            "Accept-Language": "en-US,en;q=0.9",
            Accept: "text/html,application/xhtml+xml"
          },
          timeout: 22000,
          maxRedirects: 5,
          validateStatus: (s) => s === 200
        }
      );
      if (typeof data === "string" && data.includes("data-last-price")) {
        html = data;
        break;
      }
      if (status !== 200) {
        /* try next slug */
      }
    } catch {
      /* next slug */
    }
  }

  if (!html) {
    throw new Error("Google Finance: page not available");
  }

  const lastAttr = html.match(/data-last-price="([\d.]+)"/);
  if (!lastAttr) {
    throw new Error("Google Finance: missing price");
  }
  let price = Number(lastAttr[1]);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Google Finance: invalid price");
  }

  const tupleSym = sym.replace(/\.BSE$/i, "").replace(/\.NS$/i, "");
  const tuple = parseQuoteTuple(html, tupleSym);
  let previousClose = tuple?.previousClose ?? null;
  if (!Number.isFinite(previousClose) || previousClose <= 0) {
    previousClose = parsePreviousCloseFromHtml(html);
  }

  let changePercent = 0;
  if (Number.isFinite(previousClose) && previousClose > 0) {
    changePercent = Number((((price - previousClose) / previousClose) * 100).toFixed(4));
  } else if (tuple && Number.isFinite(tuple.sessionPrice) && tuple.sessionPrice > 0) {
    changePercent = Number(
      ((((price - tuple.sessionPrice) / tuple.sessionPrice) * 100) || 0).toFixed(4)
    );
  }

  const currency = tuple?.currency || "USD";
  const rows = parseMinuteCandlesFromHtml(html);
  let points = rows.map((r) => ({
    time: r.time,
    price: r.price,
    sentiment: null
  }));

  if (!points.length) {
    points = [
      {
        time: new Date().toISOString().slice(11, 16),
        price,
        sentiment: null
      }
    ];
  } else {
    const maxPts = 100;
    if (points.length > maxPts) {
      points = points.slice(-maxPts);
    }
    const last = points[points.length - 1];
    points[points.length - 1] = { ...last, price };
  }

  return {
    symbol: sym,
    price,
    changePercent,
    currency,
    points,
    asOf: new Date().toISOString(),
    source: "Google Finance"
  };
}
