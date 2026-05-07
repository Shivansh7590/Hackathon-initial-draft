/** Indian listings on Yahoo: .NS (NSE), .BSE / .BO (BSE). */
export function isIndianMarketSymbol(symbol) {
  if (!symbol) return false;
  const s = String(symbol).toUpperCase();
  return s.endsWith(".BSE") || s.endsWith(".NS") || s.endsWith(".BO");
}

/**
 * Indian market context: INR, Indian trending tabs, or Indian ticker suffix.
 */
export function isIndianMarketContext({ currency, symbol, categoryId } = {}) {
  if (currency === "INR") return true;
  if (categoryId === "indian" || categoryId === "nifty50") return true;
  return isIndianMarketSymbol(symbol);
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatNumberBody(n, locale) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const x = Number(n);
  if (Math.abs(x) >= 1000) {
    return x.toLocaleString(locale, { maximumFractionDigits: 2 });
  }
  if (Math.abs(x) >= 1) {
    return x.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return x.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

/**
 * Trending grid: same rules as before for non-Indian; Indian uses ₹ + en-IN grouping.
 */
export function formatTrendingPrice(price, ctx) {
  const indian = isIndianMarketContext(ctx);
  const locale = indian ? "en-IN" : undefined;
  const body = formatNumberBody(price, locale);
  if (body === "—") return { text: "—", isIndian: indian };
  return { text: body, isIndian: indian };
}

/**
 * Dashboard header: $ for non-Indian (unchanged), ₹ for Indian.
 */
export function formatDashboardLastPrice(price, currency, symbol) {
  const x = toNumberOrNull(price);
  if (x == null) return "—";
  const indian = isIndianMarketContext({ currency, symbol });
  const locale = indian ? "en-IN" : undefined;
  const formatted = x.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatted;
}
