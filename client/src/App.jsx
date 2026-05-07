import { useCallback, useEffect, useState } from "react";
import { getDashboard, getTrending } from "./api/api";
import AuthPage from "./components/AuthPage";
import CommunityForum from "./components/CommunityForum";
import Dashboard from "./components/Dashboard";
import LearningHub from "./components/LearningHub";
import BullBearChatbot from "./components/BullBearChatbot";
import TrendingMarketsPage from "./components/TrendingMarketsPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./context/AuthContext";

function MainApp({ userName, onLogout }) {
  const [symbolInput, setSymbolInput] = useState("AAPL");
  const [activeSymbol, setActiveSymbol] = useState("AAPL");
  const [sidebar, setSidebar] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [trending, setTrending] = useState([]);

  const loadDashboard = useCallback(async (sym, options = {}) => {
    const silent = Boolean(options.silent);
    const s = String(sym || "AAPL").trim().toUpperCase();
    if (!s) return;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = await getDashboard(s);
      setDashboardData(data);
      setActiveSymbol(data.symbol || s);
    } catch (e) {
      if (!silent) {
        setError(e?.response?.data?.message || "Failed to load dashboard. Is the API running?");
        setDashboardData(null);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard("AAPL");
  }, [loadDashboard]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getTrending(activeSymbol);
        if (!cancelled) setTrending(items);
      } catch {
        if (!cancelled) setTrending([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSymbol]);

  function handleSearch() {
    loadDashboard(symbolInput);
  }

  function handlePickSymbol(sym) {
    setSymbolInput(sym);
    loadDashboard(sym);
  }

  function handleSidebar(id) {
    if (id === "dashboard") {
      document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (id === "bullbear") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (id === "settings") {
      document.getElementById("settings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleTrendingPick(sym) {
    const s = String(sym || "").trim();
    if (!s) return;
    setSymbolInput(s);
    setSidebar("dashboard");
    loadDashboard(s);
  }

  const showStockNav =
    sidebar === "dashboard" || sidebar === "trending" || sidebar === "bullbear" || sidebar === "settings";

  return (
    <div className="flex min-h-full flex-col bg-[#0B0F1A] lg:flex-row">
      <Sidebar
        active={sidebar}
        onSelect={(id) => { setSidebar(id); handleSidebar(id); }}
        userName={userName}
        onLogout={onLogout}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {showStockNav ? (
          <Navbar
            symbolInput={symbolInput}
            onSymbolInput={setSymbolInput}
            onSearch={handleSearch}
            loading={loading}
            userName={userName}
            onLogout={onLogout}
          />
        ) : null}
        <main className="flex-1 overflow-y-auto">
          {sidebar === "community" ? (
            <CommunityForum activeSymbol={activeSymbol} />
          ) : sidebar === "learning" ? (
            <LearningHub />
          ) : sidebar === "trending" ? (
            <TrendingMarketsPage onSelectSymbol={handleTrendingPick} />
          ) : sidebar === "bullbear" ? (
            <BullBearChatbot symbol={activeSymbol} />
          ) : (
            <Dashboard
              data={dashboardData}
              trending={trending}
              loading={loading}
              error={error}
              symbol={activeSymbol}
              onPickSymbol={handlePickSymbol}
              onOpenBullBear={() => setSidebar("bullbear")}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, ready, logout } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0B0F1A]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#00FFB2]" />
        <p className="text-sm text-[#9CA3AF]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <MainApp userName={user.name} onLogout={logout} />;
}
