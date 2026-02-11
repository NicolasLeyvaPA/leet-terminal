# Backend MVP Requirements Document

## Leet Terminal - Backend Architecture

**Version:** 1.0.0
**Last Updated:** January 2026
**Target Audience:** Backend Engineering Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [MVP Scope Definition](#mvp-scope-definition)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [External API Integrations](#external-api-integrations)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Security Requirements](#security-requirements)
10. [Testing Requirements](#testing-requirements)
11. [Development Milestones](#development-milestones)
12. [Appendix](#appendix)

---

## Executive Summary

### Project Vision
Leet Terminal is a professional-grade prediction market analytics platform. The backend MVP must transform the current client-side-only application into a full-stack platform capable of:

- **Persistent user data** (portfolios, watchlists, preferences)
- **Real-time market data aggregation** (Polymarket + Kalshi)
- **Deep research integration** (Parallel.ai)
- **Scalable API architecture** with CI/CD automation

### What We're Building
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LEET TERMINAL ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         FRONTEND (React/Vite)                            │   │
│   │                    ✅ EXISTING - Maintained by Frontend Team              │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│                                       ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    BACKEND API LAYER (NEW - MVP SCOPE)                   │   │
│   │                                                                          │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │   │
│   │   │   REST API   │  │  WebSocket   │  │   Workers    │                  │   │
│   │   │  (Express)   │  │   Server     │  │  (Bull/BG)   │                  │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘                  │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│              ┌────────────────────────┼────────────────────────┐                │
│              │                        │                        │                │
│              ▼                        ▼                        ▼                │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐           │
│   │    PostgreSQL    │   │      Redis       │   │   External APIs  │           │
│   │    (Supabase)    │   │     (Cache)      │   │                  │           │
│   │                  │   │                  │   │  • Polymarket    │           │
│   │  • Users         │   │  • Sessions      │   │  • Kalshi        │           │
│   │  • Portfolios    │   │  • Market Cache  │   │  • Parallel.ai   │           │
│   │  • Watchlists    │   │  • Rate Limits   │   │                  │           │
│   │  • Research      │   │                  │   │                  │           │
│   └──────────────────┘   └──────────────────┘   └──────────────────┘           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### What Exists (Frontend)
| Component | Status | Location |
|-----------|--------|----------|
| React Application | ✅ Complete | `website/src/` |
| Polymarket API Integration | ✅ Complete | `website/src/services/polymarketAPI.js` |
| Kalshi API Integration | ❌ Documented Only | README.md |
| Authentication (Client-side) | ✅ Complete | `website/src/utils/auth.js` |
| Quant Engine | ✅ Complete | `website/src/utils/quantEngine.js` |
| Web3 Wallets (Phantom/MetaMask) | ✅ Complete | `website/src/utils/phantom.js`, `metamask.js` |
| CI/CD (GitHub Pages) | ✅ Complete | `.github/workflows/deploy.yml` |

### What's Missing (Backend MVP Scope)
| Component | Priority | Complexity |
|-----------|:--------:|:----------:|
| Backend API Server | P0 | Medium |
| PostgreSQL Database Schema | P0 | Medium |
| User Data Persistence | P0 | Low |
| Kalshi API Service | P0 | Medium |
| Parallel.ai Integration | P1 | Medium |
| WebSocket Real-time Server | P1 | High |
| Redis Caching Layer | P1 | Low |
| Background Job Workers | P2 | Medium |

---

## MVP Scope Definition

### In Scope (Must Have)

#### Phase 1: Foundation (Week 1-2)
- [ ] Backend API server setup (Node.js/Express or Python/FastAPI)
- [ ] PostgreSQL database with Supabase
- [ ] User authentication (JWT + existing Web3 flow)
- [ ] Basic CRUD for users, portfolios, watchlists

#### Phase 2: Data Layer (Week 3-4)
- [ ] Polymarket API proxy/aggregation service
- [ ] Kalshi API integration (full implementation)
- [ ] Unified market data format
- [ ] Redis caching for market data

#### Phase 3: Research Integration (Week 5-6)
- [ ] Parallel.ai Task API integration
- [ ] Research results storage
- [ ] Market-linked research queries

#### Phase 4: CI/CD & Deployment (Week 7-8)
- [ ] Docker containerization
- [ ] GitHub Actions CI/CD pipeline
- [ ] Staging/Production environments
- [ ] Monitoring & logging

### Out of Scope (Future Phases)
- Direct trading execution
- Real-time WebSocket streaming (deferred to Phase 2)
- Custom ML model training
- Mobile API optimizations
- White-label features

---

## Technology Stack

### Recommended Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Node.js 20 LTS | Matches frontend ecosystem, excellent async I/O |
| **Framework** | Express.js or Fastify | Battle-tested, extensive middleware ecosystem |
| **Database** | PostgreSQL (via Supabase) | Already integrated, managed, real-time subscriptions |
| **Cache** | Redis | Session storage, rate limiting, market data cache |
| **Queue** | Bull (Redis-based) | Background jobs for API polling, research tasks |
| **Auth** | JWT + Supabase Auth | Existing integration, Web3 wallet support |
| **Validation** | Zod or Joi | Runtime type safety |
| **Testing** | Jest + Supertest | Standard Node.js testing |
| **Containerization** | Docker + Docker Compose | Consistent environments |
| **CI/CD** | GitHub Actions | Already in use, free for public repos |

### Alternative Stack (Python)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Python 3.11+ | Better ML integration potential |
| **Framework** | FastAPI | Modern async, auto OpenAPI docs |
| **ORM** | SQLAlchemy 2.0 | Industry standard |
| **Queue** | Celery + Redis | Robust task queue |

**Recommendation:** Node.js stack for faster development velocity and ecosystem consistency with frontend.

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │    portfolios    │       │    positions     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │───┐   │ id (PK)          │───┐   │ id (PK)          │
│ email            │   │   │ user_id (FK)     │   │   │ portfolio_id(FK) │
│ wallet_address   │   └──▶│ name             │   └──▶│ market_id        │
│ auth_provider    │       │ created_at       │       │ platform         │
│ created_at       │       │ is_default       │       │ side (YES/NO)    │
│ updated_at       │       └──────────────────┘       │ quantity         │
│ preferences      │                                   │ avg_cost         │
└──────────────────┘                                   │ created_at       │
         │                                             └──────────────────┘
         │
         │           ┌──────────────────┐       ┌──────────────────┐
         │           │    watchlists    │       │ watchlist_items  │
         │           ├──────────────────┤       ├──────────────────┤
         └──────────▶│ id (PK)          │───┐   │ id (PK)          │
                     │ user_id (FK)     │   │   │ watchlist_id(FK) │
                     │ name             │   └──▶│ market_id        │
                     │ created_at       │       │ platform         │
                     └──────────────────┘       │ added_at         │
                                                └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  market_cache    │       │ research_results │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ market_id        │       │ user_id (FK)     │
│ platform         │       │ market_id        │
│ data (JSONB)     │       │ query            │
│ fetched_at       │       │ result (JSONB)   │
│ expires_at       │       │ processor_type   │
└──────────────────┘       │ created_at       │
                           │ cost_cents       │
                           └──────────────────┘
```

### SQL Schema Definition

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    wallet_address VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) NOT NULL, -- 'email', 'phantom', 'metamask', 'google'
    display_name VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint for at least one identifier
ALTER TABLE users ADD CONSTRAINT users_identifier_check
    CHECK (email IS NOT NULL OR wallet_address IS NOT NULL);

-- Portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default Portfolio',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    market_id VARCHAR(255) NOT NULL, -- External market identifier
    platform VARCHAR(50) NOT NULL, -- 'polymarket', 'kalshi'
    ticker VARCHAR(100),
    question TEXT,
    side VARCHAR(10) NOT NULL, -- 'YES', 'NO'
    quantity DECIMAL(18, 8) NOT NULL,
    avg_cost DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    realized_pnl DECIMAL(18, 8)
);

-- Watchlists table
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist items table
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    market_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watchlist_id, market_id, platform)
);

-- Market data cache table
CREATE TABLE market_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(market_id, platform)
);

-- Research results table
CREATE TABLE research_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id VARCHAR(255),
    query TEXT NOT NULL,
    result JSONB NOT NULL,
    processor_type VARCHAR(50) NOT NULL, -- 'lite', 'base', 'pro', 'ultra'
    sources JSONB, -- Array of source URLs
    cost_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_market_id ON positions(market_id);
CREATE INDEX idx_watchlist_items_market_id ON watchlist_items(market_id);
CREATE INDEX idx_market_cache_expires ON market_cache(expires_at);
CREATE INDEX idx_research_results_user ON research_results(user_id, created_at DESC);

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_results ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Portfolios policies
CREATE POLICY "Users can manage own portfolios" ON portfolios
    FOR ALL USING (auth.uid() = user_id);

-- Positions policies
CREATE POLICY "Users can manage own positions" ON positions
    FOR ALL USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );
```

---

## API Architecture

### REST API Endpoints

#### Authentication
```
POST   /api/v1/auth/register        # Email registration
POST   /api/v1/auth/login           # Email login
POST   /api/v1/auth/wallet          # Wallet authentication
POST   /api/v1/auth/refresh         # Refresh JWT token
POST   /api/v1/auth/logout          # Invalidate session
GET    /api/v1/auth/me              # Current user info
```

#### Users
```
GET    /api/v1/users/me             # Get current user profile
PATCH  /api/v1/users/me             # Update profile
DELETE /api/v1/users/me             # Delete account
GET    /api/v1/users/me/preferences # Get user preferences
PUT    /api/v1/users/me/preferences # Update preferences
```

#### Portfolios
```
GET    /api/v1/portfolios           # List user's portfolios
POST   /api/v1/portfolios           # Create portfolio
GET    /api/v1/portfolios/:id       # Get portfolio details
PATCH  /api/v1/portfolios/:id       # Update portfolio
DELETE /api/v1/portfolios/:id       # Delete portfolio
GET    /api/v1/portfolios/:id/positions  # List positions
POST   /api/v1/portfolios/:id/positions  # Add position
```

#### Positions
```
GET    /api/v1/positions/:id        # Get position details
PATCH  /api/v1/positions/:id        # Update position
DELETE /api/v1/positions/:id        # Remove position
POST   /api/v1/positions/:id/close  # Close position
```

#### Watchlists
```
GET    /api/v1/watchlists           # List user's watchlists
POST   /api/v1/watchlists           # Create watchlist
GET    /api/v1/watchlists/:id       # Get watchlist with items
PATCH  /api/v1/watchlists/:id       # Update watchlist
DELETE /api/v1/watchlists/:id       # Delete watchlist
POST   /api/v1/watchlists/:id/items # Add market to watchlist
DELETE /api/v1/watchlists/:id/items/:itemId  # Remove item
```

#### Markets (Aggregated Data)
```
GET    /api/v1/markets              # List all markets (paginated)
GET    /api/v1/markets/:id          # Get market by ID
GET    /api/v1/markets/:id/history  # Price history
GET    /api/v1/markets/:id/orderbook # Order book
GET    /api/v1/markets/search       # Search markets
```

Query Parameters for `/api/v1/markets`:
```
?platform=polymarket|kalshi|all     # Filter by platform
?category=politics|crypto|sports    # Filter by category
?status=active|closed               # Filter by status
?sort=volume|liquidity|created      # Sort field
?order=asc|desc                     # Sort order
?limit=10-100                       # Results per page
?offset=0                           # Pagination offset
```

#### Research (Parallel.ai)
```
POST   /api/v1/research             # Start new research task
GET    /api/v1/research             # List user's research history
GET    /api/v1/research/:id         # Get research result
DELETE /api/v1/research/:id         # Delete research result
```

Research Request Body:
```json
{
  "query": "What are the key factors affecting the outcome of the 2026 US midterm elections?",
  "market_id": "optional-market-id",
  "processor": "pro",  // lite, base, core, pro, ultra
  "output_format": "auto"  // auto (JSON) or text (Markdown)
}
```

### API Response Format

#### Success Response
```json
{
  "success": true,
  "data": { /* payload */ },
  "meta": {
    "timestamp": "2026-01-16T12:00:00Z",
    "requestId": "uuid"
  }
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "meta": { /* ... */ }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  },
  "meta": { /* ... */ }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|:-----------:|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `EXTERNAL_API_ERROR` | 502 | Upstream API failure |
| `INTERNAL_ERROR` | 500 | Server error |

---

## External API Integrations

### 1. Polymarket API

#### Overview
- **CLOB API:** `https://clob.polymarket.com` - Order book, trading
- **Gamma API:** `https://gamma-api.polymarket.com` - Market metadata
- **Data API:** `https://data-api.polymarket.com` - Historical data
- **WebSocket:** `wss://ws-subscriptions-clob.polymarket.com/ws/`

#### Authentication Levels
| Level | Method | Use Case |
|-------|--------|----------|
| Public | None | Market data, prices, order books |
| L1 | EIP-712 Signature | Account operations |
| L2 | HMAC-SHA256 (API Key) | Trading operations |

#### Key Endpoints

```javascript
// Fetch active markets
GET https://gamma-api.polymarket.com/events
  ?closed=false
  &order=volume24hr
  &ascending=false
  &limit=100

// Fetch price history (90 days)
GET https://clob.polymarket.com/prices-history
  ?market={tokenId}
  &interval=1h
  &fidelity=60

// Fetch order book
GET https://clob.polymarket.com/book
  ?token_id={tokenId}
```

#### Rate Limits
- **Gamma API:** ~100 requests/minute (soft limit)
- **CLOB API:** Varies by endpoint
- **Recommendation:** Cache market data for 60 seconds, order books for 5-10 seconds

#### Implementation Notes
```javascript
// Existing implementation reference: website/src/services/polymarketAPI.js
// Key functions to migrate:
// - fetchActiveMarkets() -> Use as reference
// - fetchPriceHistory() -> Add server-side caching
// - fetchOrderbook() -> Add rate limiting
```

### 2. Kalshi API

#### Overview
- **REST API:** `https://trading-api.kalshi.com/trade-api/v2`
- **Demo API:** `https://demo-api.kalshi.co/trade-api/v2/`
- **WebSocket:** Available for real-time data
- **FIX Protocol:** Available for institutional use

#### Authentication
```javascript
// Login to get session token
POST /trade-api/v2/login
{
  "email": "user@example.com",
  "password": "password"
}

// Response includes token (expires in 30 minutes)
{
  "token": "jwt-token-here",
  "member_id": "user-id"
}

// Use token in header for subsequent requests
Authorization: Bearer <token>
```

**Note:** Tokens expire every 30 minutes - implement automatic refresh.

#### Key Endpoints

```javascript
// List all markets
GET /trade-api/v2/markets
  ?status=open
  &limit=100
  &cursor={pagination_cursor}

// Get single market
GET /trade-api/v2/markets/{ticker}

// Get order book
GET /trade-api/v2/markets/{ticker}/orderbook

// Get price history
GET /trade-api/v2/markets/{ticker}/history
  ?min_ts={unix_timestamp}
  &max_ts={unix_timestamp}

// Get event details (groups related markets)
GET /trade-api/v2/events/{event_ticker}
```

#### Rate Limits
- Standard tier: Contact Kalshi for specifics
- Advanced tier: Apply for higher limits
- REST latency: 50-200ms typical

#### Market Data Structure
```json
{
  "ticker": "INXD-25JAN16-B22000",
  "event_ticker": "INXD-25JAN16",
  "title": "S&P 500 to close at or above 22000?",
  "subtitle": "January 16, 2026",
  "status": "open",
  "yes_bid": 0.45,
  "yes_ask": 0.47,
  "no_bid": 0.53,
  "no_ask": 0.55,
  "last_price": 0.46,
  "volume": 125000,
  "volume_24h": 8500,
  "open_interest": 45000,
  "close_time": "2026-01-16T21:00:00Z"
}
```

### 3. Parallel.ai API (Deep Research)

#### Overview
Parallel.ai provides state-of-the-art deep research capabilities through their Task API. This enables automated web research with structured outputs.

- **Task API:** `https://api.parallel.ai/v1/tasks/runs`
- **Events Streaming:** `https://api.parallel.ai/v1beta/tasks/runs/{run_id}/events`
- **Search API:** `https://api.parallel.ai/v1/search`

#### Authentication
```javascript
// Use API key in header
Authorization: Bearer <PARALLEL_API_KEY>
```

Get API keys from [platform.parallel.ai](https://platform.parallel.ai)

#### Pricing (Per 1,000 Requests)

| Processor | Cost | Latency | Use Case |
|-----------|:----:|---------|----------|
| `lite` | $5 | 5-60s | Basic info retrieval |
| `base` | $10 | 15-100s | Simple research |
| `core` | $25 | 1-5min | Complex research |
| `pro` | $100 | 3-9min | Exploratory research |
| `ultra` | $300 | 5-25min | Extensive deep research |

**Free tier:** 20,000 requests to start

#### Task API Usage

```javascript
// Create a research task
const response = await fetch('https://api.parallel.ai/v1/tasks/runs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PARALLEL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    processor: 'pro',
    input: {
      query: "What factors will influence the outcome of the 2026 US midterm elections? Include recent polling data, historical trends, and key issues."
    },
    output: {
      schema: 'auto'  // Returns structured JSON
      // OR schema: 'text' for markdown report with citations
    }
  })
});

const { run_id, status, result } = await response.json();
```

#### Streaming Events (for long-running tasks)
```javascript
const eventSource = new EventSource(
  `https://api.parallel.ai/v1beta/tasks/runs/${run_id}/events`,
  { headers: { Authorization: `Bearer ${PARALLEL_API_KEY}` } }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.status, data.progress);
};
```

#### Search API (Faster, Simpler)
```javascript
// For quick web searches (not deep research)
const response = await fetch('https://api.parallel.ai/v1/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PARALLEL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "latest polymarket election odds",
    num_results: 10
  })
});
// Cost: ~$0.005 per request
```

#### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PARALLEL.AI INTEGRATION FLOW                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User Request                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│   │  Validate   │────▶│  Check Cost │────▶│  Check Cache│           │
│   │   Query     │     │   Budget    │     │   (Redis)   │           │
│   └─────────────┘     └─────────────┘     └──────┬──────┘           │
│                                                   │                  │
│                           Cache Hit? ────────────┼─── Yes ──▶ Return│
│                                                   │                  │
│                                                  No                  │
│                                                   │                  │
│                                                   ▼                  │
│                                           ┌─────────────┐           │
│                                           │  Queue Job  │           │
│                                           │ (Bull/Redis)│           │
│                                           └──────┬──────┘           │
│                                                   │                  │
│                                                   ▼                  │
│                                           ┌─────────────┐           │
│                                           │ Parallel.ai │           │
│                                           │  Task API   │           │
│                                           └──────┬──────┘           │
│                                                   │                  │
│                              ┌────────────────────┼────────────────┐│
│                              │                    │                ││
│                              ▼                    ▼                ▼│
│                       ┌──────────┐        ┌──────────┐      ┌──────┘│
│                       │  Store   │        │  Notify  │      │ Return│
│                       │   in DB  │        │   User   │      │ Result│
│                       └──────────┘        └──────────┘      └───────│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Cost Management
```javascript
// Track research costs per user
const PROCESSOR_COSTS = {
  lite: 0.5,    // $0.005 per request
  base: 1,      // $0.01 per request
  core: 2.5,    // $0.025 per request
  pro: 10,      // $0.10 per request
  ultra: 30     // $0.30 per request
};

// Implement user budgets and limits
// Store cost_cents in research_results table
```

### API Aggregation Service

Create a unified market data format:

```javascript
// Unified Market Schema
interface UnifiedMarket {
  id: string;                    // Internal ID
  externalId: string;            // Platform-specific ID
  platform: 'polymarket' | 'kalshi';

  // Core data
  question: string;
  description?: string;
  category: string;

  // Pricing
  yesPrice: number;              // 0-1
  noPrice: number;               // 0-1
  spread: number;

  // Volume
  volume24h: number;             // USD
  volumeTotal: number;           // USD
  liquidity: number;             // USD
  openInterest?: number;

  // Timing
  createdAt: Date;
  endDate: Date;
  status: 'active' | 'closed' | 'resolved';

  // Resolution
  resolution?: 'YES' | 'NO' | null;

  // Raw data for platform-specific features
  _raw: object;
}
```

---

## CI/CD Pipeline

### Pipeline Architecture

```yaml
# .github/workflows/backend-ci.yml

name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/backend

jobs:
  # ──────────────────────────────────────────────────────────────────
  # STAGE 1: Lint & Type Check
  # ──────────────────────────────────────────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run ESLint
        run: npm run lint
        working-directory: backend

      - name: Run TypeScript check
        run: npm run type-check
        working-directory: backend

  # ──────────────────────────────────────────────────────────────────
  # STAGE 2: Unit Tests
  # ──────────────────────────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: leet_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run migrations
        run: npm run db:migrate
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/leet_test

      - name: Run unit tests
        run: npm run test:unit -- --coverage
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/leet_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: backend/coverage/lcov.info

  # ──────────────────────────────────────────────────────────────────
  # STAGE 3: Integration Tests
  # ──────────────────────────────────────────────────────────────────
  integration:
    runs-on: ubuntu-latest
    needs: test

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: leet_test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run integration tests
        run: npm run test:integration
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/leet_test
          REDIS_URL: redis://localhost:6379

  # ──────────────────────────────────────────────────────────────────
  # STAGE 4: Build Docker Image
  # ──────────────────────────────────────────────────────────────────
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.event_name == 'push'

    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ──────────────────────────────────────────────────────────────────
  # STAGE 5: Deploy to Staging
  # ──────────────────────────────────────────────────────────────────
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Add deployment commands here
          # e.g., kubectl set image, railway deploy, render deploy

  # ──────────────────────────────────────────────────────────────────
  # STAGE 6: Deploy to Production
  # ──────────────────────────────────────────────────────────────────
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, integration]
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment..."
          # Add deployment commands here
```

### Dockerfile

```dockerfile
# backend/Dockerfile

# ──────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# ──────────────────────────────────────────────────────────────────
# Stage 2: Build
# ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────────
# Stage 3: Production
# ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER backend

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Docker Compose (Development)

```yaml
# docker-compose.yml

version: '3.8'

services:
  # ─────────────────────────────────────────────────────────────────
  # Backend API
  # ─────────────────────────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      target: builder
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/leet_terminal
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-change-in-production
      - POLYMARKET_API_URL=https://gamma-api.polymarket.com
      - KALSHI_API_URL=https://trading-api.kalshi.com/trade-api/v2
      - PARALLEL_API_KEY=${PARALLEL_API_KEY}
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    command: npm run dev

  # ─────────────────────────────────────────────────────────────────
  # PostgreSQL Database
  # ─────────────────────────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: leet_terminal
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations/init.sql:/docker-entrypoint-initdb.d/init.sql

  # ─────────────────────────────────────────────────────────────────
  # Redis Cache
  # ─────────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # ─────────────────────────────────────────────────────────────────
  # Frontend (Optional - for full-stack dev)
  # ─────────────────────────────────────────────────────────────────
  frontend:
    build:
      context: ./website
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000
    volumes:
      - ./website:/app
      - /app/node_modules
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

---

## Security Requirements

### Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| JWT tokens | RS256 signing, 15-minute expiry |
| Refresh tokens | Secure HTTP-only cookies, 7-day expiry |
| Password hashing | bcrypt with cost factor 12 |
| Rate limiting | 100 requests/minute per IP, 1000/minute per user |
| CORS | Whitelist frontend domains only |
| Input validation | Zod schemas on all endpoints |

### API Security

```javascript
// Required middleware stack
app.use(helmet());           // Security headers
app.use(cors(corsOptions)); // CORS configuration
app.use(rateLimiter);       // Rate limiting
app.use(validateRequest);    // Input validation
app.use(authenticate);       // JWT verification
```

### Secrets Management

| Secret | Storage |
|--------|---------|
| Database credentials | Environment variables / Secrets manager |
| JWT signing keys | Environment variables / Vault |
| API keys (Parallel.ai, etc.) | Environment variables / Secrets manager |
| Encryption keys | Vault / KMS |

### Data Protection

- All data in transit: TLS 1.3
- Sensitive data at rest: AES-256 encryption
- PII handling: GDPR/CCPA compliant logging
- Audit logs: All authentication events, admin actions

---

## Testing Requirements

### Test Coverage Targets

| Type | Coverage | Priority |
|------|:--------:|:--------:|
| Unit tests | >80% | P0 |
| Integration tests | >60% | P0 |
| E2E tests | Critical paths | P1 |
| Load tests | API endpoints | P2 |

### Test Structure

```
backend/
├── src/
│   ├── routes/
│   ├── services/
│   ├── models/
│   └── utils/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── polymarket.test.ts
│   │   │   ├── kalshi.test.ts
│   │   │   └── research.test.ts
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── portfolios.test.ts
│   │   └── markets.test.ts
│   └── fixtures/
│       ├── markets.json
│       └── users.json
```

### Example Test

```javascript
// tests/integration/markets.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import supertest from 'supertest';
import { app } from '../../src/app';
import { seedTestData, cleanupTestData } from '../fixtures';

const request = supertest(app);

describe('Markets API', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/markets', () => {
    it('should return paginated markets', async () => {
      const response = await request
        .get('/api/v1/markets')
        .query({ limit: 10, platform: 'polymarket' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.hasMore).toBeDefined();
    });

    it('should filter by platform', async () => {
      const response = await request
        .get('/api/v1/markets')
        .query({ platform: 'kalshi' });

      expect(response.status).toBe(200);
      response.body.data.forEach(market => {
        expect(market.platform).toBe('kalshi');
      });
    });
  });
});
```

---

## Development Milestones

### Phase 1: Foundation (Weeks 1-2)

#### Week 1: Project Setup
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up ESLint, Prettier, and Git hooks
- [ ] Configure Jest for testing
- [ ] Create Docker Compose development environment
- [ ] Set up Supabase project and database schema
- [ ] Implement basic health check endpoint

#### Week 2: Authentication
- [ ] Implement JWT authentication service
- [ ] Create user registration/login endpoints
- [ ] Integrate wallet authentication (Phantom/MetaMask)
- [ ] Add session management with Redis
- [ ] Write authentication tests

**Deliverable:** Working auth system with tests

### Phase 2: Data Layer (Weeks 3-4)

#### Week 3: Polymarket Integration
- [ ] Create Polymarket API service (migrate from frontend)
- [ ] Implement market data caching (Redis)
- [ ] Add unified market data endpoints
- [ ] Set up rate limiting for external API calls
- [ ] Write Polymarket integration tests

#### Week 4: Kalshi Integration
- [ ] Implement Kalshi API authentication
- [ ] Create Kalshi market service
- [ ] Add token refresh mechanism
- [ ] Implement market aggregation service
- [ ] Write Kalshi integration tests

**Deliverable:** Unified market data API serving both platforms

### Phase 3: User Features (Weeks 5-6)

#### Week 5: Portfolios & Positions
- [ ] Implement portfolio CRUD endpoints
- [ ] Create position management service
- [ ] Add P&L calculation logic
- [ ] Implement watchlist features
- [ ] Write portfolio tests

#### Week 6: Parallel.ai Integration
- [ ] Implement Parallel.ai Task API client
- [ ] Create research service with job queue
- [ ] Add cost tracking and budgeting
- [ ] Implement research results storage
- [ ] Set up webhook handling for async tasks
- [ ] Write research integration tests

**Deliverable:** Full user feature set with research capability

### Phase 4: Production Readiness (Weeks 7-8)

#### Week 7: CI/CD & Infrastructure
- [ ] Create production Dockerfile
- [ ] Set up GitHub Actions CI pipeline
- [ ] Configure staging environment
- [ ] Set up monitoring (logs, metrics)
- [ ] Implement error tracking (Sentry)

#### Week 8: Polish & Documentation
- [ ] Performance optimization (N+1 queries, caching)
- [ ] Load testing and benchmarking
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment runbook
- [ ] Security audit

**Deliverable:** Production-ready backend with CI/CD

---

## Appendix

### Environment Variables

```bash
# .env.example

# ─────────────────────────────────────────────────────────────────
# Server
# ─────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_VERSION=v1

# ─────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leet_terminal
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# ─────────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─────────────────────────────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────────────────────────────
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# ─────────────────────────────────────────────────────────────────
# External APIs
# ─────────────────────────────────────────────────────────────────
POLYMARKET_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_URL=https://clob.polymarket.com

KALSHI_API_URL=https://trading-api.kalshi.com/trade-api/v2
KALSHI_EMAIL=
KALSHI_PASSWORD=

PARALLEL_API_KEY=your-parallel-api-key
PARALLEL_API_URL=https://api.parallel.ai/v1

# ─────────────────────────────────────────────────────────────────
# Rate Limiting
# ─────────────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ─────────────────────────────────────────────────────────────────
# Monitoring
# ─────────────────────────────────────────────────────────────────
SENTRY_DSN=
LOG_LEVEL=info
```

### Recommended Backend Directory Structure

```
backend/
├── src/
│   ├── index.ts                 # Entry point
│   ├── app.ts                   # Express app setup
│   ├── config/
│   │   ├── index.ts             # Configuration loader
│   │   ├── database.ts          # Database config
│   │   └── redis.ts             # Redis config
│   │
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── portfolios.routes.ts
│   │   ├── markets.routes.ts
│   │   ├── watchlists.routes.ts
│   │   └── research.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── portfolios.controller.ts
│   │   ├── markets.controller.ts
│   │   ├── watchlists.controller.ts
│   │   └── research.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── portfolio.service.ts
│   │   ├── market.service.ts
│   │   ├── polymarket.service.ts
│   │   ├── kalshi.service.ts
│   │   ├── parallel.service.ts
│   │   └── cache.service.ts
│   │
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── portfolio.model.ts
│   │   ├── position.model.ts
│   │   ├── watchlist.model.ts
│   │   └── research.model.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   └── errorHandler.middleware.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── portfolio.validator.ts
│   │   └── market.validator.ts
│   │
│   ├── jobs/
│   │   ├── index.ts             # Job queue setup
│   │   ├── marketSync.job.ts
│   │   └── research.job.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── market.types.ts
│   │   └── api.types.ts
│   │
│   └── utils/
│       ├── logger.ts
│       ├── errors.ts
│       └── helpers.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── migrations/
│   └── 001_initial_schema.sql
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
└── .env.example
```

### API Documentation Links

| Service | Documentation |
|---------|---------------|
| Polymarket | [docs.polymarket.com](https://docs.polymarket.com) |
| Kalshi | [docs.kalshi.com](https://docs.kalshi.com) |
| Parallel.ai | [docs.parallel.ai](https://docs.parallel.ai) |
| Supabase | [supabase.com/docs](https://supabase.com/docs) |

### Contact & Support

For questions about this document or the backend implementation:
- Create an issue in the repository
- Tag the backend team in pull requests

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | Backend Team | Initial release |
