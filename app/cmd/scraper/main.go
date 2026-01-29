package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/cache"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/queue"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/scraper"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	logger, err := initLogger(cfg.LogLevel)
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	logger.Info("Starting Scraper Service",
		zap.String("environment", cfg.AppEnv),
		zap.Int("max_concurrent", cfg.ScraperMaxConcurrent),
	)

	// Initialize storage
	db, err := storage.NewPostgresDB(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize encryption key for decrypting API keys
	if err := storage.SetEncryptionKey(cfg.EncryptionKey); err != nil {
		logger.Fatal("Failed to set encryption key", zap.Error(err))
	}

	// Initialize cache
	redisClient, err := cache.NewRedisClient(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()

	// Initialize queue consumer
	queueClient, err := queue.NewAsynqClient(cfg)
	if err != nil {
		logger.Fatal("Failed to initialize queue client", zap.Error(err))
	}
	defer queueClient.Close()

	// Create scraper engine
	engine := scraper.NewEngine(db, redisClient, cfg, logger)

	// Create and start scheduler for periodic news source scraping
	// Check every 5 minutes for sources that need scraping
	scheduler := scraper.NewScheduler(db, queueClient, logger, 5*time.Minute)
	scheduler.Start(context.Background())
	defer scheduler.Stop()

	// Create queue server for processing scraping jobs
	srv := queue.NewAsynqServer(cfg, logger)
	
	// Register task handlers
	mux := srv.Mux()
	mux.HandleFunc(queue.TypeScrapeJob, engine.HandleScrapeJob)
	mux.HandleFunc(queue.TypeNewsSourceScrape, engine.HandleNewsSourceScrape)

	// Start server in a goroutine
	go func() {
		logger.Info("Scraper worker started")
		if err := srv.Start(mux); err != nil {
			logger.Fatal("Failed to start worker", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down scraper service...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	srv.Shutdown(ctx)

	logger.Info("Scraper service exited")
}

func initLogger(level string) (*zap.Logger, error) {
	var zapLevel zap.AtomicLevel
	switch level {
	case "debug":
		zapLevel = zap.NewAtomicLevelAt(zap.DebugLevel)
	case "info":
		zapLevel = zap.NewAtomicLevelAt(zap.InfoLevel)
	case "warn":
		zapLevel = zap.NewAtomicLevelAt(zap.WarnLevel)
	case "error":
		zapLevel = zap.NewAtomicLevelAt(zap.ErrorLevel)
	default:
		zapLevel = zap.NewAtomicLevelAt(zap.InfoLevel)
	}

	config := zap.Config{
		Level:            zapLevel,
		Development:      false,
		Encoding:         "json",
		EncoderConfig:    zap.NewProductionEncoderConfig(),
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	return config.Build()
}
