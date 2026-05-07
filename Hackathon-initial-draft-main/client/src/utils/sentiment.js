/** Client-side helpers for displaying sentiment (server is source of truth). */

export function recommendationClass(action) {
  if (action === "BUY") return "text-[#00FFB2]";
  if (action === "SELL") return "text-[#FF3B3B]";
  return "text-[#FACC15]";
}

export function changeArrow(changePercent) {
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

export function sentimentTagClass(tag) {
  if (tag === "Bullish" || tag === "Positive") return "bg-[#00FFB2]/15 text-[#00FFB2] border border-[#00FFB2]/30";
  if (tag === "Bearish" || tag === "Negative") return "bg-[#FF3B3B]/15 text-[#FF3B3B] border border-[#FF3B3B]/30";
  return "bg-white/5 text-[#9CA3AF] border border-white/10";
}

export function heatmapCellClass(score) {
  if (score >= 60) return "bg-[#00FFB2]/25 border-[#00FFB2]/40 text-[#00FFB2]";
  if (score <= 40) return "bg-[#FF3B3B]/20 border-[#FF3B3B]/35 text-[#FF3B3B]";
  return "bg-white/5 border-white/10 text-[#9CA3AF]";
}
