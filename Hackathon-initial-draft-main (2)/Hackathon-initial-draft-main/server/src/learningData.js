/**
 * Learning curriculum: tracks (structured courses), topic pages (cards), masterclass videos.
 */

export const MASTERCLASS_VIDEOS = [
  {
    id: "ZCFkWDdmFp0",
    title: "How does the stock market work?",
    channel: "TED-Ed",
    description: "A clear animated overview of exchanges, shares, and why prices move."
  },
  {
    id: "PHe0bXAIuk0",
    title: "How The Economic Machine Works",
    channel: "Ray Dalio",
    description: "Foundational macro cycles: productivity, credit, and short- and long-term debt."
  },
  {
    id: "RzkD_dTE0fQ",
    title: "The incredible inventions of intuitive AI",
    channel: "Maurice Conti · TED",
    description: "How AI augments human decision-making—relevant to modern sentiment and data tools."
  },
  {
    id: "ajGdy9eyZpk",
    title: "How AI can save our humanity",
    channel: "Kai-Fu Lee · TED",
    description: "AI capabilities, economics, and how humans and machines can complement each other."
  },
  {
    id: "RUqphAWBPdE",
    title: "The Stock Market for Beginners",
    channel: "The Plain Bagel",
    description: "Practical walkthrough of markets for everyday investors."
  },
  {
    id: "lNdOtuxGe4k",
    title: "How to Invest for Beginners",
    channel: "Ali Abdaal",
    description: "Simple habits, index funds, and long-term mindset."
  }
];

const staticArticles = {
  "stock-market": [
    {
      title: "Investor.gov — Introduction to Investing",
      summary: "U.S. SEC educational resource on stocks, risk, and diversification.",
      url: "https://www.investor.gov/introduction-investing",
      source: "SEC / Investor.gov",
      publishedAt: null
    },
    {
      title: "Investopedia — Stock Market Explained",
      summary: "How exchanges, orders, and indices fit together.",
      url: "https://www.investopedia.com/terms/s/stockmarket.asp",
      source: "Investopedia",
      publishedAt: null
    }
  ],
  "how-to-invest": [
    {
      title: "Investor.gov — Start Investing",
      summary: "Steps to open an account, understand fees, and set goals.",
      url: "https://www.investor.gov/additional-resources/how-invest",
      source: "SEC / Investor.gov",
      publishedAt: null
    },
    {
      title: "Investopedia — How to Start Investing in 2025",
      summary: "Brokerage basics, asset types, and risk tolerance.",
      url: "https://www.investopedia.com/how-to-start-investing-4588908",
      source: "Investopedia",
      publishedAt: null
    }
  ],
  "risk-management": [
    {
      title: "Investopedia — Risk Management in Trading",
      summary: "Position sizing, stops, and portfolio-level controls.",
      url: "https://www.investopedia.com/trading/risk-management/",
      source: "Investopedia",
      publishedAt: null
    }
  ],
  "index-funds": [
    {
      title: "Investor.gov — Mutual Funds and ETFs",
      summary: "How index funds track benchmarks and charge expense ratios.",
      url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-funds-etfs",
      source: "SEC / Investor.gov",
      publishedAt: null
    },
    {
      title: "Investopedia — Index Fund",
      summary: "Passive investing and tracking error explained.",
      url: "https://www.investopedia.com/terms/i/indexfund.asp",
      source: "Investopedia",
      publishedAt: null
    }
  ],
  "chart-patterns": [
    {
      title: "Investopedia — Technical Analysis",
      summary: "Price, volume, and common chart-reading concepts.",
      url: "https://www.investopedia.com/technical-analysis-4689657",
      source: "Investopedia",
      publishedAt: null
    }
  ],
  "crypto-basics": [
    {
      title: "Investor.gov — Thinking About Buying Crypto?",
      summary: "Risks, scams, and regulatory context from U.S. regulators.",
      url: "https://www.investor.gov/introduction-investing/crypto-assets",
      source: "SEC / Investor.gov",
      publishedAt: null
    },
    {
      title: "Investopedia — Blockchain Explained",
      summary: "Ledgers, consensus, and why tokens differ from stocks.",
      url: "https://www.investopedia.com/terms/b/blockchain.asp",
      source: "Investopedia",
      publishedAt: null
    }
  ]
};

export function getStaticArticles(topicKey) {
  return staticArticles[topicKey] || [];
}

export function mergeLearningArticles(lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const a of list || []) {
      const k = String(a.url || a.title || "")
        .toLowerCase()
        .slice(0, 120);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(a);
    }
  }
  return out;
}

export const TOPIC_PAGES = {
  "stock-market": {
    id: "stock-market",
    title: "What is the Stock Market?",
    subtitle: "Exchanges, shares, and why prices move",
    sections: [
      {
        heading: "What you are trading",
        paragraphs: [
          "A stock (share) is a small ownership slice of a public company. When you buy a share on an exchange, you are buying from another participant—not usually from the company itself.",
          "Exchanges like the NYSE or NSE match buyers and sellers. The price you see is the last trade where supply and demand met."
        ]
      },
      {
        heading: "Indices and benchmarks",
        paragraphs: [
          "Indices such as the S&P 500 or Nifty 50 track baskets of stocks. They help investors compare performance and express a view on a whole market or sector without picking single names."
        ]
      },
      {
        heading: "Why Sentilyze fits here",
        paragraphs: [
          "Headlines and social sentiment often move prices before traditional filings update. Learning the mechanics of the market helps you interpret Sentilyze’s sentiment layer alongside price and volume."
        ]
      }
    ]
  },
  "how-to-invest": {
    id: "how-to-invest",
    title: "How to Invest?",
    subtitle: "From first account to a repeatable process",
    sections: [
      {
        heading: "Goals and time horizon",
        paragraphs: [
          "Decide what the money is for (retirement, house, learning) and when you need it. Longer horizons can usually tolerate more volatility if you accept the risk."
        ]
      },
      {
        heading: "Account and products",
        paragraphs: [
          "Most beginners use a regulated brokerage or bank platform. Compare fees, tax treatment (where you live), and whether you want self-directed trading or advisory help.",
          "Common starting points: broad index ETFs or mutual funds, then add individual stocks as you learn."
        ]
      },
      {
        heading: "Process over prediction",
        paragraphs: [
          "A simple rules-based process—how much to invest each month, when to rebalance, max position size—often beats trying to time every headline. Use Sentilyze as one input, not the only one."
        ]
      }
    ]
  },
  "risk-management": {
    id: "risk-management",
    title: "Risk Management",
    subtitle: "Protecting capital while staying in the game",
    sections: [
      {
        heading: "Position sizing",
        paragraphs: [
          "Never risk so much on one trade that a normal bad streak wipes you out. Many traders cap a single position at a small fraction of total capital and scale up only with experience."
        ]
      },
      {
        heading: "Stop-loss and invalidation",
        paragraphs: [
          "A stop-loss is a pre-defined exit when the market proves your idea wrong—not just when you feel uncomfortable. Define what would invalidate your thesis before you enter."
        ]
      },
      {
        heading: "Diversification",
        paragraphs: [
          "Spread exposure across sectors, geographies, or asset classes so one shock does not dominate outcomes. Correlations rise in crises, so diversification is imperfect but still useful."
        ]
      }
    ]
  },
  "index-funds": {
    id: "index-funds",
    title: "Index Funds",
    subtitle: "Passive exposure and compounding",
    sections: [
      {
        heading: "What is an index fund?",
        paragraphs: [
          "An index fund (or ETF tracking an index) holds the same stocks as a published index, weighted similarly. You earn roughly the market’s return minus a small annual fee (expense ratio)."
        ]
      },
      {
        heading: "Why investors use them",
        paragraphs: [
          "They are simple, transparent, and low-friction for long horizons. You are not betting that a fund manager will outperform every year—you are accepting market returns with minimal drag."
        ]
      },
      {
        heading: "What to check",
        paragraphs: [
          "Expense ratio, tracking error, liquidity (for ETFs), and tax rules in your country. Read the fund factsheet to see exactly which index is replicated."
        ]
      }
    ]
  },
  "chart-patterns": {
    id: "chart-patterns",
    title: "Chart Patterns",
    subtitle: "Reading price action in plain language",
    sections: [
      {
        heading: "Candles and timeframes",
        paragraphs: [
          "Each candle summarizes open, high, low, and close for a period (1m, 1d, etc.). Longer timeframes filter noise; shorter ones show intraday structure. Match timeframe to your holding period."
        ]
      },
      {
        heading: "Support and resistance",
        paragraphs: [
          "Support is a zone where buying has historically appeared; resistance is where selling has capped rallies. These are not magic lines— they are areas where order flow clustered before and may again."
        ]
      },
      {
        heading: "Common patterns (easy mental models)",
        paragraphs: [
          "Higher highs and higher lows suggest uptrend; lower highs and lower lows suggest downtrend. Consolidation (range) means balance until a breakout with volume often signals the next leg.",
          "Combine patterns with volume and context (news, sentiment). No pattern works every time; probability and risk control matter more than the name of the shape."
        ]
      }
    ]
  },
  "crypto-basics": {
    id: "crypto-basics",
    title: "Crypto Basics",
    subtitle: "Blockchain, tokens, and risk",
    sections: [
      {
        heading: "Blockchain in one paragraph",
        paragraphs: [
          "A blockchain is a shared ledger updated by a network. Tokens can represent many things; “crypto” often means transferable digital assets whose supply and rules are defined by code."
        ]
      },
      {
        heading: "Different from stocks",
        paragraphs: [
          "Equities are claims on a company’s cash flows and governance. Many crypto tokens do not entitle you to corporate profits. Regulatory treatment and custody also differ—learn local rules."
        ]
      },
      {
        heading: "Volatility and security",
        paragraphs: [
          "Crypto markets can move fast on narrative and liquidity. Use reputable exchanges or self-custody carefully, enable 2FA, and assume phishing and scams are common."
        ]
      }
    ]
  }
};

function lessonsMarketBasics() {
  return [
    {
      id: "mb-1",
      title: "What is a stock?",
      durationMin: 6,
      content: [
        "A share of stock represents fractional ownership in a company. Public companies list shares on exchanges so investors can trade them with transparent pricing.",
        "Your upside comes from price appreciation and sometimes dividends; your downside is that the company can underperform or fail. Limited liability means you generally cannot lose more than you invested in the shares."
      ]
    },
    {
      id: "mb-2",
      title: "Orders: market vs limit",
      durationMin: 7,
      content: [
        "A market order fills immediately at the best available prices. A limit order only fills at your price or better, but might not fill if the market moves away.",
        "Beginners often use limit orders to avoid surprises in fast markets. Check your broker’s order types and fees."
      ]
    },
    {
      id: "mb-3",
      title: "Why prices move",
      durationMin: 8,
      content: [
        "In the short run, prices reflect collective expectations, liquidity, and news. Earnings, rates, and sentiment can all shift those expectations quickly.",
        "Sentilyze focuses on narrative and sentiment signals that often lead or amplify moves—use them together with fundamentals and risk limits."
      ]
    },
    {
      id: "mb-4",
      title: "Indices and sectors",
      durationMin: 7,
      content: [
        "Sectors (tech, finance, energy) rotate as the cycle changes. Indices group many stocks so you can measure broad trends without watching every ticker.",
        "Tracking sector sentiment can tell you whether optimism is narrow (few leaders) or broad (healthy participation)."
      ]
    },
    {
      id: "mb-5",
      title: "Your first checklist",
      durationMin: 5,
      content: [
        "Before each trade: thesis in one sentence, time horizon, invalidation level, position size as % of portfolio, and news sources you trust.",
        "Writing it down reduces impulsive decisions when sentiment spikes on social media."
      ]
    }
  ];
}

function lessonsRisk() {
  return [
    {
      id: "rm-1",
      title: "Risk per trade",
      durationMin: 8,
      content: [
        "Define maximum loss per trade as a percent of account equity. If you risk 2% per trade, five losses in a row still leave most of the account intact.",
        "Position size = (risk budget) / (distance to stop). Wider stops require smaller size for the same dollar risk."
      ]
    },
    {
      id: "rm-2",
      title: "Drawdowns and psychology",
      durationMin: 7,
      content: [
        "A drawdown is peak-to-trough decline in your equity curve. Expect them; plan position sizes so emotionally you can stick to the process.",
        "After large wins or losses, take a short break before resizing risk—recency bias pushes people to overtrade."
      ]
    },
    {
      id: "rm-3",
      title: "Correlation shocks",
      durationMin: 8,
      content: [
        "In stress periods, stocks often move together and hedges can fail briefly. Cash and uncorrelated assets are part of risk management, not just stop orders.",
        "Diversify across ideas, not only across tickers in the same narrative."
      ]
    },
    {
      id: "rm-4",
      title: "Stop-loss discipline",
      durationMin: 6,
      content: [
        "Move stops to breakeven only when the trade proves itself; avoid widening stops to avoid being wrong—that turns a defined risk into a large undefined risk.",
        "Sentiment extremes can be exit signals when they diverge from your original thesis."
      ]
    }
  ];
}

function lessonsMacro() {
  return [
    {
      id: "mp-1",
      title: "Macro vs micro",
      durationMin: 8,
      content: [
        "Macro drivers include rates, inflation, employment, and currency. Micro is company-specific revenue, margins, and guidance.",
        "Good macro can lift many boats; bad company micro can still sink a single stock."
      ]
    },
    {
      id: "mp-2",
      title: "Rates and discounting",
      durationMin: 9,
      content: [
        "Higher risk-free rates reduce the present value of future cash flows—often hurting long-duration growth stocks more than value names in textbook models.",
        "Watch central-bank guidance and real yields; they reset expectations across asset classes."
      ]
    },
    {
      id: "mp-3",
      title: "From headline to watchlist",
      durationMin: 10,
      content: [
        "When a macro event hits: identify channels (demand, margins, funding), map sectors most exposed, then pick liquid leaders in those sectors.",
        "Sentilyze can surface which names are gathering narrative momentum after the headline."
      ]
    },
    {
      id: "mp-4",
      title: "Scenario planning",
      durationMin: 8,
      content: [
        "Write bull, base, and bear cases with triggers for each. If only one scenario is imaginable, you are probably overconfident.",
        "Update scenarios when data prints—not when social sentiment alone spikes."
      ]
    }
  ];
}

const TRACK_CURATED = {
  "market-basics": [
    {
      title: "SEC — Investor Bulletins",
      summary: "Short official notes on market structure and products.",
      url: "https://www.investor.gov/investor-bulletins",
      source: "SEC",
      publishedAt: null
    }
  ],
  "risk-management": [
    {
      title: "Investopedia — Value at Risk (overview)",
      summary: "Conceptual primer on measuring portfolio downside.",
      url: "https://www.investopedia.com/terms/v/var.asp",
      source: "Investopedia",
      publishedAt: null
    }
  ],
  "macro-plan": [
    {
      title: "FRED — Economic Data",
      summary: "Free charts for rates, inflation, and employment.",
      url: "https://fred.stlouisfed.org/",
      source: "St. Louis Fed",
      publishedAt: null
    }
  ]
};

export const LEARNING_TRACKS = [
  {
    id: "market-basics",
    title: "Market Basics",
    level: "Beginner",
    summary: "Understand price action, sectors, and sentiment signals.",
    lessons: lessonsMarketBasics(),
    articleTopicKey: "market-basics",
    staticArticleKey: "stock-market",
    curatedArticles: TRACK_CURATED["market-basics"]
  },
  {
    id: "risk-management",
    title: "Risk Management",
    level: "Beginner+",
    summary: "Position sizing, stop-loss logic, and drawdown control.",
    lessons: lessonsRisk(),
    articleTopicKey: "risk-management-track",
    staticArticleKey: "risk-management",
    curatedArticles: TRACK_CURATED["risk-management"]
  },
  {
    id: "macro-plan",
    title: "Macro to Trade Plan",
    level: "Intermediate",
    summary: "Convert macro headlines into actionable watchlists.",
    lessons: lessonsMacro(),
    articleTopicKey: "macro-plan",
    staticArticleKey: "how-to-invest",
    curatedArticles: TRACK_CURATED["macro-plan"]
  }
];

export function getTrackSummaries() {
  return LEARNING_TRACKS.map((t) => ({
    id: t.id,
    title: t.title,
    level: t.level,
    summary: t.summary,
    lessons: t.lessons.length
  }));
}

export function getTrackDetailById(id) {
  const t = LEARNING_TRACKS.find((x) => x.id === id);
  return t || null;
}

export function getTopicPage(id) {
  return TOPIC_PAGES[id] || null;
}
