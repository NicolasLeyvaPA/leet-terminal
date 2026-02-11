# Backend Engineer Quick Start Guide

Welcome to the Leet Terminal backend team! This guide will get you up to speed quickly.

---

## TL;DR - What We're Building

A backend API that:
1. **Aggregates market data** from Polymarket + Kalshi
2. **Persists user data** (portfolios, watchlists, positions)
3. **Integrates Parallel.ai** for deep research on prediction markets
4. **Serves a React frontend** with real-time analytics

---

## Quick Links

| Resource | Link |
|----------|------|
| Full Requirements | [BACKEND_MVP_REQUIREMENTS.md](./BACKEND_MVP_REQUIREMENTS.md) |
| Frontend Code | `/website/src/` |
| Live Demo | [GitHub Pages](https://nicolasleyvaPA.github.io/leet-terminal/) |
| Polymarket Docs | [docs.polymarket.com](https://docs.polymarket.com) |
| Kalshi Docs | [docs.kalshi.com](https://docs.kalshi.com) |
| Parallel.ai Docs | [docs.parallel.ai](https://docs.parallel.ai) |

---

## Day 1: Environment Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL client (optional, for debugging)
- Redis CLI (optional)

### Clone & Run Frontend
```bash
# Clone the repo
git clone https://github.com/NicolasLeyvaPA/leet-terminal.git
cd leet-terminal

# Run the existing frontend to understand what we're building for
cd website
npm install
npm run dev
# Open http://localhost:5173
```

### Understand the Frontend
Spend 30 minutes clicking around the terminal:
- [ ] Browse markets in the watchlist
- [ ] Click on a market to see the analysis panels
- [ ] Check the Portfolio, Lab, News, and Bets tabs
- [ ] Try the Monte Carlo simulation

---

## Day 2-3: Understand the APIs

### Polymarket (Already Integrated in Frontend)

Check the existing implementation:
```bash
cat website/src/services/polymarketAPI.js
```

Key endpoints you'll proxy:
```
GET https://gamma-api.polymarket.com/events
GET https://clob.polymarket.com/prices-history
GET https://clob.polymarket.com/book
```

### Kalshi (Needs Implementation)

Base URL: `https://trading-api.kalshi.com/trade-api/v2`

Auth flow:
```javascript
// 1. Login (tokens expire every 30 min!)
POST /login
{ "email": "...", "password": "..." }

// 2. Use token
Authorization: Bearer <token>

// 3. Fetch markets
GET /markets?status=open
```

### Parallel.ai (Deep Research)

```javascript
// Simple research request
POST https://api.parallel.ai/v1/tasks/runs
{
  "processor": "pro",  // lite($0.005), base($0.01), core($0.025), pro($0.10), ultra($0.30)
  "input": { "query": "What factors affect the 2026 midterm elections?" },
  "output": { "schema": "auto" }  // or "text" for markdown
}
```

Get API key: [platform.parallel.ai](https://platform.parallel.ai)

---

## Day 4-5: Start Building

### Recommended First Steps

1. **Create the backend folder structure:**
```bash
mkdir -p backend/src/{routes,services,middleware,models,config}
cd backend
npm init -y
npm install express cors helmet dotenv zod
npm install -D typescript @types/node @types/express jest ts-jest
```

2. **Start with a health check:**
```typescript
// src/index.ts
import express from 'express';

const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Backend running on :3000'));
```

3. **Add the market aggregation endpoint:**
```typescript
// First milestone: GET /api/v1/markets
// Should return unified data from both Polymarket and Kalshi
```

### Priority Order

| Priority | Task | Why |
|:--------:|------|-----|
| 1 | Health check + basic Express setup | Foundation |
| 2 | Polymarket proxy (copy from frontend) | Quick win |
| 3 | Kalshi integration | Core feature |
| 4 | Unified market response format | API consistency |
| 5 | Redis caching | Performance |
| 6 | User auth (JWT) | Enable persistence |
| 7 | Portfolio/Watchlist CRUD | User features |
| 8 | Parallel.ai integration | Research feature |

---

## Key Decisions Made

### Tech Stack
- **Node.js + Express** (matches frontend ecosystem)
- **PostgreSQL via Supabase** (already configured for frontend)
- **Redis** for caching + rate limiting
- **Bull** for background jobs

### API Design
- RESTful with `/api/v1/` prefix
- JWT auth with 15-min expiry + refresh tokens
- Unified error format (see requirements doc)

### Database
- Schema defined in requirements doc
- Use Supabase for managed Postgres
- RLS policies for user data isolation

---

## Communication

- **Daily standups:** Share what you're working on
- **PRs:** Tag frontend team for API contract changes
- **Questions:** Create GitHub issues for blockers

---

## First Week Goals

By end of week 1, you should have:
- [ ] Local dev environment running
- [ ] Basic Express server with health check
- [ ] Polymarket data flowing through your backend
- [ ] Understanding of Kalshi auth flow

By end of week 2:
- [ ] Kalshi integration complete
- [ ] Unified market endpoint working
- [ ] Basic caching in place
- [ ] First tests written

---

## Need Help?

1. Check the [full requirements doc](./BACKEND_MVP_REQUIREMENTS.md)
2. Look at the frontend implementation for reference
3. Create an issue in the repo
4. Reach out to the frontend team

Good luck! We're excited to have you on the team.
