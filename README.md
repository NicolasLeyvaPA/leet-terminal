<div align="center">

# LEET QUANTUM TERMINAL PRO

### The Bloomberg Terminal for Prediction Markets

<img src="https://img.shields.io/badge/version-3.1.0-blue?style=for-the-badge" alt="Version">
<img src="https://img.shields.io/badge/status-Production-brightgreen?style=for-the-badge" alt="Status">
<img src="https://img.shields.io/badge/license-Proprietary-red?style=for-the-badge" alt="License">

<br/>

<img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
<img src="https://img.shields.io/badge/Vite-5.0.8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/Chart.js-4.4.0-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js">
<img src="https://img.shields.io/badge/Supabase-2.89.0-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind">

<br/><br/>

**Enterprise-grade prediction market analytics with real-time Polymarket integration,**
**quantitative analysis tools, and Web3-native authentication.**

[Features](#-features) |
[Quick Start](#-quick-start) |
[Documentation](#-documentation) |
[Architecture](#-architecture) |
[API Reference](#-api-reference)

<br/>

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ██╗     ███████╗███████╗████████╗     ██████╗ ████████╗██████╗              ║
║  ██║     ██╔════╝██╔════╝╚══██╔══╝    ██╔═══██╗╚══██╔══╝██╔══██╗             ║
║  ██║     █████╗  █████╗     ██║       ██║   ██║   ██║   ██████╔╝             ║
║  ██║     ██╔══╝  ██╔══╝     ██║       ██║▄▄ ██║   ██║   ██╔═══╝              ║
║  ███████╗███████╗███████╗   ██║       ╚██████╔╝   ██║   ██║                  ║
║  ╚══════╝╚══════╝╚══════╝   ╚═╝        ╚══▀▀═╝    ╚═╝   ╚═╝                  ║
║                                                                               ║
║              Q U A N T U M   T E R M I N A L   P R O   v 3 . 1               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

</div>

---

## Overview

**Leet Quantum Terminal Pro** is a professional-grade, browser-based analytics platform engineered for prediction market traders, quantitative analysts, and portfolio managers. Inspired by institutional trading terminals like Bloomberg, it provides a comprehensive suite of tools for analyzing, monitoring, and optimizing prediction market positions.

<table>
<tr>
<td width="50%">

### Why Leet QTP?

- **Real-Time Data** - Live Polymarket prices & volumes
- **Quant Analytics** - Monte Carlo, Kelly Criterion, Greeks
- **Multi-Model ML** - 4-model ensemble predictions
- **Web3 Native** - Phantom & MetaMask integration
- **Zero Setup** - Fully client-side, no backend required

</td>
<td width="50%">

### Who Is It For?

| Audience | Use Case |
|----------|----------|
| Traders | Real-time market analysis |
| Quants | Statistical modeling & risk |
| PMs | Portfolio tracking & P&L |
| Researchers | Market data visualization |

</td>
</tr>
</table>

---

## Features

<table>
<tr>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/-Market_Data-orange?style=for-the-badge" alt="Market Data">
<br/><br/>
<b>Real-Time Markets</b>
<br/>
Live Polymarket integration with<br/>
up to 100 markets, price history,<br/>
and order book depth
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/-Analytics-purple?style=for-the-badge" alt="Analytics">
<br/><br/>
<b>Quant Engine</b>
<br/>
Monte Carlo simulations,<br/>
Kelly Criterion sizing,<br/>
VaR/CVaR risk metrics
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/-ML_Models-blue?style=for-the-badge" alt="ML Models">
<br/><br/>
<b>Ensemble Predictions</b>
<br/>
4-model ML ensemble:<br/>
LightGBM, XGBoost,<br/>
Logistic, Bayesian
<br/><br/>
</td>
</tr>
<tr>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/-Portfolio-green?style=for-the-badge" alt="Portfolio">
<br/><br/>
<b>Position Tracking</b>
<br/>
Multi-position management<br/>
with real-time P&L,<br/>
cost basis tracking
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/-Optimization-red?style=for-the-badge" alt="Optimization">
<br/><br/>
<b>Quantum Lab</b>
<br/>
Simulated quantum annealing<br/>
for optimal portfolio<br/>
allocation
<br/><br/>
</td>
<td align="center" width="33%">
<br/>
<img src="https://img.shields.io/badge/-Web3-yellow?style=for-the-badge" alt="Web3">
<br/><br/>
<b>Wallet Auth</b>
<br/>
Native Phantom (Solana)<br/>
and MetaMask (Ethereum)<br/>
authentication
<br/><br/>
</td>
</tr>
</table>

### Workspaces

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ANALYSIS  │  PORTFOLIO  │  LAB  │  NEWS  │  BETS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┬─────────────────┬─────────────────┐                       │
│   │ MARKET OVERVIEW │   PRICE CHART   │   ORDER BOOK    │                       │
│   │                 │                 │                 │                       │
│   │ Prob: 67.5%     │    [Chart]      │  Bid    Ask     │                       │
│   │ Edge: +3.2%     │                 │  0.65   0.68    │                       │
│   │ Vol: $1.2M      │                 │  0.64   0.69    │                       │
│   ├─────────────────┼─────────────────┼─────────────────┤                       │
│   │   CONFLUENCE    │ MODEL BREAKDOWN │     GREEKS      │                       │
│   │                 │                 │                 │                       │
│   │ Bullish: 72%    │ LightGBM: 0.71  │ Delta:  0.67    │                       │
│   │ Bearish: 28%    │ XGBoost:  0.69  │ Gamma:  0.12    │                       │
│   │ Signal: BUY     │ Logistic: 0.68  │ Theta: -0.02    │                       │
│   │                 │ Bayesian: 0.70  │ Vega:   0.15    │                       │
│   └─────────────────┴─────────────────┴─────────────────┘                       │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────┐                       │
│   │              MONTE CARLO SIMULATION                  │                       │
│   │  Expected Return: +12.4%  |  Win Rate: 68%          │                       │
│   │  Max Drawdown: -18%  |  Sharpe: 1.42  |  VaR: -8%   │                       │
│   └─────────────────────────────────────────────────────┘                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

<img src="https://img.shields.io/badge/Node.js-≥18.0.0-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/npm-≥9.0.0-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm">
<img src="https://img.shields.io/badge/Git-Latest-F05032?style=flat-square&logo=git&logoColor=white" alt="Git">

### Installation

```bash
# Clone the repository
git clone https://github.com/NicolasLeyvaPA/leet-terminal.git

# Navigate to the website directory
cd leet-terminal/website

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file in the `website` directory:

```env
# Supabase Configuration (Optional - for authentication)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Create optimized production build |
| `npm run preview` | Preview production build locally |

---

## Technology Stack

<table>
<tr>
<th align="center">Layer</th>
<th align="center">Technology</th>
<th align="center">Purpose</th>
</tr>
<tr>
<td><b>Frontend</b></td>
<td>
<img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
</td>
<td>Component-based UI with Hooks</td>
</tr>
<tr>
<td><b>Build</b></td>
<td>
<img src="https://img.shields.io/badge/Vite-5.0.8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
</td>
<td>ESM-native bundler with HMR</td>
</tr>
<tr>
<td><b>Charts</b></td>
<td>
<img src="https://img.shields.io/badge/Chart.js-4.4.0-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js">
</td>
<td>Canvas-based data visualization</td>
</tr>
<tr>
<td><b>Styling</b></td>
<td>
<img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind">
</td>
<td>Utility-first CSS framework</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>
<img src="https://img.shields.io/badge/Supabase-2.89.0-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
</td>
<td>Auth, database, real-time</td>
</tr>
<tr>
<td><b>Data</b></td>
<td>
<img src="https://img.shields.io/badge/Polymarket-API-000000?style=flat-square" alt="Polymarket">
<img src="https://img.shields.io/badge/Kalshi-API-4F46E5?style=flat-square" alt="Kalshi">
</td>
<td>Market data & order books</td>
</tr>
<tr>
<td><b>Web3</b></td>
<td>
<img src="https://img.shields.io/badge/Phantom-Solana-AB9FF2?style=flat-square&logo=solana&logoColor=white" alt="Phantom">
<img src="https://img.shields.io/badge/MetaMask-ETH-E2761B?style=flat-square&logo=metamask&logoColor=white" alt="MetaMask">
</td>
<td>Wallet authentication</td>
</tr>
</table>

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATION                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌───────────────────────────────────────────────────────────────────────┐    │
│   │                         REACT APPLICATION                              │    │
│   │                                                                        │    │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │    │
│   │   │   App.jsx   │  │ Components  │  │  Services   │  │   Utils     │ │    │
│   │   │   (Core)    │  │  (Panels)   │  │   (API)     │  │  (Helpers)  │ │    │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │    │
│   │          │                │                │                │         │    │
│   │          └────────────────┴────────────────┴────────────────┘         │    │
│   │                                   │                                    │    │
│   │                    ┌──────────────┴──────────────┐                    │    │
│   │                    │     STATE MANAGEMENT        │                    │    │
│   │                    │   (React Hooks/Context)     │                    │    │
│   │                    └─────────────────────────────┘                    │    │
│   └───────────────────────────────────────────────────────────────────────┘    │
│                                       │                                         │
└───────────────────────────────────────┼─────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
     ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
     │  PREDICTION    │       │    SUPABASE    │       │     WEB3       │
     │  MARKET APIs   │       │    BACKEND     │       │   PROVIDERS    │
     │                │       │                │       │                │
     │  • Polymarket  │       │  • Auth        │       │  • Phantom     │
     │  • Kalshi      │       │  • Database    │       │  • MetaMask    │
     │  • CLOB/REST   │       │  • Storage     │       │  • WalletCon.  │
     └────────────────┘       └────────────────┘       └────────────────┘
```

### Directory Structure

```
leet-terminal/
├── website/
│   ├── src/
│   │   ├── App.jsx                    # Root component (800+ LOC)
│   │   ├── main.jsx                   # Application entry point
│   │   │
│   │   ├── components/
│   │   │   ├── Login.jsx              # Authentication UI
│   │   │   ├── Signup.jsx             # User registration
│   │   │   ├── MarketDetailDock.jsx   # Bottom detail panel
│   │   │   ├── PriceChart.jsx         # Chart.js wrapper
│   │   │   ├── MonteCarloChart.jsx    # Simulation charts
│   │   │   ├── PanelHeader.jsx        # Reusable header
│   │   │   ├── DataRow.jsx            # Key-value display
│   │   │   ├── Tag.jsx                # Status indicators
│   │   │   │
│   │   │   └── panels/                # 12 workspace panels
│   │   │       ├── WatchlistPanel.jsx
│   │   │       ├── MarketOverviewPanel.jsx
│   │   │       ├── PriceChartPanel.jsx
│   │   │       ├── OrderBookPanel.jsx
│   │   │       ├── ConfluencePanel.jsx
│   │   │       ├── ModelBreakdownPanel.jsx
│   │   │       ├── GreeksPanel.jsx
│   │   │       ├── MonteCarloPanel.jsx
│   │   │       ├── PortfolioPanel.jsx
│   │   │       ├── QuantumLabPanel.jsx
│   │   │       ├── NewsFeedPanel.jsx
│   │   │       └── MarketTradesPanel.jsx
│   │   │
│   │   ├── services/
│   │   │   └── polymarketAPI.js       # API integration (500+ LOC)
│   │   │
│   │   ├── utils/
│   │   │   ├── auth.js                # Auth orchestration (1000+ LOC)
│   │   │   ├── phantom.js             # Solana wallet
│   │   │   ├── metamask.js            # Ethereum wallet
│   │   │   ├── quantEngine.js         # Quant analysis
│   │   │   ├── helpers.js             # Utility functions
│   │   │   ├── supabase.js            # Database client
│   │   │   └── jwt.js                 # Token management
│   │   │
│   │   ├── data/
│   │   │   └── constants.js           # Static configurations
│   │   │
│   │   └── styles.css                 # Global stylesheet
│   │
│   ├── index.html                     # HTML template
│   ├── vite.config.js                 # Build configuration
│   ├── package.json                   # Dependencies
│   └── package-lock.json              # Dependency lock
│
└── README.md                          # This document
```

---

## Documentation

### Feature Matrix

| Feature | Status | Workspace | Description |
|---------|:------:|-----------|-------------|
| Real-Time Market Data | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | All | Live Polymarket prices & volumes |
| Interactive Watchlist | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | All | Filterable market browser (up to 100) |
| Price Charts | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Analysis | 90-day historical visualization |
| Order Book Display | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Analysis | 15-level bid/ask depth |
| Confluence Analysis | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Analysis | 10-factor signal aggregation |
| Model Ensemble | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Analysis | 4-model ML probability |
| Greeks Calculation | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Analysis | Delta, Gamma, Theta, Vega, Rho |
| Monte Carlo Simulation | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Detail Dock | 5,000-path risk analysis |
| Portfolio Tracking | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Portfolio | Position & P&L management |
| Quantum Optimization | ![Production](https://img.shields.io/badge/-Production-brightgreen?style=flat-square) | Lab | Simulated annealing allocation |
| News Aggregation | ![Beta](https://img.shields.io/badge/-Beta-yellow?style=flat-square) | News | Market-linked news feed |
| Trade Stream | ![Beta](https://img.shields.io/badge/-Beta-yellow?style=flat-square) | Bets | Live transaction feed |

### Command Interface

The terminal supports keyboard-driven navigation:

| Command | Action |
|---------|--------|
| `[TICKER]` | Select market by ticker symbol |
| `ANALYSIS` | Switch to Analysis workspace |
| `PORTFOLIO` | Switch to Portfolio workspace |
| `LAB` | Switch to Quantum Lab workspace |
| `NEWS` | Switch to News workspace |
| `BETS` | Switch to Bets workspace |
| `REFRESH` | Force data refresh |
| `[Polymarket URL]` | Load specific market by URL |

---

## API Reference

### Polymarket Gamma API

<img src="https://img.shields.io/badge/Base_URL-gamma--api.polymarket.com-blue?style=flat-square" alt="Base URL">

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/events` | `GET` | Fetch market listings |
| `/events/{id}` | `GET` | Single market details |

**Query Parameters:**

```javascript
{
  closed: false,           // Exclude resolved markets
  order: 'volume24hr',     // Sort field
  ascending: false,        // Sort direction
  limit: 100               // Max results (10-100)
}
```

### Polymarket CLOB API

<img src="https://img.shields.io/badge/Base_URL-clob.polymarket.com-blue?style=flat-square" alt="Base URL">

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/prices-history` | `GET` | 90-day price data |
| `/book` | `GET` | Order book depth |

### Kalshi API

<img src="https://img.shields.io/badge/Base_URL-trading--api.kalshi.com-4F46E5?style=flat-square" alt="Base URL">

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/trade-api/v2/markets` | `GET` | Fetch market listings |
| `/trade-api/v2/markets/{ticker}` | `GET` | Single market details |
| `/trade-api/v2/markets/{ticker}/orderbook` | `GET` | Order book depth |
| `/trade-api/v2/markets/{ticker}/history` | `GET` | Price history |

**Authentication:** API Key required for trading endpoints

---

## Quantitative Analysis

### Monte Carlo Simulation

The platform runs **5,000 simulations** with **100 trades each** to generate risk metrics:

| Metric | Description |
|--------|-------------|
| **Expected Return** | Average simulation return |
| **Win Rate** | Percentage of profitable paths |
| **Max Drawdown** | Worst peak-to-trough decline |
| **VaR 95%** | Value at Risk at 95% confidence |
| **CVaR 95%** | Conditional VaR (expected shortfall) |
| **Sharpe Ratio** | Risk-adjusted return |
| **Prob. of Ruin** | Bankruptcy probability |

### Kelly Criterion

Optimal position sizing with risk-adjusted variants:

```javascript
// Full Kelly (aggressive)
fullKelly = (p * b - q) / b

// Half Kelly (moderate)
halfKelly = fullKelly * 0.5

// Quarter Kelly (conservative) - DEFAULT
quarterKelly = fullKelly * 0.25

// Maximum position: 5% of capital
```

### Confluence Factors

10-factor weighted signal aggregation:

| Factor | Weight | Description |
|--------|:------:|-------------|
| News Sentiment | 15% | NLP-based news analysis |
| Model Confidence | 15% | ML ensemble agreement |
| Orderbook Imbalance | 12% | Buy/sell pressure ratio |
| Smart Money | 12% | Large trader detection |
| Price Momentum | 10% | Trend strength |
| Volume Trend | 8% | Volume trajectory |
| Social Sentiment | 8% | Social media signals |
| Historical Pattern | 8% | Pattern recognition |
| Liquidity Score | 7% | Market depth quality |
| Time Decay | 5% | Expiration proximity |

---

## Authentication

### Supported Methods

<table>
<tr>
<td align="center">
<img src="https://img.shields.io/badge/Phantom-Solana-AB9FF2?style=for-the-badge&logo=solana&logoColor=white" alt="Phantom">
<br/>
<small>High Security</small>
</td>
<td align="center">
<img src="https://img.shields.io/badge/MetaMask-Ethereum-E2761B?style=for-the-badge&logo=metamask&logoColor=white" alt="MetaMask">
<br/>
<small>High Security</small>
</td>
<td align="center">
<img src="https://img.shields.io/badge/Email-Password-gray?style=for-the-badge&logo=gmail&logoColor=white" alt="Email">
<br/>
<small>Medium Security</small>
</td>
<td align="center">
<img src="https://img.shields.io/badge/OAuth-Google-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google">
<br/>
<small>Medium Security</small>
</td>
</tr>
</table>

### Wallet Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Connect   │────▶│    Sign      │────▶│   Verify     │────▶│   Session    │
│    Wallet    │     │   Message    │     │  Signature   │     │   Created    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Deployment

### Build Configuration

```javascript
// vite.config.js
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/leet-terminal/' : '/',

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});
```

### Deployment Options

| Platform | Configuration | Best For |
|----------|---------------|----------|
| ![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-181717?style=flat-square&logo=github&logoColor=white) | `base: '/leet-terminal/'` | Free hosting |
| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) | Zero config | Preview deploys |
| ![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white) | `_redirects` for SPA | Serverless |
| ![AWS](https://img.shields.io/badge/AWS_S3-232F3E?style=flat-square&logo=amazonaws&logoColor=white) | CloudFront CDN | Enterprise |

---

## Performance

### Targets

| Metric | Target | Tool |
|--------|:------:|------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Bundle Size (gzipped) | < 200KB | Build output |
| Monte Carlo (5k sims) | < 500ms | Custom |

### Optimizations

- **React.memo** - Memoized components prevent unnecessary re-renders
- **useMemo/useCallback** - Cached calculations and handlers
- **Code Splitting** - Dynamic imports for workspace panels
- **Tree Shaking** - Dead code elimination in production builds

---

## Roadmap

### Phase 1: Foundation
- [ ] WebSocket real-time connections
- [ ] Persistent user preferences
- [ ] TradingView chart integration
- [ ] Mobile-responsive design

### Phase 2: Analytics
- [ ] Custom ML model training
- [ ] Backtesting engine
- [ ] Strategy builder
- [ ] Price/volume alerts

### Phase 3: Trading
- [ ] Direct Polymarket execution
- [ ] Portfolio rebalancing
- [ ] Multi-platform support
- [ ] Copy trading

### Phase 4: Enterprise
- [ ] Team workspaces
- [ ] API access tiers
- [ ] White-label options
- [ ] Compliance logging

---

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

```bash
# Fork the repository
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request
```

---

## License

<img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" alt="License">

All Rights Reserved. This software is proprietary and confidential.

---

<div align="center">

### Built with precision for prediction market professionals

<br/>

<img src="https://img.shields.io/badge/Made_with-React-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
<img src="https://img.shields.io/badge/Powered_by-Polymarket-000000?style=flat-square" alt="Polymarket">
<img src="https://img.shields.io/badge/Secured_by-Web3-F6851B?style=flat-square" alt="Web3">

<br/><br/>

**[github.com/NicolasLeyvaPA/leet-terminal](https://github.com/NicolasLeyvaPA/leet-terminal)**

<br/>

```
© 2026 Leet Quantum Terminal Pro. All rights reserved.
```

</div>
