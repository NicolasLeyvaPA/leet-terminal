package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/api"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/cache"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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

	logger.Info("Starting Leet Terminal API Server",
		zap.String("version", cfg.APIVersion),
		zap.String("environment", cfg.AppEnv),
		zap.Int("port", cfg.AppPort),
	)

	// Initialize storage
	db, err := storage.NewPostgresDB(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize encryption key for API keys
	if err := storage.SetEncryptionKey(cfg.EncryptionKey); err != nil {
		logger.Fatal("Failed to set encryption key", zap.Error(err))
	}

	// Initialize cache
	redisClient, err := cache.NewRedisClient(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()

	// Setup Gin router
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(ginLogger(logger))

	// CORS middleware
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "api",
			"version": cfg.APIVersion,
			"time":    time.Now().Unix(),
		})
	})

	// Initialize API handlers
	apiHandler := api.NewHandler(db, redisClient, cfg, logger)
	
	// Setup routes
	v1 := router.Group("/api/v1")
	{
		// Authentication routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", apiHandler.Register)
			auth.POST("/login", apiHandler.Login)
			auth.POST("/refresh", apiHandler.RefreshToken)
		}

		// Protected routes (require authentication)
		protected := v1.Group("")
		protected.Use(api.AuthMiddleware(cfg.JWTSecret))
		{
			// Scraper routes
			scraper := protected.Group("/scraper")
			{
				scraper.POST("/jobs", apiHandler.CreateScrapeJob)
				scraper.GET("/jobs", apiHandler.ListScrapeJobs)
				scraper.GET("/jobs/:id", apiHandler.GetScrapeJob)
			}

			// Analysis routes
			analysis := protected.Group("/analysis")
			{
				analysis.POST("/jobs", apiHandler.CreateAnalysisJob)
				analysis.GET("/jobs", apiHandler.ListAnalysisJobs)
				analysis.GET("/jobs/:id", apiHandler.GetAnalysisJob)
			}

			// Prediction routes
			predictions := protected.Group("/predictions")
			{
				predictions.POST("/jobs", apiHandler.CreatePredictionJob)
				predictions.GET("/jobs", apiHandler.ListPredictionJobs)
				predictions.GET("/jobs/:id", apiHandler.GetPredictionJob)
			}

			// News routes
			news := protected.Group("/news")
			{
				// News sources management
				news.POST("/sources", apiHandler.CreateNewsSource)
				news.GET("/sources", apiHandler.ListNewsSources)
				news.GET("/sources/:id", apiHandler.GetNewsSource)
				news.PUT("/sources/:id", apiHandler.UpdateNewsSource)
				news.DELETE("/sources/:id", apiHandler.DeleteNewsSource)
				news.POST("/sources/:id/scrape", apiHandler.TriggerNewsSourceScrape)
				
				// Articles
				news.GET("/articles", apiHandler.ListArticles)
				news.GET("/articles/:id", apiHandler.GetArticle)
				news.GET("/articles/search", apiHandler.SearchArticles)
			}

			// Polymarket proxy routes (avoid CORS issues)
			polymarket := protected.Group("/polymarket")
			{
				polymarket.GET("/events", apiHandler.PolymarketProxyHandler)
				polymarket.GET("/events/:id", apiHandler.PolymarketEventHandler)
			}

			// WebSocket endpoint
			protected.GET("/ws", apiHandler.HandleWebSocket)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.AppPort),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("API server listening", zap.Int("port", cfg.AppPort))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
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

func ginLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		if query != "" {
			path = path + "?" + query
		}

		logger.Info("HTTP request",
			zap.Int("status", c.Writer.Status()),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("ip", c.ClientIP()),
			zap.Duration("latency", latency),
			zap.String("user-agent", c.Request.UserAgent()),
		)
	}
}
