import axios from "axios";

const cache = new Map();
const CACHE_MS = 60_000;

function openrouterKey() {
  return process.env.OPENROUTER_API_KEY;
}

function openrouterModel() {
  return process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";
}

function readCache(key) {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() - row.ts > CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return row.value;
}

function writeCache(key, value) {
  cache.set(key, { ts: Date.now(), value });
}

function fallback(ruleRecommendation, sentiment) {
  return {
    action: ruleRecommendation.action,
    explanation: ruleRecommendation.explanation,
    insightNarrative: ruleRecommendation.insightNarrative,
    sentimentScore: Number(sentiment?.sentimentScore ?? 50),
    source: "rules"
  };
}

function normalizeAction(value, fallbackAction) {
  const s = String(value || "").trim().toUpperCase();
  if (s.includes("BUY")) return "BUY";
  if (s.includes("SELL")) return "SELL";
  if (s.includes("HOLD")) return "HOLD";
  return fallbackAction;
}

function clampScore(v, fallbackScore) {
  const n = Number(v);
  if (!Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(Number(fallbackScore) || 50)));
  return Math.max(0, Math.min(100, Math.round(n)));
}

function extractJsonObject(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // try extracting the first JSON object span
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseStructuredText(raw, fallbackAction, fallbackScore, fallbackText) {
  const txt = String(raw || "");
  const actionMatch = txt.match(/action\s*[:\-]\s*(buy|hold|sell)/i);
  const scoreMatch = txt.match(/score\s*[:\-]\s*(\d{1,3})/i);
  const reasonMatch = txt.match(/reason(?:ing)?\s*[:\-]\s*([\s\S]{8,})/i);
  return {
    action: normalizeAction(actionMatch?.[1], fallbackAction),
    explanation: String(reasonMatch?.[1] || txt || fallbackText).trim(),
    insightNarrative: String(txt || fallbackText).trim(),
    sentimentScore: clampScore(scoreMatch?.[1], fallbackScore),
    source: "model"
  };
}

async function callAdvisorModel(prompt, temperature = 0.15, maxTokens = 450) {
  const { data } = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: openrouterModel(),
      messages: [
        { role: "system", content: "You are a market strategist. Return concise outputs exactly as asked." },
        { role: "user", content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    },
    {
      headers: {
        Authorization: `Bearer ${openrouterKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:5173",
        "X-Title": "Sentilyze Advisor"
      },
      timeout: 35000
    }
  );
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

export async function buildModelRecommendation({ symbol, stock, sentiment, news, ruleRecommendation }) {
  if (!openrouterKey()) return fallback(ruleRecommendation, sentiment);
  const key = `${symbol}:${stock?.price}:${stock?.changePercent}:${sentiment?.sentimentScore}:${news?.length || 0}`;
  const cached = readCache(key);
  if (cached) return cached;

  const newsTitles = (Array.isArray(news) ? news : [])
    .slice(0, 8)
    .map((n) => `- ${n?.title || ""}`)
    .join("\n");

  const promptJson = [
    "You are a market strategist.",
    "Return strict JSON only with keys: action, explanation, insightNarrative, sentimentScore.",
    'action must be one of: "BUY","HOLD","SELL".',
    "sentimentScore must be an integer 0-100.",
    "explanation max 2 sentences, practical and data-grounded.",
    "Do not mention AI, model, or uncertainty disclaimers.",
    "",
    `Symbol: ${symbol}`,
    `Price: ${stock?.price}`,
    `ChangePercent: ${stock?.changePercent}`,
    `Currency: ${stock?.currency}`,
    `Current sentiment score: ${sentiment?.sentimentScore}`,
    `Sentiment split: +${sentiment?.positivePercent}% / -${sentiment?.negativePercent}% / neutral ${sentiment?.neutralPercent}%`,
    "Recent headlines:",
    newsTitles || "- no headlines"
  ].join("\n");

  try {
    // Attempt 1: strict JSON response.
    const rawJson = await callAdvisorModel(promptJson, 0.1, 420);
    const parsed = extractJsonObject(rawJson);
    if (parsed && typeof parsed === "object") {
      const out = {
        action: normalizeAction(parsed?.action, ruleRecommendation.action),
        explanation: String(parsed?.explanation || ruleRecommendation.explanation).trim(),
        insightNarrative: String(parsed?.insightNarrative || parsed?.explanation || ruleRecommendation.insightNarrative).trim(),
        sentimentScore: clampScore(parsed?.sentimentScore, sentiment?.sentimentScore),
        source: "model"
      };
      writeCache(key, out);
      return out;
    }

    // Attempt 2: structured plain text, then parse.
    const promptText = [
      "Respond in exactly 3 lines:",
      "ACTION: BUY|HOLD|SELL",
      "SCORE: <0-100 integer>",
      "REASON: <1-2 concise sentences with concrete rationale>",
      "",
      `Symbol: ${symbol}`,
      `Price: ${stock?.price}`,
      `ChangePercent: ${stock?.changePercent}`,
      `Currency: ${stock?.currency}`,
      `Current sentiment score: ${sentiment?.sentimentScore}`,
      `Sentiment split: +${sentiment?.positivePercent}% / -${sentiment?.negativePercent}% / neutral ${sentiment?.neutralPercent}%`,
      "Recent headlines:",
      newsTitles || "- no headlines"
    ].join("\n");
    const rawText = await callAdvisorModel(promptText, 0.2, 260);
    const out = parseStructuredText(
      rawText,
      ruleRecommendation.action,
      sentiment?.sentimentScore,
      ruleRecommendation.explanation
    );
    writeCache(key, out);
    return out;
  } catch {
    return fallback(ruleRecommendation, sentiment);
  }
}
