export default function SentimentMeter({ score = 50, label }) {
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div className="sentilyze-card rounded-2xl border border-white/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Sentiment meter</p>
      <p className="mt-1 text-lg font-bold text-white">{label || "—"}</p>
      <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-[#1a2235]">
        <div
          className="gradient-fear-greed absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-[#6B7280]">
        <span>Extreme Fear</span>
        <span>Extreme Greed</span>
      </div>
      <p className="mt-3 text-center text-2xl font-black tabular-nums text-[#00FFB2]">{pct}</p>
    </div>
  );
}
