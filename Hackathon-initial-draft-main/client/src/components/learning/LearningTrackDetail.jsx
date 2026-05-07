import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getLearningTrackDetail } from "../../api/api";
import { useLearningProgress } from "../../hooks/useLearningProgress";

export default function LearningTrackDetail({ trackId, onBack }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const { toggleLesson, isLessonDone, countTrackDone } = useLearningProgress();

  useEffect(() => {
    let c = false;
    setErr("");
    setData(null);
    (async () => {
      try {
        const d = await getLearningTrackDetail(trackId);
        if (!c) setData(d);
      } catch (e) {
        if (!c) setErr(e?.response?.data?.message || "Could not load track.");
      }
    })();
    return () => {
      c = true;
    };
  }, [trackId]);

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
        <p className="text-sm text-sz-on-variant">Loading track…</p>
      </div>
    );
  }

  const lessonIds = (data.lessons || []).map((l) => l.id);
  const done = countTrackDone(trackId, lessonIds);
  const total = lessonIds.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

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
        <p className="mb-1 font-[family-name:var(--font-sz-label)] text-[10px] uppercase tracking-widest text-sz-tertiary">
          {data.level}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-sz-on">{data.title}</h1>
        <p className="mt-2 text-sm text-sz-on-variant">{data.summary}</p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-sz-on-variant">
            <span>Your progress</span>
            <span className="text-sz-primary">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sz-surface-highest">
            <div className="h-full rounded-full bg-sz-primary transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-primary">
          <BookOpen className="h-4 w-4" />
          Lessons
        </h2>
        <ul className="space-y-4">
          {(data.lessons || []).map((lesson) => (
            <li
              key={lesson.id}
              className="rounded-xl border border-sz-outline/15 bg-[rgba(20,25,39,0.7)] p-5 backdrop-blur-md"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sz-on">{lesson.title}</h3>
                  <p className="mt-0.5 text-[11px] text-sz-on-variant">{lesson.durationMin} min read</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-sz-on-variant">
                  <input
                    type="checkbox"
                    checked={isLessonDone(trackId, lesson.id)}
                    onChange={() => toggleLesson(trackId, lesson.id)}
                    className="h-4 w-4 rounded border-sz-outline text-sz-primary focus:ring-sz-primary"
                  />
                  Done
                </label>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-sz-on-variant">
                {(lesson.content || []).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-[family-name:var(--font-sz-label)] text-xs font-bold uppercase tracking-widest text-sz-tertiary">
          Articles &amp; further reading
        </h2>
        {data.articlesMeta?.source === "no_api_key" ? (
          <p className="mb-4 text-xs text-sz-on-variant">
            Add a NewsAPI key on the server to pull live articles here; curated links still appear below.
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
