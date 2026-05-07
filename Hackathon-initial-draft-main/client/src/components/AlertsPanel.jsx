import { AlertTriangle } from "lucide-react";

export default function AlertsPanel({ alerts }) {
  if (!alerts?.length) {
    return <p className="text-sm text-[#6B7280]">No alerts.</p>;
  }

  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li
          key={a.message}
          className="flex gap-3 rounded-xl border border-[#FF3B3B]/20 bg-[#FF3B3B]/5 p-3 text-sm text-[#FCA5A5]"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#FF3B3B]" />
          <span>{a.message}</span>
        </li>
      ))}
    </ul>
  );
}
