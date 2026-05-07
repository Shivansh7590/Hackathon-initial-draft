/**
 * Rule-based sentiment analysis for news headlines.
 * Positive / negative lexicons + keyword trend boosts.
 */

const POSITIVE_WORDS = new Set([
  "gain", "gains", "gainz", "rally", "rallies", "surge", "surges", "beat", "beats", "bull", "bullish",
  "growth", "profit", "profits", "strong", "upgrade", "upgrades", "outperform", "buy", "optimistic",
  "record", "high", "momentum", "recovery", "rebound", "soar", "jump", "positive", "expansion",
  "innovation", "breakthrough", "dividend", "beaten", "upside", "outlook", "raises", "raised"
]);

const NEGATIVE_WORDS = new Set([
  "loss", "losses", "decline", "declines", "fall", "falls", "drop", "drops", "bear", "bearish",
  "weak", "downgrade", "downgrades", "cut", "cuts", "sell", "risk", "risks", "warning", "miss",
  "misses", "lawsuit", "layoff", "layoffs", "recession", "inflation", "crash", "plunge", "negative",
  "concern", "concerns", "probe", "investigation", "fraud", "bankruptcy", "volatile", "selloff"
]);

const TREND_KEYWORDS = {
  positive: ["ai", "chip", "semiconductor", "earnings beat", "guidance raise", "partnership", "contract"],
  negative: ["regulation", "ban", "probe", "delay", "strike", "debt", "default"]
};

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreText(text) {
  const tokens = tokenize(text);
  let score = 0;
  for (const t of tokens) {
    if (POSITIVE_WORDS.has(t)) score += 1;
    if (NEGATIVE_WORDS.has(t)) score -= 1;
  }
  const lower = String(text || "").toLowerCase();
  for (const kw of TREND_KEYWORDS.positive) {
    if (lower.includes(kw)) score += 0.5;
  }
  for (const kw of TREND_KEYWORDS.negative) {
    if (lower.includes(kw)) score -= 0.5;
  }
  return score;
}

function classifyArticle(headline, summary) {
  const combined = `${headline} ${summary}`;
  const raw = scoreText(combined);
  if (raw > 0.25) return "positive";
  if (raw < -0.25) return "negative";
  return "neutral";
}

/**
 * @param {Array<{ title: string, summary?: string }>} articles
 * @returns {{
 *   sentimentScore: number,
 *   sentimentLabel: string,
 *   positivePercent: number,
 *   negativePercent: number,
 *   neutralPercent: number,
 *   articleBreakdown: Array<{ title: string, label: string, score: number }>
 * }}
 */
export function generateSentimentScore(articles) {
  const list = Array.isArray(articles) ? articles : [];
  if (!list.length) {
    return {
      sentimentScore: 50,
      sentimentLabel: "Neutral",
      positivePercent: 33,
      negativePercent: 33,
      neutralPercent: 34,
      articleBreakdown: []
    };
  }

  let pos = 0;
  let neg = 0;
  let neu = 0;
  const breakdown = [];

  for (const a of list) {
    const title = a.title || "";
    const summary = a.summary || "";
    const rawScore = scoreText(`${title} ${summary}`);
    const label = classifyArticle(title, summary);
    if (label === "positive") pos += 1;
    else if (label === "negative") neg += 1;
    else neu += 1;
    const tag =
      label === "positive" ? "Bullish" : label === "negative" ? "Bearish" : "Neutral";
    breakdown.push({ title, label, sentimentTag: tag, score: rawScore });
  }

  const total = list.length;
  const positivePercent = Math.round((pos / total) * 100);
  const negativePercent = Math.round((neg / total) * 100);
  const neutralPercent = Math.max(0, 100 - positivePercent - negativePercent);

  const avgRaw =
    breakdown.reduce((s, b) => s + b.score, 0) / Math.max(1, breakdown.length);
  const maxMag = 4;
  const normalized = Math.max(-1, Math.min(1, avgRaw / maxMag));
  const sentimentScore = Math.round(50 + normalized * 50);

  let sentimentLabel = "Neutral";
  if (sentimentScore >= 58) sentimentLabel = "Bullish";
  else if (sentimentScore <= 42) sentimentLabel = "Bearish";

  return {
    sentimentScore,
    sentimentLabel,
    positivePercent,
    negativePercent,
    neutralPercent,
    articleBreakdown: breakdown
  };
}

/**
 * @param {number} sentimentScore 0-100
 * @param {{ positivePercent: number, negativePercent: number, sentimentLabel: string }} sentiment
 * @param {Array} newsArticles
 */
export function sentimentMeterLabel(score) {
  const s = Number(score);
  if (s <= 20) return "Extreme Fear";
  if (s <= 35) return "Fear";
  if (s <= 50) return "Neutral";
  if (s <= 65) return "Greed";
  if (s <= 80) return "Strong Greed";
  return "Extreme Greed";
}

/**
 * Rich narrative for the AI Insight panel (hackathon demo clarity).
 */
export function generateInsightNarrative(sentimentScore, sentiment, newsArticles) {
  const n = newsArticles?.length || 0;
  const posPct = sentiment.positivePercent;
  const negPct = sentiment.negativePercent;
  const neuPct = sentiment.neutralPercent;
  const tone = sentiment.sentimentLabel;

  let momentum = "stable";
  if (sentimentScore >= 60) momentum = "building bullish momentum";
  else if (sentimentScore <= 40) momentum = "showing bearish pressure";

  const volumeNote =
    n >= 10 ? "High headline volume increases confidence in the signal." : "Sample size is moderate; consider more confirmations.";

  return (
    `${tone} conditions (${sentimentScore}/100): roughly ${posPct}% of articles read positive, ` +
    `${negPct}% negative, and ${neuPct}% neutral. Keyword analysis suggests ${momentum}. ${volumeNote}`
  );
}

export function buildRecommendation(sentimentScore, sentiment, newsArticles) {
  let action = "HOLD";
  if (sentimentScore > 65) action = "BUY";
  else if (sentimentScore < 35) action = "SELL";

  const n = newsArticles?.length || 0;
  const posPct = sentiment.positivePercent;
  const negPct = sentiment.negativePercent;
  const trendWord =
    sentimentScore >= 55 ? "increasing" : sentimentScore <= 45 ? "softening" : "stable";

  const explanation =
    `Recommendation: ${action} because approximately ${posPct}% of recent headlines skew positive, ` +
    `${negPct}% skew negative, and aggregate sentiment reads ${sentiment.sentimentLabel.toLowerCase()} ` +
    `(${sentimentScore}/100). News flow appears ${trendWord} across ${n} sampled articles.`;

  const insightNarrative = generateInsightNarrative(sentimentScore, sentiment, newsArticles);

  return {
    action,
    explanation,
    insightNarrative,
    sentimentScore
  };
}
