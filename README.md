# Sentilyze — AI Stock Market Sentiment Dashboard

Production-style hackathon demo: **React (Vite)**, **Tailwind CSS v4** + **global CSS variables**, **Recharts**, **Axios**, **Lucide** icons. Backend: **Express** with Alpha Vantage + NewsAPI (or deterministic mocks).

## Features

- **Navbar**: brand, symbol search, live pulse, notification + user affordances  
- **Sidebar**: Dashboard, Trending, Alerts, Settings (scroll-to-section)  
- **Metrics**: Positive / Negative / Neutral %, **AI recommendation** (BUY / HOLD / SELL)  
- **Chart**: Dual-axis **price vs sentiment** (Recharts)  
- **AI Insight**: Narrative + key factors + glow styling  
- **Sentiment meter**: Fear → Greed bar (gradient)  
- **Trending**: Tickers with price move + sentiment index  
- **Heatmap**: Cross-ticker sentiment snapshot  
- **News**: Headlines with **Bullish / Bearish / Neutral** tags  
- **Alerts**: Volatility + sentiment warnings  

## AI logic (server)

- Keyword scoring on headlines (`server/src/sentimentEngine.js`)  
- **sentimentScore** 0–100, label Bullish / Bearish / Neutral  
- **Recommendation**: `> 65` BUY, `< 35` SELL, else HOLD  
- **Insight narrative** from score + news mix + volume note  

## Run

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- App: **http://localhost:5173**  
- API: **http://localhost:4000**  

### Quick run commands (later)

```bash
# from repo root
npm run dev
```

Optional split terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

Set in **`server/.env`**:

- `ALPHA_VANTAGE_API_KEY` — live intraday prices  
- `NEWSAPI_API_KEY` — live headlines  
- Without keys: **stable mock** data (not random noise per request for same symbol)  

## Client layout

```
client/src/
  api/api.js           # Axios: getDashboard, getTrending
  components/          # Navbar, Sidebar, Dashboard, cards, chart, news, alerts
  utils/sentiment.js   # Display helpers
  styles/styles.css    # :root tokens
  styles/components.css
  index.css            # @import "tailwindcss"
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/:symbol` | Stock series, news, sentiment, recommendation, meter, alerts |
| `GET /api/trending` | TSLA, AAPL, NVDA, MSFT, GOOGL, META + sentiment each |

## Netlify deployment (frontend) + API host

This repo deploys only the Vite frontend to Netlify. The Express API must be hosted separately (Render/Railway/VM/etc).

1. Deploy this repo to Netlify (build is already configured via `netlify.toml`).
2. In Netlify Site Settings -> Environment Variables, add:
   - `VITE_BACKEND_URL=https://your-api-host.com` (no trailing slash)
3. Trigger **Redeploy** after setting env vars.
4. On your API host, set server CORS env:
5. Restart API service after env update.

If `VITE_BACKEND_URL` is missing, the app shows "Production API URL missing" and API calls will not work.
