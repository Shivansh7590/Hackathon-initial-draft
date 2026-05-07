import { Activity, GraduationCap, LayoutDashboard, LogOut, Mic, Settings, Users } from "lucide-react";

const items = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "trending", label: "Trending Stocks", icon: Activity },
  { id: "community", label: "Community", icon: Users },
  { id: "learning", label: "Learn", icon: GraduationCap },
  { id: "bullbear", label: "AI Chat", icon: Mic },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ active, onSelect, userName, onLogout }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#0B0F1A] lg:w-56 lg:border-b-0 lg:border-r">
      <nav className="flex w-full flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:p-4">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex min-w-[9rem] flex-shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition lg:min-w-0 ${
              active === id
                ? "border border-[#00FFB2]/30 bg-[#00FFB2]/10 text-[#00FFB2] shadow-[0_0_20px_rgba(0,255,178,0.12)]"
                : "text-[#9CA3AF] hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      {typeof onLogout === "function" ? (
        <>
          <div className="flex items-center justify-end gap-2 border-t border-white/10 px-2 py-2 lg:hidden">
            {userName ? (
              <span className="mr-auto max-w-[40%] truncate text-xs text-[#6B7280]" title={userName}>
                {userName}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#FCA5A5]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
          <div className="mt-auto hidden border-t border-white/10 p-3 lg:block">
            {userName ? (
              <p className="mb-2 truncate px-1 text-xs text-[#6B7280]" title={userName}>
                {userName}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#9CA3AF] transition hover:bg-white/5 hover:text-[#FCA5A5]"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Log out
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
}
