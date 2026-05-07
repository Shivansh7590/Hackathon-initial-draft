import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getLearningTopic } from "../../api/api";
import { useLearningProgress } from "../../hooks/useLearningProgress";

export default function LearningTopicDetail({ topicId, onBack }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const { toggleSection, isSectionDone, countTopicDone } = useLearningProgress();

  useEffect(() => {
    let c = false;
    setErr("");
    setData(null);
    (async () => {
      try {
        const d = await getLearningTopic(topicId);
        if (!c) setData(d);
      } catch (e) {
        if (!c) setErr(e?.response?.data?.message || "Could not load topic.");
      }
    })();
    return () => {
      c = true;
    };
  }, [topicId]);

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-sz-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-sz-error">{err}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sz-outline border-t-sz-primary" />
        <p className="text-sm text-sz-on-variant">Loading…</p>
      </div>
    );
  }

  const sections = data.sections || [];
  const secCount = sections.length;
  const done = countTopicDone(topicId, secCount);
  const pct = secCount ? Math.round((done / secCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-sz-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learn
      </button>

      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-sz-on">{data.title}</h1>
        <p className="mt-2 text-sz-tertiary">{data.subtitle}</p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-sz-on-variant">
            <span>Section progress</span>
            <span className="text-sz-primary">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sz-surface-highest">
            <div className="h-full rounded-full bg-sz-primary transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>
      </header>

      <section className="mb-10 space-y-8">
        {sections.map((sec, idx) => (
          <article key={idx} className="rounded-xl border border-sz-outline/15 bg-[rgba(20,25,39,0.7)] p-5 backdrop-blur-md">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-sz-on">{sec.heading}</h2>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-sz-on-variant">
                <input
                  type="checkbox"
                  checked={isSectionDone(topicId, idx)}
                  onChange={() => toggleSection(topicId, idx)}
                  className="h-4 w-4 rounded border-sz-outline text-sz-primary focus:ring-sz-primary"
                />
                Read
              </label>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-sz-on-variant">
              {(sec.paragraphs || []).map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-tertiary">
          Related articles
        </h2>
        {data.articlesMeta?.source === "no_api_key" ? (
          <p className="mb-4 text-xs text-sz-on-variant">
            Set <code className="rounded bg-sz-surface-highest px-1">NEWSAPI_API_KEY</code> on the server for live news
            results; curated links are always shown.
          </p>
        ) : null}
        <ul className="space-y-3">
          {(data.articles || []).map((a, i) => (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 rounded-xl border border-sz-outline/10 bg-sz-surface-low/80 p-4 transition hover:border-sz-primary/30"
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-sz-primary opacity-70 group-hover:opacity-100" />
                <div className="min-w-0">
                  <p className="font-semibold text-sz-on group-hover:text-sz-primary">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-sz-on-variant">{a.summary}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-sz-on-variant">{a.source}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
