import axios from "axios";
import { fetchStockData, fetchNewsData } from "./dataService.js";
import { generateSentimentScore } from "./sentimentEngine.js";

function deepseekKey() {
  return process.env.DEEPSEEK_API_KEY;
}
function deepseekUrl() {
  return process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
}
function openrouterKey() {
  return process.env.OPENROUTER_API_KEY;
}
function openrouterModel() {
  return process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-oss-120b";
}
function deepseekModel() {
  return process.env.DEEPSEEK_CHAT_MODEL || "deepseek-chat";
}

const MAX_MESSAGES = 24;
const MAX_CONTENT = 12000;

const BASE_SYSTEM = `You are Sentilyze AI — a capable, friendly assistant (similar in spirit to DeepSeek Chat).

You can help with:
- General questions, reasoning, coding, writing, math, and explanations
- Markets and tickers when the user asks (use any "live context" snippet if provided; it may be delayed)
- Clear, structured answers; use markdown when it helps (headings, lists, code fences)

Rules:
- Be honest about uncertainty. Do not fabricate live prices if no context was given.
- For finance: this is educational, not personalized investment advice.
- Keep answers focused; offer to go deeper if the topic is large.`;

async function buildMarketSnippet(symbol) {
  const sym = String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, "");
  if (!sym) return null;
  try {
    const [stock, news] = await Promise.all([fetchStockData(sym, { mode: "api" }), fetchNewsData(sym)]);
    const s = generateSentimentScore(news);
    const ch = Number(stock.changePercent ?? 0);
    return (
      `[Live snapshot — not a recommendation] Symbol ${stock.symbol}: last ~${stock.price} (${ch.toFixed(2)}% change). ` +
      `Headline sentiment model: ${s.sentimentScore}/100 (${s.sentimentLabel}); ${s.positivePercent}% positive / ${s.negativePercent}% negative / ${s.neutralPercent}% neutral in recent sample.`
    );
  } catch {
    return `[Context] Could not load live data for ${sym}.`;
  }
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
    if (!role) continue;
    const content = String(m.content ?? "").trim().slice(0, MAX_CONTENT);
    if (!content) continue;
    out.push({ role, content });
  }
  return out.slice(-MAX_MESSAGES);
}

async function callDeepSeek(systemContent, cleaned) {
  const { data } = await axios.post(
    deepseekUrl(),
    {
      model: deepseekModel(),
      messages: [{ role: "system", content: systemContent }, ...cleaned],
      temperature: 0.6,
      max_tokens: 4096
    },
    {
      headers: {
        Authorization: `Bearer ${deepseekKey()}`,
        "Content-Type": "application/json"
      },
      timeout: 120000
    }
  );
  return data?.choices?.[0]?.message?.content;
}

async function callOpenRouter(systemContent, cleaned) {
  const { data } = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: openrouterModel(),
      messages: [{ role: "system", content: systemContent }, ...cleaned],
      temperature: 0.5,
      max_tokens: 1200
    },
    {
      headers: {
        Authorization: `Bearer ${openrouterKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:5173",
        "X-Title": "Sentilyze AI Chat"
      },
      timeout: 180000
    }
  );
  return data?.choices?.[0]?.message?.content;
}

/**
 * @param {{ messages: Array<{role:'user'|'assistant', content: string}>, symbol?: string }} opts
 * @returns {Promise<string>} assistant plain text (may include markdown)
 */
export async function runDeepSeekChat({ messages, symbol }) {
  if (!deepseekKey() && !openrouterKey()) {
    const err = new Error("NO_AI_PROVIDER");
    err.code = "NO_KEY";
    throw err;
  }

  const cleaned = sanitizeMessages(messages);
  if (!cleaned.length) {
    const err = new Error("EMPTY_MESSAGES");
    err.code = "EMPTY";
    throw err;
  }
  if (cleaned[cleaned.length - 1].role !== "user") {
    const err = new Error("LAST_NOT_USER");
    err.code = "BAD_TURN";
    throw err;
  }

  let systemContent = BASE_SYSTEM;
  if (symbol) {
    const snippet = await buildMarketSnippet(symbol);
    if (snippet) {
      systemContent += `\n\n---\n${snippet}\n---\n`;
    }
  }

  let raw;
  if (deepseekKey()) {
    raw = await callDeepSeek(systemContent, cleaned);
  } else {
    raw = await callOpenRouter(systemContent, cleaned);
  }

  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) {
    const err = new Error("EMPTY_MODEL_REPLY");
    err.code = "MODEL_EMPTY";
    throw err;
  }
  return text;
}

/** True if either DeepSeek direct API or OpenRouter is configured. */
export function isAiChatConfigured() {
  return Boolean(deepseekKey() || openrouterKey());
}

export function isDeepSeekConfigured() {
  return Boolean(deepseekKey());
}

export function getAiChatStatus() {
  return {
    ready: isAiChatConfigured(),
    deepseek: Boolean(deepseekKey()),
    openrouter: Boolean(openrouterKey())
  };
}
