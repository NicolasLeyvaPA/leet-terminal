# Local Development Environment - Quick Start Guide

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB RAM available
- Ports 80, 5432, 6379, 8080, 8081 available

## Quick Start

### Option 1: Using the Helper Script (Recommended)

```bash
# Make the script executable
chmod +x scripts/dev.sh

# Start all services
./scripts/dev.sh up

# View logs
./scripts/dev.sh logs

# Stop all services
./scripts/dev.sh down

# Restart services
./scripts/dev.sh restart

# Check status
./scripts/dev.sh status

# Clean up (removes volumes)
./scripts/dev.sh clean
```

### Option 2: Using Docker Compose Directly

```bash
# Navigate to deployments directory
cd deployments

# Build and start all services
docker-compose -f docker-compose.dev.yml up --build -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes
docker-compose -f docker-compose.dev.yml down -v
```

## Services

Once started, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost | React web interface |
| API | http://localhost:8080 | REST API & WebSocket |
| API Health | http://localhost:8080/health | Health check endpoint |
| Queue Monitor | http://localhost:8081 | Asynq job queue monitoring |
| PostgreSQL | localhost:5432 | Database (user: leet_user, pass: leet_password, db: leet_terminal) |
| Redis | localhost:6379 | Cache and message queue |

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Nginx)                    │
│                    http://localhost                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                     API Service (Gin)                    │
│                  http://localhost:8080                   │
└──┬───────────────────┬────────────────────┬─────────────┘
   │                   │                    │
   ▼                   ▼                    ▼
┌──────────┐    ┌──────────┐       ┌──────────┐
│ Scraper  │    │ Analyzer │       │ Modeler  │
│  Worker  │    │  Worker  │       │  Worker  │
└────┬─────┘    └────┬─────┘       └────┬─────┘
     │               │                   │
     └───────────────┼───────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
     ┌─────────┐          ┌─────────┐
     │  Redis  │          │Postgres │
     │ (Queue) │          │  (DB)   │
     └─────────┘          └─────────┘
```

## Development Workflow

### 1. First Time Setup

```bash
# Start all services
./scripts/dev.sh up

# Wait for services to be healthy (check logs)
./scripts/dev.sh logs

# Verify all services are running
./scripts/dev.sh status
```

### 2. Testing the API

```bash
# Check API health
curl http://localhost:8080/health

# Example: Create a scrape job (requires authentication)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "username": "testuser"
  }'

# Login to get token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Monitoring

#### View All Logs
```bash
./scripts/dev.sh logs
```

#### View Specific Service Logs
```bash
# API logs
docker-compose -f deployments/docker-compose.dev.yml logs -f api

# Scraper logs
docker-compose -f deployments/docker-compose.dev.yml logs -f scraper

# Database logs
docker-compose -f deployments/docker-compose.dev.yml logs -f postgres
```

#### Queue Monitoring
Open http://localhost:8081 to view:
- Pending jobs
- Active jobs
- Completed jobs
- Failed jobs
- Worker statistics

### 4. Database Access

```bash
# Connect to PostgreSQL
docker exec -it leet-postgres-dev psql -U leet_user -d leet_terminal

# List tables
\dt

# Query users
SELECT * FROM users;

# Exit
\q
```

### 5. Redis Access

```bash
# Connect to Redis
docker exec -it leet-redis-dev redis-cli

# List all keys
KEYS *

# Get a value
GET some_key

# Monitor commands
MONITOR

# Exit
exit
```

## Rebuilding Services

If you make changes to the code:

```bash
# Rebuild and restart all services
./scripts/dev.sh down
./scripts/dev.sh up

# Or rebuild specific service
cd deployments
docker-compose -f docker-compose.dev.yml up --build -d api
```

## Troubleshooting

### Port Already in Use

If you get port conflicts:

```bash
# Check what's using the port
lsof -i :8080  # or :80, :5432, :6379

# Kill the process or change the port in docker-compose.dev.yml
```

### Services Won't Start

```bash
# Check logs
./scripts/dev.sh logs

# Check specific service
docker logs leet-api-dev

# Restart a specific service
docker-compose -f deployments/docker-compose.dev.yml restart api
```

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker exec leet-postgres-dev pg_isready -U leet_user

# Recreate the database
./scripts/dev.sh clean
./scripts/dev.sh up
```

### Out of Memory

```bash
# Check Docker stats
docker stats

# Increase Docker Desktop memory limit:
# Docker Desktop → Settings → Resources → Memory
```

## Clean Up

### Stop Services (Keep Data)
```bash
./scripts/dev.sh down
```

### Stop Services and Remove Data
```bash
./scripts/dev.sh clean
```

### Remove Everything Including Images
```bash
cd deployments
docker-compose -f docker-compose.dev.yml down -v --rmi all
docker system prune -a
```

## Development Tips

1. **Hot Reload**: Currently, you need to rebuild containers after code changes. For faster development, consider running services locally outside Docker.

2. **Database Migrations**: Migrations run automatically when PostgreSQL starts. To add new migrations:
   - Add SQL files to `migrations/` directory
   - Restart postgres: `docker-compose -f deployments/docker-compose.dev.yml restart postgres`

3. **Environment Variables**: Edit `docker-compose.dev.yml` to change service configurations.

4. **Debugging**: Set `LOG_LEVEL: debug` in docker-compose.dev.yml for verbose logs.

5. **Queue Jobs**: Use the Asynq monitor at http://localhost:8081 to:
   - View pending jobs
   - Retry failed jobs
   - Inspect job payloads
   - Monitor worker performance

## Next Steps

- See [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for production deployment
- See [BACKEND_QUICKSTART.md](../docs/BACKEND_QUICKSTART.md) for backend development
- See [FRONTEND_QUICKSTART.md](../docs/FRONTEND_QUICKSTART.md) for frontend development
- See [ARCHITECTURE_PROPOSAL.md](../docs/ARCHITECTURE_PROPOSAL.md) for system architecture

## Support

For issues or questions:
1. Check logs: `./scripts/dev.sh logs`
2. Verify services: `./scripts/dev.sh status`
3. Review this documentation
4. Check the main [README.md](../README.md)
