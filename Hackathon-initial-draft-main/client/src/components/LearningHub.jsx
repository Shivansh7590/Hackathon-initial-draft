import { useEffect, useState } from "react";
import { getLearningTracks } from "../api/api";
import { useLearningProgress } from "../hooks/useLearningProgress";
import LearningMasterclass from "./learning/LearningMasterclass";
import LearningTopicDetail from "./learning/LearningTopicDetail";
import LearningTrackDetail from "./learning/LearningTrackDetail";

const MODULES = [
  {
    id: "m1",
    topicId: "stock-market",
    title: "What is Stock Market?",
    desc: "Understanding the global exchange where ownership of public companies is traded.",
    progressClass: "bg-sz-primary shadow-[0_0_15px_rgba(0,254,177,0.3)]",
    tag: "MODULE 01",
    tagClass: "text-sz-primary bg-sz-primary/10 border-sz-primary/20",
    gradient: "from-sz-primary-dim/10",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAn186k9dQtp2mp4u5bLsAZNl1B7d1SBF9vtI2guQX9tQmFB1BrUvdDwmYi89_D_p1IWCQLvlr9WARWCBYztwgmNCbEknxExRb4g_6PQ1uoo0FC-NW8K2TL3WGkvNMwy6EQMZ1bKosvqhZE0xaNm5HLWJ7G1nDHxWk_C8uUVOCrvfBio71_I8IlrLddhaaZ7FNoNhVqMdtQNSyzAZJ12aQHQt7SEZObzG35MWro9M7c9YWysz633D1PbbGm3vOywlGrREQBgCmCJA",
    sectionCount: 3
  },
  {
    id: "m2",
    topicId: "how-to-invest",
    title: "How to Invest?",
    desc: "From opening your first brokerage account to executing your first sentiment-aware plan.",
    progressClass: "bg-sz-tertiary shadow-[0_0_15px_rgba(105,255,238,0.3)]",
    tag: "MODULE 02",
    tagClass: "text-sz-tertiary bg-sz-tertiary/10 border-sz-tertiary/20",
    gradient: "from-sz-tertiary/10",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCLZg-pHyw_SWJKdcA1Cq8oxfURbDDNbtEkY95aACc0BoCqEbNzILPioh_1cUSrd9Amt0F-wUw25a58jHu5vpos3N4eW80nZJcAy4s6tUHWmsK-b4d11PNCYHjnzEUQplCBnum1CmaXqJs9dy8-Gi7r9OLpG0hCo9ihDc7ZjL9HierbbjAFa0gSzA42jmyUD3iZHiY39dt7O4YNJdrpcOF5DKGn3pVkDwxbwf5L4w5JXbtDpirAxEmcKJg_VUYgywoIoez2TPlgrA",
    sectionCount: 3
  },
  {
    id: "m3",
    topicId: "risk-management",
    title: "Risk Management",
    desc: "The science of protecting your capital: stops, diversification, and position sizing.",
    progressClass: "bg-sz-outline",
    tag: "MODULE 03",
    tagClass: "text-sz-error bg-sz-error/10 border-sz-error/20",
    gradient: "from-sz-error/10",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAGJ7G7IbFvtt4R-81jJWvDv8E8xAkNDx3rptvAc7UjI46GUb9ZV8yNahRFXT3v8RUxVMx4MMwUwfM7Y-0Sm0BavGN0HDT05zliq6OWUC8QutrDxn6dgBK58Bg2m_Uhl5TEmVAwxFPw_x3e_6ujyJRWhJOiflm-DvoFMkU62jmhuhys6sz7dWBxVxiKIn2oDPoZZiiCRhaVVIYRwj_x9xOBPNXkxUpbmNigNVnHGPtOLJtyOPShogUSaxMmqOtgModj86Nx3M3aUA",
    sectionCount: 3
  }
];

const SECONDARY = [
  {
    icon: "account_balance",
    title: "Index Funds",
    desc: "The power of passive growth and compound interest.",
    color: "text-sz-primary",
    topicId: "index-funds",
    sectionCount: 3
  },
  {
    icon: "candlestick_chart",
    title: "Chart Patterns",
    desc: "Read trends, support/resistance, and patterns in plain language.",
    color: "text-sz-secondary",
    topicId: "chart-patterns",
    sectionCount: 3
  },
  {
    icon: "auto_awesome",
    title: "Crypto Basics",
    desc: "Blockchain, tokens, and risks vs traditional equities.",
    color: "text-sz-tertiary",
    topicId: "crypto-basics",
    sectionCount: 3
  }
];

export default function LearningHub() {
  const [tracks, setTracks] = useState([]);
  const [view, setView] = useState(null);
  const { countTopicDone } = useLearningProgress();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getLearningTracks();
        if (!cancelled) setTracks(t);
      } catch {
        if (!cancelled) setTracks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shell = (child) => (
    <div
      className="min-h-full pb-24 text-sz-on"
      style={{
        backgroundColor: "#0a0e19",
        backgroundImage: "radial-gradient(circle at 50% 0%, #141927 0%, #0a0e19 100%)"
      }}
    >
      {child}
    </div>
  );

  if (view?.type === "track") {
    return shell(<LearningTrackDetail trackId={view.id} onBack={() => setView(null)} />);
  }
  if (view?.type === "topic") {
    return shell(<LearningTopicDetail topicId={view.id} onBack={() => setView(null)} />);
  }
  if (view?.type === "masterclass") {
    return shell(<LearningMasterclass onBack={() => setView(null)} />);
  }

  return shell(
    <main className="mx-auto max-w-5xl px-6 pb-12 pt-4">
      <section className="mb-12">
        <span className="mb-2 block font-[family-name:var(--font-sz-label)] text-[10px] uppercase tracking-widest text-sz-tertiary">
          Level 1: Novice
        </span>
        <h2 className="mb-4 font-sans text-3xl font-black leading-none tracking-tight text-sz-on">
          Your Trading <br />
          <span className="text-sz-primary">Foundation.</span>
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-sz-on-variant">
          Structured tracks with lessons, module guides with articles (including live results when NewsAPI is
          configured), and a video masterclass playlist.
        </p>
      </section>

      {tracks.length > 0 && (
        <section className="mb-10 rounded-xl border border-sz-outline/10 bg-sz-surface/80 p-5 backdrop-blur-md">
          <h3 className="mb-4 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-primary">
            Learning tracks
          </h3>
          <p className="mb-4 text-xs text-sz-on-variant">
            Open a track for full lesson text plus curated and live articles.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setView({ type: "track", id: t.id })}
                  className="w-full rounded-lg border border-sz-outline/10 bg-sz-surface-low p-4 text-left transition hover:border-sz-primary/40 hover:bg-sz-surface-high/50"
                >
                  <p className="font-bold text-sz-on">{t.title}</p>
                  <p className="mt-1 text-xs text-sz-on-variant">
                    {t.lessons} lessons · {t.level}
                  </p>
                  <p className="mt-2 text-[11px] text-sz-on-variant">{t.summary}</p>
                  <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider text-sz-primary">
                    Open track →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const done = countTopicDone(m.topicId, m.sectionCount);
          const progress = Math.round((done / m.sectionCount) * 100);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setView({ type: "topic", id: m.topicId })}
              className="group flex flex-col overflow-hidden rounded-xl border border-sz-outline/10 bg-[rgba(20,25,39,0.6)] text-left backdrop-blur-xl transition-all hover:border-sz-primary/30"
            >
              <div className="relative h-40 overflow-hidden bg-sz-surface-highest">
                <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} to-transparent`} />
                <img
                  alt=""
                  src={m.img}
                  className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute bottom-3 left-4">
                  <span
                    className={`rounded-full border px-2 py-1 font-[family-name:var(--font-sz-label)] text-[10px] ${m.tagClass}`}
                  >
                    {m.tag}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-2 text-lg font-bold text-sz-on">{m.title}</h3>
                <p className="mb-6 flex-1 text-xs text-sz-on-variant">{m.desc}</p>
                <div className="mt-auto">
                  <div className="mb-2 flex items-end justify-between">
                    <span className="font-[family-name:var(--font-sz-label)] text-[10px] uppercase tracking-wider text-sz-on-variant">
                      Progress
                    </span>
                    <span className={`font-[family-name:var(--font-sz-label)] text-xs ${m.id === "m2" ? "text-sz-tertiary" : "text-sz-primary"}`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sz-surface-highest">
                    <div
                      className={`h-full rounded-full ${m.progressClass}`}
                      style={{ width: `${Math.max(progress, 2)}%` }}
                    />
                  </div>
                  <span className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-sz-primary">
                    Open module →
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-xl border border-sz-tertiary/20 bg-gradient-to-r from-sz-surface to-sz-surface-high p-6 md:col-span-2 md:flex-row lg:col-span-3">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 h-64 w-64 bg-sz-tertiary/5 blur-[100px]" />
          <div className="relative flex-1">
            <span className="mb-3 inline-block rounded border border-sz-tertiary/30 bg-sz-surface-highest px-2 py-0.5 font-[family-name:var(--font-sz-label)] text-[9px] font-bold uppercase tracking-widest text-sz-tertiary">
              Masterclass
            </span>
            <h4 className="mb-3 font-sans text-2xl font-black tracking-tight text-sz-on">AI Sentiment Analysis 101</h4>
            <p className="mb-6 max-w-lg text-sm leading-relaxed text-sz-on-variant">
              Watch curated talks from TED, educators, and finance creators on markets, macro, and how AI reasons
              about data—ideas that sit behind modern sentiment tools.
            </p>
            <button
              type="button"
              onClick={() => setView({ type: "masterclass" })}
              className="flex items-center gap-2 rounded bg-sz-primary px-6 py-3 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-[#005c3e] transition hover:brightness-110 active:scale-95"
            >
              Start Masterclass
              <span className="material-symbols-outlined text-sm">play_arrow</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setView({ type: "masterclass" })}
            className="flex aspect-video w-full items-center justify-center rounded-lg border border-sz-outline/20 bg-black/40 p-4 transition hover:border-sz-tertiary/40 md:w-1/3 md:aspect-square"
            aria-label="Open video masterclass"
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded border border-dashed border-sz-tertiary/30 text-center">
              <span className="material-symbols-outlined mb-2 text-4xl text-sz-tertiary">play_circle</span>
              <span className="font-[family-name:var(--font-sz-label)] text-[10px] uppercase tracking-tighter text-sz-tertiary/80">
                YouTube playlist
              </span>
            </div>
          </button>
        </div>

        {SECONDARY.map((s) => {
          const done = countTopicDone(s.topicId, s.sectionCount);
          const progress = Math.round((done / s.sectionCount) * 100);
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => setView({ type: "topic", id: s.topicId })}
              className="flex items-start gap-4 rounded-xl border border-sz-outline/10 bg-[rgba(20,25,39,0.6)] p-5 text-left backdrop-blur-xl transition-colors hover:border-sz-primary/25 hover:bg-sz-surface-high"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sz-surface-highest ${s.color}`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="mb-1 text-sm font-bold text-sz-on">{s.title}</h5>
                <p className="text-[11px] text-sz-on-variant">{s.desc}</p>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-sz-surface-highest">
                  <div
                    className="h-full rounded-full bg-sz-secondary/80"
                    style={{ width: `${Math.max(progress, 2)}%` }}
                  />
                </div>
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-sz-primary">Open →</span>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
