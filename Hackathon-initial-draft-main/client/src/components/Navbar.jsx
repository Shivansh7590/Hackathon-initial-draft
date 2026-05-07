import { Bell, LogOut, Search, User } from "lucide-react";

export default function Navbar({ symbolInput, onSymbolInput, onSearch, loading, userName, onLogout }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F1A]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="bg-gradient-to-r from-[#00FFB2] to-cyan-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Sentilyze
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
            className="relative hidden min-w-[200px] max-w-md flex-1 sm:block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => onSymbolInput(e.target.value)}
              placeholder="Search symbol (e.g. TSLA)"
              className="w-full rounded-xl border border-white/10 bg-[#121826] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#6B7280] outline-none transition focus:border-[#00FFB2]/50 focus:ring-2 focus:ring-[#00FFB2]/20"
              aria-label="Stock symbol search"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-[#00FFB2]/30 bg-[#00FFB2]/10 px-3 py-1 text-xs font-semibold text-[#00FFB2]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00FFB2] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00FFB2]" />
            </span>
            Live
          </span>
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-[#121826] p-2 text-[#9CA3AF] transition hover:border-white/20 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          {userName ? (
            <span className="hidden max-w-[140px] truncate text-xs font-medium text-[#9CA3AF] sm:inline" title={userName}>
              {userName}
            </span>
          ) : null}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#121826] to-[#1a2235] text-sm font-bold text-[#00FFB2]">
            <User className="h-5 w-5" />
          </div>
          {typeof onLogout === "function" ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121826] px-3 py-2 text-xs font-semibold text-[#9CA3AF] transition hover:border-[#FF3B3B]/40 hover:text-[#FCA5A5]"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          ) : null}
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#00FFB2]" />
          )}
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="border-t border-white/5 px-4 py-2 sm:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={symbolInput}
            onChange={(e) => onSymbolInput(e.target.value)}
            placeholder="Symbol..."
            className="w-full rounded-xl border border-white/10 bg-[#121826] py-2.5 pl-10 pr-4 text-sm text-white"
          />
        </div>
      </form>
    </header>
  );
}
