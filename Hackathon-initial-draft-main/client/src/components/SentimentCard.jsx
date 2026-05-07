export default function SentimentCard({ label, value, sub, variant = "default" }) {
  const glow =
    variant === "green"
      ? "shadow-[0_0_24px_rgba(0,255,178,0.2)] border-[#00FFB2]/25"
      : variant === "red"
        ? "shadow-[0_0_24px_rgba(255,59,59,0.18)] border-[#FF3B3B]/25"
        : "border-white/10";

  return (
    <div className={`sentilyze-card rounded-2xl p-5 ${glow}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#6B7280]">{sub}</p>}
    </div>
  );
}
