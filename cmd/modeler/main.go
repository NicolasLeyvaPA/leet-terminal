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
	"github.com/NicolasLeyvaPA/leet-terminal/internal/modeler"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/queue"
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

	logger.Info("Starting Modeler Service", zap.String("environment", cfg.AppEnv))

	// Initialize storage
	db, err := storage.NewPostgresDB(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

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

	// Create modeler engine
	engine := modeler.NewEngine(db, redisClient, cfg, logger)

	// Create queue server for processing prediction jobs
	srv := queue.NewAsynqServer(cfg, logger)
	
	// Register task handlers
	mux := srv.Mux()
	mux.HandleFunc(queue.TypePredictionJob, engine.HandlePredictionJob)

	// Start server in a goroutine
	go func() {
		logger.Info("Modeler worker started")
		if err := srv.Start(mux); err != nil {
			logger.Fatal("Failed to start worker", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down modeler service...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	srv.Shutdown(ctx)

	logger.Info("Modeler service exited")
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
