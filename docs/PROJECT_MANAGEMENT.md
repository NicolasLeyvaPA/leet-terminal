# Leet Terminal - Project Management Document

**Version:** 1.0
**Last Updated:** February 2026
**Project Manager:** Nicolás Leyva
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Team Structure](#team-structure)
3. [Role Definitions](#role-definitions)
4. [Sprint Planning](#sprint-planning)
5. [Task Breakdown by Role](#task-breakdown-by-role)
6. [Dependencies & Critical Path](#dependencies--critical-path)
7. [Milestones & Deliverables](#milestones--deliverables)
8. [Communication Protocols](#communication-protocols)
9. [Risk Management](#risk-management)
10. [Definition of Done](#definition-of-done)

---

## Executive Summary

### Project Vision
Build a Bloomberg-style prediction market analytics terminal that aggregates data from Polymarket, Kalshi, and other prediction markets, providing professional-grade quantitative analysis tools for traders and researchers.

### Current State
- **Frontend:** 95% complete (React, 16 panels, real-time data)
- **Backend:** 60% complete (Go microservices, needs DB wiring)
- **ML/Quant:** 30% complete (heuristics only, no ML models)
- **Data Pipeline:** 40% complete (basic fetching, no warehouse)

### MVP Target
8-week sprint to production-ready MVP with:
- Full backend API integration
- Real ML-based predictions
- Interactive charts with indicators
- Complete user authentication flow

---

## Team Structure

```
                    ┌─────────────────────┐
                    │   PROJECT MANAGER   │
                    │   Nicolás Leyva     │
                    │                     │
                    │ • Sprint planning   │
                    │ • Code review       │
                    │ • Integration QA    │
                    │ • Stakeholder comm  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   BACKEND     │    │   FRONTEND    │    │   QUANT/ML    │
│   ENGINEER    │    │   ENGINEER    │    │   ENGINEER    │
│               │    │               │    │               │
│ David H.      │    │ [TBD]         │    │ [TBD]         │
│               │    │               │    │               │
│ • Go API      │    │ • React UI    │    │ • ML Models   │
│ • Database    │    │ • Integration │    │ • NLP/Sent.   │
│ • Auth        │    │ • Mobile      │    │ • Predictions │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   DATA/VIZ      │
                    │   ENGINEER      │
                    │                 │
                    │ [TBD]           │
                    │                 │
                    │ • Charts        │
                    │ • Data Pipeline │
                    │ • Real-time     │
                    └─────────────────┘
```

### Team Allocation Rationale

| Role | Allocation | Justification |
|------|------------|---------------|
| **Project Manager** | 20% coding, 80% coordination | Oversees integration, unblocks team, maintains quality |
| **Backend Engineer** | 100% backend | Critical path - frontend depends on API completion |
| **Frontend Engineer** | 90% frontend, 10% integration | UI polish + backend API integration |
| **Quant/ML Engineer** | 100% algorithms | Specialized work, independent until integration |
| **Data/Viz Engineer** | 60% frontend, 40% backend | Bridge role - charts (FE) + pipelines (BE) |

---

## Role Definitions

### Project Manager (Nicolás Leyva)

**Responsibilities:**
- Sprint planning and task prioritization
- Daily standups and blocker resolution
- Code review approval for all PRs
- Integration testing coordination
- External stakeholder communication
- Technical architecture decisions
- Release management

**Time Allocation:**
- 30% - Code review & PR approval
- 25% - Sprint planning & backlog grooming
- 20% - Integration testing & QA
- 15% - Team meetings & 1:1s
- 10% - Documentation & reporting

**Tools:**
- GitHub Projects for task tracking
- GitHub Actions for CI/CD
- Discord/Slack for team communication

---

### Backend Engineer (David H.)

**Responsibilities:**
- Complete Go microservices implementation
- Database schema and migrations
- API endpoint implementation
- Authentication & authorization
- Job queue and async processing
- DevOps and deployment

**Technical Ownership:**
```
/app/
├── cmd/           ← Service entrypoints
├── internal/
│   ├── api/       ← REST handlers
│   ├── storage/   ← Database layer
│   ├── scraper/   ← News scraping
│   ├── analyzer/  ← Text analysis (coordinate with Quant)
│   ├── modeler/   ← ML inference (coordinate with Quant)
│   ├── cache/     ← Redis layer
│   └── queue/     ← Asynq jobs
/db/migrations/    ← SQL schemas
/deploy/           ← Docker configs
```

**Key Metrics:**
- API response time < 200ms p95
- 99.9% uptime target
- Zero security vulnerabilities
- 80% code coverage

---

### Frontend Engineer

**Responsibilities:**
- React component development
- Backend API integration
- State management optimization
- Mobile responsive implementation
- Unit and E2E testing
- Accessibility compliance

**Technical Ownership:**
```
/website/src/
├── App.jsx              ← Main container
├── components/
│   ├── panels/          ← 16 panel components
│   ├── Login.jsx        ← Auth UI
│   ├── Signup.jsx       ← Registration UI
│   └── [shared]/        ← Reusable components
├── services/            ← API clients (refactor to use backend)
├── utils/               ← Helpers, hooks
└── styles.css           ← Global styles
```

**Key Metrics:**
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- 0 console errors in production
- 70% component test coverage

---

### Quant/ML Engineer

**Responsibilities:**
- Machine learning model development
- Natural language processing (sentiment, NER, topics)
- Price prediction algorithms
- Backtesting framework
- Model training pipelines
- Feature engineering

**Technical Ownership:**
```
/app/internal/
├── analyzer/engine.go   ← NLP implementations
├── modeler/engine.go    ← ML inference
/ml/ (new)
├── models/              ← Trained model artifacts
├── training/            ← Training scripts
├── features/            ← Feature engineering
└── evaluation/          ← Model metrics
/website/src/utils/
└── quantEngine.js       ← Frontend quant (coordinate with FE)
```

**Key Metrics:**
- Sentiment accuracy > 75%
- Prediction directional accuracy > 55%
- Model inference < 100ms
- Backtesting Sharpe ratio > 1.0

---

### Data/Visualization Engineer

**Responsibilities:**
- Chart component development (Chart.js/D3)
- Real-time WebSocket implementation
- Data pipeline architecture
- Historical data warehouse design
- Performance monitoring
- Data quality assurance

**Technical Ownership:**
```
/website/src/
├── components/
│   ├── PriceChart.jsx       ← Price visualization
│   ├── MonteCarloChart.jsx  ← Distribution charts
│   └── [new charts]/        ← Candlestick, heatmaps
├── services/
│   ├── polymarketWebSocket.js  ← Real-time
│   └── [data services]/     ← Pipeline clients
/app/internal/
├── scraper/                 ← Coordinate with Backend
└── storage/                 ← TimescaleDB schemas
/data/ (new)
├── pipelines/               ← ETL scripts
└── schemas/                 ← Data models
```

**Key Metrics:**
- Chart render time < 100ms
- WebSocket latency < 50ms
- Data freshness < 5 seconds
- 99.9% data pipeline uptime

---

## Sprint Planning

### Sprint Structure
- **Duration:** 2 weeks
- **Ceremonies:**
  - Sprint Planning (Monday, Week 1)
  - Daily Standups (15 min, async OK)
  - Sprint Review (Friday, Week 2)
  - Retrospective (Friday, Week 2)

### Sprint 1: Foundation (Weeks 1-2)

**Goal:** Database + Auth + Data Pipeline foundation

| Task ID | Task | Owner | Est. | Dependencies |
|---------|------|-------|------|--------------|
| BE-001 | Create all database migrations | Backend | 4h | - |
| BE-002 | Implement User CRUD operations | Backend | 6h | BE-001 |
| BE-003 | Wire /auth/register endpoint | Backend | 2h | BE-002 |
| BE-004 | Wire /auth/login endpoint | Backend | 2h | BE-002 |
| BE-005 | Implement Job CRUD operations | Backend | 8h | BE-001 |
| DV-001 | Design TimescaleDB schema for prices | Data/Viz | 4h | BE-001 |
| DV-002 | Build price ingestion pipeline | Data/Viz | 8h | DV-001 |
| QM-001 | Set up ML project structure | Quant/ML | 4h | - |
| QM-002 | Implement sentiment analysis v1 | Quant/ML | 12h | QM-001 |
| FE-001 | Add loading skeleton components | Frontend | 4h | - |
| FE-002 | Prepare auth service for backend | Frontend | 4h | - |

**Sprint 1 Deliverables:**
- [ ] Users can register and login via API
- [ ] Price data pipeline running (ingesting hourly)
- [ ] Basic sentiment analysis operational
- [ ] Frontend ready for backend integration

---

### Sprint 2: Core Integration (Weeks 3-4)

**Goal:** Connect frontend to backend + Charts + Predictions v1

| Task ID | Task | Owner | Est. | Dependencies |
|---------|------|-------|------|--------------|
| BE-006 | Wire job endpoints to return DB data | Backend | 4h | BE-005 |
| BE-007 | Implement article listing + pagination | Backend | 3h | BE-001 |
| BE-008 | Implement WebSocket job streaming | Backend | 4h | BE-006 |
| FE-003 | Connect auth to backend API | Frontend | 6h | BE-003, BE-004 |
| FE-004 | Replace Polymarket direct calls | Frontend | 4h | BE-008 |
| FE-005 | Implement job status listener | Frontend | 4h | BE-008 |
| DV-003 | Implement candlestick charts | Data/Viz | 6h | DV-002 |
| DV-004 | Add chart interactivity (zoom, pan) | Data/Viz | 6h | DV-003 |
| QM-003 | Implement NER extraction | Quant/ML | 8h | QM-002 |
| QM-004 | Build price prediction model v1 | Quant/ML | 16h | DV-002 |

**Sprint 2 Deliverables:**
- [ ] Frontend fully integrated with backend
- [ ] Candlestick charts with interactivity
- [ ] Price prediction model deployed
- [ ] Job tracking working end-to-end

---

### Sprint 3: Features & Polish (Weeks 5-6)

**Goal:** Complete stub components + Advanced charts + Model improvements

| Task ID | Task | Owner | Est. | Dependencies |
|---------|------|-------|------|--------------|
| BE-009 | Implement full-text search | Backend | 4h | BE-007 |
| BE-010 | Add API rate limiting | Backend | 3h | BE-003 |
| BE-011 | Add Kalshi proxy endpoints | Backend | 4h | - |
| FE-006 | Complete BuySellPanel | Frontend | 6h | FE-003 |
| FE-007 | Complete MarketTradesPanel | Frontend | 4h | FE-004 |
| FE-008 | Complete MarketDetailDock modes | Frontend | 6h | DV-003 |
| FE-009 | Add error toast notifications | Frontend | 3h | - |
| DV-005 | Volume profile / depth chart | Data/Viz | 8h | DV-003 |
| DV-006 | Correlation heat map | Data/Viz | 6h | QM-005 |
| DV-007 | Add chart indicators (MA, RSI, BB) | Data/Viz | 10h | DV-003 |
| QM-005 | Market correlation matrix | Quant/ML | 6h | DV-002 |
| QM-006 | Time series forecasting | Quant/ML | 12h | QM-004 |
| QM-007 | Volatility estimation | Quant/ML | 8h | DV-002 |

**Sprint 3 Deliverables:**
- [ ] All stub components completed
- [ ] Full chart suite with indicators
- [ ] Time series forecasting operational
- [ ] Search and filtering complete

---

### Sprint 4: Testing & Launch (Weeks 7-8)

**Goal:** Testing, optimization, production deployment

| Task ID | Task | Owner | Est. | Dependencies |
|---------|------|-------|------|--------------|
| BE-012 | Add Prometheus metrics | Backend | 3h | - |
| BE-013 | Load testing & optimization | Backend | 6h | All BE |
| BE-014 | Production deployment config | Backend | 4h | BE-013 |
| FE-010 | Add unit tests (Jest/Vitest) | Frontend | 8h | All FE |
| FE-011 | Mobile responsive layout | Frontend | 12h | FE-008 |
| FE-012 | Accessibility improvements | Frontend | 6h | FE-011 |
| FE-013 | E2E tests (Playwright) | Frontend | 8h | FE-010 |
| DV-008 | Real-time WS for all markets | Data/Viz | 8h | BE-008 |
| DV-009 | Performance monitoring dashboard | Data/Viz | 6h | DV-008 |
| QM-008 | Ensemble model (combine signals) | Quant/ML | 8h | QM-004, QM-006 |
| QM-009 | Model evaluation & metrics | Quant/ML | 4h | QM-008 |
| PM-001 | Integration testing | PM | 8h | All |
| PM-002 | Release preparation | PM | 4h | PM-001 |

**Sprint 4 Deliverables:**
- [ ] 70%+ test coverage
- [ ] Mobile responsive
- [ ] Performance optimized
- [ ] Production deployed

---

## Task Breakdown by Role

### Backend Engineer - Complete Task List

```
SPRINT 1 (26h)
├── BE-001: Create database migrations                    [4h] [P0]
├── BE-002: Implement User CRUD in storage/postgres.go    [6h] [P0]
├── BE-003: Wire /auth/register to save to DB             [2h] [P0]
├── BE-004: Wire /auth/login to verify from DB            [2h] [P0]
└── BE-005: Implement Job CRUD (scrape/analysis/predict)  [8h] [P0]

SPRINT 2 (11h)
├── BE-006: Wire job endpoints to return real DB data     [4h] [P0]
├── BE-007: Implement article listing with pagination     [3h] [P1]
└── BE-008: Complete WebSocket job status streaming       [4h] [P1]

SPRINT 3 (11h)
├── BE-009: Implement full-text search for articles       [4h] [P1]
├── BE-010: Add API rate limiting per user                [3h] [P1]
└── BE-011: Add Kalshi API proxy endpoints                [4h] [P2]

SPRINT 4 (13h)
├── BE-012: Add metrics/Prometheus endpoints              [3h] [P2]
├── BE-013: Load testing & optimization                   [6h] [P1]
└── BE-014: Production deployment configuration           [4h] [P0]

TOTAL: 61 hours (~7.5 days)
```

### Frontend Engineer - Complete Task List

```
SPRINT 1 (8h)
├── FE-001: Add loading skeleton components               [4h] [P0]
└── FE-002: Prepare auth service for backend integration  [4h] [P0]

SPRINT 2 (14h)
├── FE-003: Connect auth to backend API                   [6h] [P0]
├── FE-004: Replace direct Polymarket calls with proxy    [4h] [P0]
└── FE-005: Implement job status polling/WS listener      [4h] [P1]

SPRINT 3 (19h)
├── FE-006: Complete BuySellPanel with order preview      [6h] [P1]
├── FE-007: Complete MarketTradesPanel with real data     [4h] [P1]
├── FE-008: Complete MarketDetailDock chart modes         [6h] [P0]
└── FE-009: Add error toast notifications                 [3h] [P1]

SPRINT 4 (34h)
├── FE-010: Add unit tests (Jest/Vitest)                  [8h] [P2]
├── FE-011: Mobile responsive layout (breakpoints)        [12h] [P2]
├── FE-012: Accessibility (ARIA, focus management)        [6h] [P2]
└── FE-013: E2E tests with Playwright                     [8h] [P2]

TOTAL: 75 hours (~9.5 days)
```

### Quant/ML Engineer - Complete Task List

```
SPRINT 1 (16h)
├── QM-001: Set up ML project structure                   [4h] [P0]
└── QM-002: Implement real sentiment analysis (NLP)       [12h] [P0]

SPRINT 2 (24h)
├── QM-003: Implement named entity recognition (NER)      [8h] [P0]
└── QM-004: Build basic price prediction model            [16h] [P0]

SPRINT 3 (26h)
├── QM-005: Market correlation matrix                     [6h] [P1]
├── QM-006: Time series forecasting (ARIMA/Prophet)       [12h] [P1]
└── QM-007: Volatility estimation (realized vol, GARCH)   [8h] [P1]

SPRINT 4 (12h)
├── QM-008: Ensemble model (combine multiple signals)     [8h] [P2]
└── QM-009: Model evaluation & metrics dashboard          [4h] [P1]

TOTAL: 78 hours (~10 days)
```

### Data/Visualization Engineer - Complete Task List

```
SPRINT 1 (12h)
├── DV-001: Design TimescaleDB schema for price data      [4h] [P0]
└── DV-002: Build data ingestion pipeline                 [8h] [P0]

SPRINT 2 (12h)
├── DV-003: Implement candlestick charts (OHLC)           [6h] [P0]
└── DV-004: Add chart interactivity (zoom, pan, tooltips) [6h] [P0]

SPRINT 3 (24h)
├── DV-005: Volume profile / depth chart                  [8h] [P1]
├── DV-006: Heat map for market correlations              [6h] [P1]
└── DV-007: Add chart indicators (MA, RSI, Bollinger)     [10h] [P1]

SPRINT 4 (14h)
├── DV-008: Real-time WebSocket for all watched markets   [8h] [P1]
└── DV-009: Performance monitoring dashboard              [6h] [P2]

TOTAL: 62 hours (~8 days)
```

### Project Manager - Complete Task List

```
ONGOING (Weekly)
├── Sprint planning sessions                              [2h/sprint]
├── Daily standup facilitation                            [1.25h/week]
├── Code review & PR approval                             [5h/week]
├── 1:1 meetings with team members                        [2h/week]
└── Backlog grooming                                      [1h/week]

SPRINT 4 (12h)
├── PM-001: Integration testing coordination              [8h] [P0]
└── PM-002: Release preparation & documentation           [4h] [P0]

PER SPRINT: ~11h coordination + coding support
TOTAL OVER 8 WEEKS: ~90 hours
```

---

## Dependencies & Critical Path

```
CRITICAL PATH (Must complete in order):
═══════════════════════════════════════

BE-001 (DB Migrations)
    │
    ├──► BE-002 (User CRUD) ──► BE-003/BE-004 (Auth) ──► FE-003 (FE Auth)
    │
    ├──► BE-005 (Job CRUD) ──► BE-006 (Job Endpoints) ──► FE-005 (Job Listener)
    │
    └──► DV-001 (Schema) ──► DV-002 (Pipeline) ──► QM-004 (Prediction Model)
                                    │
                                    └──► DV-003 (Charts) ──► DV-007 (Indicators)


PARALLEL WORKSTREAMS:
═══════════════════════

Stream 1: Backend Core
BE-001 → BE-002 → BE-003/004 → BE-006 → BE-008

Stream 2: ML Pipeline
QM-001 → QM-002 → QM-003 → QM-004 → QM-008

Stream 3: Data Pipeline
DV-001 → DV-002 → DV-003 → DV-007

Stream 4: Frontend Polish
FE-001 → FE-006/007/008 → FE-010 → FE-011


BLOCKING DEPENDENCIES:
══════════════════════

FE-003 (FE Auth) BLOCKED BY: BE-003, BE-004
FE-004 (API Proxy) BLOCKED BY: BE-008
FE-005 (Job Listener) BLOCKED BY: BE-008
DV-003 (Candlestick) BLOCKED BY: DV-002
QM-004 (Prediction) BLOCKED BY: DV-002
DV-006 (Correlation Map) BLOCKED BY: QM-005
```

---

## Milestones & Deliverables

### Milestone 1: Backend Foundation (End of Week 2)
**Success Criteria:**
- [ ] All database tables created and migrated
- [ ] User registration returns JWT token
- [ ] User login validates credentials from DB
- [ ] Health endpoint returns 200 OK
- [ ] Docker compose brings up all services

**Demo:** Register a user, login, receive token

---

### Milestone 2: Data Pipeline (End of Week 2)
**Success Criteria:**
- [ ] Price data ingesting from Polymarket every 5 minutes
- [ ] TimescaleDB storing 7+ days of historical data
- [ ] Query returns OHLC aggregates
- [ ] Basic sentiment scores being calculated

**Demo:** Query historical prices, show sentiment for news

---

### Milestone 3: Frontend Integration (End of Week 4)
**Success Criteria:**
- [ ] Login/Register uses backend API
- [ ] Market data fetched via backend proxy
- [ ] Job status updates in real-time
- [ ] Candlestick chart renders with real data

**Demo:** Full user flow from login to viewing charts

---

### Milestone 4: ML Models Live (End of Week 6)
**Success Criteria:**
- [ ] Sentiment analysis > 70% accuracy on test set
- [ ] Price prediction model deployed
- [ ] Time series forecast available for markets
- [ ] Correlation matrix computed nightly

**Demo:** Show prediction vs actual for past week

---

### Milestone 5: MVP Launch (End of Week 8)
**Success Criteria:**
- [ ] All P0 and P1 tasks complete
- [ ] 70%+ test coverage
- [ ] Mobile responsive (tablet minimum)
- [ ] Performance: <200ms API, <100ms charts
- [ ] Zero critical bugs
- [ ] Production deployment live

**Demo:** Complete product walkthrough

---

## Communication Protocols

### Daily Standup (Async)
**Format:** Post in #standup channel by 10 AM
```
Yesterday: [What you completed]
Today: [What you're working on]
Blockers: [Any blockers or help needed]
```

### PR Review Process
1. Create PR with description and test evidence
2. Request review from PM + relevant team member
3. Address feedback within 24 hours
4. PM gives final approval
5. Squash and merge

### Escalation Path
```
Blocker identified
       │
       ▼
Post in #blockers channel
       │
       ▼
Team member attempts to help (2h SLA)
       │
       ▼
If unresolved → PM schedules sync call
       │
       ▼
If still unresolved → Architecture decision needed
```

### Meeting Schedule
| Meeting | Frequency | Duration | Attendees |
|---------|-----------|----------|-----------|
| Sprint Planning | Bi-weekly | 1 hour | All |
| Daily Standup | Daily (async) | 5 min | All |
| Code Review Sync | As needed | 30 min | PM + Author |
| Sprint Review | Bi-weekly | 45 min | All |
| Retrospective | Bi-weekly | 30 min | All |
| 1:1 with PM | Weekly | 15 min | PM + Individual |

---

## Risk Management

### Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | Backend delays block frontend | High | Critical | Backend has 2-week head start; FE can mock APIs |
| R2 | ML models underperform | Medium | High | Start with simple models; iterate based on metrics |
| R3 | API rate limits from Polymarket | Medium | Medium | Implement caching; request higher limits |
| R4 | Team member unavailable | Low | High | Cross-train on critical paths; document everything |
| R5 | Scope creep | Medium | Medium | PM controls backlog; new features go to post-MVP |
| R6 | Integration issues | High | Medium | Integration tests from week 3; daily syncs |
| R7 | Performance issues at scale | Medium | Medium | Load test in sprint 4; optimize critical paths |

### Contingency Plans

**If Backend Delayed:**
- Frontend uses mock API responses
- Data/Viz works on chart components independently
- Quant/ML trains models with sample data

**If ML Models Underperform:**
- Fall back to enhanced heuristics
- Focus on simpler, more interpretable models
- Prioritize sentiment over predictions

**If Integration Fails:**
- Schedule emergency sync call
- PM pairs with blocked developer
- Simplify integration points if needed

---

## Definition of Done

### Code Complete
- [ ] Feature implemented as specified
- [ ] Unit tests written and passing
- [ ] No linting errors
- [ ] Code reviewed and approved
- [ ] Documentation updated (if API change)

### Feature Complete
- [ ] Code complete (above)
- [ ] Integration tests passing
- [ ] Manually tested in staging
- [ ] No regressions in existing features
- [ ] Performance acceptable (<200ms API, <100ms UI)

### Sprint Complete
- [ ] All committed stories delivered
- [ ] Demo prepared and presented
- [ ] Retrospective completed
- [ ] Next sprint planned
- [ ] Backlog groomed

### Release Complete
- [ ] All acceptance criteria met
- [ ] QA sign-off
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Deployment runbook updated
- [ ] Monitoring alerts configured

---

## Appendix: Key File Locations

### Backend (Go)
```
/app/cmd/api/main.go                    # API entrypoint
/app/internal/api/handlers.go           # REST handlers
/app/internal/api/middleware.go         # JWT auth
/app/internal/storage/postgres.go       # DB operations
/app/internal/scraper/engine.go         # Web scraper
/app/internal/analyzer/engine.go        # NLP (Quant owns)
/app/internal/modeler/engine.go         # ML (Quant owns)
/db/migrations/                         # SQL schemas
/deploy/docker-compose.yml              # Deployment
```

### Frontend (React)
```
/website/src/App.jsx                    # Main component
/website/src/components/panels/         # All 16 panels
/website/src/components/Login.jsx       # Auth UI
/website/src/services/polymarketAPI.js  # API client
/website/src/utils/quantEngine.js       # Quant calcs
/website/src/utils/auth.js              # Auth utilities
```

### ML/Quant
```
/ml/models/                             # Model artifacts
/ml/training/                           # Training scripts
/ml/features/                           # Feature engineering
/ml/evaluation/                         # Metrics
```

### Data
```
/data/pipelines/                        # ETL scripts
/data/schemas/                          # Data models
```

---

**Document Owner:** Nicolás Leyva (Project Manager)
**Last Review:** February 2026
**Next Review:** End of Sprint 1
