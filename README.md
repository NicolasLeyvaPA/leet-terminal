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

**Real-time analytics dashboard for prediction markets.**  
**Polymarket • Kalshi • Manifold Markets**

</div>

---

## Features

### Multi-Platform Data

| Platform | Markets | Prices | Order Book | Volume | Price History |
|----------|:-------:|:------:|:----------:|:------:|:-------------:|
| Polymarket | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kalshi | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manifold | ✅ | ✅ | ✅ | ✅ | ✅ |

### Quantitative Analysis

- **Monte Carlo Simulation** — 5,000-path risk analysis with VaR, CVaR, Sharpe ratio
- **Kelly Criterion** — Optimal position sizing (full, half, quarter, eighth Kelly)
- **Greeks** — Delta, Gamma, Theta, Vega, Rho for binary options pricing
- **Confluence Signals** — Volume trends, order book imbalance, spread analysis

### Price Charts

- 90-day historical visualization
- Real-time price updates
- Volume overlay

### Order Book

- 15-level bid/ask depth
- Imbalance indicators
- Cumulative size display

### Authentication

- **Phantom** — Solana wallet signature
- **MetaMask** — Ethereum wallet signature  
- **Email/Password** — Via Supabase
- **Google OAuth** — Via Supabase

### Interface

- Bloomberg-style terminal aesthetic
- Resizable panel layout
- Platform filtering (PM / KA / MF)
- Category filtering
- Auto-refresh (15s)
- Keyboard navigation

---

## Quick Start

```bash
git clone https://github.com/NicolasLeyvaPA/leet-terminal.git
cd leet-terminal/website
npm install
npm run dev
```

### Environment (Optional)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Architecture

```
website/src/
├── App.jsx                    # Main application
├── components/panels/         # 12 workspace panels
│   ├── WatchlistPanel         # Market browser
│   ├── MarketOverviewPanel    # Key metrics
│   ├── PriceChartPanel        # Historical charts
│   ├── OrderBookPanel         # Bid/ask depth
│   ├── ConfluencePanel        # Signal aggregation
│   ├── ModelBreakdownPanel    # Market signals
│   ├── GreeksPanel            # Options Greeks
│   ├── MonteCarloPanel        # Risk simulation
│   ├── PortfolioPanel         # Position tracking
│   └── QuantumLabPanel        # Portfolio optimization
├── services/
│   ├── polymarketAPI.js       # Polymarket integration
│   ├── kalshiAPI.js           # Kalshi integration
│   └── manifoldAPI.js         # Manifold integration
└── utils/
    ├── quantEngine.js         # Monte Carlo, Kelly, Greeks
    └── auth.js                # Authentication
```

---

## API Integrations

### Polymarket
- `gamma-api.polymarket.com/events` — Market listings
- `clob.polymarket.com/prices-history` — Price history
- `clob.polymarket.com/book` — Order book

### Kalshi
- `api.elections.kalshi.com/trade-api/v2/markets` — Markets
- `api.elections.kalshi.com/trade-api/v2/markets/{ticker}/orderbook` — Order book

### Manifold
- `api.manifold.markets/v0/search-markets` — Market search
- `api.manifold.markets/v0/slug/{slug}` — Market details
- `api.manifold.markets/v0/bets` — Trade history

---

## Roadmap

### Phase 1: Enhanced Data
- [ ] News sentiment integration
- [ ] Social sentiment (Twitter/Reddit)
- [ ] WebSocket real-time updates
- [ ] Additional platforms (Metaculus, PredictIt)

### Phase 2: Advanced Analytics
- [ ] ML probability models
- [ ] Backtesting engine
- [ ] Price/volume alerts
- [ ] Market correlation analysis

### Phase 3: Trading
- [ ] Direct Polymarket trading
- [ ] Direct Kalshi trading
- [ ] Portfolio management
- [ ] Order execution

### Phase 4: Platform
- [ ] Mobile responsive
- [ ] User accounts & watchlists
- [ ] Collaboration features
- [ ] Public API

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite |
| Charts | Chart.js |
| Styling | Tailwind CSS |
| Auth | Supabase, Phantom, MetaMask |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

---

## License

MIT

---

<div align="center">

**[github.com/NicolasLeyvaPA/leet-terminal](https://github.com/NicolasLeyvaPA/leet-terminal)**

</div>
