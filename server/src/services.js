import axios from "axios";
import { fetchStockData } from "./dataService.js";
import { fetchNewsArticlesForSymbol } from "./newsApi.js";

const openRouterKey = process.env.OPENROUTER_API_KEY;
const newsApiKey = process.env.NEWSAPI_API_KEY;
const bingNewsApiKey = process.env.BING_NEWS_API_KEY;
const bingNewsEndpoint = process.env.BING_NEWS_ENDPOINT || "https://api.bing.microsoft.com/v7.0/news/search";

function buildPrediction(points) {
  const recent = points.slice(-6);
  const avg = recent.reduce((sum, point) => sum + point.price, 0) / recent.length;
  const current = points[points.length - 1].price;
  const delta = Number((avg - current).toFixed(2));
  const trend = delta >= 0 ? "Possible upside" : "Possible downside";
  return {
    confidence: `${Math.min(90, 55 + Math.round(Math.abs(delta) * 3))}%`,
    trend,
    target: Number((current + delta).toFixed(2))
  };
}

export async function fetchQuoteWithChart(symbol) {
  const stock = await fetchStockData(symbol, { mode: "api" });
  return {
    symbol: stock.symbol,
    price: stock.price,
    changePercent: stock.changePercent,
    points: stock.points.map((p, index) => ({
      time: typeof p.time === "number" ? p.time : index + 1,
      price: p.price
    }))
  };
}

export async function fetchCompanyNews(symbol) {
  if (newsApiKey) {
    try {
      const raw = await fetchNewsArticlesForSymbol(symbol, 10);
      if (raw.length) {
        const normalized = raw.map((a) =>
          normalizeItem({
            title: a.title,
            url: a.url,
            source: a.source,
            image: "",
            summary: a.summary
          })
        );
        const deduped = dedupeByTitle(normalized).slice(0, 8);
        return enrichItemsWithArticleImages(deduped, Math.min(6, deduped.length));
      }
    } catch {
      /* fall through to RSS */
    }
  }
  const query = `${symbol} stock market analysis site:reuters.com OR site:bloomberg.com OR site:cnbc.com OR site:ft.com`;
  const items = await fetchSmartNews(query, 8);
  return items.length ? items : [
    {
      title: `${symbol} market headlines currently limited`,
      source: "System",
      url: "#",
      summary: "Live company feed is temporarily sparse. Try again shortly.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&auto=format&fit=crop"
    }
  ];
}

export async function getBundle(symbol) {
  const quote = await fetchQuoteWithChart(symbol);
  const news = await fetchCompanyNews(symbol);
  const reviews = await fetchCompanyReviews(symbol);
  const prediction = buildPrediction(quote.points);
  const factors = buildAffectingFactors(news);
  return { quote, news, reviews, factors, prediction };
}

function decodeXml(text) {
  return (text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function stripHtml(rawText) {
  const decoded = decodeXml(rawText);
  return decoded
    .replace(/<a[^>]*>/gi, " ")
    .replace(/<\/a>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeItem(item) {
  return {
    title: (item.title || "Untitled").trim(),
    url: item.url || "#",
    source: item.source || "News",
    image: item.image || "",
    summary: (item.summary || "Tap to read the latest full report.").slice(0, 240)
  };
}

function isLikelyGenericImage(url) {
  const raw = (url || "").toLowerCase();
  if (!raw) {
    return true;
  }
  return raw.includes("gstatic.com") || raw.includes("googlelogo") || raw.includes("news.google.com") || raw.includes("/logo") || raw.endsWith(".svg");
}

function imageFromArticleDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (!hostname) {
      return "";
    }
    return `https://logo.clearbit.com/${hostname}`;
  } catch (error) {
    return "";
  }
}

function extractMetaImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeXml(match[1].trim());
    }
  }
  return "";
}

async function fetchArticleImage(articleUrl) {
  if (!articleUrl || articleUrl === "#") {
    return "";
  }
  try {
    const { data } = await axios.get(articleUrl, {
      timeout: 7000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      maxRedirects: 5
    });
    return extractMetaImage(String(data || ""));
  } catch (error) {
    return "";
  }
}

async function enrichItemsWithArticleImages(items, limit = 8) {
  const next = [...items];
  const candidates = next
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isLikelyGenericImage(item.image))
    .slice(0, limit);

  if (!candidates.length) {
    return next;
  }

  const resolved = await Promise.all(
    candidates.map(async ({ item, index }) => ({
      index,
      image: await fetchArticleImage(item.url)
    }))
  );

  for (const entry of resolved) {
    if (entry.image && !isLikelyGenericImage(entry.image)) {
      next[entry.index] = {
        ...next[entry.index],
        image: entry.image
      };
    } else if (isLikelyGenericImage(next[entry.index].image)) {
      next[entry.index] = {
        ...next[entry.index],
        image: imageFromArticleDomain(next[entry.index].url)
      };
    }
  }
  return next;
}

function parseGoogleNewsRss(xml, limit = 6) {
  const items = [];
  const regex = /<item>([\s\S]*?)<\/item>/g;
  let match = regex.exec(xml);
  while (match && items.length < limit) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ||
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[2] ||
      "Untitled";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "#";
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "Google News";
    const description = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[1] ||
      block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[2] ||
      "";
    const image = decodeXml(description.match(/<img[^>]+src="([^"]+)"/)?.[1] || "");
    const plain = stripHtml(description);
    items.push(normalizeItem({
      title: decodeXml(title),
      url: decodeXml(link),
      source: decodeXml(source),
      image,
      summary: plain.slice(0, 220) || "Tap to read the latest full report."
    }));
    match = regex.exec(xml);
  }
  return dedupeByTitle(items);
}

async function fetchGoogleNews(query, limit = 6) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return parseGoogleNewsRss(data, limit);
}

async function fetchNewsApi(query, limit = 8) {
  if (!newsApiKey) {
    return [];
  }
  try {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: query,
        language: "en",
        sortBy: "publishedAt",
        pageSize: limit,
        apiKey: newsApiKey
      },
      timeout: 10000
    });
    return (data.articles || [])
      .map((article) => normalizeItem({
        title: article.title,
        url: article.url,
        source: article.source?.name,
        image: article.urlToImage,
        summary: stripHtml(article.description || article.content || "")
      }))
      .filter((item) => item.url !== "#");
  } catch (error) {
    return [];
  }
}

async function fetchBingNews(query, limit = 8) {
  if (!bingNewsApiKey) {
    return [];
  }
  try {
    const { data } = await axios.get(bingNewsEndpoint, {
      params: {
        q: query,
        count: limit,
        mkt: "en-US",
        safeSearch: "Moderate"
      },
      headers: {
        "Ocp-Apim-Subscription-Key": bingNewsApiKey
      },
      timeout: 10000
    });
    return (data.value || []).map((item) => normalizeItem({
      title: item.name,
      url: item.url,
      source: item.provider?.[0]?.name || "Microsoft News",
      image: item?.image?.thumbnail?.contentUrl || "",
      summary: stripHtml(item.description || "")
    }));
  } catch (error) {
    return [];
  }
}

function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = (item.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchSmartNews(query, limit = 8) {
  const [newsApiItems, bingItems] = await Promise.all([
    fetchNewsApi(query, limit),
    fetchBingNews(query, limit)
  ]);
  if (newsApiItems.length || bingItems.length) {
    const combined = dedupeByTitle([...newsApiItems, ...bingItems]).slice(0, limit);
    return enrichItemsWithArticleImages(combined, Math.min(6, limit));
  }
  const rssItems = await fetchGoogleNews(query, limit);
  return enrichItemsWithArticleImages(rssItems, Math.min(6, limit));
}

function sourceFilter() {
  return "site:reuters.com OR site:bloomberg.com OR site:cnbc.com OR site:wsj.com OR site:ft.com";
}

function categoryKeywords(category) {
  const mapping = {
    india: "India markets NSE BSE RBI",
    foreign: "US markets Nasdaq S&P500 Federal Reserve",
    minerals: "commodities mining metals oil energy",
    forex: "forex currency dollar rupee euro yen"
  };
  return mapping[category] || "global markets economy";
}

export async function fetchMarketHighlights({ category = "foreign", symbol = "", context = "dashboard" } = {}) {
  try {
    const scenario = context === "company" && symbol
      ? `${symbol} company earnings outlook`
      : `${categoryKeywords(category)} geopolitical business`;
    const items = await fetchSmartNews(
      `${scenario} ${sourceFilter()}`,
      10
    );
    return items;
  } catch (error) {
    return [
      {
        title: "Global markets react to macro uncertainty",
        url: "#",
        source: "Fallback Feed",
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&auto=format&fit=crop"
      },
      {
        title: "Energy and commodity price swings remain in focus",
        url: "#",
        source: "Fallback Feed",
        image: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=900&auto=format&fit=crop"
      }
    ];
  }
}

export async function fetchGlobalReviews({ category = "foreign", symbol = "", context = "dashboard" } = {}) {
  try {
    const scenario = context === "company" && symbol
      ? `${symbol} analyst review target price outlook`
      : `${categoryKeywords(category)} market outlook analyst recommendation`;
    const items = await fetchSmartNews(
      `${scenario} site:reuters.com OR site:marketwatch.com OR site:investing.com OR site:ft.com OR site:seekingalpha.com`,
      10
    );
    return items;
  } catch (error) {
    return [
      {
        title: "Analyst desks suggest cautious diversified exposure",
        url: "#",
        source: "Fallback Feed",
        image: "https://images.unsplash.com/photo-1560523159-4a9692d222f9?w=900&auto=format&fit=crop"
      },
      {
        title: "Volatility outlook remains mixed across major regions",
        url: "#",
        source: "Fallback Feed",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&auto=format&fit=crop"
      }
    ];
  }
}

export async function fetchCompanyReviews(symbol) {
  const query = `${symbol} analyst review outlook site:marketwatch.com OR site:seekingalpha.com OR site:investing.com OR site:reuters.com`;
  const items = await fetchSmartNews(query, 6);
  return items;
}

function buildAffectingFactors(newsItems) {
  const corpus = newsItems.map((item) => `${item.title} ${item.summary}`).join(" ").toLowerCase();
  const map = [
    { key: "interest", label: "Interest rate and central bank expectations" },
    { key: "inflation", label: "Inflation trajectory and macro demand pressure" },
    { key: "oil", label: "Oil and energy cost fluctuations" },
    { key: "earnings", label: "Earnings revisions and guidance changes" },
    { key: "geopolitical", label: "Geopolitical developments and sanctions risk" },
    { key: "regulation", label: "Regulatory and policy announcements" },
    { key: "currency", label: "Currency movement and import-export impact" }
  ];
  const selected = map.filter((entry) => corpus.includes(entry.key)).map((entry) => entry.label);
  if (selected.length >= 3) {
    return selected.slice(0, 5);
  }
  return [
    "Institutional flow and liquidity trend",
    "Sector-wide peer performance and valuation shifts",
    "Macro headlines and policy decisions"
  ];
}

export async function generateChatAnswer({ question, symbol, contextNews = [] }) {
  const context = contextNews.slice(0, 3).map((item) => `${item.title} (${item.source})`).join(" | ");
  if (!openRouterKey) {
    return `For ${symbol}, start with trend + volume + latest headlines. Keep strict stop-loss, avoid over-leverage, and scale entries. Latest context: ${context || "market feed currently updating"}.`;
  }

  try {
    const { data } = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a concise trading education assistant. Give beginner-friendly, risk-aware answers. Never provide guaranteed returns."
          },
          {
            role: "user",
            content: `Question: ${question}\nSymbol: ${symbol}\nRecent context: ${context}`
          }
        ],
        temperature: 0.4
      },
      {
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
        },
        timeout: 12000
      }
    );
    return data?.choices?.[0]?.message?.content?.trim() || "I could not generate an answer right now.";
  } catch (error) {
    return `I could not reach the AI model right now. For ${symbol}, focus on trend, risk limits, and top headlines before taking positions.`;
  }
}
