import { Sparkles } from "lucide-react";

export default function AIInsightBox({ recommendation, sentiment }) {
  if (!recommendation) return null;

  return (
    <div className="ai-glow sentilyze-card rounded-2xl border border-[#00FFB2]/30 p-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#00FFB2]" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#00FFB2]">Market Insight</h3>
      </div>
      <p className="text-base leading-relaxed text-[#E5E7EB]">
        {recommendation.insightNarrative || recommendation.explanation}
      </p>
      {sentiment?.keyFactors?.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-[#9CA3AF]">
          {sentiment.keyFactors.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-[#00FFB2]">▸</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-[#6B7280]">Signal blend: market data + headline sentiment + trend context.</p>
    </div>
  );
}
