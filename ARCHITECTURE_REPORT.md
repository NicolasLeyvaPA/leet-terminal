# Leet Terminal Pro: Hybrid Architecture Report & Implementation Plan

**Version:** 1.0.0
**Date:** 2026-01-13
**Author:** Claude Opus (Principal Architect)
**Status:** Design Complete, Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Findings: Problems with Evidence](#2-findings-problems-with-evidence)
3. [Target Architecture](#3-target-architecture)
4. [Implementation Stages](#4-implementation-stages)
5. [Proposed File Tree](#5-proposed-file-tree)
6. [Runbook](#6-runbook)
7. [Acceptance Criteria Checklist](#7-acceptance-criteria-checklist)

---

## 1. Executive Summary

### 1.1 Current State Assessment

**What Works:**
- React 18 frontend with modern Vite build tooling
- Polymarket API integration with fallback CORS proxies
- Comprehensive quant engine (Monte Carlo, Kelly Criterion, EV calculations)
- Multi-wallet authentication (Phantom, MetaMask, email)
- Bloomberg-style terminal UI with resizable panels
- Real-time 15-second auto-refresh mechanism

**What Fails:**
- **Data Reliability:** Browser-based CORS proxies are brittle, rate-limited, and expose API patterns to third parties
- **Chart UX:** Chart.js charts are cramped (fixed heights), non-zoomable, and lack professional interactivity
- **UI Blocking:** Monte Carlo (5,000 simulations) runs on main thread, freezing UI for 200-500ms
- **No Freshness Metadata:** Users cannot see when data was last updated or if it's stale
- **Misleading Metrics:** Sharpe ratio computed without risk-free rate; VaR duplicates percentile calculations
- **No News Integration:** NewsFeedPanel returns empty; no hyperstition scoring
- **Build Artifacts:** `.vite/` cache directories tracked in repository
- **No Quality Gates:** Zero tests, no linting, no CI/CD

### 1.2 Top 5 Risks (Ranked)

| Rank | Risk | Impact | Likelihood | Mitigation |
|------|------|--------|------------|------------|
| 1 | CORS proxy failures cause app-wide data outage | Critical | High | Backend API with server-side fetching |
| 2 | Main-thread Monte Carlo freezes UI | High | Certain | Web Worker isolation |
| 3 | Stale data shown without user awareness | High | Certain | Freshness timestamps + staleness indicators |
| 4 | Charts unusable for analysis (no zoom/expand) | Medium | Certain | ECharts + TradingView Lightweight Charts |
| 5 | No automated quality gates allow regressions | Medium | High | ESLint + Vitest + GitHub Actions |

### 1.3 Target Architecture (One Paragraph)

A **Node.js + Fastify + TypeScript backend** serves as the single gateway to Kalshi, Polymarket, and news APIs, normalizing responses into versioned JSON contracts with embedded freshness metadata (`fetched_at`, `ttl`, `is_stale`). The backend implements in-memory caching with configurable TTLs, graceful degradation (partial failures don't crash endpoints), and optional Server-Sent Events (SSE) for push updates. The **React frontend** replaces ad-hoc `setInterval` polling with **TanStack Query (React Query)** for declarative data fetching, automatic refetching, and cache management. **Chart.js is replaced with Apache ECharts** for all analytical charts (Monte Carlo, confluence) and **TradingView Lightweight Charts** for price/candlestick charts, providing zoom, pan, tooltips, fullscreen expansion, and responsive sizing via ResizeObserver. **Monte Carlo simulations move to a dedicated Web Worker** with seeded PRNG (xorshift128+) for reproducibility. A **Hyperstition Scoring Engine** computes explainable 0-100 scores with component breakdowns. Finally, a **non-autonomous coding agent scaffold** monitors CI/logs and proposes diffs for human approval without auto-merging.

### 1.4 Measurable Expected Outcomes

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Real-time data reliability | ~70% (proxy failures) | 99%+ | Backend health endpoint uptime |
| UI chart readability | Poor (fixed 200px, no zoom) | Excellent | User testing: can read any data point |
| Quant metric validity | Misleading Sharpe | Proper CVaR, drawdown | Code review + documentation |
| Main thread blocking | 200-500ms (MC) | <16ms | Performance profiling |
| Data freshness visibility | None | Every panel shows timestamp | Visual inspection |
| Test coverage | 0% | >60% critical paths | Coverage report |
| Agent safety | N/A | Proposal-only, no auto-merge | Audit log review |

---

## 2. Findings: Problems with Evidence

### Issue A: Real-Time Market Data Brittleness

**Where:** `website/src/services/polymarketAPI.js:6-81`

**Symptom:** Data fetches intermittently fail in production. Console shows "CORS proxy failed" errors cycling through all three proxies before giving up. Users see stale or fallback-generated synthetic data without knowing it's fake.

**Root Cause:**
1. Browser-based fetches to `gamma-api.polymarket.com` and `clob.polymarket.com` blocked by CORS in production
2. Fallback to third-party CORS proxies (`corsproxy.io`, `allorigins.win`, `cors-anywhere.herokuapp.com`) which are:
   - Rate-limited (cors-anywhere requires header)
   - Unreliable (outages, slow response)
   - Privacy concern (third party sees all requests)
3. No freshness metadata - when fallback synthetic data is used, user doesn't know

**Evidence:**
```javascript
// polymarketAPI.js:6-10
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://cors-anywhere.herokuapp.com/${url}`,
];
```

**Impact:**
- Users make trading decisions on stale/synthetic data
- App appears broken during proxy outages
- No way to distinguish real vs. fallback data

**Fix:**
1. Create backend API (`/api/v1/markets`, `/api/v1/markets/:id/orderbook`, etc.)
2. Backend fetches from Kalshi/Polymarket server-side (no CORS)
3. Add `DataFreshness` metadata to every response
4. Frontend displays freshness indicators

**Acceptance Criteria:**
- [ ] All market data flows through backend
- [ ] Zero CORS proxy usage in production
- [ ] Every data panel shows "Updated X seconds ago"
- [ ] Stale data (>60s) shows warning indicator
- [ ] Kalshi failure doesn't break Polymarket data (graceful degradation)

---

### Issue B: Charts Are Cramped and Non-Interactive

**Where:**
- `website/src/components/PriceChart.jsx` (106 lines)
- `website/src/components/MonteCarloChart.jsx` (123 lines)
- `website/src/components/panels/PriceChartPanel.jsx`
- `website/src/components/panels/MonteCarloPanel.jsx`

**Symptom:** Charts render at fixed ~200px height, cannot zoom or pan, tooltips are basic, no fullscreen option. Users cannot analyze price movements or simulation paths effectively.

**Root Cause:**
1. Chart.js lacks built-in zoom plugin (requires chartjs-plugin-zoom)
2. Container heights hardcoded, no ResizeObserver
3. No "expand to fullscreen" functionality
4. Chart.js tooltip customization is limited
5. No data decimation for large datasets

**Evidence:**
```javascript
// PriceChart.jsx:15-20 - Fixed responsive:true but container is fixed height
const config = {
  type: 'line',
  data: chartData,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    // No zoom plugin configured
    // No decimation configured
  }
};
```

**Impact:**
- Cannot zoom into specific time periods
- Cannot see individual simulation paths clearly
- Professional traders find charts unusable
- Mobile experience is especially poor

**Fix:**
1. Replace Chart.js with **Apache ECharts** for Monte Carlo and analytical charts
2. Use **TradingView Lightweight Charts** for price charts (better financial UX)
3. Implement ResizeObserver for responsive containers
4. Add zoom/pan controls, fullscreen modal
5. Implement data decimation for 90-day history

**Acceptance Criteria:**
- [ ] All charts support zoom (mouse wheel + pinch)
- [ ] All charts support pan (drag)
- [ ] Every chart has "Expand" button opening fullscreen modal
- [ ] Tooltips show all relevant data points
- [ ] Charts resize correctly on window/panel resize
- [ ] Large datasets decimated to prevent performance issues

---

### Issue C: Quant Engine Blocks Main Thread

**Where:** `website/src/utils/quantEngine.js` (150 lines)

**Symptom:** When Monte Carlo panel renders, UI freezes for 200-500ms. Scrolling stutters, button clicks delayed.

**Root Cause:**
1. `QuantEngine.monteCarlo()` runs 5,000 simulations × 100 trades = 500,000 iterations on main thread
2. Uses `Math.random()` which is not seedable (non-reproducible results)
3. No Web Worker isolation
4. No progress indication during computation

**Evidence:**
```javascript
// quantEngine.js - runs synchronously on main thread
static monteCarlo(marketProb, modelProb, config = {}) {
  const { simulations = 5000, tradesPerSim = 100, startingCapital = 10000 } = config;
  // 500,000 synchronous iterations blocking UI
  for (let sim = 0; sim < simulations; sim++) {
    for (let trade = 0; trade < tradesPerSim; trade++) {
      // Math.random() - not seedable
    }
  }
}
```

**Impact:**
- Poor user experience (frozen UI)
- Cannot compare results (non-reproducible)
- No ability to cancel long-running simulation

**Fix:**
1. Move Monte Carlo to dedicated Web Worker
2. Implement seeded PRNG (xorshift128+ or similar)
3. Add progress callbacks for UI feedback
4. Support cancellation via `worker.terminate()`

**Acceptance Criteria:**
- [ ] Monte Carlo runs in Web Worker (main thread <16ms)
- [ ] Results reproducible with same seed
- [ ] Progress indicator shows % complete
- [ ] User can cancel running simulation

---

### Issue D: Misleading and Redundant Quant Metrics

**Where:** `website/src/utils/quantEngine.js`

**Symptom:** Sharpe ratio displayed without context. VaR 95% and Percentile 5% show same value. Missing important risk metrics.

**Root Cause:**
1. Sharpe ratio computed as `mean/stdDev` without risk-free rate subtraction
2. VaR is literally the 5th percentile (redundant display)
3. Missing: CVaR (Expected Shortfall), drawdown distribution, probability of ruin threshold

**Evidence:**
```javascript
// quantEngine.js - Sharpe without risk-free rate
sharpe: mean / stdDev,  // Should be (mean - riskFreeRate) / stdDev

// VaR is just percentile renamed
var95: sorted[Math.floor(simulations * 0.05)],
percentile5: sorted[Math.floor(simulations * 0.05)],  // Same calculation
```

**Impact:**
- Users misinterpret Sharpe ratio (inflated by not subtracting rf)
- Redundant metrics waste screen space
- Missing CVaR hides tail risk

**Fix:**
1. Sharpe: subtract configurable risk-free rate (default 5% annual)
2. Remove duplicate percentile display
3. Add: CVaR, max drawdown distribution, prob(loss > X%), expected log-growth
4. Add simulation algorithm selector (bootstrap, Student-t, regime-switching)

**Acceptance Criteria:**
- [ ] Sharpe ratio properly computed with risk-free rate
- [ ] No duplicate metrics displayed
- [ ] CVaR (Expected Shortfall) shown
- [ ] User can select simulation algorithm
- [ ] Algorithm differences explained in UI

---

### Issue E: No News Integration or Hyperstition Scoring

**Where:**
- `website/src/components/panels/NewsFeedPanel.jsx`
- `website/src/services/polymarketAPI.js:485-489`

**Symptom:** News panel is empty. No way to understand what's driving market sentiment.

**Root Cause:**
1. `fetchMarketNews()` returns empty array
2. No news aggregation service
3. No hyperstition/sentiment scoring algorithm
4. No news-to-market linking

**Evidence:**
```javascript
// polymarketAPI.js:485-489
export async function fetchMarketNews(keywords) {
  // In production, this would connect to a news aggregation API
  // For now, return empty array - no fake news
  return [];
}
```

**Impact:**
- Users cannot see news driving price movements
- No sentiment analysis
- Missing key trading signals

**Fix:**
1. Backend aggregates news from RSS feeds / news APIs
2. Implement Hyperstition Score (0-100) with components:
   - `news_heat`: Article volume acceleration
   - `momentum`: Mention frequency trend
   - `liquidity_sensitivity`: Spread/depth changes
   - `volatility_reflex`: Price variability
   - `controversy`: Sentiment polarity spread
3. Link news to markets via keyword/entity matching
4. Frontend displays score breakdown + linked articles

**Acceptance Criteria:**
- [ ] News feed shows real articles
- [ ] Hyperstition score displayed (0-100)
- [ ] Score breakdown shows 5 components
- [ ] "Why" section explains top 3 drivers
- [ ] Clicking news item shows relevance to market

---

### Issue F: Build Artifacts and Missing Quality Gates

**Where:**
- `website/.vite/` (tracked in git)
- No `.eslintrc`, `prettier.config.js`, `vitest.config.ts`
- No `.github/workflows/`

**Symptom:** `.vite/deps_temp_*` directories in repository. No linting errors caught. No tests run.

**Root Cause:**
1. `.gitignore` missing `.vite/` entry
2. No ESLint/Prettier configured
3. No test framework installed
4. No CI/CD pipeline

**Evidence:**
```bash
$ find . -name ".vite" -type d
./website/.vite
./website/.vite/deps_temp_388e36f0
./website/.vite/deps_temp_41abb50b
```

**Impact:**
- Repository bloated with cache files
- Code style inconsistent
- Regressions not caught before merge
- No confidence in deployments

**Fix:**
1. Add `.vite/` to `.gitignore`, remove tracked files
2. Configure ESLint + Prettier (or Biome)
3. Add Vitest for unit/integration tests
4. Create GitHub Actions workflow for CI

**Acceptance Criteria:**
- [ ] `.vite/` not in repository
- [ ] ESLint passes with zero errors
- [ ] Prettier formats all files consistently
- [ ] >60% test coverage on critical paths
- [ ] CI runs on every PR

---

## 3. Target Architecture

### 3.1 ASCII System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LEET TERMINAL PRO v4.0                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND (React 18)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  TanStack   │  │   ECharts   │  │ TradingView │  │    Supervisor Console   │ │
│  │   Query     │  │   Charts    │  │  Lightweight│  │   (Agent Monitoring)    │ │
│  │  (caching)  │  │ (analytics) │  │   Charts    │  │                         │ │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │                                                                        │
│  ┌──────┴──────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  apiClient  │  │  Freshness  │  │  Web Worker │  │    Hyperstition UI      │ │
│  │  (central)  │  │  Indicators │  │ (Monte Carlo│  │   (Score + Breakdown)   │ │
│  │             │  │  (per panel)│  │  + Seeded)  │  │                         │ │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────┼───────────────────────────────────────────────────────────────────────┘
          │ HTTP/SSE
          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Node.js + Fastify + TypeScript)               │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              API Gateway                                  │   │
│  │  GET /api/v1/markets              GET /api/v1/markets/:id/hyperstition   │   │
│  │  GET /api/v1/markets/:id/orderbook GET /api/v1/news                      │   │
│  │  GET /api/v1/markets/:id/history   GET /api/v1/health                    │   │
│  │  GET /api/v1/sse/markets          GET /api/v1/status                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│         │                    │                    │                    │        │
│         ▼                    ▼                    ▼                    ▼        │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌──────────┐   │
│  │   Kalshi    │      │ Polymarket  │      │    News     │      │ Hypersti │   │
│  │  Connector  │      │  Connector  │      │ Aggregator  │      │  tion    │   │
│  │ (server-    │      │ (server-    │      │ (RSS/APIs)  │      │ Scoring  │   │
│  │   side)     │      │   side)     │      │             │      │ Engine   │   │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └────┬─────┘   │
│         │                    │                    │                   │         │
│         ▼                    ▼                    ▼                   ▼         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         CACHE LAYER (In-Memory + TTL)                    │   │
│  │   markets: 30s TTL    orderbook: 10s TTL    news: 300s TTL              │   │
│  │   + fetched_at timestamp    + is_stale flag    + source tracking        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                      │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │   Kalshi    │      │ Polymarket  │      │  News APIs  │      │   GitHub    │ │
│  │    API      │      │  Gamma/CLOB │      │ (RSS feeds) │      │    API      │ │
│  └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT ORCHESTRATOR (Non-Autonomous)                       │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │   Monitor   │      │   Sandbox   │      │    Diff     │      │   Audit     │ │
│  │  (CI/logs/  │ ───▶ │  (isolated  │ ───▶ │  Generator  │ ───▶ │    Log      │ │
│  │   health)   │      │   worker)   │      │  (patches)  │      │             │ │
│  └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘ │
│                                                    │                             │
│                                                    ▼                             │
│                                           ┌─────────────┐                        │
│                                           │  HUMAN      │                        │
│                                           │  APPROVAL   │                        │
│                                           │  REQUIRED   │                        │
│                                           └─────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

#### 3.2.1 Market Data Flow

```
1. Frontend calls apiClient.getMarkets()
2. TanStack Query checks cache (staleTime: 30s)
3. If stale/missing → HTTP GET /api/v1/markets
4. Backend checks in-memory cache
5. If cache miss → parallel fetch Kalshi + Polymarket
6. Normalize to MarketSummary[], add freshness metadata
7. Return { data: [...], freshness: { fetched_at, ttl, is_stale } }
8. Frontend displays data + freshness indicator
9. TanStack Query background refetch after staleTime
```

#### 3.2.2 Cache Strategy

| Resource | Backend TTL | Frontend staleTime | Refetch Interval |
|----------|-------------|-------------------|------------------|
| Markets list | 30s | 30s | 60s (background) |
| Orderbook | 10s | 5s | 15s |
| Price history | 300s | 300s | Manual only |
| News | 300s | 60s | 120s |
| Hyperstition | 60s | 30s | 60s |

#### 3.2.3 Partial Failure Handling

```
Scenario: Kalshi API down, Polymarket up
1. Backend fetches both in parallel with Promise.allSettled()
2. Kalshi returns error, Polymarket returns data
3. Response includes:
   - data: [polymarket markets only]
   - freshness.sources: { kalshi: "error", polymarket: "ok" }
   - freshness.partial: true
4. Frontend shows data + warning: "Kalshi data unavailable"
```

#### 3.2.4 SSE Push Updates (Optional)

```
1. Client connects: GET /api/v1/sse/markets
2. Backend sends: event: market-update, data: { id, price, ... }
3. TanStack Query onMessage → invalidateQueries(['market', id])
4. Automatic refetch of affected market
```

### 3.3 Contracts (Zod Schemas)

```typescript
// shared/contracts/index.ts

import { z } from 'zod';

// === FRESHNESS METADATA ===
export const DataFreshnessSchema = z.object({
  fetched_at: z.string().datetime(),
  ttl_seconds: z.number().int().positive(),
  is_stale: z.boolean(),
  source: z.enum(['kalshi', 'polymarket', 'news', 'computed']),
  cache_hit: z.boolean(),
});
export type DataFreshness = z.infer<typeof DataFreshnessSchema>;

// === MARKET SUMMARY ===
export const MarketSummarySchema = z.object({
  id: z.string(),
  ticker: z.string(),
  platform: z.enum(['Kalshi', 'Polymarket']),
  question: z.string(),
  description: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),

  // Pricing
  market_prob: z.number().min(0).max(1),
  model_prob: z.number().min(0).max(1),
  prev_prob: z.number().min(0).max(1),

  // Market metrics
  best_bid: z.number().min(0).max(1),
  best_ask: z.number().min(0).max(1),
  spread: z.number().min(0),
  volume_24h: z.number().min(0),
  volume_total: z.number().min(0),
  liquidity: z.number().min(0),
  open_interest: z.number().min(0),
  trades_24h: z.number().int().min(0),

  // Dates
  end_date: z.string().datetime().nullable(),
  created_at: z.string().datetime(),

  // Platform-specific IDs
  platform_ids: z.object({
    market_id: z.string(),
    condition_id: z.string().optional(),
    clob_token_ids: z.array(z.string()).optional(),
  }),
});
export type MarketSummary = z.infer<typeof MarketSummarySchema>;

// === ORDERBOOK ===
export const OrderbookLevelSchema = z.object({
  price: z.number().min(0).max(1),
  size: z.number().min(0),
  cumulative: z.number().min(0),
});

export const OrderbookSnapshotSchema = z.object({
  market_id: z.string(),
  bids: z.array(OrderbookLevelSchema),
  asks: z.array(OrderbookLevelSchema),
  imbalance: z.number().min(-1).max(1),
  spread: z.number().min(0),
  mid_price: z.number().min(0).max(1),
  freshness: DataFreshnessSchema,
});
export type OrderbookSnapshot = z.infer<typeof OrderbookSnapshotSchema>;

// === PRICE HISTORY ===
export const MarketHistoryPointSchema = z.object({
  timestamp: z.number().int(), // Unix ms
  date: z.string(), // YYYY-MM-DD
  price: z.number().min(0).max(1),
  volume: z.number().min(0),
  high: z.number().min(0).max(1),
  low: z.number().min(0).max(1),
});
export type MarketHistoryPoint = z.infer<typeof MarketHistoryPointSchema>;

export const MarketHistorySchema = z.object({
  market_id: z.string(),
  points: z.array(MarketHistoryPointSchema),
  freshness: DataFreshnessSchema,
});
export type MarketHistory = z.infer<typeof MarketHistorySchema>;

// === NEWS ===
export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  url: z.string().url(),
  source: z.string(),
  published_at: z.string().datetime(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  relevance_score: z.number().min(0).max(1),
  matched_keywords: z.array(z.string()),
  linked_market_ids: z.array(z.string()),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

// === HYPERSTITION SCORE ===
export const HyperstitionComponentSchema = z.object({
  name: z.string(),
  value: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  description: z.string(),
});

export const HyperstitionScoreSchema = z.object({
  market_id: z.string(),
  overall: z.number().min(0).max(100),
  band: z.enum(['cold', 'warm', 'hot', 'viral']),
  components: z.object({
    news_heat: HyperstitionComponentSchema,
    momentum: HyperstitionComponentSchema,
    liquidity_sensitivity: HyperstitionComponentSchema,
    volatility_reflex: HyperstitionComponentSchema,
    controversy: HyperstitionComponentSchema,
  }),
  top_drivers: z.array(z.string()).max(3),
  linked_news: z.array(z.string()), // NewsItem IDs
  freshness: DataFreshnessSchema,
});
export type HyperstitionScore = z.infer<typeof HyperstitionScoreSchema>;

// === API RESPONSE WRAPPER ===
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    freshness: DataFreshnessSchema,
    errors: z.array(z.object({
      code: z.string(),
      message: z.string(),
      source: z.string().optional(),
    })).optional(),
  });

// === API VERSIONING ===
export const API_VERSION = 'v1';
export const CONTRACT_VERSION = '1.0.0';
```

### 3.4 Operations Considerations

#### 3.4.1 Rate Limits & Backoff

```typescript
// Backend retry configuration
const RETRY_CONFIG = {
  kalshi: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
  polymarket: {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },
  news: {
    maxRetries: 2,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
};

// Rate limit tracking
const RATE_LIMITS = {
  kalshi: { requests: 100, windowMs: 60000 },
  polymarket: { requests: 300, windowMs: 60000 },
};
```

#### 3.4.2 Health Endpoints

```typescript
// GET /api/v1/health - Quick liveness check
{
  "status": "healthy",
  "timestamp": "2026-01-13T10:30:00Z"
}

// GET /api/v1/status - Detailed status
{
  "status": "degraded", // healthy | degraded | unhealthy
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "sources": {
    "kalshi": { "status": "healthy", "latency_ms": 120, "last_success": "..." },
    "polymarket": { "status": "healthy", "latency_ms": 85, "last_success": "..." },
    "news": { "status": "error", "error": "Rate limited", "last_success": "..." }
  },
  "cache": {
    "markets": { "size": 150, "hit_rate": 0.85 },
    "orderbooks": { "size": 50, "hit_rate": 0.72 }
  }
}
```

#### 3.4.3 Structured Logging

```typescript
// Every log entry includes
{
  "timestamp": "2026-01-13T10:30:00.123Z",
  "level": "info",
  "request_id": "req_abc123",
  "service": "kalshi-connector",
  "message": "Fetched markets",
  "duration_ms": 150,
  "market_count": 50,
  "cache_hit": false
}
```

#### 3.4.4 Error Envelope

```typescript
// Standard error response
{
  "success": false,
  "data": null,
  "freshness": {
    "fetched_at": "2026-01-13T10:30:00Z",
    "ttl_seconds": 0,
    "is_stale": true,
    "source": "kalshi",
    "cache_hit": false
  },
  "errors": [
    {
      "code": "UPSTREAM_ERROR",
      "message": "Kalshi API returned 503",
      "source": "kalshi"
    }
  ]
}
```

---

## 4. Implementation Stages

### Stage 0: Cleanup & Tooling

**Tasks:**
1. Remove `.vite/` from git tracking
2. Update `.gitignore`
3. Add ESLint + Prettier configuration
4. Add Vitest configuration
5. Create GitHub Actions CI workflow
6. Initialize TypeScript for backend

---

### Stage 1: Backend API + Caching + Freshness

**Tasks:**
1. Create `server/` directory structure
2. Implement Fastify server with TypeScript
3. Create Kalshi connector
4. Create Polymarket connector
5. Implement in-memory cache with TTL
6. Add freshness metadata to all responses
7. Create health endpoints
8. Add structured logging

---

### Stage 2: Frontend Data Layer Modernization

**Tasks:**
1. Install TanStack Query
2. Create central `apiClient`
3. Replace `setInterval` with React Query hooks
4. Add freshness indicator components
5. Add manual refresh controls
6. Implement loading/error states

---

### Stage 3: Charting Overhaul

**Tasks:**
1. Install Apache ECharts (`echarts`, `echarts-for-react`)
2. Install TradingView Lightweight Charts
3. Create reusable chart wrapper components
4. Implement zoom/pan controls
5. Create fullscreen modal component
6. Replace PriceChart with TradingView
7. Replace MonteCarloChart with ECharts
8. Add ResizeObserver integration
9. Implement data decimation

---

### Stage 4: Quant Engine Upgrade

**Tasks:**
1. Create Web Worker for Monte Carlo
2. Implement seeded PRNG (xorshift128+)
3. Add simulation algorithm selector
4. Fix Sharpe ratio calculation
5. Add CVaR, drawdown distribution, prob(loss > X)
6. Remove redundant metrics
7. Add progress reporting
8. Create simulation config UI

---

### Stage 5: Hyperstition Scoring

**Tasks:**
1. Create news aggregation service (backend)
2. Implement keyword/entity extraction
3. Create Hyperstition scoring algorithm
4. Add news-to-market linking
5. Create `/api/v1/markets/:id/hyperstition` endpoint
6. Build Hyperstition UI panel
7. Add "Why" section with drivers
8. Link news items to markets

---

### Stage 6: Agent Scaffolding

**Tasks:**
1. Create agent orchestrator service
2. Implement job queue
3. Create sandboxed worker execution
4. Implement diff generator
5. Build Supervisor Console UI
6. Add command/path allowlists
7. Implement audit logging
8. Add kill switch mechanism
9. Create PR draft bundle fallback

---

## 5. Proposed File Tree

```
leet-terminal/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI
├── website/                          # Frontend (existing)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts             # Central API client
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── EChartsWrapper.tsx
│   │   │   │   ├── TradingViewChart.tsx
│   │   │   │   ├── MonteCarloChart.tsx    # NEW (ECharts)
│   │   │   │   ├── PriceChart.tsx         # NEW (TradingView)
│   │   │   │   └── ChartModal.tsx         # Fullscreen modal
│   │   │   ├── freshness/
│   │   │   │   ├── FreshnessIndicator.tsx
│   │   │   │   └── RefreshButton.tsx
│   │   │   ├── panels/
│   │   │   │   ├── HyperstitionPanel.tsx  # NEW
│   │   │   │   ├── SupervisorPanel.tsx    # NEW (Agent UI)
│   │   │   │   └── ... (existing panels)
│   │   │   └── ... (existing components)
│   │   ├── hooks/
│   │   │   ├── useMarkets.ts
│   │   │   ├── useOrderbook.ts
│   │   │   ├── usePriceHistory.ts
│   │   │   ├── useNews.ts
│   │   │   ├── useHyperstition.ts
│   │   │   └── useMonteCarloWorker.ts
│   │   ├── workers/
│   │   │   ├── monteCarlo.worker.ts
│   │   │   └── prng.ts                    # Seeded PRNG
│   │   ├── utils/
│   │   │   ├── quantEngine.ts             # Refactored
│   │   │   └── ... (existing utils)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json                      # NEW
│   ├── vite.config.ts
│   └── vitest.config.ts                   # NEW
├── server/                                # NEW Backend
│   ├── src/
│   │   ├── connectors/
│   │   │   ├── kalshi.ts
│   │   │   ├── polymarket.ts
│   │   │   └── news.ts
│   │   ├── services/
│   │   │   ├── cache.ts
│   │   │   ├── hyperstition.ts
│   │   │   └── marketNormalizer.ts
│   │   ├── routes/
│   │   │   ├── markets.ts
│   │   │   ├── news.ts
│   │   │   ├── health.ts
│   │   │   └── sse.ts
│   │   ├── middleware/
│   │   │   ├── requestId.ts
│   │   │   └── errorHandler.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── shared/                                # NEW Shared contracts
│   ├── contracts/
│   │   └── index.ts                       # Zod schemas
│   ├── package.json
│   └── tsconfig.json
├── agent/                                 # NEW Agent orchestrator
│   ├── src/
│   │   ├── orchestrator.ts
│   │   ├── monitor.ts
│   │   ├── sandbox.ts
│   │   ├── diffGenerator.ts
│   │   └── auditLog.ts
│   ├── package.json
│   └── tsconfig.json
├── .eslintrc.cjs                          # NEW
├── .prettierrc                            # NEW
├── .gitignore                             # UPDATED
├── package.json                           # Root workspace
├── turbo.json                             # NEW (Turborepo config)
├── ARCHITECTURE_REPORT.md                 # This document
└── README.md
```

---

## 6. Runbook

### 6.1 Prerequisites

```bash
# Required
node >= 20.0.0
npm >= 10.0.0

# Optional (for agent PR creation)
gh (GitHub CLI) authenticated
```

### 6.2 Installation

```bash
# Clone repository
git clone https://github.com/NicolasLeyvaPA/leet-terminal.git
cd leet-terminal

# Install all dependencies (workspaces)
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your API keys (optional for mock mode)
```

### 6.3 Development Mode

```bash
# Terminal 1: Start backend
cd server && npm run dev
# Runs on http://localhost:3001

# Terminal 2: Start frontend
cd website && npm run dev
# Runs on http://localhost:5173

# Terminal 3: Start agent (optional)
cd agent && npm run dev
# Runs on http://localhost:3002
```

### 6.4 Production Build

```bash
# Build all packages
npm run build

# Start production servers
npm run start
```

### 6.5 Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific workspace tests
npm run test --workspace=server
npm run test --workspace=website
```

### 6.6 Linting & Formatting

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### 6.7 Health Checks

```bash
# Backend health
curl http://localhost:3001/api/v1/health

# Detailed status
curl http://localhost:3001/api/v1/status

# Frontend (dev server)
curl http://localhost:5173
```

### 6.8 Agent Supervisor Console

1. Navigate to http://localhost:5173/supervisor
2. View pending jobs and their status
3. Review proposed diffs
4. Click "Approve" to create PR draft bundle
5. Download bundle and apply manually, or use GitHub CLI

### 6.9 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Backend returns 503 | Upstream API down | Check `/api/v1/status` for source health |
| Charts not rendering | ECharts not initialized | Check console for errors, ensure ResizeObserver |
| Monte Carlo hangs | Worker not loading | Check worker URL in network tab |
| Stale data warning | Cache expired, refetch failed | Click manual refresh, check network |
| Agent jobs stuck | Sandbox timeout | Check agent logs, kill and restart |

---

## 7. Acceptance Criteria Checklist

### Objective 1: Reliable Real-Time Markets

- [ ] `GET /api/v1/markets` returns normalized market data
- [ ] `GET /api/v1/markets/:id/orderbook` returns orderbook with freshness
- [ ] `GET /api/v1/markets/:id/history` returns price history
- [ ] `GET /api/v1/news` returns aggregated news
- [ ] `GET /api/v1/markets/:id/hyperstition` returns score
- [ ] `GET /api/v1/health` returns within 100ms
- [ ] Zero CORS proxies used in production
- [ ] Kalshi down → Polymarket still works
- [ ] Polymarket down → Kalshi still works
- [ ] All responses include `freshness` metadata

### Objective 2: Frontend Data Layer

- [ ] TanStack Query installed and configured
- [ ] Central `apiClient` handles all API calls
- [ ] All panels show freshness indicator
- [ ] Stale data (>60s) shows warning
- [ ] Manual refresh button on each panel
- [ ] User can configure refresh interval
- [ ] Loading states shown during fetch
- [ ] Error states shown on failure

### Objective 3: Charting Overhaul

- [ ] Chart.js fully removed
- [ ] Apache ECharts used for Monte Carlo, confluence
- [ ] TradingView Lightweight Charts for price charts
- [ ] All charts support mouse wheel zoom
- [ ] All charts support drag pan
- [ ] All charts have "Expand" fullscreen button
- [ ] Tooltips show all data points clearly
- [ ] Charts resize correctly on window resize
- [ ] Charts resize correctly on panel resize
- [ ] Large datasets decimated (>1000 points)
- [ ] No re-render thrashing (memoized options)

### Objective 4: Quant Engine

- [ ] Monte Carlo runs in Web Worker
- [ ] Main thread blocked <16ms during simulation
- [ ] Results reproducible with same seed
- [ ] Progress indicator shows % complete
- [ ] User can cancel simulation
- [ ] Sharpe ratio uses risk-free rate (configurable)
- [ ] CVaR (Expected Shortfall) displayed
- [ ] Drawdown distribution shown
- [ ] Probability of loss > X% shown
- [ ] Expected log-growth shown
- [ ] No duplicate metrics displayed
- [ ] ≥3 simulation algorithms available
- [ ] Algorithm differences explained in UI

### Objective 5: Hyperstition Module

- [ ] Hyperstition score displayed (0-100)
- [ ] Score band shown (cold/warm/hot/viral)
- [ ] 5 components shown with values
- [ ] Top 3 drivers listed with explanations
- [ ] Linked news items shown
- [ ] Clicking news opens source
- [ ] News linked to markets via keywords
- [ ] Relevance score shown for each link

### Objective 6: Repo Hygiene

- [ ] `.vite/` removed from repository
- [ ] `.vite/` in `.gitignore`
- [ ] ESLint configured and passing
- [ ] Prettier configured and formatted
- [ ] Vitest configured
- [ ] >60% test coverage on critical paths
- [ ] GitHub Actions CI runs on PR
- [ ] TypeScript used for backend
- [ ] TypeScript used for shared contracts

### Objective 7: Non-Autonomous Agent

- [ ] Agent orchestrator service runs
- [ ] Jobs viewable in Supervisor Console
- [ ] Proposed diffs shown in UI
- [ ] Test results shown per job
- [ ] "Approve" button creates PR bundle
- [ ] Command allowlist enforced (test/lint/build only)
- [ ] Path allowlist enforced (no secrets/.env)
- [ ] Max diff size limit enforced
- [ ] Kill switch functional
- [ ] Audit log records all actions
- [ ] Agent NEVER auto-merges
- [ ] Agent NEVER auto-deploys

---

## Appendix A: Key Implementation Diffs

*Note: Full implementation diffs are provided in the subsequent implementation files. This section provides a summary of the most critical changes.*

### A.1 Backend Server Entry Point

See `server/src/index.ts` for complete implementation.

### A.2 Frontend API Client

See `website/src/api/client.ts` for complete implementation.

### A.3 ECharts Monte Carlo Component

See `website/src/components/charts/MonteCarloChart.tsx` for complete implementation.

### A.4 Web Worker Monte Carlo

See `website/src/workers/monteCarlo.worker.ts` for complete implementation.

### A.5 Hyperstition Scoring Algorithm

See `server/src/services/hyperstition.ts` for complete implementation.

---

*End of Architecture Report*
