<div align="center">

# LEET TERMINAL

### Prediction Market Analytics Dashboard

<img src="https://img.shields.io/badge/version-3.2.0-blue?style=for-the-badge" alt="Version">
<img src="https://img.shields.io/badge/status-Beta-yellow?style=for-the-badge" alt="Status">

<br/>

<img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
<img src="https://img.shields.io/badge/Vite-5.0.8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/Chart.js-4.4.0-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js">

<br/><br/>

**A browser-based dashboard for analyzing prediction markets.**  
**Currently supports Polymarket, Kalshi, and Manifold Markets.**

</div>

---

## What This Actually Does

Leet Terminal is a **read-only analytics dashboard** for prediction markets. It fetches real market data and displays it with various analysis tools. 

**It does NOT:**
- Execute trades
- Connect to your wallet for trading
- Provide financial advice
- Use machine learning for predictions

---

## ✅ What's Actually Implemented

### Real Data Integration

| Feature | Polymarket | Kalshi | Manifold | Notes |
|---------|:----------:|:------:|:--------:|-------|
| Market listings | ✅ | ✅ | ✅ | Live from public APIs |
| Current prices | ✅ | ✅ | ✅ | Real bid/ask/last price |
| Order book depth | ✅ | ✅ | ⚠️ | Manifold: synthetic (uses AMM) |
| 24h volume | ✅ | ✅ | ✅ | Real trading volume |
| Price history | ✅ | ⚠️ | ✅ | Kalshi: simulated, Manifold: from bets |
| Open interest | ✅ | ✅ | ✅ | Real contract/bettor counts |

### Analysis Tools

| Tool | Status | What It Does |
|------|:------:|--------------|
| **Price Charts** | ✅ Real | 90-day historical visualization (Polymarket only) |
| **Order Book Display** | ✅ Real | Shows 15-level bid/ask depth |
| **Monte Carlo Simulation** | ✅ Real | 5,000-path risk simulation with configurable parameters |
| **Kelly Criterion Calculator** | ✅ Real | Position sizing (full/half/quarter/eighth Kelly) |
| **Greeks Calculation** | ✅ Real | Delta, Gamma, Theta, Vega, Rho for binary options |
| **Confluence Analysis** | ⚠️ Partial | Shows real signals (volume, spread, imbalance) - NOT predictive |
| **Market Signals Panel** | ⚠️ Partial | Displays market microstructure data - clearly labeled as heuristic |

### Authentication

| Method | Status | Notes |
|--------|:------:|-------|
| Phantom (Solana) | ✅ | Wallet signature verification |
| MetaMask (Ethereum) | ✅ | Wallet signature verification |
| Email/Password | ✅ | Via Supabase (optional) |
| Google OAuth | ✅ | Via Supabase (optional) |

**Note:** Wallet auth is for **identity only** - the app cannot access your funds or execute trades.

### UI Features

- ✅ Bloomberg-style terminal aesthetic
- ✅ Resizable panel layout
- ✅ Platform filter (Polymarket / Kalshi / All)
- ✅ Category filtering
- ✅ Market limit selector (10/25/50/100)
- ✅ URL/ticker input for loading specific markets
- ✅ Auto-refresh every 15 seconds
- ✅ Keyboard navigation (workspace commands)

---

## ⚠️ Honest Disclaimers

### What "Model Probability" Actually Is

The "model probability" shown is **NOT** from a machine learning model. It's a simple heuristic adjustment based on:
- Bid/ask spread
- Volume trends  
- Order book imbalance

**It is not predictive.** The UI clearly labels this as "Heuristic Only."

### What "Confluence" Actually Is

The confluence panel aggregates **real market signals** (volume, spread, liquidity) but:
- News sentiment: **Not connected** (shows "No data")
- Social sentiment: **Not connected** (shows "No data")
- Historical patterns: **Not implemented** (shows "No data")

Only factors marked with ● are real data.

### Price History Limitations

- **Polymarket:** Real 90-day history from CLOB API
- **Kalshi:** **Simulated** - Kalshi's public API does not expose historical prices

---

## Quick Start

```bash
# Clone
git clone https://github.com/NicolasLeyvaPA/leet-terminal.git
cd leet-terminal/website

# Install
npm install

# Run
npm run dev
```

### Environment (Optional)

For Supabase authentication, create `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without Supabase, wallet auth still works.

---

## Architecture

```
leet-terminal/website/
├── src/
│   ├── App.jsx                 # Main application
│   ├── components/
│   │   ├── panels/             # 12 workspace panels
│   │   │   ├── WatchlistPanel.jsx
│   │   │   ├── MarketOverviewPanel.jsx
│   │   │   ├── PriceChartPanel.jsx
│   │   │   ├── OrderBookPanel.jsx
│   │   │   ├── ConfluencePanel.jsx
│   │   │   ├── ModelBreakdownPanel.jsx
│   │   │   ├── GreeksPanel.jsx
│   │   │   ├── MonteCarloPanel.jsx
│   │   │   ├── PortfolioPanel.jsx
│   │   │   ├── QuantumLabPanel.jsx
│   │   │   ├── NewsFeedPanel.jsx
│   │   │   └── BetsMarketPanel.jsx
│   │   └── ...
│   ├── services/
│   │   ├── polymarketAPI.js    # Polymarket Gamma + CLOB APIs
│   │   ├── kalshiAPI.js        # Kalshi Elections API
│   │   └── manifoldAPI.js      # Manifold Markets API
│   └── utils/
│       ├── quantEngine.js      # Monte Carlo, Kelly, Greeks
│       ├── auth.js             # Auth orchestration
│       ├── phantom.js          # Solana wallet
│       └── metamask.js         # Ethereum wallet
└── vite.config.js              # Dev server + API proxies
```

---

## API Reference

### Polymarket (Real Data)

| Endpoint | Data |
|----------|------|
| `gamma-api.polymarket.com/events` | Market listings |
| `clob.polymarket.com/prices-history` | 90-day price history |
| `clob.polymarket.com/book` | Order book depth |

### Kalshi (Real Data)

| Endpoint | Data |
|----------|------|
| `api.elections.kalshi.com/trade-api/v2/markets` | Market listings with prices |
| `api.elections.kalshi.com/trade-api/v2/markets/{ticker}/orderbook` | Order book |
| Price history | **Not available** (simulated in app) |

### Manifold Markets (Real Data)

| Endpoint | Data |
|----------|------|
| `api.manifold.markets/v0/search-markets` | Market search with sorting |
| `api.manifold.markets/v0/slug/{slug}` | Single market by slug |
| `api.manifold.markets/v0/bets` | Bet history (used for price charts) |
| Order book | **Synthetic** (Manifold uses AMM, not orderbook) |

---

## 🚀 Roadmap: What We Want to Build

### Phase 1: Data Quality (Next)
- [ ] Real news sentiment integration (NewsAPI or similar)
- [ ] Social sentiment from Twitter/Reddit APIs
- [ ] Kalshi authenticated API for real price history
- [ ] WebSocket connections for real-time updates
- [ ] More prediction market platforms (Metaculus, PredictIt)

### Phase 2: Real Analytics
- [ ] Actual ML models for probability estimation
- [ ] Backtesting engine with historical data
- [ ] Custom alert system for price/volume triggers
- [ ] Portfolio tracking with P&L calculation
- [ ] Market correlation analysis

### Phase 3: Trading Features
- [ ] Direct Polymarket trading via API
- [ ] Direct Kalshi trading via API
- [ ] Portfolio rebalancing suggestions
- [ ] Order management interface

### Phase 4: Platform
- [ ] Mobile responsive design
- [ ] User accounts with saved watchlists
- [ ] Sharing and collaboration features
- [ ] Public API for market data

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Charts | Chart.js |
| Styling | Tailwind CSS |
| Auth | Supabase (optional) |
| Wallets | Phantom (Solana), MetaMask (Ethereum) |

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make changes with clear commit messages
4. Open a Pull Request

---

## License

MIT License - see LICENSE file.

---

<div align="center">

**Built for prediction market enthusiasts**

<br/>

⚠️ **This is an analytics tool, not financial advice.**  
⚠️ **Do your own research before trading.**

<br/>

[GitHub](https://github.com/NicolasLeyvaPA/leet-terminal)

</div>
