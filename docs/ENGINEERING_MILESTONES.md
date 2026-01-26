# Engineering Milestones Roadmap

## LEET Quantum Terminal Pro

**Created:** January 2026
**Status:** MVP → Production
**Timeline:** 6 Weeks

---

## Overview

Two parallel engineering tracks, prioritized by risk and dependency.

| Engineer | Focus Area | Primary Files |
|----------|------------|---------------|
| **Backend Engineer** | API, Auth, Database, Infrastructure | New `backend/` directory |
| **Frontend Engineer** | Security fixes, Refactoring, Testing | `website/src/` |

---

# Backend Engineer Milestones

## Milestone B1: Project Foundation [CRITICAL - Week 1]

**Goal:** Establish backend infrastructure and secure authentication

### Tasks (Priority Order)

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| B1.1 | Initialize Node.js/Express project with TypeScript | 4h | `backend/` scaffolded |
| B1.2 | Set up PostgreSQL schema (Supabase) | 4h | Users, portfolios, positions tables |
| B1.3 | Implement bcrypt password hashing | 2h | `backend/src/services/auth.service.ts` |
| B1.4 | Create JWT auth with RS256 signing | 4h | `backend/src/middleware/auth.middleware.ts` |
| B1.5 | Set up Redis for session storage | 2h | `backend/src/config/redis.ts` |
| B1.6 | Add HttpOnly cookie token storage | 2h | Secure token handling |
| B1.7 | Docker Compose for local dev | 2h | `docker-compose.yml` |

**Acceptance Criteria:**
- [ ] `POST /api/v1/auth/register` hashes passwords with bcrypt (cost 12)
- [ ] `POST /api/v1/auth/login` returns JWT in HttpOnly cookie
- [ ] No secrets in localStorage
- [ ] `docker-compose up` starts all services

---

## Milestone B2: Market Data API [HIGH - Week 2]

**Goal:** Create unified market data layer with caching

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| B2.1 | Polymarket API service (migrate from frontend) | 6h | `backend/src/services/polymarket.service.ts` |
| B2.2 | Kalshi API service with token refresh | 8h | `backend/src/services/kalshi.service.ts` |
| B2.3 | Unified market schema | 4h | `backend/src/types/market.types.ts` |
| B2.4 | Redis caching layer (60s TTL) | 4h | `backend/src/services/cache.service.ts` |
| B2.5 | Rate limiting middleware | 2h | 100 req/min per IP |
| B2.6 | Request timeout handling (5s) | 2h | AbortController integration |

**Acceptance Criteria:**
- [ ] `GET /api/v1/markets` returns unified format from both platforms
- [ ] Cached responses < 10ms, uncached < 500ms
- [ ] Rate limit returns 429 after threshold

---

## Milestone B3: User Data Persistence [HIGH - Week 3]

**Goal:** Enable persistent portfolios and watchlists

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| B3.1 | Portfolio CRUD endpoints | 4h | REST API for portfolios |
| B3.2 | Position management service | 4h | Add/remove/close positions |
| B3.3 | P&L calculation service | 4h | Real-time P&L with market prices |
| B3.4 | Watchlist CRUD endpoints | 3h | REST API for watchlists |
| B3.5 | User preferences storage | 2h | JSONB preferences field |
| B3.6 | Row Level Security policies | 2h | Users can only access own data |

**Acceptance Criteria:**
- [ ] User A cannot access User B's portfolio
- [ ] P&L updates correctly with market price changes
- [ ] Preferences persist across sessions

---

## Milestone B4: Research Integration [MEDIUM - Week 4]

**Goal:** Integrate Parallel.ai for deep research

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| B4.1 | Parallel.ai Task API client | 4h | `backend/src/services/parallel.service.ts` |
| B4.2 | Bull job queue for async research | 4h | `backend/src/jobs/research.job.ts` |
| B4.3 | Research results storage | 2h | Database + cost tracking |
| B4.4 | User budget/limit enforcement | 2h | Per-user spending caps |
| B4.5 | Webhook handler for task completion | 2h | Async notification |

**Acceptance Criteria:**
- [ ] Research tasks queue and complete asynchronously
- [ ] Cost tracked per user in cents
- [ ] Results stored and retrievable

---

## Milestone B5: CI/CD & Production [MEDIUM - Week 5-6]

**Goal:** Production-ready deployment pipeline

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| B5.1 | Production Dockerfile (multi-stage) | 3h | Optimized image |
| B5.2 | GitHub Actions CI pipeline | 4h | Lint → Test → Build → Deploy |
| B5.3 | Unit tests (80% coverage target) | 8h | Jest test suite |
| B5.4 | Integration tests | 6h | Supertest API tests |
| B5.5 | Staging environment setup | 4h | Preview deployments |
| B5.6 | Monitoring & logging (Sentry) | 3h | Error tracking |
| B5.7 | API documentation (OpenAPI) | 3h | Swagger UI |

**Acceptance Criteria:**
- [ ] All PRs require passing tests
- [ ] 80%+ code coverage
- [ ] Zero critical vulnerabilities in `npm audit`

---

# Frontend Engineer Milestones

## Milestone F1: Critical Security Fixes [CRITICAL - Week 1]

**Goal:** Eliminate authentication vulnerabilities

### Tasks (Priority Order)

| # | Task | File | Effort | Description |
|---|------|------|--------|-------------|
| F1.1 | Remove plaintext password storage | `auth.js:53` | 2h | Delete localStorage password code |
| F1.2 | Remove wallet-as-password auth | `auth.js:269-272` | 3h | Implement proper message signing |
| F1.3 | Move to backend auth API | `auth.js` | 4h | Replace localStorage with API calls |
| F1.4 | Add CSRF token handling | `auth.js` | 2h | Include tokens in OAuth flows |
| F1.5 | Implement proper logout | `auth.js` | 1h | Clear HttpOnly cookies via API |
| F1.6 | Add security headers | `vite.config.js` | 1h | CSP, X-Frame-Options |

**Acceptance Criteria:**
- [ ] No passwords in localStorage (verify in DevTools)
- [ ] No JWTs in localStorage
- [ ] Wallet auth uses cryptographic signature
- [ ] Logout clears all session data

---

## Milestone F2: Error Handling & Stability [HIGH - Week 2]

**Goal:** Prevent crashes and improve reliability

### Tasks

| # | Task | File | Effort | Description |
|---|------|------|--------|-------------|
| F2.1 | Add React Error Boundary | New component | 2h | Wrap App in error boundary |
| F2.2 | Add request timeouts | `polymarketAPI.js:13-81` | 2h | 5s AbortController |
| F2.3 | Fix event listener memory leak | `App.jsx:261-272` | 2h | Proper cleanup in useEffect |
| F2.4 | Fix OAuth race condition | `App.jsx:604-661` | 3h | Single auth check effect |
| F2.5 | Add null checks to panels | All panels | 3h | Defensive `?.` operators |
| F2.6 | Fix Kelly NaN edge case | `quantEngine.js:68-79` | 1h | Guard against division by zero |

**Acceptance Criteria:**
- [ ] App shows error UI instead of white screen on crash
- [ ] Network errors timeout in 5s (not 30s+)
- [ ] No memory leaks during panel resize

---

## Milestone F3: Code Quality & Tooling [MEDIUM - Week 3]

**Goal:** Establish development standards

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| F3.1 | Add ESLint configuration | 2h | `.eslintrc.json` with React rules |
| F3.2 | Add Prettier configuration | 1h | `.prettierrc` |
| F3.3 | Add Husky pre-commit hooks | 2h | Lint on commit |
| F3.4 | Fix all ESLint errors | 4h | Clean codebase |
| F3.5 | Add JSDoc to utility functions | 4h | Type documentation |
| F3.6 | Update CI to run linting | 1h | GitHub Actions update |

**Acceptance Criteria:**
- [ ] `npm run lint` passes with zero errors
- [ ] Pre-commit hook prevents unlinted code
- [ ] All utility functions have JSDoc

---

## Milestone F4: Architecture Refactor [MEDIUM - Week 4]

**Goal:** Break up monolithic components

### Tasks

| # | Task | File | Effort | Description |
|---|------|------|--------|-------------|
| F4.1 | Extract auth context | `auth.js` → `contexts/` | 4h | AuthProvider component |
| F4.2 | Split wallet auth modules | `auth.js` | 4h | `phantom.ts`, `metamask.ts` |
| F4.3 | Extract workspace components | `App.jsx` | 6h | `AnalysisWorkspace.jsx`, etc. |
| F4.4 | Create market context | New | 3h | MarketProvider for state |
| F4.5 | Add code splitting | `App.jsx:1-21` | 3h | React.lazy for panels |
| F4.6 | Remove duplicate code | `helpers.js`, `polymarketAPI.js` | 2h | Single source of truth |

**Acceptance Criteria:**
- [ ] `App.jsx` < 300 lines
- [ ] `auth.js` split into 4+ files
- [ ] Initial bundle size reduced 30%+

---

## Milestone F5: Testing [MEDIUM - Week 5]

**Goal:** Establish test coverage

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| F5.1 | Set up Jest + React Testing Library | 2h | Test configuration |
| F5.2 | Unit tests for quantEngine.js | 4h | Monte Carlo, Kelly, Greeks tests |
| F5.3 | Unit tests for polymarketAPI.js | 4h | Data transformation tests |
| F5.4 | Integration tests for auth flows | 6h | Login, signup, wallet auth |
| F5.5 | Component tests for panels | 6h | Render + interaction tests |
| F5.6 | Add coverage to CI | 1h | Fail build below 60% |

**Acceptance Criteria:**
- [ ] 80% coverage on `utils/`
- [ ] 60% coverage overall
- [ ] All auth paths tested

---

## Milestone F6: Performance [LOW - Week 6]

**Goal:** Optimize user experience

### Tasks

| # | Task | Effort | Deliverable |
|---|------|--------|-------------|
| F6.1 | Move Monte Carlo to Web Worker | 4h | Non-blocking simulation |
| F6.2 | Add virtual scrolling for market lists | 4h | react-window integration |
| F6.3 | Optimize bundle with tree-shaking | 2h | Analyze + fix imports |
| F6.4 | Add loading skeletons | 3h | Better perceived performance |
| F6.5 | Implement request debouncing | 2h | Reduce API calls |

**Acceptance Criteria:**
- [ ] Monte Carlo doesn't block UI
- [ ] 1000+ markets render smoothly
- [ ] Lighthouse performance > 80

---

# Combined Timeline

```
Week 1: ████████████████████████████████████████
        B1: Backend Foundation     F1: Security Fixes
        [CRITICAL]                 [CRITICAL]

Week 2: ████████████████████████████████████████
        B2: Market Data API        F2: Error Handling
        [HIGH]                     [HIGH]

Week 3: ████████████████████████████████████████
        B3: User Persistence       F3: Code Quality
        [HIGH]                     [MEDIUM]

Week 4: ████████████████████████████████████████
        B4: Research Integration   F4: Refactoring
        [MEDIUM]                   [MEDIUM]

Week 5: ████████████████████████████████████████
        B5: CI/CD (part 1)         F5: Testing
        [MEDIUM]                   [MEDIUM]

Week 6: ████████████████████████████████████████
        B5: CI/CD (part 2)         F6: Performance
        [MEDIUM]                   [LOW]
```

---

# Success Metrics

| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| Security vulnerabilities | 3 critical | 0 | Both |
| Test coverage | 0% | 80% | Frontend |
| Auth token in localStorage | Yes | No | Both |
| App.jsx lines | 715 | <300 | Frontend |
| API response time (p95) | N/A | <500ms | Backend |
| CI pipeline | Partial | Full | Backend |

---

# Quick Reference: Critical Files

## Backend (New)
```
backend/
├── src/
│   ├── services/
│   │   ├── auth.service.ts      # B1.3 - Password hashing
│   │   ├── polymarket.service.ts # B2.1 - Market data
│   │   ├── kalshi.service.ts    # B2.2 - Kalshi integration
│   │   └── cache.service.ts     # B2.4 - Redis caching
│   ├── middleware/
│   │   └── auth.middleware.ts   # B1.4 - JWT verification
│   └── config/
│       └── redis.ts             # B1.5 - Session storage
└── docker-compose.yml           # B1.7 - Local dev
```

## Frontend (Existing - To Modify)
```
website/src/
├── App.jsx                      # F2.3, F2.4, F4.3 - Refactor
├── utils/
│   ├── auth.js                  # F1.1-F1.5 - Security fixes
│   └── quantEngine.js           # F2.6 - Edge case fix
├── services/
│   └── polymarketAPI.js         # F2.2 - Timeouts
└── vite.config.js               # F1.6 - Security headers
```

---

# Dependencies Between Tracks

```
Backend B1 (Auth) ──────────────► Frontend F1 (Security)
    │                                   │
    │ Backend provides secure           │ Frontend consumes
    │ auth API endpoints                │ backend auth API
    │                                   │
    ▼                                   ▼
Backend B2 (Markets) ◄──────────── Frontend F4 (Refactor)
    │                                   │
    │ Backend provides unified          │ Frontend updates
    │ market data API                   │ API consumption
```

**Coordination Points:**
1. **Week 1:** Backend must deploy auth endpoints before Frontend can complete F1.3
2. **Week 2:** Backend market API schema must be finalized before Frontend updates calls
3. **Week 4:** Frontend refactor should align with Backend API contracts

---

# Getting Started

## Backend Engineer - Day 1
```bash
mkdir backend && cd backend
npm init -y
npm install express typescript @types/express @types/node
npm install bcryptjs jsonwebtoken redis
npx tsc --init
```

## Frontend Engineer - Day 1
```bash
cd website
# Open auth.js:53 - locate plaintext password storage
# Open auth.js:269 - locate wallet-as-password issue
# Begin removal of insecure patterns
```

---

**Document Version:** 1.0
**Last Updated:** January 2026
