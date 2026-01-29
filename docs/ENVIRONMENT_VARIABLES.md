# Environment Variables Configuration

## Core Application
```bash
APP_ENV=development                    # Environment: development, staging, production
APP_PORT=8080                          # API server port
APP_NAME=leet-terminal                 # Application name
```

## API Configuration
```bash
API_VERSION=v1                         # API version
API_BASE_URL=http://localhost:8080     # Base URL for API
CORS_ORIGINS=http://localhost:5173,http://localhost:3000  # Allowed CORS origins
```

## Database (PostgreSQL + TimescaleDB)
```bash
DB_HOST=localhost                      # Database host
DB_PORT=5432                           # Database port
DB_USER=leet_user                      # Database user
DB_PASSWORD=your_secure_password       # Database password (REQUIRED in production)
DB_NAME=leet_terminal                  # Database name
DB_SSL_MODE=disable                    # SSL mode: disable, require, verify-full
DB_MAX_CONNECTIONS=100                 # Maximum database connections
DB_MAX_IDLE=10                         # Maximum idle connections
```

## Redis (Cache & Queue)
```bash
REDIS_HOST=localhost                   # Redis host
REDIS_PORT=6379                        # Redis port
REDIS_PASSWORD=                        # Redis password (optional)
REDIS_DB=0                             # Redis database number
REDIS_POOL_SIZE=10                     # Redis connection pool size
```

## Asynq (Job Queue)
```bash
ASYNQ_REDIS_ADDR=localhost:6379        # Asynq Redis address
ASYNQ_CONCURRENCY=10                   # Number of concurrent workers
```

## Authentication
```bash
JWT_SECRET=your_secret_key_change_in_production  # JWT signing secret (REQUIRED in production)
JWT_EXPIRATION=24h                     # Access token expiration
JWT_REFRESH_EXPIRATION=168h            # Refresh token expiration (7 days)
ENCRYPTION_KEY=change_this_to_32_byte_key_prod  # 32-byte key for AES-256 encryption (REQUIRED in production)
```

## WebSocket
```bash
WS_READ_BUFFER_SIZE=1024               # WebSocket read buffer size
WS_WRITE_BUFFER_SIZE=1024              # WebSocket write buffer size
WS_HEARTBEAT_INTERVAL=30s              # WebSocket heartbeat interval
```

## Scraper Configuration
```bash
SCRAPER_MAX_CONCURRENT=10              # Maximum concurrent scraping jobs
SCRAPER_REQUEST_TIMEOUT=30s            # HTTP request timeout
SCRAPER_USER_AGENT=LeetTerminal/1.0    # User agent for scraping
SCRAPER_RATE_LIMIT=100                 # Rate limit (requests per minute)
SCRAPER_CACHE_TTL=3600                 # Cache TTL in seconds
```

## External APIs
```bash
# Polymarket (prediction markets)
POLYMARKET_API_KEY=                    # Optional API key
POLYMARKET_API_URL=https://gamma-api.polymarket.com  # Polymarket API base URL

# News API (news aggregation)
NEWS_API_KEY=your_newsapi_key          # Get from https://newsapi.org
NEWS_API_URL=https://newsapi.org/v2    # News API base URL

# Other services
KALSHI_API_KEY=                        # Kalshi API key (optional)
PARALLEL_AI_API_KEY=                   # Parallel AI API key (optional)
```

## Monitoring & Logging
```bash
LOG_LEVEL=info                         # Logging level: debug, info, warn, error
LOG_FORMAT=json                        # Log format: json, console
ENABLE_METRICS=true                    # Enable Prometheus metrics
METRICS_PORT=9090                      # Metrics server port
```

## Storage
```bash
UPLOAD_MAX_SIZE=10485760               # Max upload size (10MB)
STORAGE_PATH=/var/lib/leet-terminal/data  # Data storage path
```

## Frontend (Vite)
```bash
VITE_API_URL=http://localhost:8080     # Backend API URL (frontend connects here)
VITE_SUPABASE_URL=                     # Supabase URL (optional, legacy)
VITE_SUPABASE_ANON_KEY=                # Supabase key (optional, legacy)
```

---

## Security Best Practices

### Production Requirements
**MUST CHANGE** these values in production:
- `DB_PASSWORD` - Use strong, unique password
- `JWT_SECRET` - Use cryptographically secure random string (32+ chars)
- `ENCRYPTION_KEY` - **MUST be exactly 32 bytes** for AES-256 encryption (used for API keys)
- `CORS_ORIGINS` - Set to your production domain only
- `DB_SSL_MODE` - Set to `require` or `verify-full`

### API Keys
Store sensitive API keys:
- Use environment variables (never commit to git)
- Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate keys regularly
- Use separate keys for dev/staging/prod

### Network Security
- Use HTTPS in production (`API_BASE_URL` should start with https://)
- Configure firewall rules
- Use VPC/private networks for database connections
- Enable SSL/TLS for Redis and PostgreSQL in production

---

## Docker Compose Example

See `deployments/docker-compose.dev.yml` for containerized setup.

Key services:
- **postgres**: PostgreSQL + TimescaleDB
- **redis**: Redis cache & queue backend
- **api**: Go API server
- **scraper**: Background scraper worker
- **analyzer**: ML analysis worker
- **modeler**: Prediction model worker
- **web**: React frontend (Vite + Nginx)
- **asynqmon**: Job queue monitoring UI

---

## Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values

3. Start services:
   ```bash
   docker-compose -f deployments/docker-compose.dev.yml up -d
   ```

4. Access:
   - Frontend: http://localhost
   - API: http://localhost:8080
   - Asynq Monitor: http://localhost:8081

---

## API Connection Principles

### Backend → External APIs
- All external API URLs configured via environment variables
- Centralized in `internal/config/config.go`
- Default values provided for development
- Override in production via environment

### Frontend → Backend
- Single configuration file: `web/src/config/api.js`
- All API calls go through backend (no direct external calls)
- `VITE_API_URL` controls backend connection
- Backend proxies external services (avoids CORS issues)

### Data Flow
```
Frontend (React)
    ↓ VITE_API_URL
Backend API (Go)
    ↓ POLYMARKET_API_URL
External APIs (Polymarket, NewsAPI, etc.)
```

### Benefits
✅ Single source of truth for configuration
✅ Easy environment switching (dev/staging/prod)
✅ No CORS issues (backend proxies external APIs)
✅ Secure API key storage (never exposed to frontend)
✅ Centralized rate limiting and caching
✅ Easy to mock/test external services
