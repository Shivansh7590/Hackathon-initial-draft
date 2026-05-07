import { ArrowLeft, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { getLearningMasterclass } from "../../api/api";

export default function LearningMasterclass({ onBack }) {
  const [videos, setVideos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const v = await getLearningMasterclass();
        if (!c) {
          setVideos(v);
          if (v[0]?.id) setActiveId(v[0].id);
        }
      } catch (e) {
        if (!c) setErr(e?.response?.data?.message || "Could not load videos.");
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const active = videos.find((v) => v.id === activeId) || videos[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-sz-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learn
      </button>

      <header className="mb-8">
        <p className="mb-1 font-[family-name:var(--font-sz-label)] text-[10px] uppercase tracking-widest text-sz-tertiary">
          Masterclass
        </p>
        <h1 className="text-3xl font-black tracking-tight text-sz-on">AI Sentiment Analysis 101</h1>
        <p className="mt-2 max-w-2xl text-sm text-sz-on-variant">
          Curated talks and explainers on markets, macro, and how AI interprets data—similar ideas power sentiment-aware
          tools like Sentilyze. Click a video to watch below.
        </p>
      </header>

      {err ? <p className="text-sz-error">{err}</p> : null}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-on-variant">
            Playlist
          </h2>
          <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {videos.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(v.id)}
                  className={`flex w-full gap-3 rounded-xl border p-3 text-left transition ${
                    activeId === v.id
                      ? "border-sz-primary/50 bg-sz-primary/10"
                      : "border-sz-outline/10 bg-sz-surface-low/60 hover:border-sz-outline/25"
                  }`}
                >
                  <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-black/50">
                    <Play className="h-6 w-6 text-sz-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-sz-on">{v.title}</p>
                    <p className="mt-0.5 text-[10px] text-sz-tertiary">{v.channel}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          {active ? (
            <>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-sz-outline/20 bg-black shadow-lg">
                <iframe
                  title={active.title}
                  src={`https://www.youtube-nocookie.com/embed/${active.id}?rel=0`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <p className="mt-4 text-sm text-sz-on-variant">{active.description}</p>
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-sz-outline/30 text-sz-on-variant">
              No videos loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
