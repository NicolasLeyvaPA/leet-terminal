# LEET QUANTUM TERMINAL PRO

## Technical Specification & Project Documentation

**Version:** 3.1.0
**Document Revision:** 1.0
**Classification:** Technical Reference
**Last Updated:** January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Proposal](#2-project-proposal)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Core Features & Functionality](#5-core-features--functionality)
6. [API Integrations](#6-api-integrations)
7. [Authentication & Security](#7-authentication--security)
8. [Data Models & Schemas](#8-data-models--schemas)
9. [Quantitative Analysis Engine](#9-quantitative-analysis-engine)
10. [Development Guide](#10-development-guide)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Performance Specifications](#12-performance-specifications)
13. [Roadmap & Future Considerations](#13-roadmap--future-considerations)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Product Overview

**Leet Quantum Terminal Pro** is an enterprise-grade, real-time prediction markets analytics platform engineered to bridge the gap between retail trading interfaces and institutional-level quantitative analysis tools. The platform delivers a Bloomberg Terminal-inspired experience specifically optimized for prediction market traders, analysts, and quantitative researchers.

### 1.2 Value Proposition

| Stakeholder | Value Delivered |
|-------------|-----------------|
| **Retail Traders** | Professional-grade analytics without institutional access requirements |
| **Quantitative Analysts** | Real-time data feeds with built-in statistical modeling frameworks |
| **Portfolio Managers** | Multi-position tracking with Monte Carlo risk assessment |
| **Market Researchers** | Comprehensive market data aggregation and visualization |

### 1.3 Key Differentiators

- **Real-Time Polymarket Integration**: Direct API connectivity to the world's largest prediction market
- **Multi-Model Ensemble Analytics**: 4-model machine learning ensemble (LightGBM, XGBoost, Logistic Regression, Bayesian)
- **Quantum-Inspired Optimization**: Simulated quantum annealing for portfolio allocation
- **Web3 Native Authentication**: Native Phantom (Solana) and MetaMask (Ethereum) wallet integration
- **Zero Infrastructure Requirements**: Fully client-side architecture with optional backend services

---

## 2. Project Proposal

### 2.1 Problem Statement

The prediction markets industry has experienced exponential growth, with platforms like Polymarket processing billions of dollars in trading volume. However, existing tools for market analysis remain fragmented:

1. **Lack of Professional Tooling**: No Bloomberg-equivalent exists for prediction markets
2. **Quantitative Accessibility Gap**: Advanced analytics require custom infrastructure
3. **Data Fragmentation**: Market data, news, and analysis exist in silos
4. **Web3 Integration Friction**: Traditional platforms ignore blockchain-native authentication

### 2.2 Solution Architecture

Leet Quantum Terminal Pro addresses these gaps through a unified, browser-based platform that delivers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEET QUANTUM TERMINAL PRO                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Real-Time  │  │  Quant      │  │  Portfolio  │             │
│  │  Market     │──│  Analytics  │──│  Management │             │
│  │  Data       │  │  Engine     │  │  System     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                      │
│         └────────────────┴────────────────┘                      │
│                          │                                       │
│              ┌───────────┴───────────┐                          │
│              │   Unified Terminal    │                          │
│              │      Interface        │                          │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Target Market

| Segment | TAM Estimate | Primary Use Case |
|---------|--------------|------------------|
| Prediction Market Traders | 500K+ active users | Daily trading operations |
| DeFi Portfolio Managers | 50K+ professionals | Risk management |
| Quantitative Researchers | 100K+ analysts | Market research & modeling |
| Financial Content Creators | 25K+ influencers | Data visualization & reporting |

### 2.4 Business Model Considerations

The platform architecture supports multiple monetization vectors:

- **Freemium SaaS**: Basic analytics free, premium features subscription-based
- **API Access Tiers**: Rate-limited free tier, paid professional tier
- **White-Label Licensing**: Enterprise deployments for trading firms
- **Data Services**: Historical data exports and custom analytics

---

## 3. Technology Stack

### 3.1 Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  React 18.2.0         │  Vite 5.0.8          │  Chart.js 4.4.0  │
│  (UI Framework)       │  (Build Tool)        │  (Visualization) │
├─────────────────────────────────────────────────────────────────┤
│                        STYLING LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Tailwind CSS (CDN)   │  Custom CSS Grid     │  CSS Variables   │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│  Supabase 2.89.0      │  PostgreSQL          │  JWT Auth        │
│  (BaaS Platform)      │  (Database)          │  (Token Mgmt)    │
├─────────────────────────────────────────────────────────────────┤
│                        EXTERNAL APIs                             │
├─────────────────────────────────────────────────────────────────┤
│  Polymarket Gamma API │  Polymarket CLOB     │  Web3 Providers  │
│  (Market Data)        │  (Order Book)        │  (Wallets)       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Core Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `react` | 18.2.0 | Component-based UI framework | MIT |
| `react-dom` | 18.2.0 | React DOM rendering | MIT |
| `vite` | 5.0.8 | Next-generation build tool | MIT |
| `@vitejs/plugin-react` | 4.2.1 | React Fast Refresh for Vite | MIT |
| `chart.js` | 4.4.0 | Canvas-based charting library | MIT |
| `@supabase/supabase-js` | 2.89.0 | Supabase client SDK | MIT |

### 3.3 Technology Selection Rationale

#### React 18.2.0
- **Concurrent Features**: Automatic batching and transitions for smooth UI
- **Hooks Architecture**: Simplified state management without Redux overhead
- **Ecosystem Maturity**: Extensive library support and community resources
- **Server Components Ready**: Future-proofed for React Server Components

#### Vite 5.0.8
- **ESM-Native**: Leverages native ES modules for instant dev server startup
- **Hot Module Replacement**: Sub-second HMR for rapid development
- **Optimized Builds**: Rollup-based production builds with tree shaking
- **Plugin Ecosystem**: Extensible architecture for custom tooling

#### Chart.js 4.4.0
- **Canvas Rendering**: GPU-accelerated rendering for large datasets
- **Declarative API**: React-friendly configuration patterns
- **Animation System**: Smooth transitions for real-time data updates
- **Bundle Size**: ~60KB gzipped vs. 200KB+ alternatives (D3.js)

#### Supabase 2.89.0
- **PostgreSQL Backend**: Enterprise-grade relational database
- **Row Level Security**: Fine-grained access control policies
- **Real-time Subscriptions**: WebSocket-based live data (future enhancement)
- **Auth Providers**: OAuth, email, phone, and custom JWT support

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         REACT APPLICATION                              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   App.jsx  │  │ Components │  │  Services  │  │   Utils    │     │  │
│  │  │  (Router)  │  │  (Panels)  │  │   (API)    │  │  (Helpers) │     │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │  │
│  │        │               │               │               │             │  │
│  │        └───────────────┴───────────────┴───────────────┘             │  │
│  │                                │                                      │  │
│  │                    ┌───────────┴───────────┐                         │  │
│  │                    │    STATE MANAGEMENT    │                         │  │
│  │                    │  (React Hooks/Context) │                         │  │
│  │                    └───────────────────────┘                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     │                                        │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │  Polymarket  │  │   Supabase   │  │    Web3      │
           │     APIs     │  │   Backend    │  │  Providers   │
           │              │  │              │  │              │
           │ • Gamma API  │  │ • Auth       │  │ • Phantom    │
           │ • CLOB API   │  │ • Database   │  │ • MetaMask   │
           │ • Prices     │  │ • Storage    │  │ • WalletCon. │
           └──────────────┘  └──────────────┘  └──────────────┘
```

### 4.2 Directory Structure

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
│   │   │   ├── PanelHeader.jsx        # Reusable header component
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
│   │   │   ├── phantom.js             # Solana wallet integration
│   │   │   ├── metamask.js            # Ethereum wallet integration
│   │   │   ├── quantEngine.js         # Quantitative analysis
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
│   ├── package.json                   # Dependencies manifest
│   └── package-lock.json              # Dependency lock file
│
├── PROJECT_DOCUMENTATION.md           # This document
└── README.md                          # Quick start guide
```

### 4.3 Component Hierarchy

```
<App>
├── <Header>
│   ├── <TickerTape />
│   ├── <CommandBar />
│   └── <WorkspaceTabs />
│
├── <MainContent>
│   ├── <WatchlistPanel />           [Resizable: 140-920px]
│   │
│   └── <WorkspaceContainer>
│       │
│       ├── [ANALYSIS Workspace]     [3x2 Grid]
│       │   ├── <MarketOverviewPanel />
│       │   ├── <PriceChartPanel />
│       │   ├── <OrderBookPanel />
│       │   ├── <ConfluencePanel />
│       │   ├── <ModelBreakdownPanel />
│       │   └── <GreeksPanel />
│       │
│       ├── [PORTFOLIO Workspace]
│       │   └── <PortfolioPanel />
│       │
│       ├── [LAB Workspace]
│       │   └── <QuantumLabPanel />
│       │
│       ├── [NEWS Workspace]
│       │   └── <NewsFeedPanel />
│       │
│       └── [BETS Workspace]
│           └── <MarketTradesPanel />
│
├── <MarketDetailDock />              [Resizable: 80-500px]
│   └── <MonteCarloPanel />
│
└── <StatusBar />
    ├── <SyncIndicator />
    ├── <MarketCount />
    └── <SignalCount />
```

### 4.4 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW DIAGRAM                         │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────┐          ┌─────────────┐
    │  Polymarket │          │   Supabase  │
    │    APIs     │          │   Backend   │
    └──────┬──────┘          └──────┬──────┘
           │                        │
           │  HTTP/REST             │  HTTP/REST
           │                        │
           ▼                        ▼
    ┌─────────────────────────────────────────┐
    │           polymarketAPI.js              │
    │  ┌─────────────────────────────────┐   │
    │  │      Data Transformation        │   │
    │  │  • Normalize market objects     │   │
    │  │  • Calculate derived metrics    │   │
    │  │  • Generate model probabilities │   │
    │  └─────────────────────────────────┘   │
    └──────────────────┬──────────────────────┘
                       │
                       │  Processed Market[]
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │              App.jsx State              │
    │  ┌─────────────────────────────────┐   │
    │  │  markets: Market[]              │   │
    │  │  selectedMarket: Market | null  │   │
    │  │  workspace: string              │   │
    │  │  filters: FilterConfig          │   │
    │  │  layoutDimensions: Dimensions   │   │
    │  └─────────────────────────────────┘   │
    └──────────────────┬──────────────────────┘
                       │
                       │  Props Drilling
                       │
    ┌──────────────────┼──────────────────────┐
    │                  │                      │
    ▼                  ▼                      ▼
┌─────────┐     ┌─────────────┐       ┌─────────────┐
│Watchlist│     │  Analysis   │       │  Portfolio  │
│  Panel  │     │   Panels    │       │   Panel     │
└─────────┘     └─────────────┘       └─────────────┘
```

---

## 5. Core Features & Functionality

### 5.1 Feature Matrix

| Feature | Status | Workspace | Description |
|---------|--------|-----------|-------------|
| Real-Time Market Data | Production | All | Live Polymarket prices & volumes |
| Interactive Watchlist | Production | All | Filterable market browser |
| Price Charts | Production | Analysis | 90-day historical visualization |
| Order Book Display | Production | Analysis | Bid/ask depth analysis |
| Confluence Analysis | Production | Analysis | 10-factor signal aggregation |
| Model Ensemble | Production | Analysis | 4-model ML probability |
| Greeks Calculation | Production | Analysis | Options-style risk metrics |
| Monte Carlo Simulation | Production | Detail Dock | 5,000-path risk analysis |
| Portfolio Tracking | Production | Portfolio | Position & P&L management |
| Quantum Optimization | Production | Lab | Simulated annealing allocation |
| News Aggregation | Beta | News | Market-linked news feed |
| Trade Stream | Beta | Bets | Live transaction feed |

### 5.2 Workspace Specifications

#### 5.2.1 Analysis Workspace

The primary workspace featuring a 3x2 responsive grid layout:

```
┌──────────────────┬──────────────────┬──────────────────┐
│                  │                  │                  │
│  Market Overview │   Price Chart    │   Order Book     │
│                  │                  │                  │
│  • Current prob  │  • 90-day OHLC   │  • 15-level bid  │
│  • Bid/ask       │  • Volume bars   │  • 15-level ask  │
│  • Volume 24h    │  • Trend lines   │  • Imbalance %   │
│                  │                  │                  │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│   Confluence     │ Model Breakdown  │     Greeks       │
│                  │                  │                  │
│  • 10 factors    │  • LightGBM      │  • Delta         │
│  • Bull/bear %   │  • XGBoost       │  • Gamma         │
│  • Signal        │  • Logistic      │  • Theta         │
│                  │  • Bayesian      │  • Vega/Rho      │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

#### 5.2.2 Portfolio Workspace

Position tracking and P&L analysis:

| Column | Data Type | Description |
|--------|-----------|-------------|
| Ticker | String | Market identifier |
| Side | LONG/SHORT | Position direction |
| Size | Number | Share quantity |
| Avg Cost | Currency | Entry price basis |
| Current | Currency | Mark-to-market price |
| P&L | Currency | Unrealized gain/loss |
| P&L % | Percentage | Return percentage |

#### 5.2.3 Quantum Lab Workspace

Optimization engine specifications:

- **Algorithm**: Simulated Quantum Annealing
- **Iterations**: 1,000 optimization cycles
- **Edge Threshold**: >2% model advantage required
- **Position Sizing**: Kelly Criterion variants (Full/Half/Quarter)
- **Risk Limits**: Maximum 5% portfolio per position
- **Output**: Optimal allocation weights with expected return

### 5.3 Resizable Layout System

```javascript
// Panel Dimension Constraints
const LAYOUT_CONSTRAINTS = {
  watchlist: {
    min: 140,   // Minimum width (px)
    max: 920,   // Maximum width (px)
    default: 180
  },
  detailDock: {
    min: 80,    // Minimum height (px)
    max: 500,   // Maximum height (px)
    default: 180
  },
  analytics: {
    min: 260,   // Minimum width (px)
    max: 1000,  // Maximum width (px)
    default: 320
  }
};
```

### 5.4 Command Interface

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

## 6. API Integrations

### 6.1 Polymarket Gamma API

**Base URL**: `https://gamma-api.polymarket.com`

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events` | GET | Fetch market listings |
| `/events/{id}` | GET | Single market details |

#### Query Parameters

```javascript
// Market Listing Parameters
{
  closed: false,           // Exclude resolved markets
  order: 'volume24hr',     // Sort field
  ascending: false,        // Sort direction
  limit: 100               // Max results (10-100)
}
```

#### Response Schema

```javascript
{
  id: string,
  slug: string,
  title: string,
  description: string,
  category: string,
  volume: number,
  volume24hr: number,
  liquidity: number,
  startDate: ISO8601,
  endDate: ISO8601,
  markets: [
    {
      id: string,
      question: string,
      outcomes: string[],
      outcomePrices: string[],
      volume: number,
      clobTokenIds: string[]
    }
  ]
}
```

### 6.2 Polymarket CLOB API

**Base URL**: `https://clob.polymarket.com`

#### Price History

```javascript
// Request
GET /prices-history?market={tokenId}&interval=max&fidelity=60

// Response
{
  history: [
    { t: timestamp, p: price }
  ]
}
```

#### Order Book

```javascript
// Request
GET /book?token_id={tokenId}

// Response
{
  market: string,
  asset_id: string,
  bids: [{ price: string, size: string }],
  asks: [{ price: string, size: string }]
}
```

### 6.3 CORS Proxy Strategy

Due to browser CORS restrictions, the application implements a multi-layer fallback system:

```javascript
const CORS_FALLBACK_CHAIN = [
  // 1. Vite Dev Proxy (development only)
  '/api/polymarket',

  // 2. Direct fetch (may work in some deployments)
  'https://gamma-api.polymarket.com',

  // 3. Public CORS proxies
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/'
];
```

### 6.4 Supabase Integration

#### Configuration

```javascript
// Environment Variables
VITE_SUPABASE_URL=https://{project}.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Database Schema

```sql
-- Users table (managed by Supabase Auth)
auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  encrypted_password TEXT,
  created_at TIMESTAMPTZ
)

-- Wallet users extension
public.wallet_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  wallet_type TEXT NOT NULL,  -- 'phantom' | 'metamask'
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- User preferences
public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  default_workspace TEXT DEFAULT 'ANALYSIS',
  watchlist_width INTEGER DEFAULT 180,
  detail_dock_height INTEGER DEFAULT 180,
  auto_refresh_interval INTEGER DEFAULT 15000
)
```

---

## 7. Authentication & Security

### 7.1 Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   User Arrives  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │    Wallet Detected?         │
              └──────────────┬──────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │ YES             │                 │ NO
           ▼                 │                 ▼
    ┌─────────────┐         │         ┌─────────────┐
    │  Phantom    │         │         │   Email/    │
    │  MetaMask   │         │         │  Password   │
    └──────┬──────┘         │         └──────┬──────┘
           │                │                │
           ▼                │                ▼
    ┌─────────────┐         │         ┌─────────────┐
    │  Sign       │         │         │  Supabase   │
    │  Message    │         │         │  Auth       │
    └──────┬──────┘         │         └──────┬──────┘
           │                │                │
           ▼                │                ▼
    ┌─────────────┐         │         ┌─────────────┐
    │  Verify     │         │         │  JWT        │
    │  Signature  │         │         │  Token      │
    └──────┬──────┘         │         └──────┬──────┘
           │                │                │
           └────────────────┴────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  verifyAuth()   │
                    │  Session Valid  │
                    └─────────────────┘
```

### 7.2 Supported Authentication Methods

| Method | Provider | Security Level | Use Case |
|--------|----------|----------------|----------|
| Phantom Wallet | Solana | High | Crypto-native users |
| MetaMask | Ethereum | High | EVM ecosystem users |
| Email/Password | Supabase | Medium | Traditional users |
| OAuth (Google) | Supabase | Medium | Consumer convenience |
| OAuth (GitHub) | Supabase | Medium | Developer users |

### 7.3 Wallet Authentication Flow

```javascript
// Phantom Authentication
async function authenticatePhantom() {
  // 1. Connect wallet
  const resp = await window.solana.connect();
  const publicKey = resp.publicKey.toString();

  // 2. Generate challenge message
  const message = `Sign this message to authenticate with Leet Terminal\n\n` +
                  `Nonce: ${Date.now()}\n` +
                  `Public Key: ${publicKey}`;

  // 3. Sign message
  const encodedMessage = new TextEncoder().encode(message);
  const signature = await window.solana.signMessage(encodedMessage);

  // 4. Verify and create session
  return {
    publicKey,
    signature: bs58.encode(signature.signature),
    signedAt: Date.now()
  };
}
```

### 7.4 Security Considerations

| Risk | Mitigation |
|------|------------|
| XSS Attacks | React's automatic escaping, CSP headers |
| CSRF | SameSite cookies, token-based auth |
| Injection | Parameterized queries via Supabase |
| Wallet Spoofing | EIP-6963 provider detection |
| Session Hijacking | Short-lived JWTs, secure storage |

---

## 8. Data Models & Schemas

### 8.1 Market Object

The canonical market object used throughout the application:

```typescript
interface Market {
  // Identifiers
  id: string;
  ticker: string;
  marketId: string;
  conditionId: string;

  // Metadata
  platform: 'Polymarket';
  question: string;
  description: string;
  category: string;

  // Probabilities
  market_prob: number;      // 0-1, current market price
  model_prob: number;       // 0-1, model prediction
  prev_prob: number;        // 0-1, previous price

  // Market Metrics
  bestBid: number;
  bestAsk: number;
  spread: number;
  volume_24h: number;
  volume_total: number;
  liquidity: number;
  open_interest: number;
  trades_24h: number;

  // Analytical Data
  factors: ConfluenceFactors;
  model_breakdown: ModelBreakdown;
  greeks: Greeks;

  // Time Series
  price_history: PricePoint[];
  orderbook: OrderBook;

  // Token Data
  clobTokenIds: string[];
  outcomes: string[];
  outcomePrices: number[];

  // Dates
  end_date: string;         // ISO 8601

  // Raw API Response
  _raw: PolymarketEvent;
}
```

### 8.2 Confluence Factors

```typescript
interface ConfluenceFactors {
  orderbook_imbalance: Factor;  // Weight: 12%
  price_momentum: Factor;        // Weight: 10%
  volume_trend: Factor;          // Weight: 8%
  news_sentiment: Factor;        // Weight: 15%
  social_sentiment: Factor;      // Weight: 8%
  smart_money: Factor;           // Weight: 12%
  historical_pattern: Factor;    // Weight: 8%
  time_decay: Factor;            // Weight: 5%
  liquidity_score: Factor;       // Weight: 7%
  model_confidence: Factor;      // Weight: 15%
}

interface Factor {
  value: number;      // -1 to 1
  weight: number;     // 0 to 1
  signal: 'bullish' | 'bearish' | 'neutral';
}
```

### 8.3 Model Breakdown

```typescript
interface ModelBreakdown {
  lightgbm: ModelOutput;
  xgboost: ModelOutput;
  logistic: ModelOutput;
  bayesian: ModelOutput;
}

interface ModelOutput {
  prob: number;         // Model's probability estimate
  weight: number;       // Ensemble weight
  confidence: number;   // Model's confidence score
}
```

### 8.4 Greeks

```typescript
interface Greeks {
  delta: number;    // Price sensitivity
  gamma: number;    // Delta change rate
  theta: number;    // Time decay (per day)
  vega: number;     // Volatility sensitivity
  rho: number;      // Interest rate sensitivity
}
```

---

## 9. Quantitative Analysis Engine

### 9.1 Engine Overview

The `quantEngine.js` module provides institutional-grade analytics:

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUANT ENGINE MODULES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Monte Carlo    │  │  Kelly Criterion │  │  Expected Value │ │
│  │  Simulation     │  │  Calculator      │  │  Analysis       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Greeks         │  │  Model          │  │  Confluence     │ │
│  │  Calculator     │  │  Ensemble       │  │  Aggregator     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Monte Carlo Simulation

#### Algorithm

```javascript
function runMonteCarloSimulation(market, config = {}) {
  const {
    simulations = 5000,
    tradesPerSimulation = 100,
    initialCapital = 10000
  } = config;

  const results = [];

  for (let i = 0; i < simulations; i++) {
    let capital = initialCapital;
    const capitalPath = [capital];

    for (let t = 0; t < tradesPerSimulation; t++) {
      const betSize = calculateKellySize(market, capital);
      const outcome = Math.random() < market.model_prob;

      if (outcome) {
        capital += betSize * (1 / market.market_prob - 1);
      } else {
        capital -= betSize;
      }

      capitalPath.push(Math.max(0, capital));
      if (capital <= 0) break;
    }

    results.push({
      finalCapital: capital,
      maxDrawdown: calculateMaxDrawdown(capitalPath),
      path: capitalPath
    });
  }

  return aggregateResults(results);
}
```

#### Output Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| Expected Return | `mean(finalCapital) / initialCapital - 1` | Average simulation return |
| Win Rate | `count(profitable) / total` | Percentage of winning simulations |
| Max Drawdown | `max(peak - trough) / peak` | Worst peak-to-trough decline |
| VaR 95% | `percentile(returns, 5)` | Value at Risk, 95% confidence |
| CVaR 95% | `mean(returns < VaR)` | Conditional VaR (expected shortfall) |
| Sharpe Ratio | `(mean - rf) / std` | Risk-adjusted return |
| Prob. of Ruin | `count(capital <= 0) / total` | Bankruptcy probability |

### 9.3 Kelly Criterion Implementation

```javascript
function calculateKellySize(market, capital) {
  const p = market.model_prob;       // Win probability
  const q = 1 - p;                   // Loss probability
  const b = 1 / market.market_prob - 1;  // Odds received

  // Full Kelly
  const fullKelly = (p * b - q) / b;

  // Risk-adjusted variants
  const halfKelly = fullKelly * 0.5;
  const quarterKelly = fullKelly * 0.25;

  // Optimal sizing (25% Kelly, max 5% of capital)
  const optimalSize = Math.min(
    quarterKelly * capital,
    capital * 0.05
  );

  return Math.max(0, optimalSize);
}
```

### 9.4 Greeks Calculation

```javascript
function calculateGreeks(market) {
  const S = market.market_prob;        // Current price
  const K = 0.5;                       // Strike (50% reference)
  const T = market.timeToExpiry / 365; // Time in years
  const sigma = market.impliedVol;     // Implied volatility
  const r = 0.05;                      // Risk-free rate

  return {
    delta: calculateDelta(S, K, T, sigma, r),
    gamma: calculateGamma(S, K, T, sigma, r),
    theta: calculateTheta(S, K, T, sigma, r),
    vega: calculateVega(S, K, T, sigma, r),
    rho: calculateRho(S, K, T, sigma, r)
  };
}
```

### 9.5 Confluence Algorithm

```javascript
const CONFLUENCE_WEIGHTS = {
  orderbook_imbalance: 0.12,
  price_momentum: 0.10,
  volume_trend: 0.08,
  news_sentiment: 0.15,
  social_sentiment: 0.08,
  smart_money: 0.12,
  historical_pattern: 0.08,
  time_decay: 0.05,
  liquidity_score: 0.07,
  model_confidence: 0.15
};

function calculateConfluence(factors) {
  let bullish = 0;
  let bearish = 0;

  for (const [factor, weight] of Object.entries(CONFLUENCE_WEIGHTS)) {
    const value = factors[factor].value;

    if (value > 0) {
      bullish += value * weight;
    } else {
      bearish += Math.abs(value) * weight;
    }
  }

  const total = bullish + bearish;

  return {
    bullishPercent: (bullish / total) * 100,
    bearishPercent: (bearish / total) * 100,
    signal: bullish > bearish ? 'BUY' : 'SELL',
    strength: Math.abs(bullish - bearish)
  };
}
```

---

## 10. Development Guide

### 10.1 Environment Setup

#### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

#### Installation

```bash
# Clone repository
git clone https://github.com/NicolasLeyvaPA/leet-terminal.git
cd leet-terminal/website

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### 10.2 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run test suite |

### 10.3 Code Style Guidelines

#### Component Structure

```javascript
// Recommended component template
import React, { useState, useEffect, useCallback, useMemo } from 'react';

function ComponentName({ prop1, prop2, onEvent }) {
  // 1. State declarations
  const [state, setState] = useState(initialValue);

  // 2. Memoized values
  const computed = useMemo(() => {
    return expensiveCalculation(prop1);
  }, [prop1]);

  // 3. Callbacks
  const handleClick = useCallback(() => {
    onEvent(state);
  }, [state, onEvent]);

  // 4. Effects
  useEffect(() => {
    // Side effect logic
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  // 5. Render
  return (
    <div className="component-container">
      {/* JSX */}
    </div>
  );
}

export default ComponentName;
```

#### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MarketOverviewPanel` |
| Functions | camelCase | `calculateKellySize` |
| Constants | SCREAMING_SNAKE | `MAX_MARKETS` |
| CSS Classes | kebab-case | `panel-header` |
| Files | PascalCase.jsx | `QuantumLabPanel.jsx` |

### 10.4 Adding New Features

#### Creating a New Panel

```javascript
// 1. Create component file: src/components/panels/NewPanel.jsx
import React from 'react';
import PanelHeader from '../PanelHeader';

function NewPanel({ market }) {
  return (
    <div className="panel">
      <PanelHeader title="NEW FEATURE" />
      <div className="panel-content">
        {/* Panel content */}
      </div>
    </div>
  );
}

export default NewPanel;

// 2. Import in App.jsx
import NewPanel from './components/panels/NewPanel';

// 3. Add to workspace grid
{workspace === 'ANALYSIS' && (
  <div className="grid grid-cols-3 gap-2">
    {/* Existing panels */}
    <NewPanel market={selectedMarket} />
  </div>
)}
```

---

## 11. Deployment & Infrastructure

### 11.1 Build Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  base: process.env.NODE_ENV === 'production'
    ? '/leet-terminal/'
    : '/',

  server: {
    host: true,
    allowedHosts: ['localhost', '.ngrok.io', '.ngrok-free.app'],
    proxy: {
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, '')
      },
      '/api/clob': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clob/, '')
      }
    }
  },

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

### 11.2 Deployment Options

| Platform | Configuration | Best For |
|----------|---------------|----------|
| GitHub Pages | `base: '/leet-terminal/'` | Free hosting, GitHub integration |
| Vercel | Zero config | Fast global CDN, preview deployments |
| Netlify | `_redirects` for SPA | Form handling, serverless functions |
| AWS S3 + CloudFront | Manual setup | Enterprise, custom domains |

### 11.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: website/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: website

      - name: Build
        run: npm run build
        working-directory: website
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: website/dist
```

---

## 12. Performance Specifications

### 12.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Bundle Size (gzipped) | < 200KB | Build output |
| API Response Handling | < 100ms | Custom metrics |
| Monte Carlo (5k sims) | < 500ms | Custom metrics |

### 12.2 Optimization Strategies

#### React Optimizations

```javascript
// Memoization for expensive calculations
const filteredMarkets = useMemo(() => {
  return markets
    .filter(m => m.category === selectedCategory)
    .sort((a, b) => b.edge - a.edge);
}, [markets, selectedCategory]);

// Callback memoization for event handlers
const handleMarketSelect = useCallback((market) => {
  setSelectedMarket(market);
}, []);

// Ref-based drag handling (no re-renders)
const isDragging = useRef(false);
```

#### Bundle Optimization

```javascript
// Code splitting with dynamic imports
const QuantumLabPanel = React.lazy(() =>
  import('./components/panels/QuantumLabPanel')
);

// Tree-shaking friendly imports
import { format } from 'date-fns/format';  // Not: import { format } from 'date-fns'
```

### 12.3 Caching Strategy

```javascript
// API response caching
const CACHE_DURATION = {
  markets: 15000,      // 15 seconds
  priceHistory: 60000, // 1 minute
  orderbook: 5000      // 5 seconds
};

const marketCache = new Map();

async function fetchWithCache(key, fetcher, duration) {
  const cached = marketCache.get(key);

  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data;
  }

  const data = await fetcher();
  marketCache.set(key, { data, timestamp: Date.now() });

  return data;
}
```

---

## 13. Roadmap & Future Considerations

### 13.1 Feature Roadmap

#### Phase 1: Foundation Enhancement
- [ ] Real-time WebSocket connections for live data
- [ ] Persistent user preferences (cloud sync)
- [ ] Advanced charting (TradingView integration)
- [ ] Mobile-responsive design overhaul

#### Phase 2: Analytics Expansion
- [ ] Custom ML model training interface
- [ ] Backtesting engine with historical data
- [ ] Strategy builder with visual editor
- [ ] Alert system (price, volume, signal triggers)

#### Phase 3: Trading Integration
- [ ] Direct Polymarket order execution
- [ ] Portfolio rebalancing automation
- [ ] Multi-platform support (Kalshi, PredictIt)
- [ ] Copy trading / signal marketplace

#### Phase 4: Enterprise Features
- [ ] Team workspaces and collaboration
- [ ] Custom API access tiers
- [ ] White-label deployment options
- [ ] Compliance and audit logging

### 13.2 Technical Debt Considerations

| Item | Priority | Description |
|------|----------|-------------|
| State Management | Medium | Consider Zustand/Jotai for complex state |
| TypeScript Migration | High | Add type safety across codebase |
| Test Coverage | High | Add unit/integration tests (Jest, RTL) |
| Error Boundaries | Medium | Add React error boundaries for resilience |
| Accessibility | Medium | WCAG 2.1 AA compliance audit |

### 13.3 Scalability Considerations

```
Current Architecture Limits:
├── Client-side only: Limited by browser memory
├── API polling: 15-second refresh interval
├── No persistence: Data lost on refresh
└── Single-user: No collaboration features

Recommended Evolution:
├── Add backend service (Node.js/Python)
├── Implement WebSocket for real-time
├── Add Redis caching layer
├── Deploy with horizontal scaling (K8s)
└── Add message queue for async processing
```

---

## 14. Appendices

### 14.1 Glossary

| Term | Definition |
|------|------------|
| **Confluence** | Multi-factor agreement score for trading signals |
| **CLOB** | Central Limit Order Book - Polymarket's trading engine |
| **Edge** | Difference between model probability and market price |
| **Greeks** | Risk metrics borrowed from options pricing theory |
| **Kelly Criterion** | Optimal bet sizing formula maximizing log wealth |
| **Monte Carlo** | Statistical simulation using random sampling |
| **VaR** | Value at Risk - potential loss at confidence level |
| **CVaR** | Conditional VaR - expected loss beyond VaR |

### 14.2 API Error Codes

| Code | Message | Resolution |
|------|---------|------------|
| `CORS_ERROR` | Cross-origin request blocked | Fallback to proxy |
| `RATE_LIMITED` | Too many requests | Implement backoff |
| `INVALID_MARKET` | Market ID not found | Refresh market list |
| `AUTH_EXPIRED` | JWT token expired | Re-authenticate |
| `WALLET_REJECTED` | User rejected signature | Prompt retry |

### 14.3 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes* | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes* | Supabase anonymous key |
| `VITE_API_BASE_URL` | No | Custom API endpoint |
| `VITE_ENABLE_DEVTOOLS` | No | Enable React DevTools |

*Required for authentication features

### 14.4 Contact & Support

**Repository**: [github.com/NicolasLeyvaPA/leet-terminal](https://github.com/NicolasLeyvaPA/leet-terminal)

**Issues**: Submit via GitHub Issues

**License**: Proprietary - All Rights Reserved

---

*This document is confidential and intended for authorized developers and stakeholders only.*

**Document Version**: 1.0
**Generated**: January 2026
**Leet Quantum Terminal Pro - Technical Specification**
