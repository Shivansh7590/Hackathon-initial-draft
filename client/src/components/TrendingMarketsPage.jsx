import { useEffect, useState } from "react";
import { getTrendingCategories, getTrendingCategoryQuotes } from "../api/api";
import { formatTrendingPrice } from "../utils/currency";

export default function TrendingMarketsPage({ onSelectSymbol }) {
  const [categories, setCategories] = useState([]);
  const [activeId, setActiveId] = useState("foreign");
  const [quotes, setQuotes] = useState([]);
  const [meta, setMeta] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getTrendingCategories();
        if (!cancelled && list.length) {
          setCategories(list);
          if (!list.some((c) => c.id === activeId)) {
            setActiveId(list[0].id);
          }
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Load quotes only for the current tab. Cleanup + categoryId check prevents an older
   * request (e.g. Foreign) from overwriting the grid after switching to Indian.
   */
  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    const idWanted = activeId;

    const loadQuotes = async ({ showSpinner }) => {
      if (showSpinner) {
        setLoading(true);
        setError("");
        setQuotes([]);
        setMeta({ title: "", description: "" });
      }
      try {
        const data = await getTrendingCategoryQuotes(idWanted);
        if (cancelled) return;
        if (data?.categoryId && data.categoryId !== idWanted) return;
        setMeta({ title: data.title || "", description: data.description || "" });
        setQuotes(data.quotes || []);
        setError("");
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || "Could not load quotes.");
        if (showSpinner) {
          setQuotes([]);
        }
      } finally {
        if (showSpinner && !cancelled) setLoading(false);
      }
    };

    loadQuotes({ showSpinner: true });

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Markets</p>
        <h1 className="text-3xl font-black tracking-tight text-white">Trending by category</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#9CA3AF]">
          Browse foreign and Indian large caps, Nifty-style names, commodities-themed lists, FX, and crypto.
          Select a symbol to open it on the sentiment dashboard.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
              activeId === c.id
                ? "border-[#00FFB2]/50 bg-[#00FFB2]/10 text-white"
                : "border-white/10 bg-white/[0.03] text-[#9CA3AF] hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="block">{c.title}</span>
            <span className="mt-0.5 block text-xs font-normal text-[#6B7280]">{c.count} symbols</span>
          </button>
        ))}
      </div>

      {meta.description ? (
        <p className="text-sm text-[#9CA3AF]">{meta.description}</p>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 p-4 text-sm text-[#FCA5A5]">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#00FFB2]" />
          <p className="text-sm text-[#9CA3AF]">Loading {meta.title || "quotes"}…</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quotes.map((row) => (
            <button
              key={row.symbol}
              type="button"
              onClick={() => onSelectSymbol?.(row.symbol)}
              className="sentilyze-card flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition hover:border-[#00FFB2]/30 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold text-white">{row.symbol}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[#9CA3AF]">{row.name}</p>
                </div>
                {row.changePercent != null && Number.isFinite(row.changePercent) ? (
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                      row.changePercent >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {row.changePercent >= 0 ? "+" : ""}
                    {Number(row.changePercent).toFixed(2)}%
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-mono text-xl font-black text-white">
                {(() => {
                  const { text, isIndian } = formatTrendingPrice(row.price, {
                    currency: row.currency,
                    symbol: row.symbol,
                    categoryId: activeId
                  });
                  return (
                    <>
                      {text}
                      {row.currency ? (
                        <span className="ml-1 text-xs font-normal text-[#6B7280]">{row.currency}</span>
                      ) : null}
                    </>
                  );
                })()}
              </p>
              {row.source ? <p className="mt-2 text-[10px] uppercase tracking-wider text-[#6B7280]">{row.source}</p> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
