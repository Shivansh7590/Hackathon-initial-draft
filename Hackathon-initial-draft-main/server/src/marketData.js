export const marketCatalog = {
  dashboard: [
    { symbol: "AAPL", name: "Apple Inc.", market: "us" },
    { symbol: "TSLA", name: "Tesla Inc.", market: "us" },
    { symbol: "RELIANCE.BSE", name: "Reliance Industries", market: "india" },
    { symbol: "INFY.BSE", name: "Infosys", market: "india" }
  ],
  foreign: [
    { symbol: "AAPL", name: "Apple Inc.", market: "us" },
    { symbol: "MSFT", name: "Microsoft", market: "us" },
    { symbol: "TSLA", name: "Tesla Inc.", market: "us" },
    { symbol: "NVDA", name: "NVIDIA", market: "us" },
    { symbol: "GOOGL", name: "Alphabet", market: "us" },
    { symbol: "AMZN", name: "Amazon", market: "us" },
    { symbol: "META", name: "Meta Platforms", market: "us" },
    { symbol: "JPM", name: "JPMorgan Chase", market: "us" }
  ],
  india: [
    { symbol: "RELIANCE.BSE", name: "Reliance Industries", market: "india" },
    { symbol: "INFY.BSE", name: "Infosys", market: "india" },
    { symbol: "TCS.BSE", name: "Tata Consultancy Services", market: "india" },
    { symbol: "HDFCBANK.BSE", name: "HDFC Bank", market: "india" },
    { symbol: "ICICIBANK.BSE", name: "ICICI Bank", market: "india" },
    { symbol: "BHARTIARTL.BSE", name: "Bharti Airtel", market: "india" },
    { symbol: "ITC.BSE", name: "ITC", market: "india" },
    { symbol: "LT.BSE", name: "Larsen & Toubro", market: "india" }
  ],
  minerals: [
    { symbol: "XOM", name: "Exxon Mobil", market: "commodities" },
    { symbol: "SHEL", name: "Shell", market: "commodities" },
    { symbol: "VALE", name: "Vale", market: "commodities" },
    { symbol: "BHP", name: "BHP Group", market: "commodities" },
    { symbol: "RIO", name: "Rio Tinto", market: "commodities" },
    { symbol: "SCCO", name: "Southern Copper", market: "commodities" }
  ],
  forex: [
    { symbol: "EURUSD", name: "Euro / US Dollar", market: "forex" },
    { symbol: "USDINR", name: "US Dollar / Indian Rupee", market: "forex" },
    { symbol: "GBPUSD", name: "Pound / US Dollar", market: "forex" },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", market: "forex" },
    { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", market: "forex" }
  ]
};

export const categoryLabels = {
  dashboard: "Dashboard",
  foreign: "Foreign Market",
  india: "Indian Market",
  minerals: "Minerals & Commodities",
  forex: "Forex"
};
