#!/bin/bash

# Leet Terminal - Local Development Setup Script
# This script helps you quickly start the local development environment

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Leet Terminal - Local Development Environment  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker Compose is not installed!${NC}"
    exit 1
fi

# Determine docker compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

cd "$SCRIPT_DIR"

# Function to show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up      - Build and start all services"
    echo "  down    - Stop all services"
    echo "  restart - Restart all services"
    echo "  logs    - View logs from all services"
    echo "  clean   - Stop and remove all containers and volumes"
    echo "  status  - Show status of all services"
    echo ""
}

# Parse command
COMMAND=${1:-up}

case $COMMAND in
    up)
        echo -e "${YELLOW}🔨 Building and starting all services...${NC}"
        echo ""
        $DOCKER_COMPOSE -f docker-compose.dev.yml up --build -d
        
        echo ""
        echo -e "${GREEN}✅ All services started successfully!${NC}"
        echo ""
        echo -e "${BLUE}📊 Service URLs:${NC}"
        echo "  • Frontend:       http://localhost"
        echo "  • API:            http://localhost:8080"
        echo "  • API Health:     http://localhost:8080/health"
        echo "  • Queue Monitor:  http://localhost:8081"
        echo "  • PostgreSQL:     localhost:5432"
        echo "  • Redis:          localhost:6379"
        echo ""
        echo -e "${YELLOW}📝 View logs:${NC}"
        echo "  All services:     $0 logs"
        echo "  Specific service: $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f [service-name]"
        echo ""
        echo -e "${YELLOW}🛑 Stop services:${NC}"
        echo "  $0 down"
        echo ""
        ;;
    
    down)
        echo -e "${YELLOW}🛑 Stopping all services...${NC}"
        $DOCKER_COMPOSE -f docker-compose.dev.yml down
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
    
    restart)
        echo -e "${YELLOW}🔄 Restarting all services...${NC}"
        $DOCKER_COMPOSE -f docker-compose.dev.yml restart
        echo -e "${GREEN}✅ All services restarted${NC}"
        ;;
    
    logs)
        echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit)...${NC}"
        echo ""
        $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f
        ;;
    
    clean)
        echo -e "${RED}⚠️  WARNING: This will remove all containers and volumes!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🧹 Cleaning up...${NC}"
            $DOCKER_COMPOSE -f docker-compose.dev.yml down -v
            echo -e "${GREEN}✅ Cleanup complete${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    
    status)
        echo -e "${BLUE}📊 Service Status:${NC}"
        echo ""
        $DOCKER_COMPOSE -f docker-compose.dev.yml ps
        ;;
    
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
