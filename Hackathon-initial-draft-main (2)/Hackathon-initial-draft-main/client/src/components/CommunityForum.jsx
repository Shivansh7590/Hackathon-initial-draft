import { useCallback, useEffect, useState } from "react";
import { createCommunityPost, getCommunityPosts } from "../api/api";

const ROOMS = [
  { symbol: "TSLA", label: "$TSLA Room", icon: "bolt" },
  { symbol: "BTC", label: "$BTC Room", icon: "currency_bitcoin" },
  { symbol: "NVDA", label: "$NVDA Room", icon: "memory" },
  { symbol: "AAPL", label: "$AAPL Room", icon: "phone_iphone" }
];

const TRENDING = [
  { tag: "#FEDS_PIVOT", sub: "4.2k active traders", tone: "text-sz-tertiary" },
  { tag: "#AI_BUBBLE", sub: "1.8k bearish signals", tone: "text-[#ffafa8]" },
  { tag: "#HALVING_2024", sub: "12k mentions", tone: "text-sz-primary" }
];

const THREADS = [
  {
    id: "t1",
    votes: 1200,
    badge: "BULLISH",
    badgeClass: "bg-sz-primary/10 text-sz-primary",
    author: "@quant_alpha • 2h ago",
    title: "The $TSLA delivery numbers are being misunderstood by legacy media. Here is the AI breakdown.",
    body: "The neural network efficiency in the latest FSD build indicates a massive reduction in compute cost per mile. This isn't just a car company anymore, it's a distributed inference machine. Looking at the order flow, large institutions are absorbing every dip below $160...",
    comments: 248,
    chart: false
  },
  {
    id: "t2",
    votes: 842,
    badge: "BEARISH",
    badgeClass: "bg-[#c00018]/10 text-sz-secondary",
    author: "@macro_void • 5h ago",
    title: "Why the current $TSLA valuation still ignores the supply chain contraction in Asia.",
    body: "If you track the maritime freight data for battery components, we are seeing a 15% slowdown. This isn't reflected in the current consensus. AI sentiment across social platforms is hitting a 30-day low despite the price stabilization. Be careful of the bull trap...",
    comments: 156,
    chart: false
  },
  {
    id: "t3",
    votes: 312,
    badge: "INSIGHT",
    badgeClass: "bg-sz-tertiary/10 text-sz-tertiary",
    author: "@sentilyze_bot • 8h ago",
    title: "Data Analysis: Whale Wallets movement in the last 24 hours ($TSLA / $BTC correlation).",
    body: "",
    comments: 89,
    chart: true
  }
];

const LIVE_CHAT = [
  { user: "whale_watcher", meta: "LVL 82", metaClass: "text-sz-tertiary", text: "The 5-min chart just confirmed the RSI divergence. Longing here.", border: "" },
  { user: "new_trader_404", meta: "LVL 12", metaClass: "text-sz-outline", text: "Wait, what RSI divergence? I'm still learning.", border: "" },
  { user: "gamma_god", meta: "REP 4.8k", metaClass: "text-sz-primary", text: "Institutional delta hedging starting in 3.. 2.. 1..", border: "border-l-2 border-sz-primary" },
  { user: "short_everything", meta: "BEAR", metaClass: "text-[#ffafa8]", text: "Cope. This is heading to $140 by Friday close. 🐻", border: "border-l-2 border-sz-secondary" }
];

const CONTRIBUTORS = [
  { name: "quant_alpha", rep: "+12.4k REP", repClass: "text-sz-primary" },
  { name: "gamma_god", rep: "+8.1k REP", repClass: "text-sz-primary" },
  { name: "macro_void", rep: "+6.2k REP", repClass: "text-[#ffafa8]" }
];

export default function CommunityForum({ activeSymbol = "TSLA" }) {
  const [room, setRoom] = useState(activeSymbol.replace("$", "").slice(0, 4) || "TSLA");
  const [posts, setPosts] = useState([]);
  const [composer, setComposer] = useState("");
  const [author, setAuthor] = useState("You");
  const [role, setRole] = useState("Trader");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getCommunityPosts();
      setPosts(list);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sym = activeSymbol.replace("$", "").trim();
    if (sym) setRoom(sym.slice(0, 5));
  }, [activeSymbol]);

  async function handlePost(e) {
    e.preventDefault();
    const text = composer.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await createCommunityPost({ author: author.trim() || "Anon", role: role.trim() || "Member", text });
      setComposer("");
      await load();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-sz-bg pb-8 text-sz-on">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-4 md:px-8 lg:grid-cols-12">
        <aside className="hidden space-y-6 lg:col-span-3 lg:block">
          <section className="rounded-xl bg-sz-surface-low p-4">
            <h3 className="mb-4 px-2 font-[family-name:var(--font-sz-label)] text-xs uppercase tracking-[0.2em] text-sz-on-variant">
              Market Rooms
            </h3>
            <div className="space-y-1">
              {ROOMS.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => setRoom(r.symbol)}
                  className={`flex w-full items-center justify-between rounded-lg p-3 font-[family-name:var(--font-sz-label)] text-sm font-bold transition-colors ${
                    room === r.symbol
                      ? "border-l-2 border-sz-primary bg-sz-primary/10 text-sz-primary"
                      : "text-sz-on-variant hover:bg-sz-surface-highest"
                  }`}
                >
                  <span>{r.label}</span>
                  <span className="material-symbols-outlined text-sm">{r.icon}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-xl bg-sz-surface-low p-4">
            <h3 className="mb-4 px-2 font-[family-name:var(--font-sz-label)] text-xs uppercase tracking-[0.2em] text-sz-on-variant">
              Trending Topics
            </h3>
            <div className="space-y-4">
              {TRENDING.map((t) => (
                <div key={t.tag} className="px-2">
                  <p className="text-sm font-bold text-sz-on">{t.tag}</p>
                  <p className={`font-[family-name:var(--font-sz-label)] text-[10px] ${t.tone}`}>{t.sub}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4 lg:col-span-6">
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {ROOMS.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => setRoom(r.symbol)}
                className={`flex-none rounded-full px-4 py-2 font-[family-name:var(--font-sz-label)] text-xs font-bold ${
                  room === r.symbol
                    ? "border border-sz-primary/30 bg-sz-primary/20 text-sz-primary"
                    : "bg-sz-surface-high text-sz-on-variant"
                }`}
              >
                ${r.symbol}
              </button>
            ))}
            <div className="flex-none rounded-full bg-sz-surface-high px-4 py-2 font-[family-name:var(--font-sz-label)] text-xs font-bold text-sz-on-variant">
              $SPY
            </div>
          </div>

          <form
            onSubmit={handlePost}
            className="rounded-xl border border-sz-outline/10 bg-sz-surface p-4 shadow-lg"
          >
            <p className="mb-2 font-[family-name:var(--font-sz-label)] text-[10px] uppercase tracking-wider text-sz-on-variant">
              Share with the community
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="rounded-lg border-none bg-black/40 px-3 py-2 text-xs text-sz-on placeholder:text-sz-outline focus:ring-1 focus:ring-sz-tertiary sm:w-36"
                placeholder="Your name"
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border-none bg-black/40 px-3 py-2 text-xs text-sz-on placeholder:text-sz-outline focus:ring-1 focus:ring-sz-tertiary sm:w-40"
                placeholder="Role (e.g. Swing Trader)"
              />
            </div>
            <div className="mt-3 flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sz-surface-highest">
                <span className="material-symbols-outlined text-sz-on-variant">person</span>
              </div>
              <input
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                className="w-full rounded-lg border-none bg-black p-3 text-sm text-sz-on placeholder:text-sz-outline focus:ring-1 focus:ring-sz-tertiary"
                placeholder={`Start a $${room} discussion...`}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-sz-primary/20 px-4 py-2 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-wider text-sz-primary transition hover:bg-sz-primary/30 disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>

          {posts.length > 0 && (
            <div className="rounded-xl border border-sz-outline/10 bg-sz-surface-low p-4">
              <h3 className="mb-3 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-tertiary">
                Live feed (API)
              </h3>
              <ul className="space-y-3">
                {posts.slice(0, 8).map((p) => (
                  <li key={p.id} className="border-b border-sz-outline/10 pb-3 last:border-0">
                    <p className="text-xs text-sz-on-variant">
                      <span className="font-bold text-sz-on">{p.author}</span>
                      {p.role ? ` · ${p.role}` : ""} · ❤️ {p.likes ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-sz-on-variant">{p.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {THREADS.map((thread) => (
            <article
              key={thread.id}
              className="overflow-hidden rounded-xl border border-sz-outline/5 bg-sz-surface shadow-xl transition-all hover:-translate-y-0.5"
            >
              <div className="flex gap-4 p-4">
                <div className="flex flex-col items-center gap-1">
                  <button type="button" className="text-sz-primary transition-transform active:scale-125">
                    <span className="material-symbols-outlined">expand_less</span>
                  </button>
                  <span className="font-[family-name:var(--font-sz-label)] text-xs font-bold text-sz-on">
                    {thread.votes >= 1000 ? `${(thread.votes / 1000).toFixed(1)}k` : thread.votes}
                  </span>
                  <button
                    type="button"
                    className="text-sz-on-variant transition-transform hover:text-sz-secondary active:scale-125"
                  >
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-[family-name:var(--font-sz-label)] text-[10px] font-black tracking-widest ${thread.badgeClass}`}
                    >
                      {thread.badge}
                    </span>
                    <span className="font-[family-name:var(--font-sz-label)] text-[10px] uppercase text-sz-on-variant">
                      Posted by {thread.author}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold leading-tight text-sz-on">{thread.title}</h2>
                  {thread.body ? (
                    <p className="line-clamp-3 text-sm text-sz-on-variant">{thread.body}</p>
                  ) : null}
                  {thread.chart ? (
                    <div className="mb-3 flex h-32 items-end justify-between rounded-lg bg-black px-6 py-2">
                      {[50, 75, 33, 100, 66, 25, 50].map((h, i) => (
                        <div
                          key={i}
                          className={`w-4 rounded-t-sm ${
                            i % 3 === 0 ? "bg-sz-primary" : i % 3 === 1 ? "bg-sz-secondary" : "bg-sz-tertiary"
                          }`}
                          style={{ height: `${h}%`, boxShadow: "0 0 10px rgba(0,254,177,0.2)" }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sz-on-variant transition hover:text-sz-tertiary"
                    >
                      <span className="material-symbols-outlined text-lg">chat_bubble</span>
                      <span className="font-[family-name:var(--font-sz-label)] text-xs">{thread.comments} Comments</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sz-on-variant transition hover:text-sz-primary"
                    >
                      <span className="material-symbols-outlined text-lg">share</span>
                      <span className="font-[family-name:var(--font-sz-label)] text-xs">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="space-y-6 lg:col-span-3">
          <section className="flex h-[500px] flex-col overflow-hidden rounded-xl border border-sz-outline/10 bg-sz-surface-high">
            <div className="flex items-center justify-between border-b border-sz-outline/10 bg-sz-surface-highest p-4">
              <h3 className="font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-primary">
                Live ${room} Chat
              </h3>
              <span className="flex items-center gap-1 font-[family-name:var(--font-sz-label)] text-[10px] text-sz-on-variant">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sz-primary" />
                1.2k Online
              </span>
            </div>
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
              {LIVE_CHAT.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-[family-name:var(--font-sz-label)] text-[10px] font-bold ${c.metaClass}`}>
                      {c.meta}
                    </span>
                    <span className="text-xs font-bold text-sz-on">{c.user}</span>
                  </div>
                  <div
                    className={`rounded-lg rounded-tl-none bg-black p-2 ${c.border} ${
                      c.border ? "text-sz-on" : "text-sz-on-variant"
                    }`}
                  >
                    <p className="text-xs">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-sz-surface-highest p-4">
              <div className="flex items-center gap-2 rounded-lg border border-sz-outline/10 bg-black p-2">
                <input
                  className="w-full border-none bg-transparent text-xs text-sz-on placeholder:text-sz-outline/50 focus:ring-0"
                  placeholder="Type a message..."
                  readOnly
                />
                <span className="text-sz-primary">
                  <span className="material-symbols-outlined text-lg">send</span>
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-sz-outline/10 bg-sz-surface p-4">
            <h3 className="mb-4 px-2 font-[family-name:var(--font-sz-label)] text-xs uppercase tracking-[0.2em] text-sz-on-variant">
              Top Contributors
            </h3>
            <div className="space-y-4">
              {CONTRIBUTORS.map((c) => (
                <div key={c.name} className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-sz-surface-highest">
                      <span className="material-symbols-outlined text-xs text-sz-on-variant">person</span>
                    </div>
                    <span className="text-xs font-bold text-sz-on">{c.name}</span>
                  </div>
                  <span className={`font-[family-name:var(--font-sz-label)] text-[10px] ${c.repClass}`}>{c.rep}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
