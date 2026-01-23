# Leet Terminal - Deployment Guide

## Overview

This guide covers deploying the Leet Terminal application using Docker Compose with proper storage management and auto-scaling capabilities.

## Architecture

The application consists of:
- **API Service** (2 replicas default): REST API & WebSocket server
- **Scraper Service** (3 replicas default): Web scraping workers
- **Analyzer Service** (2 replicas default): Text analysis workers
- **Modeler Service** (2 replicas default): Prediction/ML workers
- **PostgreSQL** (TimescaleDB): Primary database with time-series support
- **Redis**: Caching and message queue
- **RabbitMQ**: Optional message broker
- **Web Frontend**: Nginx-served React application

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB disk space

## Quick Start

### 1. Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd leet-terminal

# Copy environment file
cp .env.example .env

# Edit configuration
nano .env  # or your preferred editor
```

### 2. Configure Environment

Edit `.env` and update at minimum:
```env
# Security (REQUIRED for production)
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
REDIS_PASSWORD=your_secure_redis_password

# External APIs (if using)
POLYMARKET_API_KEY=your_polymarket_key
KALSHI_API_KEY=your_kalshi_key
PARALLEL_AI_API_KEY=your_parallel_ai_key
```

### 3. Start Services

```bash
# Navigate to deployments directory
cd deployments

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Verify Deployment

```bash
# Check API health
curl http://localhost:8080/health

# Check web interface
curl http://localhost/health
```

Access services:
- **Frontend**: http://localhost
- **API**: http://localhost:8080
- **Queue Monitor**: http://localhost:8081
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## Scaling Services

### Manual Scaling

Scale individual services based on load:

```bash
# Scale scraper workers to 5
docker-compose up -d --scale scraper=5

# Scale analyzer workers to 3
docker-compose up -d --scale analyzer=3

# Scale modeler workers to 4
docker-compose up -d --scale modeler=4

# Check running instances
docker-compose ps
```

### Auto-Scaling via Environment

Edit `.env` and set replica counts:

```env
API_REPLICAS=3
SCRAPER_REPLICAS=5
ANALYZER_REPLICAS=3
MODELER_REPLICAS=2
```

Then restart:
```bash
docker-compose up -d
```

## Storage Management

### Data Volumes

The application uses several persistent volumes:

- `postgres_data`: PostgreSQL database
- `redis_data`: Redis persistence
- `rabbitmq_data`: RabbitMQ data
- `api_data`: Uploaded files and processed data

### Backup Database

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U leet_user leet_terminal > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U leet_user leet_terminal < backup.sql
```

### Backup Redis

```bash
# Trigger Redis save
docker-compose exec redis redis-cli SAVE

# Copy RDB file
docker cp leet-redis:/data/dump.rdb ./redis-backup.rdb
```

### Clean Up Old Data

```bash
# Remove stopped containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Monitoring

### Built-in Monitoring

Access monitoring interfaces:

1. **Asynq Monitor** (Queue stats): http://localhost:8081
   - View pending/active/completed jobs
   - Monitor worker performance
   - Retry failed jobs

2. **RabbitMQ Management**: http://localhost:15672
   - Default credentials: guest/guest
   - Monitor message queues
   - View connection statistics

### Optional Monitoring Stack

Start with Prometheus and Grafana:

```bash
docker-compose --profile monitoring up -d
```

Access:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Health Checks

All services expose health endpoints:

```bash
# API health
curl http://localhost:8080/health

# Database health
docker-compose exec postgres pg_isready

# Redis health
docker-compose exec redis redis-cli ping
```

## Logs Management

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f scraper

# Last 100 lines
docker-compose logs --tail=100 api

# Since specific time
docker-compose logs --since 2024-01-01T00:00:00 api
```

### Log Rotation

For production, configure log rotation:

```yaml
# Add to docker-compose.yml under each service
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Performance Tuning

### Database Optimization

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U leet_user leet_terminal

# Analyze table statistics
ANALYZE;

# Vacuum database
VACUUM ANALYZE;

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

### Redis Optimization

Edit docker-compose.yml:

```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Worker Concurrency

Adjust worker concurrency in `.env`:

```env
SCRAPER_CONCURRENCY=20  # Concurrent scraping jobs per worker
ANALYZER_CONCURRENCY=15 # Concurrent analysis jobs per worker
MODELER_CONCURRENCY=10  # Concurrent modeling jobs per worker
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT secret (32+ characters)
- [ ] Enable Redis password protection
- [ ] Configure CORS origins properly
- [ ] Use HTTPS/TLS certificates
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Enable database SSL/TLS
- [ ] Secure RabbitMQ admin interface

### Reverse Proxy Setup

Use Nginx or Traefik as reverse proxy:

```nginx
# nginx.conf example
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/v1/ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

### Resource Limits

Configure proper resource limits:

```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

### Database Connection Pooling

Adjust in `.env`:

```env
DB_MAX_CONNECTIONS=50
DB_MAX_IDLE_CONNECTIONS=10
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart service
docker-compose restart service-name
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec api sh
# Inside container:
nc -zv postgres 5432

# Check database logs
docker-compose logs postgres
```

### Queue Not Processing

```bash
# Check Redis connection
docker-compose exec scraper sh
# Inside container:
nc -zv redis 6379

# Check queue monitor
open http://localhost:8081
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Reduce worker replicas
docker-compose up -d --scale scraper=2 --scale analyzer=1

# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory
```

### High CPU Usage

```bash
# Identify high CPU container
docker stats

# Reduce concurrency
# Edit .env:
SCRAPER_CONCURRENCY=5
ANALYZER_CONCURRENCY=5

# Restart services
docker-compose restart
```

## Maintenance

### Update Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Remove old images
docker image prune -a
```

### Database Migrations

```bash
# Run migrations
docker-compose exec postgres psql -U leet_user leet_terminal < /docker-entrypoint-initdb.d/002_new_migration.up.sql

# Rollback migration
docker-compose exec postgres psql -U leet_user leet_terminal < /docker-entrypoint-initdb.d/002_new_migration.down.sql
```

### Scheduled Maintenance

Create a maintenance script:

```bash
#!/bin/bash
# maintenance.sh

# Backup database
docker-compose exec postgres pg_dump -U leet_user leet_terminal > backup-$(date +%Y%m%d).sql

# Vacuum database
docker-compose exec postgres psql -U leet_user leet_terminal -c "VACUUM ANALYZE;"

# Clean old Redis keys
docker-compose exec redis redis-cli --scan --pattern "cache:*" | xargs docker-compose exec redis redis-cli DEL

# Refresh materialized views
docker-compose exec postgres psql -U leet_user leet_terminal -c "SELECT refresh_user_statistics();"

# Restart services
docker-compose restart
```

Run via cron:
```bash
# Add to crontab
0 2 * * * /path/to/maintenance.sh
```

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify configuration: `docker-compose config`
3. Check health: `curl http://localhost:8080/health`
4. Review documentation: `/docs`
5. Open GitHub issue

## Additional Resources

- [Architecture Documentation](../docs/ARCHITECTURE_PROPOSAL.md)
- [Backend Requirements](../docs/BACKEND_MVP_REQUIREMENTS.md)
- [API Documentation](../docs/API.md)
- [Development Guide](../docs/DEVELOPMENT.md)
