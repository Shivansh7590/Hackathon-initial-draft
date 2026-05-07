import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { heatmapCellClass } from "../utils/sentiment";

function Arrow({ change }) {
  if (change > 0) return <ArrowUpRight className="h-4 w-4 text-[#00FFB2]" />;
  if (change < 0) return <ArrowDownRight className="h-4 w-4 text-[#FF3B3B]" />;
  return <Minus className="h-4 w-4 text-[#6B7280]" />;
}

export default function TrendingStocks({ items, onSymbolClick }) {
  if (!items?.length) {
    return <p className="text-sm text-[#6B7280]">Loading trending…</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.symbol}>
          <button
            type="button"
            onClick={() => onSymbolClick?.(t.symbol)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121826]/80 px-3 py-2.5 text-left transition hover:border-[#00FFB2]/30"
          >
            <div className="flex items-center gap-2">
              <Arrow change={t.changePercent} />
              <span className="font-semibold text-white">{t.symbol}</span>
            </div>
            <div className="text-right">
              <span className={t.changePercent >= 0 ? "text-[#00FFB2]" : "text-[#FF3B3B]"}>
                {t.changePercent >= 0 ? "+" : ""}
                {Number(t.changePercent).toFixed(2)}%
              </span>
              <div className="text-[10px] text-[#9CA3AF]">SMI {t.sentimentScore}</div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SentimentHeatmap({ items }) {
  if (!items?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((t) => (
        <div
          key={t.symbol}
          className={`rounded-xl border px-3 py-3 text-center text-xs font-bold ${heatmapCellClass(t.sentimentScore)}`}
        >
          <div className="text-white">{t.symbol}</div>
          <div className="mt-1 text-[10px] opacity-90">{t.sentimentLabel}</div>
          <div className="mt-1 text-lg tabular-nums">{t.sentimentScore}</div>
        </div>
      ))}
    </div>
  );
}
