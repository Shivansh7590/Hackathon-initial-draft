import "./envLoad.js";
import axios from "axios";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { categoryLabels, marketCatalog } from "./marketData.js";
import { buildDashboardBundle, buildTrendingList, TRENDING_SYMBOLS } from "./dashboardService.js";
import { fetchStockData } from "./dataService.js";
import { listTrendingCategoryMeta, getTrendingCategoryById } from "./trendingCategories.js";
import { fetchTrendingCategoryQuotes } from "./trendingQuotesService.js";
import { fetchGlobalReviews, fetchMarketHighlights, generateChatAnswer, getBundle } from "./services.js";
import { generateBullBearAnswer } from "./bullBearAssistant.js";
import { getAiChatStatus, runDeepSeekChat } from "./deepseekChat.js";
import authRouter from "./authRoutes.js";
import { fetchArticlesForTopic } from "./learningArticles.js";
import {
  getTrackSummaries,
  getTrackDetailById,
  getTopicPage,
  getStaticArticles,
  mergeLearningArticles,
  MASTERCLASS_VIDEOS
} from "./learningData.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  }
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);

const communityPosts = [
  {
    id: 1,
    author: "Riya Sharma",
    role: "Swing Trader",
    text: "I use Sentilyze pulse before market open to set my risk buckets.",
    likes: 42
  },
  {
    id: 2,
    author: "David Lee",
    role: "Crypto Analyst",
    text: "Cross-market sentiment helps me avoid crowded trades during high fear.",
    likes: 37
  },
  {
    id: 3,
    author: "Ankit Verma",
    role: "Beginner Investor",
    text: "Learning cards + live dashboard made my first strategy notebook.",
    likes: 23
  }
];

const waitlist = [];

app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "market-insight-server" });
});

app.get("/api/debug/providers", (_, res) => {
  const av = String(process.env.ALPHA_VANTAGE_API_KEY || "");
  const ms = String(process.env.MARKETSTACK_API_KEY || "");
  const fh = String(process.env.FINNHUB_API_KEY || "");
  const ind = String(process.env.INDIAN_STOCK_API_BASE_URL || "");
  const news = String(process.env.NEWSAPI_API_KEY || "");
  const yahooGap = Number(process.env.YAHOO_MIN_GAP_MS) || null;
  const avGap = Number(process.env.ALPHA_VANTAGE_MIN_GAP_MS) || null;
  res.json({
    alphaVantage: {
      configured: Boolean(av),
      keyPrefix: av ? av.slice(0, 4) : "",
      minGapMs: avGap
    },
    marketstack: {
      configured: Boolean(ms),
      keyPrefix: ms ? ms.slice(0, 4) : ""
    },
    finnhub: {
      configured: Boolean(fh),
      keyPrefix: fh ? fh.slice(0, 4) : ""
    },
    indianStockApi: {
      configured: Boolean(ind),
      baseUrl: ind || ""
    },
    newsApi: {
      configured: Boolean(news)
    },
    yahoo: {
      minGapMs: yahooGap
    }
  });
});

app.get("/api/debug/alpha-quote/:symbol", async (req, res) => {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    res.status(400).json({ ok: false, message: "No ALPHA_VANTAGE_API_KEY configured" });
    return;
  }
  const symbol = String(req.params.symbol || "").trim().toUpperCase();
  try {
    const { data } = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "GLOBAL_QUOTE", symbol, apikey: key },
      timeout: 20000
    });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(502).json({ ok: false, message: e?.message || "Alpha Vantage request failed" });
  }
});

app.get("/api/markets", (_, res) => {
  const categories = Object.entries(marketCatalog).map(([key, companies]) => ({
    key,
    label: categoryLabels[key],
    companies
  }));
  res.json({ categories });
});

app.get("/api/dashboard/:symbol", async (req, res) => {
  try {
    const payload = await buildDashboardBundle(req.params.symbol);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to build dashboard" });
  }
});

app.get("/api/trending", async (req, res) => {
  try {
    const payload = await buildTrendingList(req.query.symbol);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: "Failed to load trending" });
  }
});

app.get("/api/market/trending-categories", (_, res) => {
  res.json({ categories: listTrendingCategoryMeta() });
});

app.get("/api/market/trending-categories/:id/quotes", async (req, res) => {
  const cat = getTrendingCategoryById(req.params.id);
  if (!cat) {
    res.status(404).json({ message: "Unknown category" });
    return;
  }
  try {
    const payload = await fetchTrendingCategoryQuotes(req.params.id);
    res.json(payload);
  } catch {
    res.status(500).json({ message: "Failed to load category quotes" });
  }
});

app.get("/api/company/:symbol", async (req, res) => {
  try {
    const bundle = await getBundle(req.params.symbol);
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ message: "Failed to load company details" });
  }
});

app.get("/api/highlights", async (req, res) => {
  const { category, symbol, context } = req.query;
  try {
    const highlights = await fetchMarketHighlights({ category, symbol, context });
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ message: "Failed to load highlights" });
  }
});

app.get("/api/global-reviews", async (req, res) => {
  const { category, symbol, context } = req.query;
  try {
    const reviews = await fetchGlobalReviews({ category, symbol, context });
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: "Failed to load global reviews" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { question, symbol } = req.body;
  let contextNews = [];
  try {
    const bundle = await getBundle(symbol || "AAPL");
    contextNews = bundle.news || [];
  } catch (error) {
    contextNews = [];
  }
  const answer = await generateChatAnswer({
    question,
    symbol: symbol || "market",
    contextNews
  });
  res.json({ answer });
});

app.post("/api/bull-bear/ask", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  const symbol = String(req.body?.symbol || "AAPL").trim();
  if (!question) {
    res.status(400).json({ message: "Say or type a question first." });
    return;
  }
  try {
    const payload = await generateBullBearAnswer(question, symbol);
    res.json(payload);
  } catch {
    res.status(500).json({ message: "Bull/Bear assistant is temporarily unavailable." });
  }
});

app.get("/api/ai/chat/status", (_, res) => {
  res.json(getAiChatStatus());
});

app.post("/api/ai/chat", async (req, res) => {
  const { messages, symbol } = req.body || {};
  const sym = symbol ? String(symbol).trim().toUpperCase() : "";
  try {
    const content = await runDeepSeekChat({
      messages,
      symbol: sym || undefined
    });
    res.json({ message: { role: "assistant", content } });
  } catch (e) {
    if (e?.code === "NO_KEY") {
      res.status(503).json({
        code: "NO_AI_KEY",
        message:
          "Sentilyze AI is not configured. Add OPENROUTER_API_KEY to server/.env, then restart the API server."
      });
      return;
    }
    if (e?.code === "EMPTY" || e?.code === "BAD_TURN") {
      res.status(400).json({ message: "Send a valid chat history ending with a user message." });
      return;
    }
    if (axios.isAxiosError(e)) {
      const msg = e.response?.data?.error?.message || e.message || "Upstream AI error";
      res.status(502).json({ message: msg });
      return;
    }
    res.status(502).json({ message: "AI chat failed. Try again in a moment." });
  }
});

app.post("/api/waitlist", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }
  if (!waitlist.includes(email.toLowerCase())) {
    waitlist.push(email.toLowerCase());
  }
  return res.json({ ok: true, message: "Request received. We will notify you for beta access." });
});

app.get("/api/community/posts", (_, res) => {
  res.json({ posts: communityPosts });
});

app.post("/api/community/posts", (req, res) => {
  const author = String(req.body?.author || "").trim();
  const role = String(req.body?.role || "").trim();
  const text = String(req.body?.text || "").trim();
  if (!author || !text) {
    return res.status(400).json({ message: "Author and text are required." });
  }
  const post = {
    id: Date.now(),
    author,
    role: role || "Community Member",
    text,
    likes: 0
  };
  communityPosts.unshift(post);
  return res.status(201).json({ post });
});

app.get("/api/learning/tracks", (_, res) => {
  res.json({ tracks: getTrackSummaries() });
});

app.get("/api/learning/tracks/:id", async (req, res) => {
  const t = getTrackDetailById(req.params.id);
  if (!t) {
    res.status(404).json({ message: "Track not found" });
    return;
  }
  try {
    const { articles: newsArticles, source } = await fetchArticlesForTopic(t.articleTopicKey, 12);
    const staticExtra = t.staticArticleKey ? getStaticArticles(t.staticArticleKey) : [];
    const articles = mergeLearningArticles([t.curatedArticles, staticExtra, newsArticles]).slice(0, 18);
    const { curatedArticles, articleTopicKey, staticArticleKey, ...pub } = t;
    res.json({
      ...pub,
      articles,
      articlesMeta: { source }
    });
  } catch {
    res.status(500).json({ message: "Failed to load track" });
  }
});

app.get("/api/learning/topics/:topicId", async (req, res) => {
  const page = getTopicPage(req.params.topicId);
  if (!page) {
    res.status(404).json({ message: "Topic not found" });
    return;
  }
  try {
    const { articles: newsArticles, source } = await fetchArticlesForTopic(req.params.topicId, 12);
    const articles = mergeLearningArticles([getStaticArticles(req.params.topicId), newsArticles]).slice(0, 18);
    res.json({
      ...page,
      articles,
      articlesMeta: { source }
    });
  } catch {
    res.status(500).json({ message: "Failed to load topic" });
  }
});

app.get("/api/learning/masterclass", (_, res) => {
  res.json({ videos: MASTERCLASS_VIDEOS });
});

const liveSymbolRefCount = new Map();

function normalizeLiveSymbol(symbol) {
  return String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, "");
}

io.on("connection", (socket) => {
  socket.data.watchlist = new Set();

  socket.on("subscribe-symbol", (symbol) => {
    const sym = normalizeLiveSymbol(symbol);
    if (!sym) {
      return;
    }
    socket.join(sym);
    if (!socket.data.watchlist.has(sym)) {
      socket.data.watchlist.add(sym);
      liveSymbolRefCount.set(sym, (liveSymbolRefCount.get(sym) || 0) + 1);
    }
  });

  socket.on("unsubscribe-symbol", (symbol) => {
    const sym = normalizeLiveSymbol(symbol);
    if (!sym) {
      return;
    }
    socket.leave(sym);
    if (socket.data.watchlist?.has(sym)) {
      socket.data.watchlist.delete(sym);
      const next = Math.max(0, (liveSymbolRefCount.get(sym) || 1) - 1);
      if (next === 0) {
        liveSymbolRefCount.delete(sym);
      } else {
        liveSymbolRefCount.set(sym, next);
      }
    }
  });

  socket.on("disconnect", () => {
    for (const sym of socket.data.watchlist || []) {
      const next = Math.max(0, (liveSymbolRefCount.get(sym) || 1) - 1);
      if (next === 0) {
        liveSymbolRefCount.delete(sym);
      } else {
        liveSymbolRefCount.set(sym, next);
      }
    }
  });
});

const LIVE_REFRESH_MS = Number(process.env.LIVE_QUOTE_INTERVAL_MS) || 60_000;

setInterval(async () => {
  // Only poll symbols that the UI is actively watching.
  // Polling large static lists can trigger upstream rate limits (Yahoo/Google).
  const symbols = [...new Set([...liveSymbolRefCount.keys()])];
  const staggerMs = Number(process.env.LIVE_QUOTE_STAGGER_MS) || 450;
  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, staggerMs));
    }
    try {
      const stock = await fetchStockData(symbol, { mode: "live", forceRefresh: true });
      io.to(symbol).emit("quote-update", {
        symbol: stock.symbol,
        price: stock.price,
        changePercent: stock.changePercent,
        currency: stock.currency,
        time: stock.asOf || new Date().toISOString()
      });
    } catch (error) {
      // keep stream alive even if one symbol fails
    }
  }
}, LIVE_REFRESH_MS);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
