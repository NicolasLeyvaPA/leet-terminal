# Frontend Engineer / PM Quick Start Guide

Welcome! This guide gets you productive fast as the Frontend Engineer and Product Manager for Leet Terminal.

---

## TL;DR - Your Mission

**Transform Leet Terminal from a binary-only market viewer into a full-featured prediction market analytics platform that:**

1. Shows **ALL outcomes** for every market (not just YES/NO)
2. Provides **full context** (resolution criteria, rules, sources)
3. Integrates with the **new backend API**
4. Supports both **Polymarket AND Kalshi**

---

## Quick Links

| Resource | Link |
|----------|------|
| Full Frontend Requirements | [FRONTEND_MVP_REQUIREMENTS.md](./FRONTEND_MVP_REQUIREMENTS.md) |
| Backend Requirements | [BACKEND_MVP_REQUIREMENTS.md](./BACKEND_MVP_REQUIREMENTS.md) |
| Live Demo | [GitHub Pages](https://nicolasleyvaPA.github.io/leet-terminal/) |
| Codebase | `/website/src/` |

---

## Day 1: Run the App

```bash
cd leet-terminal/website
npm install
npm run dev
# Open http://localhost:5173
```

### Explore the Current UI
- [ ] Click through different markets in the watchlist
- [ ] Switch between workspaces (ANALYSIS, PORTFOLIO, LAB, NEWS, BETS)
- [ ] Paste a Polymarket URL in the command bar
- [ ] Notice: **Markets only show YES probability - where are the other outcomes?**

---

## Day 2: Understand the Codebase

### Key Files

```
website/src/
├── App.jsx                 # THE MAIN FILE (714 lines)
│                           # Contains Terminal component + all state
│
├── components/panels/      # 12 analysis panels
│   ├── WatchlistPanel.jsx  # Market list sidebar
│   ├── MarketOverviewPanel.jsx  # Current market view
│   ├── ConfluencePanel.jsx # 10-factor analysis
│   └── ...
│
├── services/
│   └── polymarketAPI.js    # API integration (study this!)
│
└── utils/
    ├── auth.js             # Authentication
    └── quantEngine.js      # Monte Carlo, Kelly criterion
```

### Data Flow (Current)

```
Polymarket API
      │
      ▼
polymarketAPI.js (transforms data)
      │
      ▼
App.jsx state (markets, selectedMarket)
      │
      ▼
Panel components (display only)
```

---

## Day 3-4: Understand the Problem

### The Critical Gap: Multi-Outcome Markets

**Current:** Only shows single probability (binary YES/NO assumed)

```jsx
// Current market display
<span>{(market.market_prob * 100).toFixed(1)}¢</span>  // "65¢"
// User thinks: "65¢ for what? YES? Who else can I bet on?"
```

**Required:** Show ALL outcomes with context

```jsx
// What we need to build
<OutcomesTable market={market}>
  {market.outcomes.map(outcome => (
    <OutcomeRow
      name={outcome.name}        // "Candidate A"
      price={outcome.price}      // 0.42
      modelPrice={outcome.modelPrice}  // 0.47
      edge={outcome.edge}        // +0.05
    />
  ))}
</OutcomesTable>
```

### Real World Example

**Polymarket market:** "2028 Presidential Election"
- This is NOT a YES/NO market
- It has 5+ candidates, each with their own price
- Current UI shows "42¢" with no context
- User has no idea what they're looking at

---

## Day 5: Start Building

### Priority 1: Update the Data Model

Create a new market schema that supports all outcomes:

```javascript
// services/transformers/market.transformer.js

export function transformToUnifiedMarket(rawData, platform) {
  return {
    id: rawData.id,
    platform,  // 'polymarket' or 'kalshi'
    question: rawData.title || rawData.question,
    marketType: detectMarketType(rawData),  // 'binary', 'multi', 'bracket'

    // ALL OUTCOMES (the critical piece!)
    outcomes: rawData.markets?.map(m => ({
      id: m.id,
      name: extractOutcomeName(m),  // "Yes", "Candidate A", "5000-5250"
      price: parseFloat(m.lastTradePrice) || 0.5,
      volume24h: parseFloat(m.volume24hr) || 0,
      tokenId: m.clobTokenIds?.[0],
    })) || [],

    // Resolution context (CRITICAL)
    resolution: {
      criteria: rawData.resolutionSource,
      endDate: rawData.endDate,
      rules: extractRules(rawData.description),
    },
  };
}
```

### Priority 2: Create OutcomesTable Component

```jsx
// components/market/OutcomesTable.jsx

export const OutcomesTable = ({ market, selectedOutcome, onSelect }) => {
  if (!market?.outcomes?.length) return null;

  return (
    <div className="outcomes-table">
      <div className="outcomes-header">
        <span>OUTCOME</span>
        <span>PRICE</span>
        <span>EDGE</span>
      </div>

      {market.outcomes.map((outcome) => (
        <div
          key={outcome.id}
          className={`outcome-row ${selectedOutcome?.id === outcome.id ? 'selected' : ''}`}
          onClick={() => onSelect(outcome)}
        >
          {/* Probability bar */}
          <div className="outcome-bar-container">
            <div
              className="outcome-bar"
              style={{ width: `${outcome.price * 100}%` }}
            />
            <span className="outcome-name">{outcome.name}</span>
          </div>

          {/* Price */}
          <span className="outcome-price">
            {(outcome.price * 100).toFixed(1)}¢
          </span>

          {/* Edge */}
          <span className={`outcome-edge ${outcome.edge > 0 ? 'positive' : 'negative'}`}>
            {outcome.edge > 0 ? '+' : ''}{(outcome.edge * 100).toFixed(1)}¢
          </span>
        </div>
      ))}

      {/* Total check */}
      <div className="outcomes-footer">
        Total: {(market.outcomes.reduce((sum, o) => sum + o.price, 0) * 100).toFixed(1)}¢
      </div>
    </div>
  );
};
```

### Priority 3: Add Market Context Panel

```jsx
// components/panels/MarketContextPanel.jsx

export const MarketContextPanel = ({ market }) => {
  return (
    <div className="terminal-panel">
      <PanelHeader title="CONTEXT" />

      <div className="panel-content">
        {/* Resolution Info */}
        <section>
          <h4 className="text-xs text-gray-500">RESOLUTION</h4>
          <p className="text-sm">{market.resolution?.criteria}</p>
          <p className="text-xs text-gray-400">
            Ends: {new Date(market.resolution?.endDate).toLocaleDateString()}
          </p>
        </section>

        {/* Rules */}
        {market.resolution?.rules?.length > 0 && (
          <section>
            <h4 className="text-xs text-gray-500">RULES</h4>
            <ul className="text-xs text-gray-400">
              {market.resolution.rules.map((rule, i) => (
                <li key={i}>• {rule}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
```

---

## Week 2+: Backend Integration

Once the backend is ready, update the API layer:

```javascript
// services/api/client.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async getMarkets(params) {
    const res = await fetch(`${API_URL}/api/v1/markets?${new URLSearchParams(params)}`);
    return res.json();
  },

  async getMarket(id) {
    const res = await fetch(`${API_URL}/api/v1/markets/${id}`);
    return res.json();
  },

  // ... more endpoints
};
```

---

## Your First Week Checklist

### By End of Week 1:
- [ ] Can run the app locally
- [ ] Understand current component structure
- [ ] Identify where multi-outcome support is missing
- [ ] Create mock multi-outcome market data
- [ ] Start `OutcomesTable` component

### By End of Week 2:
- [ ] `OutcomesTable` component complete
- [ ] `MarketContextPanel` component complete
- [ ] Updated data model supports all market types
- [ ] Can display a multi-outcome market properly

---

## Common Gotchas

### 1. Polymarket API Returns Events, Not Markets

```javascript
// Polymarket structure:
{
  "id": "event-id",
  "title": "2028 Election",
  "markets": [              // <-- THIS is where outcomes live
    { "id": "market-1", "outcomes": ["Yes", "No"] },
    { "id": "market-2", "outcomes": ["Candidate A", "Candidate B", ...] }
  ]
}
```

### 2. Kalshi Uses Different Schema

```javascript
// Kalshi structure:
{
  "ticker": "INXD-25JAN16-B5000",
  "event_ticker": "INXD-25JAN16",
  "title": "S&P 500 above 5000?",
  "yes_bid": 0.45,
  "yes_ask": 0.47,
  // No "outcomes" array - binary by default
  // Multiple tickers form bracket markets
}
```

### 3. State is All in App.jsx

Currently ~15 `useState` calls in App.jsx. Consider:
- Extract to Context for shared state
- Use reducers for complex state logic
- Keep panel-local state in panels

---

## Key Decisions to Make (PM Hat)

### 1. How to Display Multi-Outcome Markets?

**Option A:** Expandable rows in watchlist
```
▶ 2028 Election  42¢  +5%
  └─ Candidate A  42¢
  └─ Candidate B  35¢
  └─ Candidate C  15¢
```

**Option B:** Separate detail view
```
Click market → Opens full outcomes panel
```

**Option C:** Always show top 3, expand for more

### 2. How to Handle Platform Differences?

**Option A:** Unified UI (same for both platforms)
**Option B:** Platform-specific views
**Option C:** Unified with platform badges

### 3. Research Integration Priority?

**Option A:** Launch with research from Day 1
**Option B:** Add research in Phase 2
**Option C:** Research as premium feature

---

## Contact & Support

- Create GitHub issues for technical blockers
- Tag backend engineer for API questions
- Document all product decisions in this repo

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND MVP QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MARKET TYPES:                                               │
│  • Binary: YES/NO (current support)                         │
│  • Multi: 3+ named outcomes (MUST ADD)                      │
│  • Bracket: Numeric ranges (MUST ADD)                       │
│                                                              │
│  KEY COMPONENTS TO BUILD:                                    │
│  • OutcomesTable - Display all outcomes                     │
│  • MarketContextPanel - Resolution, rules                   │
│  • BracketVisualization - Range markets                     │
│  • OutcomeSelector - Pick outcome for analysis              │
│                                                              │
│  STATE LOCATIONS:                                            │
│  • App.jsx: markets, selectedMarket, workspace              │
│  • useWatchlist: localStorage watchlist                     │
│  • Individual panels: local UI state                        │
│                                                              │
│  API SERVICES:                                               │
│  • polymarketAPI.js: Current Polymarket integration         │
│  • (NEW) api/client.js: Backend API client                  │
│  • (NEW) api/markets.api.js: Market endpoints               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Good luck! Build something amazing.
