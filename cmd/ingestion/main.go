package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
	"github.com/NicolasLeyvaPA/leet-terminal/services/db"
	"github.com/NicolasLeyvaPA/leet-terminal/services/ingestion"
)

func main() {
	// CLI flags
	dryRun := flag.Bool("dry-run", false, "Run once and exit (for testing)")
	marketsOnly := flag.Bool("markets-only", false, "Ingest only market data")
	newsOnly := flag.Bool("news-only", false, "Ingest only news data")
	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("=== Leet Terminal Ingestion Service ===")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to TimescaleDB (markets and news are stored there)
	tsDB, err := db.ConnectToPostgres(cfg.TimescaleDSN)
	if err != nil {
		log.Fatalf("Failed to connect to TimescaleDB: %v", err)
	}
	defer tsDB.Close()

	// We don't need user DB for ingestion, but adapter expects both
	// Use TimescaleDB connection for both (or connect to UserDB if needed)
	pgDB, err := db.ConnectToPostgres(cfg.UsersDSN)
	if err != nil {
		log.Fatalf("Failed to connect to Postgres: %v", err)
	}
	defer pgDB.Close()

	// Wait for DB to be ready
	time.Sleep(500 * time.Millisecond)

	// Run migrations
	ctx := context.Background()
	log.Println("Running database migrations...")
	if err := db.RunSQLFile(ctx, tsDB, "services/db/migrations/timescaledb_migration_001.sql"); err != nil {
		log.Printf("WARN: Migration 001 failed (may already exist): %v", err)
	}
	if err := db.RunSQLFile(ctx, tsDB, "services/db/migrations/timescaledb_migration_002.sql"); err != nil {
		log.Printf("WARN: Migration 002 failed (may already exist): %v", err)
	}
	log.Println("Migrations complete")

	// Create adapter
	adapter := db.NewAdapter(pgDB, tsDB)

	// Create ingestion pipeline
	pipeline := ingestion.NewPipeline(cfg, adapter)

	// Dry run mode (single execution)
	if *dryRun {
		log.Println("=== DRY RUN MODE ===")

		if *newsOnly {
			if err := pipeline.RunNewsIngestion(ctx); err != nil {
				log.Fatalf("News ingestion failed: %v", err)
			}
		} else if *marketsOnly {
			if err := pipeline.RunMarketIngestion(ctx); err != nil {
				log.Fatalf("Market ingestion failed: %v", err)
			}
		} else {
			if err := pipeline.RunFullIngestion(ctx); err != nil {
				log.Fatalf("Full ingestion failed: %v", err)
			}
		}

		log.Println("Dry run complete")
		return
	}

	// Scheduled mode (continuous)
	scheduler := ingestion.NewScheduler(pipeline, cfg.IngestionInterval)

	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	// Start scheduler in background
	errCh := make(chan error, 1)
	go func() {
		errCh <- scheduler.Start(ctx)
	}()

	// Wait for shutdown signal or error
	select {
	case sig := <-sigCh:
		log.Printf("Received signal %v, shutting down gracefully...", sig)
		scheduler.Stop()
	case err := <-errCh:
		if err != nil {
			log.Printf("Scheduler error: %v", err)
		}
	}

	log.Println("Ingestion service stopped")
}

