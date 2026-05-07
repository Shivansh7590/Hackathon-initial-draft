import axios from "axios";
import { fetchStockData, fetchNewsData } from "./dataService.js";
import { generateSentimentScore, buildRecommendation } from "./sentimentEngine.js";

function deepseekKey() {
  return process.env.DEEPSEEK_API_KEY;
}
function deepseekUrl() {
  return process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
}
function deepseekModel() {
  return process.env.DEEPSEEK_CHAT_MODEL || "deepseek-chat";
}

const NAME_HINTS = [
  [/nvidia|nvda/i, "NVDA"],
  [/apple|aapl/i, "AAPL"],
  [/tesla|tsla/i, "TSLA"],
  [/microsoft|msft/i, "MSFT"],
  [/google|alphabet|googl/i, "GOOGL"],
  [/meta|facebook|fb\b/i, "META"],
  [/amazon|amzn/i, "AMZN"],
  [/amd\b/i, "AMD"],
  [/intel|intc/i, "INTC"],
  [/netflix|nflx/i, "NFLX"],
  [/broadcom|avgo/i, "AVGO"],
  [/jpmorgan|jpm\b/i, "JPM"],
  [/reliance|reliance industries/i, "RELIANCE.BSE"],
  [/tcs\b|tata consultancy/i, "TCS.BSE"]
];

export function resolveSymbolFromQuestion(text, fallback) {
  const t = String(text || "");
  const tick = t.match(/\b([A-Z]{1,5}(?:\.[A-Z]{2,4})?)\b/);
  if (tick) return tick[1].toUpperCase();
  for (const [re, sym] of NAME_HINTS) {
    if (re.test(t)) return sym;
  }
  return String(fallback || "AAPL").toUpperCase();
}

function buildContextPayload(stock, sentiment, recommendation) {
  const headlines = (sentiment.articleBreakdown || []).slice(0, 6).map((r) => ({
    title: r.title,
    tag: r.sentimentTag || "Neutral"
  }));
  const neg = sentiment.negativePercent ?? 0;
  const pos = sentiment.positivePercent ?? 0;
  const shiftHint = Number((((pos - neg) / 100) * 0.8).toFixed(2));
  return {
    symbol: stock.symbol,
    price: stock.price,
    changePercent: stock.changePercent,
    sentimentScore: sentiment.sentimentScore,
    sentimentLabel: sentiment.sentimentLabel,
    positivePercent: pos,
    negativePercent: neg,
    neutralPercent: sentiment.neutralPercent,
    recommendation: recommendation?.action || "Hold",
    headlineSample: headlines,
    narrativeShift: shiftHint
  };
}

function fallbackNarration(ctx, question) {
  const { symbol, changePercent, sentimentScore, positivePercent, negativePercent, recommendation } = ctx;
  const dir = (changePercent ?? 0) >= 0 ? "firm" : "soft";
  const tone =
    sentimentScore >= 60 ? "constructive" : sentimentScore <= 40 ? "cautious" : "mixed";
  return `${symbol} is trading with a ${dir} tape—about ${changePercent ?? 0}% on the session. Sentilyze reads ${sentimentScore} out of 100 (${tone} tone): roughly ${positivePercent}% positive versus ${negativePercent}% negative in recent headlines. The desk leans ${recommendation} on narrative risk, not price targets. For your question—${question.slice(0, 120)}—watch the next two sessions for confirmation before sizing up.`;
}

async function deepSeekNarrate({ question, contextBlock }) {
  const key = deepseekKey();
  if (!key) return null;
  const { data } = await axios.post(
    deepseekUrl(),
    {
      model: deepseekModel(),
      messages: [
        {
          role: "system",
          content:
            "You are Sentilyze Bull/Bear — a single fluent voice that blends bull and bear viewpoints like a market narrator. " +
            "Answer the user's spoken question using ONLY the JSON context provided (price, changePercent, sentiment scores, headline tags, recommendation). " +
            "Sound conversational for text-to-speech: short sentences, no bullet lists, no markdown. " +
            "If helpful, mention a 'sentiment shift' as a small decimal (e.g. -0.42) derived from positive vs negative headline mix vs neutral. " +
            "Optionally cite 'expert-style' skew as approximate % bullish vs cautious from the headline tags—not real tweets unless in context. " +
            "Stay under 110 words. Disclaim: not financial advice."
        },
        {
          role: "user",
          content: `CONTEXT (JSON):\n${contextBlock}\n\nUSER QUESTION:\n${question}`
        }
      ],
      temperature: 0.45,
      max_tokens: 400
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      timeout: 45000
    }
  );
  const text = data?.choices?.[0]?.message?.content?.trim();
  return text || null;
}

/**
 * Voice-assistant style answer with live quote + sentiment + optional DeepSeek narration.
 */
export async function generateBullBearAnswer(question, defaultSymbol) {
  const q = String(question || "").trim();
  const sym = resolveSymbolFromQuestion(q, defaultSymbol);

  const [stock, news] = await Promise.all([fetchStockData(sym, { mode: "api" }), fetchNewsData(sym)]);
  const sentiment = generateSentimentScore(news);
  const recommendation = buildRecommendation(sentiment.sentimentScore, sentiment, news);
  const ctx = buildContextPayload(stock, sentiment, recommendation);

  const contextBlock = JSON.stringify(ctx, null, 0);

  let answer = null;
  let source = "local";
  try {
    const ds = await deepSeekNarrate({ question: q || `What is moving ${sym}?`, contextBlock });
    if (ds) {
      answer = ds;
      source = "deepseek";
    }
  } catch {
    answer = null;
  }
  if (!answer) {
    answer = fallbackNarration(ctx, q || `What's the story on ${sym}?`);
    source = "local";
  }

  return {
    symbol: sym,
    answer,
    source,
    context: {
      price: ctx.price,
      changePercent: ctx.changePercent,
      sentimentScore: ctx.sentimentScore,
      recommendation: ctx.recommendation
    }
  };
}
