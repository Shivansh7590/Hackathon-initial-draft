import { Mic } from "lucide-react";

export default function BullBearCallout({ onOpen }) {
  return (
    <section className="sentilyze-card rounded-2xl border border-[#00FFB2]/25 bg-gradient-to-br from-[#00FFB2]/10 to-transparent p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00FFB2]/20">
            <Mic className="h-6 w-6 text-[#00FFB2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sentilyze AI Chat</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              DeepSeek-style assistant: ask anything, with optional live market context for your active symbol.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-xl bg-[#00FFB2] px-5 py-3 text-sm font-bold text-[#0B0F1A] transition hover:brightness-110"
        >
          Open AI chat
        </button>
      </div>
    </section>
  );
}
