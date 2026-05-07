import { sentimentTagClass } from "../utils/sentiment";

export default function NewsList({ articles }) {
  if (!articles?.length) {
    return <p className="text-sm text-[#6B7280]">No headlines available.</p>;
  }

  return (
    <ul className="space-y-3">
      {articles.slice(0, 10).map((a) => (
        <li
          key={`${a.title}-${a.url}`}
          className="sentilyze-card rounded-xl border border-white/10 p-4 transition hover:border-[#00FFB2]/20"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-xs font-medium text-[#6B7280]">{a.source || "News"}</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${sentimentTagClass(a.sentimentTag)}`}>
              {a.sentimentTag}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium leading-snug text-white">{a.title}</p>
        </li>
      ))}
    </ul>
  );
}
