.PHONY: help build run test clean docker-build docker-up docker-down migrate

# Variables
BINARY_NAME=leet-terminal
DOCKER_COMPOSE=docker-compose -f deployments/docker-compose.yml
GO=go
GOFLAGS=-v

help: ## Display this help screen
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(GO) mod download
	$(GO) mod verify

build-api: ## Build API service
	$(GO) build $(GOFLAGS) -o bin/api ./cmd/api

build-scraper: ## Build scraper service
	$(GO) build $(GOFLAGS) -o bin/scraper ./cmd/scraper

build-analyzer: ## Build analyzer service
	$(GO) build $(GOFLAGS) -o bin/analyzer ./cmd/analyzer

build-modeler: ## Build modeler service
	$(GO) build $(GOFLAGS) -o bin/modeler ./cmd/modeler

build: build-api build-scraper build-analyzer build-modeler ## Build all services

run-api: ## Run API service
	$(GO) run ./cmd/api

run-scraper: ## Run scraper service
	$(GO) run ./cmd/scraper

test: ## Run tests
	$(GO) test -v -race -coverprofile=coverage.out ./...

test-coverage: test ## Run tests with coverage report
	$(GO) tool cover -html=coverage.out

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out

lint: ## Run linter
	golangci-lint run ./...

docker-build: ## Build Docker images
	$(DOCKER_COMPOSE) build

docker-up: ## Start all services with Docker Compose
	$(DOCKER_COMPOSE) up -d

docker-down: ## Stop all services
	$(DOCKER_COMPOSE) down

docker-logs: ## View Docker logs
	$(DOCKER_COMPOSE) logs -f

docker-restart: ## Restart all services
	$(DOCKER_COMPOSE) restart

docker-clean: ## Remove all containers and volumes
	$(DOCKER_COMPOSE) down -v

migrate-up: ## Run database migrations up
	$(GO) run cmd/migrate/main.go up

migrate-down: ## Run database migrations down
	$(GO) run cmd/migrate/main.go down

migrate-create: ## Create a new migration file (usage: make migrate-create NAME=migration_name)
	@if [ -z "$(NAME)" ]; then echo "NAME is required. Usage: make migrate-create NAME=your_migration_name"; exit 1; fi
	@timestamp=$$(date +%Y%m%d%H%M%S); \
	echo "-- +migrate Up" > migrations/$${timestamp}_$(NAME).up.sql; \
	echo "-- SQL statements for migration up" >> migrations/$${timestamp}_$(NAME).up.sql; \
	echo "" >> migrations/$${timestamp}_$(NAME).up.sql; \
	echo "-- +migrate Down" > migrations/$${timestamp}_$(NAME).down.sql; \
	echo "-- SQL statements for migration down" >> migrations/$${timestamp}_$(NAME).down.sql; \
	echo "Created migration files: migrations/$${timestamp}_$(NAME).{up,down}.sql"

dev: ## Run in development mode with hot reload (requires air)
	air

generate: ## Generate code (mocks, etc.)
	$(GO) generate ./...

tidy: ## Tidy go modules
	$(GO) mod tidy

fmt: ## Format code
	$(GO) fmt ./...
	gofmt -s -w .

vet: ## Run go vet
	$(GO) vet ./...

all: clean install build test ## Run all tasks
