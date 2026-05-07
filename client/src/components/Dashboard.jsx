import { formatDashboardLastPrice } from "../utils/currency";
import { recommendationClass } from "../utils/sentiment";
import AIInsightBox from "./AIInsightBox";
import BullBearCallout from "./BullBearCallout";
import ChartComponent from "./ChartComponent";
import NewsList from "./NewsList";
import SentimentCard from "./SentimentCard";
import SentimentMeter from "./SentimentMeter";
import TrendingStocks, { SentimentHeatmap } from "./TrendingStocks";

function sourceBadgeClass(sourceText) {
  const s = String(sourceText || "").toLowerCase();
  if (s.includes("mock")) return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  if (s.includes("alpha") || s.includes("yahoo") || s.includes("google")) {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  }
  return "border-white/15 bg-white/5 text-[#9CA3AF]";
}

function formatAsOf(isoLike) {
  if (!isoLike) return "n/a";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "n/a";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function Dashboard({
  data,
  trending,
  loading,
  error,
  symbol,
  onPickSymbol,
  onOpenBullBear
}) {
  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#00FFB2]" />
        <p className="text-sm text-[#9CA3AF]">Analyzing market sentiment…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 p-6 text-center text-[#FCA5A5]">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { sentiment, recommendation, stock, news, sentimentMeter, meta } = data;
  const points = stock?.points || [];

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Active symbol</p>
          <h1 className="text-3xl font-black tracking-tight text-white">{symbol}</h1>
          {meta?.dataSource && (
            <p className="mt-1 text-xs text-[#6B7280]">
              {meta.dataSource.stock} · {meta.dataSource.news}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-sm text-[#9CA3AF]">
          <div>
            Last{" "}
            <span className="font-mono text-[#00FFB2]">{formatDashboardLastPrice(stock?.price, stock?.currency, symbol)}</span>
            {stock?.currency ? <span className="ml-1 text-xs uppercase tracking-wide text-[#9CA3AF]">{stock.currency}</span> : null}
            <span className={` ml-2 ${stock?.changePercent >= 0 ? "text-[#00FFB2]" : "text-[#FF3B3B]"}`}>
              ({stock?.changePercent >= 0 ? "+" : ""}
              {stock?.changePercent}%)
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-2 text-[11px]">
            <span
              className={`rounded-full border px-2 py-0.5 font-medium ${sourceBadgeClass(
                data?.meta?.dataSource?.stock || stock?.source
              )}`}
            >
              Stock: {data?.meta?.dataSource?.stock || stock?.source || "unknown"}
            </span>
            <span className={`rounded-full border px-2 py-0.5 font-medium ${sourceBadgeClass(data?.meta?.fx?.source)}`}>
              FX: {data?.meta?.fx?.source || "n/a"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-medium text-[#9CA3AF]">
              Updated: {formatAsOf(data?.meta?.asOf || stock?.asOf)}
            </span>
          </div>
        </div>
      </div>

      <section id="dashboard">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SentimentCard label="Positive %" value={`${sentiment.positivePercent}%`} variant="green" />
          <SentimentCard label="Negative %" value={`${sentiment.negativePercent}%`} variant="red" />
          <SentimentCard label="Neutral %" value={`${sentiment.neutralPercent}%`} />
          <div className="sentilyze-card rounded-2xl border border-[#00FFB2]/40 bg-[#00FFB2]/5 p-5 shadow-[0_0_28px_rgba(0,255,178,0.25)] xl:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Recommendation</p>
            <p className={`mt-2 text-4xl font-black ${recommendationClass(recommendation.action)}`}>
              {recommendation.action}
            </p>
            <p className="mt-2 text-xs text-[#6B7280]">Score {sentiment.sentimentScore}/100 · {sentiment.sentimentLabel}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="sentilyze-card rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-bold text-white">Price vs sentiment</h2>
            <ChartComponent data={points} />
          </section>

          <AIInsightBox recommendation={recommendation} sentiment={sentiment} />
        </div>

        <div className="space-y-6">
          <SentimentMeter score={sentimentMeter?.score ?? sentiment.sentimentScore} label={sentimentMeter?.label} />

          <section id="trending" className="sentilyze-card rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#9CA3AF]">Trending</h2>
            <TrendingStocks items={trending} onSymbolClick={onPickSymbol} />
          </section>
        </div>
      </div>

      <section className="sentilyze-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Sentiment heatmap</h2>
        <p className="mb-4 text-sm text-[#9CA3AF]">Cross-ticker sentiment index (keyword + headline mix)</p>
        <SentimentHeatmap items={trending} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="sentilyze-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">News & sentiment tags</h2>
          <NewsList articles={news} />
        </section>
        <section id="bullbear" className="space-y-4">
          {typeof onOpenBullBear === "function" ? <BullBearCallout onOpen={onOpenBullBear} /> : null}
        </section>
      </div>

      <section id="settings" className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-[#6B7280]">
        Settings: connect API keys in <code className="text-[#00FFB2]">server/.env</code> (Alpha Vantage, NewsAPI).
      </section>
    </div>
  );
}
