# Frontend MVP Requirements Document

## Leet Terminal - Frontend & PM Guide

**Version:** 1.0.0
**Last Updated:** January 2026
**Target Audience:** Frontend Engineer / Product Manager

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [MVP Scope Definition](#mvp-scope-definition)
4. [Market Data Architecture](#market-data-architecture)
5. [Multi-Outcome Markets](#multi-outcome-markets)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [API Client Layer](#api-client-layer)
9. [UI/UX Requirements](#uiux-requirements)
10. [Testing Requirements](#testing-requirements)
11. [Development Milestones](#development-milestones)
12. [Appendix](#appendix)

---

## Executive Summary

### Your Role: Frontend Engineer / PM

As the Frontend Engineer and PM, you own:
- **User Experience** - How traders interact with the terminal
- **Data Visualization** - Charts, orderbooks, analytics displays
- **Market Context** - Ensuring users understand EVERY bet and ALL outcomes
- **Integration** - Connecting frontend to the new backend API
- **Product Direction** - Defining what gets built and in what order

### Critical Requirement: Beyond Binary Markets

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MARKET TYPE SUPPORT MATRIX                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   BINARY MARKETS (Current Support)                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  "Will Bitcoin hit $100k by Dec 2026?"                                  │   │
│   │                                                                          │   │
│   │    YES ████████████████████████░░░░░░░░  65¢                            │   │
│   │    NO  ░░░░░░░░░░░░░░░░░░░░░░░░████████  35¢                            │   │
│   │                                                                          │   │
│   │    ✅ Currently Supported                                                │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   MULTI-OUTCOME MARKETS (MVP PRIORITY)                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  "Who will win the 2028 Presidential Election?"                         │   │
│   │                                                                          │   │
│   │    CANDIDATE A    ████████████████████░░░░░░░░░░░░░░  42¢               │   │
│   │    CANDIDATE B    ████████████████░░░░░░░░░░░░░░░░░░  35¢               │   │
│   │    CANDIDATE C    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  15¢               │   │
│   │    CANDIDATE D    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5¢               │   │
│   │    OTHER          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3¢               │   │
│   │                                                         ────            │   │
│   │                                            TOTAL:      100¢             │   │
│   │                                                                          │   │
│   │    ⚠️  MUST IMPLEMENT - Users need to see ALL outcomes                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   RANGED/BRACKET MARKETS (MVP PRIORITY)                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  "What will S&P 500 close at on Jan 31, 2026?"                          │   │
│   │                                                                          │   │
│   │    < 4500         ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3¢               │   │
│   │    4500-4750      ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8¢               │   │
│   │    4750-5000      ████████████░░░░░░░░░░░░░░░░░░░░░░  22¢               │   │
│   │    5000-5250      ████████████████████░░░░░░░░░░░░░░  38¢               │   │
│   │    5250-5500      ████████████░░░░░░░░░░░░░░░░░░░░░░  20¢               │   │
│   │    > 5500         ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   9¢               │   │
│   │                                                         ────            │   │
│   │                                            TOTAL:      100¢             │   │
│   │                                                                          │   │
│   │    ⚠️  MUST IMPLEMENT - Critical for Kalshi integration                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### What Exists

| Component | Status | Location | Notes |
|-----------|:------:|----------|-------|
| React Application | ✅ | `website/src/` | Vite + React 18 |
| Terminal Layout | ✅ | `App.jsx` | Bloomberg-style UI |
| 12 Analysis Panels | ✅ | `components/panels/` | All functional |
| Polymarket API | ✅ | `services/polymarketAPI.js` | Working with CORS fallbacks |
| Web3 Auth | ✅ | `utils/auth.js` | Phantom + MetaMask |
| Quant Engine | ✅ | `utils/quantEngine.js` | Monte Carlo, Kelly, etc. |
| Watchlist (Local) | ✅ | `utils/useWatchlist.js` | localStorage only |

### What's Limited

| Feature | Current State | Problem |
|---------|--------------|---------|
| **Market Outcomes** | Binary only (YES/NO) | Misses multi-candidate, bracket markets |
| **Market Context** | Question + price only | No resolution criteria, rules, sources |
| **Kalshi Support** | None | Different data format, more bracket markets |
| **Backend API** | None | All data fetched client-side |
| **Data Persistence** | localStorage | No cloud sync, lost on clear |
| **Research Integration** | None | No Parallel.ai deep research |

### Code Statistics

```
website/src/
├── App.jsx                    714 lines   (Main terminal)
├── components/
│   ├── panels/               ~1,800 lines (12 panels)
│   ├── Login.jsx              200 lines
│   ├── Signup.jsx             180 lines
│   └── shared/                ~300 lines
├── services/
│   └── polymarketAPI.js       500 lines
├── utils/
│   ├── auth.js                200 lines
│   ├── quantEngine.js         450 lines
│   └── helpers.js             150 lines
└── data/
    └── constants.js            50 lines
                              ─────────
                    TOTAL:   ~4,500 lines
```

---

## MVP Scope Definition

### In Scope (Must Have)

#### P0: Multi-Outcome Market Support
- [ ] Display ALL outcomes for any market (not just YES/NO)
- [ ] Outcome comparison visualization
- [ ] Price history per outcome
- [ ] Orderbook per outcome
- [ ] Proper probability normalization (sum to 100%)

#### P0: Full Market Context
- [ ] Resolution criteria display
- [ ] Resolution source links
- [ ] Market rules and fine print
- [ ] Related markets linking
- [ ] Event grouping (multiple markets under one event)

#### P1: Backend API Integration
- [ ] API client service layer
- [ ] Authentication flow with JWT
- [ ] Portfolio sync to backend
- [ ] Watchlist sync to backend
- [ ] Real-time data via polling (WebSocket Phase 2)

#### P1: Kalshi Data Format Support
- [ ] Kalshi market schema mapping
- [ ] Bracket/range market visualization
- [ ] Platform indicator in UI
- [ ] Unified search across platforms

#### P2: Research Integration
- [ ] Deep research panel
- [ ] Research request form
- [ ] Results display with citations
- [ ] Research history

### Out of Scope (Phase 2+)
- Direct trading/order placement
- WebSocket real-time streaming
- Mobile responsive design
- Custom alerts/notifications
- Social features

---

## Market Data Architecture

### The Problem: Current Data Model is Binary

```javascript
// CURRENT: Only handles YES/NO
const currentMarket = {
  market_prob: 0.65,      // Single probability
  model_prob: 0.68,       // Single model estimate
  // Where are the other outcomes?!
};
```

### The Solution: Multi-Outcome Data Model

```typescript
// NEW: Supports ALL market types

interface Market {
  // Identity
  id: string;
  slug: string;
  platform: 'polymarket' | 'kalshi';

  // Event Context (CRITICAL)
  event: {
    id: string;
    title: string;                    // "2028 Presidential Election"
    description: string;              // Full context
    category: string;
    subcategory?: string;
    tags: string[];
  };

  // Market Details
  question: string;                   // "Who will win?"
  marketType: 'binary' | 'multi' | 'scalar' | 'bracket';

  // Resolution Info (CRITICAL FOR CONTEXT)
  resolution: {
    criteria: string;                 // How is this resolved?
    source: string;                   // Who resolves it?
    sourceUrl?: string;               // Link to source
    rules: string[];                  // Fine print, edge cases
    endDate: string;                  // When does it resolve?
    earlyResolution?: boolean;        // Can resolve early?
  };

  // ALL OUTCOMES (not just YES/NO)
  outcomes: Outcome[];

  // Aggregate Metrics
  volume24h: number;
  volumeTotal: number;
  liquidity: number;

  // Related Markets (same event)
  relatedMarkets?: string[];          // IDs of related markets

  // Raw data for debugging
  _raw: object;
}

interface Outcome {
  id: string;
  name: string;                       // "Candidate A", "5000-5250", "YES"
  shortName?: string;                 // "A", ">5k", "Y"

  // Pricing
  price: number;                      // Current price (0-1)
  previousPrice: number;              // For change calculation

  // Model Analysis
  modelPrice?: number;                // Our model's estimate
  edge?: number;                      // modelPrice - price
  signal?: 'BUY' | 'SELL' | 'HOLD';

  // Order Book
  bestBid: number;
  bestAsk: number;
  spread: number;

  // Volume
  volume24h: number;

  // Platform-specific
  tokenId?: string;                   // For API calls
  clobTokenId?: string;               // Polymarket CLOB
}
```

### Market Type Examples

#### Binary Market
```json
{
  "question": "Will Bitcoin hit $100k by Dec 2026?",
  "marketType": "binary",
  "outcomes": [
    { "name": "Yes", "price": 0.65, "edge": 0.03 },
    { "name": "No",  "price": 0.35, "edge": -0.03 }
  ]
}
```

#### Multi-Outcome Market (Elections, Sports, etc.)
```json
{
  "question": "Who will win the 2028 Presidential Election?",
  "marketType": "multi",
  "outcomes": [
    { "name": "Kamala Harris",    "price": 0.42, "edge": 0.05 },
    { "name": "Ron DeSantis",     "price": 0.35, "edge": -0.02 },
    { "name": "Gavin Newsom",     "price": 0.15, "edge": 0.01 },
    { "name": "Donald Trump Jr.", "price": 0.05, "edge": -0.01 },
    { "name": "Other",            "price": 0.03, "edge": 0.00 }
  ],
  "resolution": {
    "criteria": "Based on AP/Reuters/major networks calling the race",
    "source": "Associated Press",
    "rules": [
      "If no candidate wins 270+ electoral votes, resolves based on House contingent election",
      "Third-party candidates not listed resolve to 'Other'"
    ]
  }
}
```

#### Bracket/Range Market (Kalshi style)
```json
{
  "question": "What will S&P 500 close at on Jan 31, 2026?",
  "marketType": "bracket",
  "outcomes": [
    { "name": "Below 4500",   "range": [0, 4500],     "price": 0.03 },
    { "name": "4500-4750",    "range": [4500, 4750],  "price": 0.08 },
    { "name": "4750-5000",    "range": [4750, 5000],  "price": 0.22 },
    { "name": "5000-5250",    "range": [5000, 5250],  "price": 0.38 },
    { "name": "5250-5500",    "range": [5250, 5500],  "price": 0.20 },
    { "name": "Above 5500",   "range": [5500, null],  "price": 0.09 }
  ],
  "resolution": {
    "criteria": "Official S&P 500 closing price on settlement date",
    "source": "S&P Dow Jones Indices",
    "sourceUrl": "https://www.spglobal.com/spdji/"
  }
}
```

---

## Multi-Outcome Markets

### Why This Matters

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     THE MULTI-OUTCOME PROBLEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   USER SCENARIO:                                                                 │
│   "I want to bet on the 2028 election. Who are my options?"                     │
│                                                                                  │
│   ❌ CURRENT EXPERIENCE:                                                         │
│   ┌─────────────────────────────────────────────────────────────┐               │
│   │  MARKETS                              │  ANALYSIS            │               │
│   │  ─────────────────────────            │  ─────────────────── │               │
│   │  PREZ28  42¢  +2.1%  BUY             │  Market: 42¢         │               │
│   │                                       │  Model:  47¢         │               │
│   │  "2028 Presidential Election"         │  Edge:   +5¢         │               │
│   │                                       │                      │               │
│   │  😕 Wait, 42¢ for WHAT?              │  😕 What are my      │               │
│   │     Who is this for?                  │     other options?   │               │
│   │     Who else can I bet on?            │                      │               │
│   └─────────────────────────────────────────────────────────────┘               │
│                                                                                  │
│   ✅ REQUIRED EXPERIENCE:                                                        │
│   ┌─────────────────────────────────────────────────────────────┐               │
│   │  EVENT: 2028 Presidential Election                          │               │
│   │  Resolution: AP/Reuters call • Ends: Nov 5, 2028            │               │
│   │  ─────────────────────────────────────────────────────────  │               │
│   │                                                              │               │
│   │  ALL OUTCOMES:                           MARKET   MODEL EDGE │               │
│   │  ───────────────────────────────────────────────────────── │               │
│   │  ● Kamala Harris    ███████████████░░░    42¢    47¢  +5¢  │               │
│   │  ● Ron DeSantis     ████████████░░░░░░    35¢    33¢  -2¢  │               │
│   │  ● Gavin Newsom     ██████░░░░░░░░░░░░    15¢    16¢  +1¢  │               │
│   │  ● Trump Jr.        ██░░░░░░░░░░░░░░░░     5¢     4¢  -1¢  │               │
│   │  ● Other            █░░░░░░░░░░░░░░░░░     3¢     3¢   0¢  │               │
│   │                                          ────              │               │
│   │                               TOTAL:    100¢               │               │
│   │                                                              │               │
│   │  📊 Click any outcome for detailed analysis                 │               │
│   │  🔗 Related: VP Race, Senate Control, House Control         │               │
│   └─────────────────────────────────────────────────────────────┘               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### UI Components for Multi-Outcome Markets

#### 1. Outcomes Table Component

```jsx
// components/OutcomesTable.jsx

const OutcomesTable = ({ market, selectedOutcome, onSelectOutcome }) => {
  const outcomes = market.outcomes || [];
  const totalVolume = outcomes.reduce((sum, o) => sum + (o.volume24h || 0), 0);

  return (
    <div className="outcomes-table">
      <div className="outcomes-header">
        <span className="text-xs text-gray-500">OUTCOME</span>
        <span className="text-xs text-gray-500">MARKET</span>
        <span className="text-xs text-gray-500">MODEL</span>
        <span className="text-xs text-gray-500">EDGE</span>
        <span className="text-xs text-gray-500">VOL 24H</span>
      </div>

      {outcomes.map((outcome, idx) => {
        const edge = (outcome.modelPrice || outcome.price) - outcome.price;
        const signal = edge > 0.02 ? 'BUY' : edge < -0.02 ? 'SELL' : 'HOLD';
        const isSelected = selectedOutcome?.id === outcome.id;

        return (
          <div
            key={outcome.id}
            onClick={() => onSelectOutcome(outcome)}
            className={`outcome-row ${isSelected ? 'selected' : ''}`}
          >
            {/* Outcome Name with Probability Bar */}
            <div className="outcome-name">
              <div
                className="probability-bar"
                style={{ width: `${outcome.price * 100}%` }}
              />
              <span className="outcome-label">{outcome.name}</span>
            </div>

            {/* Market Price */}
            <span className="market-price">
              {(outcome.price * 100).toFixed(1)}¢
            </span>

            {/* Model Price */}
            <span className="model-price">
              {outcome.modelPrice
                ? `${(outcome.modelPrice * 100).toFixed(1)}¢`
                : '-'
              }
            </span>

            {/* Edge */}
            <span className={`edge ${edge > 0 ? 'positive' : edge < 0 ? 'negative' : ''}`}>
              {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}¢
            </span>

            {/* Volume */}
            <span className="volume">
              ${(outcome.volume24h / 1000).toFixed(1)}k
            </span>

            {/* Signal Tag */}
            {Math.abs(edge) > 0.02 && (
              <Tag type={signal.toLowerCase()}>{signal}</Tag>
            )}
          </div>
        );
      })}

      {/* Probability Sum Check */}
      <div className="outcomes-footer">
        <span className="text-xs text-gray-500">
          Total: {(outcomes.reduce((sum, o) => sum + o.price, 0) * 100).toFixed(1)}¢
          {outcomes.reduce((sum, o) => sum + o.price, 0) !== 1 && (
            <span className="text-yellow-500 ml-2">
              (Market inefficiency detected)
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
```

#### 2. Market Context Panel

```jsx
// components/panels/MarketContextPanel.jsx

const MarketContextPanel = ({ market }) => {
  if (!market) return null;

  const { event, resolution, relatedMarkets } = market;

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="MARKET CONTEXT" subtitle={market.ticker} />

      <div className="panel-content space-y-4">
        {/* Event Info */}
        <section>
          <h3 className="section-header">EVENT</h3>
          <div className="text-sm text-white">{event?.title || market.question}</div>
          <div className="text-xs text-gray-400 mt-1">
            {event?.description || market.description}
          </div>
        </section>

        {/* Resolution Criteria - CRITICAL */}
        <section>
          <h3 className="section-header">RESOLUTION</h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Criteria:</span>
              <span className="text-xs text-white">{resolution?.criteria}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Source:</span>
              {resolution?.sourceUrl ? (
                <a
                  href={resolution.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  {resolution.source} ↗
                </a>
              ) : (
                <span className="text-xs text-white">{resolution?.source}</span>
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-xs text-gray-500">End Date:</span>
              <span className="text-xs text-white">
                {new Date(resolution?.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Rules / Fine Print */}
          {resolution?.rules?.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">RULES:</span>
              <ul className="mt-1 space-y-1">
                {resolution.rules.map((rule, idx) => (
                  <li key={idx} className="text-[10px] text-gray-400 flex">
                    <span className="text-orange-500 mr-2">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Related Markets */}
        {relatedMarkets?.length > 0 && (
          <section>
            <h3 className="section-header">RELATED MARKETS</h3>
            <div className="space-y-1">
              {relatedMarkets.map((related) => (
                <div
                  key={related.id}
                  className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                  onClick={() => onSelectMarket(related)}
                >
                  {related.ticker} - {related.question}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
```

#### 3. Bracket Market Visualization

```jsx
// components/BracketVisualization.jsx

const BracketVisualization = ({ market }) => {
  const outcomes = market.outcomes || [];
  const maxPrice = Math.max(...outcomes.map(o => o.price));

  // For bracket markets, show as a distribution
  return (
    <div className="bracket-viz">
      <div className="bracket-header">
        <span className="text-xs text-gray-500">PROBABILITY DISTRIBUTION</span>
      </div>

      <div className="bracket-bars">
        {outcomes.map((outcome, idx) => (
          <div key={outcome.id} className="bracket-bar-container">
            {/* Bar */}
            <div
              className="bracket-bar"
              style={{
                height: `${(outcome.price / maxPrice) * 100}%`,
                backgroundColor: outcome.edge > 0.02
                  ? 'rgba(34, 197, 94, 0.6)'
                  : outcome.edge < -0.02
                    ? 'rgba(239, 68, 68, 0.6)'
                    : 'rgba(249, 115, 22, 0.6)'
              }}
            >
              <span className="bar-price">
                {(outcome.price * 100).toFixed(0)}¢
              </span>
            </div>

            {/* Label */}
            <div className="bracket-label">
              {outcome.shortName || outcome.name}
            </div>
          </div>
        ))}
      </div>

      {/* Current Value Indicator (for bracket markets) */}
      {market.currentValue && (
        <div
          className="current-value-marker"
          style={{ left: `${calculatePosition(market.currentValue, outcomes)}%` }}
        >
          <span className="text-xs text-yellow-400">
            Current: {market.currentValue}
          </span>
        </div>
      )}
    </div>
  );
};
```

---

## Component Architecture

### Updated Panel Structure

```
components/
├── panels/
│   ├── WatchlistPanel.jsx         # Market list (update for multi-outcome)
│   ├── MarketOverviewPanel.jsx    # Single market view (MAJOR UPDATE)
│   ├── OutcomesPanel.jsx          # NEW: All outcomes display
│   ├── MarketContextPanel.jsx     # NEW: Resolution, rules, context
│   ├── PriceChartPanel.jsx        # Update for per-outcome charts
│   ├── OrderBookPanel.jsx         # Update for selected outcome
│   ├── ConfluencePanel.jsx        # Works per outcome
│   ├── ModelBreakdownPanel.jsx    # Works per outcome
│   ├── GreeksPanel.jsx            # Update for multi-outcome
│   ├── MonteCarloPanel.jsx        # Update for portfolio of outcomes
│   ├── PortfolioPanel.jsx         # Update for multi-outcome positions
│   ├── QuantumLabPanel.jsx        # Works with new data model
│   ├── NewsFeedPanel.jsx          # Link news to outcomes
│   ├── BetsMarketPanel.jsx        # Update for trade display
│   ├── ResearchPanel.jsx          # NEW: Parallel.ai integration
│   └── EventGroupPanel.jsx        # NEW: Related markets view
│
├── market/
│   ├── OutcomesTable.jsx          # NEW: Multi-outcome table
│   ├── BracketVisualization.jsx   # NEW: Bracket/range display
│   ├── OutcomeSelector.jsx        # NEW: Dropdown/tabs for outcomes
│   └── ProbabilityBar.jsx         # NEW: Horizontal probability bar
│
├── shared/
│   ├── PanelHeader.jsx            # Existing
│   ├── Tag.jsx                    # Existing
│   ├── DataRow.jsx                # Existing
│   └── LoadingSpinner.jsx         # NEW
│
└── layout/
    ├── Terminal.jsx               # Extract from App.jsx
    ├── Header.jsx                 # Extract from App.jsx
    ├── TickerTape.jsx             # Extract from App.jsx
    └── WorkspaceGrid.jsx          # NEW: Workspace layouts
```

### Component Hierarchy

```
App
├── AuthGuard
│   ├── Login
│   └── Signup
│
└── Terminal
    ├── Header
    │   ├── Logo
    │   ├── WorkspaceTabs
    │   └── UserMenu
    │
    ├── TickerTape
    │
    ├── CommandBar
    │   ├── SearchInput
    │   ├── FilterControls
    │   └── ActionButtons
    │
    └── WorkspaceGrid
        ├── [Left Sidebar]
        │   └── WatchlistPanel
        │       └── MarketItem (per market)
        │           └── OutcomePreview (for multi-outcome)
        │
        ├── [Main Area - Analysis Workspace]
        │   ├── MarketOverviewPanel
        │   │   ├── MarketHeader
        │   │   ├── OutcomesTable        # NEW
        │   │   └── QuickStats
        │   │
        │   ├── OutcomesPanel            # NEW - Detailed outcomes
        │   │   ├── OutcomeSelector
        │   │   └── OutcomeDetails
        │   │
        │   ├── PriceChartPanel
        │   │   └── OutcomeChartTabs     # NEW
        │   │
        │   ├── ConfluencePanel
        │   ├── ModelBreakdownPanel
        │   ├── MonteCarloPanel
        │   └── GreeksPanel
        │
        └── [Bottom Dock]
            └── MarketDetailDock
                ├── PriceChart
                ├── MarketTradesPanel
                └── BuySellPanel
```

---

## State Management

### Current State: Local useState

```javascript
// Current: All state in App.jsx
const [markets, setMarkets] = useState([]);
const [selectedMarket, setSelectedMarket] = useState(null);
const [workspace, setWorkspace] = useState("analysis");
// ... 15+ useState calls
```

### Recommended: Context + Reducers

```
src/
├── context/
│   ├── MarketContext.jsx       # Market data state
│   ├── AuthContext.jsx         # Authentication state
│   ├── PortfolioContext.jsx    # Portfolio state
│   └── UIContext.jsx           # UI preferences
│
├── hooks/
│   ├── useMarkets.js           # Market data hook
│   ├── useAuth.js              # Auth hook
│   ├── usePortfolio.js         # Portfolio hook
│   ├── useWatchlist.js         # Existing, update
│   ├── useOutcome.js           # NEW: Selected outcome
│   └── useResearch.js          # NEW: Research queries
```

### Market Context Implementation

```javascript
// context/MarketContext.jsx

const MarketContext = createContext();

const marketReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MARKETS':
      return { ...state, markets: action.payload, loading: false };

    case 'SELECT_MARKET':
      return {
        ...state,
        selectedMarket: action.payload,
        selectedOutcome: action.payload?.outcomes?.[0] || null // Default to first outcome
      };

    case 'SELECT_OUTCOME':
      return { ...state, selectedOutcome: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'UPDATE_MARKET':
      return {
        ...state,
        markets: state.markets.map(m =>
          m.id === action.payload.id ? action.payload : m
        )
      };

    default:
      return state;
  }
};

export const MarketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(marketReducer, {
    markets: [],
    selectedMarket: null,
    selectedOutcome: null,  // NEW: Track selected outcome
    loading: true,
    error: null
  });

  // Actions
  const selectMarket = (market) => {
    dispatch({ type: 'SELECT_MARKET', payload: market });
  };

  const selectOutcome = (outcome) => {
    dispatch({ type: 'SELECT_OUTCOME', payload: outcome });
  };

  return (
    <MarketContext.Provider value={{
      ...state,
      dispatch,
      selectMarket,
      selectOutcome
    }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarketContext = () => useContext(MarketContext);
```

---

## API Client Layer

### Service Architecture

```
src/
├── services/
│   ├── api/
│   │   ├── client.js           # Base HTTP client with auth
│   │   ├── auth.api.js         # Auth endpoints
│   │   ├── markets.api.js      # Market endpoints
│   │   ├── portfolios.api.js   # Portfolio endpoints
│   │   ├── watchlists.api.js   # Watchlist endpoints
│   │   └── research.api.js     # Parallel.ai endpoints
│   │
│   ├── polymarket/
│   │   └── polymarketAPI.js    # Existing, keep for fallback
│   │
│   └── transformers/
│       ├── polymarket.transformer.js  # Polymarket → Unified
│       └── kalshi.transformer.js      # Kalshi → Unified
```

### Base API Client

```javascript
// services/api/client.js

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class APIClient {
  constructor() {
    this.baseURL = `${API_BASE}/api/v1`;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error?.message || 'Request failed', response.status, data.error);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError('Network error', 0, { code: 'NETWORK_ERROR' });
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

class APIError extends Error {
  constructor(message, status, error) {
    super(message);
    this.status = status;
    this.code = error?.code;
    this.details = error?.details;
  }
}

export const apiClient = new APIClient();
export { APIError };
```

### Markets API Service

```javascript
// services/api/markets.api.js

import { apiClient } from './client';

export const marketsAPI = {
  // Get all markets with filtering
  async getMarkets(params = {}) {
    const response = await apiClient.get('/markets', {
      platform: params.platform || 'all',
      category: params.category,
      status: params.status || 'active',
      limit: params.limit || 50,
      offset: params.offset || 0,
    });
    return response.data;
  },

  // Get single market with ALL outcomes
  async getMarket(marketId) {
    const response = await apiClient.get(`/markets/${marketId}`);
    return response.data;
  },

  // Get price history for specific outcome
  async getOutcomeHistory(marketId, outcomeId, days = 90) {
    const response = await apiClient.get(
      `/markets/${marketId}/outcomes/${outcomeId}/history`,
      { days }
    );
    return response.data;
  },

  // Get orderbook for specific outcome
  async getOutcomeOrderbook(marketId, outcomeId) {
    const response = await apiClient.get(
      `/markets/${marketId}/outcomes/${outcomeId}/orderbook`
    );
    return response.data;
  },

  // Search across all platforms
  async searchMarkets(query) {
    const response = await apiClient.get('/markets/search', { q: query });
    return response.data;
  },

  // Get related markets (same event)
  async getRelatedMarkets(marketId) {
    const response = await apiClient.get(`/markets/${marketId}/related`);
    return response.data;
  },
};
```

### Research API Service

```javascript
// services/api/research.api.js

import { apiClient } from './client';

export const researchAPI = {
  // Start a new research query
  async createResearch(params) {
    const response = await apiClient.post('/research', {
      query: params.query,
      marketId: params.marketId,
      processor: params.processor || 'pro',  // lite, base, core, pro, ultra
      outputFormat: params.outputFormat || 'auto',
    });
    return response.data;
  },

  // Get research result
  async getResearch(researchId) {
    const response = await apiClient.get(`/research/${researchId}`);
    return response.data;
  },

  // Get user's research history
  async getResearchHistory(params = {}) {
    const response = await apiClient.get('/research', {
      limit: params.limit || 20,
      offset: params.offset || 0,
    });
    return response.data;
  },

  // Delete research result
  async deleteResearch(researchId) {
    return apiClient.delete(`/research/${researchId}`);
  },
};
```

---

## UI/UX Requirements

### Design Principles

1. **Information Density** - Bloomberg terminal style, maximum data visibility
2. **Context is King** - Users must understand exactly what they're betting on
3. **All Outcomes Visible** - Never hide outcomes behind tabs/accordions by default
4. **Platform Agnostic** - Same UX for Polymarket and Kalshi
5. **Signal Clarity** - Clear BUY/SELL/HOLD signals with reasoning

### Color System

```css
/* Status Colors */
--color-buy: #22c55e;       /* Green - positive edge */
--color-sell: #ef4444;      /* Red - negative edge */
--color-hold: #6b7280;      /* Gray - no signal */

/* Platform Colors */
--color-polymarket: #8b5cf6; /* Purple */
--color-kalshi: #3b82f6;     /* Blue */

/* Outcome Colors (for multi-outcome) */
--color-outcome-1: #f97316;  /* Orange */
--color-outcome-2: #8b5cf6;  /* Purple */
--color-outcome-3: #22c55e;  /* Green */
--color-outcome-4: #3b82f6;  /* Blue */
--color-outcome-5: #ec4899;  /* Pink */
--color-outcome-other: #6b7280; /* Gray */
```

### Responsive Breakpoints

```css
/* Desktop First (current) */
@media (min-width: 1440px) { /* Large desktop */ }
@media (min-width: 1024px) { /* Standard desktop */ }

/* Future: Tablet/Mobile (Phase 2) */
@media (max-width: 1023px) { /* Tablet */ }
@media (max-width: 768px) { /* Mobile */ }
```

### Accessibility Requirements

- [ ] Keyboard navigation for all interactive elements
- [ ] ARIA labels on charts and data visualizations
- [ ] Color-blind friendly palette (don't rely only on red/green)
- [ ] Focus indicators on all focusable elements
- [ ] Screen reader support for key data

---

## Testing Requirements

### Test Coverage Targets

| Type | Coverage | Priority |
|------|:--------:|:--------:|
| Unit tests (components) | >70% | P1 |
| Integration tests | >50% | P1 |
| E2E tests | Critical paths | P2 |
| Visual regression | Key components | P2 |

### Testing Stack

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "msw": "^2.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

### Test Structure

```
website/
├── src/
│   └── components/
│       └── panels/
│           ├── OutcomesPanel.jsx
│           └── OutcomesPanel.test.jsx  # Co-located tests
│
└── tests/
    ├── integration/
    │   ├── market-selection.test.jsx
    │   └── multi-outcome.test.jsx
    │
    └── e2e/
        ├── auth.spec.ts
        └── trading-flow.spec.ts
```

### Example Test: Multi-Outcome Display

```javascript
// components/panels/OutcomesPanel.test.jsx

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OutcomesPanel } from './OutcomesPanel';

const mockMultiOutcomeMarket = {
  id: 'test-market',
  question: 'Who will win?',
  marketType: 'multi',
  outcomes: [
    { id: '1', name: 'Candidate A', price: 0.42, modelPrice: 0.47 },
    { id: '2', name: 'Candidate B', price: 0.35, modelPrice: 0.33 },
    { id: '3', name: 'Candidate C', price: 0.15, modelPrice: 0.16 },
    { id: '4', name: 'Other', price: 0.08, modelPrice: 0.04 },
  ],
};

describe('OutcomesPanel', () => {
  it('displays all outcomes for multi-outcome market', () => {
    render(<OutcomesPanel market={mockMultiOutcomeMarket} />);

    // All outcomes should be visible
    expect(screen.getByText('Candidate A')).toBeInTheDocument();
    expect(screen.getByText('Candidate B')).toBeInTheDocument();
    expect(screen.getByText('Candidate C')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows correct prices for each outcome', () => {
    render(<OutcomesPanel market={mockMultiOutcomeMarket} />);

    expect(screen.getByText('42.0¢')).toBeInTheDocument();
    expect(screen.getByText('35.0¢')).toBeInTheDocument();
    expect(screen.getByText('15.0¢')).toBeInTheDocument();
    expect(screen.getByText('8.0¢')).toBeInTheDocument();
  });

  it('displays edge signals correctly', () => {
    render(<OutcomesPanel market={mockMultiOutcomeMarket} />);

    // Candidate A has +5¢ edge = BUY signal
    const candidateARow = screen.getByText('Candidate A').closest('.outcome-row');
    expect(within(candidateARow).getByText('BUY')).toBeInTheDocument();
    expect(within(candidateARow).getByText('+5.0¢')).toBeInTheDocument();
  });

  it('shows total probability sum', () => {
    render(<OutcomesPanel market={mockMultiOutcomeMarket} />);

    expect(screen.getByText(/Total: 100.0¢/)).toBeInTheDocument();
  });

  it('allows selecting an outcome', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <OutcomesPanel
        market={mockMultiOutcomeMarket}
        onSelectOutcome={onSelect}
      />
    );

    await user.click(screen.getByText('Candidate B'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2', name: 'Candidate B' })
    );
  });
});
```

---

## Development Milestones

### Phase 1: Multi-Outcome Foundation (Weeks 1-2)

#### Week 1: Data Model & Components
- [ ] Define unified market schema with multi-outcome support
- [ ] Create `OutcomesTable` component
- [ ] Create `OutcomeSelector` component
- [ ] Update `MarketOverviewPanel` for multiple outcomes
- [ ] Add outcome state to context

#### Week 2: Visualization
- [ ] Create `BracketVisualization` component
- [ ] Update `PriceChartPanel` for per-outcome charts
- [ ] Update `OrderBookPanel` for selected outcome
- [ ] Add probability bar component
- [ ] Test with mock multi-outcome data

**Deliverable:** Multi-outcome UI working with mock data

### Phase 2: Context & Resolution (Weeks 3-4)

#### Week 3: Market Context
- [ ] Create `MarketContextPanel`
- [ ] Display resolution criteria
- [ ] Show resolution source with links
- [ ] Display market rules/fine print
- [ ] Add related markets section

#### Week 4: Event Grouping
- [ ] Create `EventGroupPanel`
- [ ] Link related markets under events
- [ ] Cross-market navigation
- [ ] Event-level analytics

**Deliverable:** Full market context displayed

### Phase 3: Backend Integration (Weeks 5-6)

#### Week 5: API Client
- [ ] Create base API client with auth
- [ ] Implement markets API service
- [ ] Implement portfolios API service
- [ ] Implement watchlists API service
- [ ] Add error handling and retries

#### Week 6: Data Sync
- [ ] Connect market fetching to backend
- [ ] Sync portfolios to backend
- [ ] Sync watchlists to backend
- [ ] Handle offline/online transitions
- [ ] Add loading states

**Deliverable:** Frontend fully connected to backend

### Phase 4: Research & Polish (Weeks 7-8)

#### Week 7: Research Integration
- [ ] Create `ResearchPanel`
- [ ] Research request form
- [ ] Results display with citations
- [ ] Research history view
- [ ] Link research to markets

#### Week 8: Testing & QA
- [ ] Write unit tests for new components
- [ ] Write integration tests
- [ ] Fix bugs from QA
- [ ] Performance optimization
- [ ] Documentation

**Deliverable:** Production-ready frontend

---

## Appendix

### Environment Variables

```bash
# .env.example (Frontend)

# API Configuration
VITE_API_URL=http://localhost:3000

# Feature Flags
VITE_ENABLE_RESEARCH=true
VITE_ENABLE_KALSHI=true

# Supabase (existing, optional)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### File Naming Conventions

```
# Components
PascalCase.jsx              # OutcomesPanel.jsx
PascalCase.test.jsx         # OutcomesPanel.test.jsx

# Hooks
camelCase.js                # useOutcome.js

# Services
camelCase.api.js            # markets.api.js
camelCase.transformer.js    # polymarket.transformer.js

# Contexts
PascalCase.jsx              # MarketContext.jsx

# Utils
camelCase.js                # helpers.js
```

### Key Dependencies to Add

```json
{
  "dependencies": {
    "zustand": "^4.4.0",           // Optional: lighter state management
    "react-query": "^5.0.0",        // Server state management
    "recharts": "^2.10.0",          // Alternative to Chart.js
    "date-fns": "^3.0.0",           // Date utilities
    "zod": "^3.22.0"                // Runtime validation
  }
}
```

### Useful Resources

| Resource | Link |
|----------|------|
| React Query Docs | [tanstack.com/query](https://tanstack.com/query) |
| Recharts (Charts) | [recharts.org](https://recharts.org) |
| Vitest (Testing) | [vitest.dev](https://vitest.dev) |
| Polymarket API | [docs.polymarket.com](https://docs.polymarket.com) |
| Kalshi API | [docs.kalshi.com](https://docs.kalshi.com) |

---

## Quick Reference: Market Types Cheatsheet

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MARKET TYPES QUICK REFERENCE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   BINARY                    MULTI-OUTCOME              BRACKET/RANGE            │
│   ────────                  ─────────────              ─────────────            │
│   2 outcomes exactly        3+ outcomes                Numeric ranges            │
│   YES / NO                  Named options              Usually 5-10 brackets     │
│   Sum = 100%                Sum = 100%                 Sum = 100%                │
│                                                                                  │
│   Examples:                 Examples:                  Examples:                 │
│   • "Will X happen?"        • "Who will win?"          • "What price?"           │
│   • "Yes/No questions"      • Elections                • "What count?"           │
│                             • Sports winners           • Index levels            │
│                             • Award shows              • Economic data           │
│                                                                                  │
│   UI: Simple bars           UI: Stacked table         UI: Distribution chart    │
│                                                                                  │
│   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐          │
│   │ YES ████ 65% │          │ A ████── 42% │          │    ▂▄█▆▃▁    │          │
│   │ NO  ██── 35% │          │ B ███─── 35% │          │ <5k      >6k │          │
│   └──────────────┘          │ C ██──── 15% │          └──────────────┘          │
│                             │ D █───── 5%  │                                     │
│                             │ X ─────  3%  │                                     │
│                             └──────────────┘                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | Frontend/PM | Initial release |
