package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	// Application
	AppEnv  string
	AppPort int
	AppName string

	// API
	APIVersion  string
	APIBaseURL  string
	CORSOrigins []string

	// Database
	DBHost           string
	DBPort           int
	DBUser           string
	DBPassword       string
	DBName           string
	DBSSLMode        string
	DBMaxConnections int
	DBMaxIdle        int

	// Redis
	RedisHost     string
	RedisPort     int
	RedisPassword string
	RedisDB       int
	RedisPoolSize int

	// Message Queue (RabbitMQ)
	RabbitMQHost     string
	RabbitMQPort     int
	RabbitMQUser     string
	RabbitMQPassword string
	RabbitMQVHost    string

	// Asynq (Redis-based queue)
	AsynqRedisAddr   string
	AsynqConcurrency int

	// JWT
	JWTSecret            string
	JWTExpiration        time.Duration
	JWTRefreshExpiration time.Duration

	// Encryption
	EncryptionKey string // 32 bytes for AES-256

	// WebSocket
	WSReadBufferSize    int
	WSWriteBufferSize   int
	WSHeartbeatInterval time.Duration

	// Scraper
	ScraperMaxConcurrent int
	ScraperRequestTimeout time.Duration
	ScraperUserAgent     string
	ScraperRateLimit     int
	ScraperCacheTTL      int

	// External APIs
	PolymarketAPIKey    string
	PolymarketAPIURL    string
	KalshiAPIKey        string
	ParallelAIAPIKey    string
	NewsAPIKey          string
	NewsAPIURL          string

	// Monitoring & Logging
	LogLevel      string
	LogFormat     string
	EnableMetrics bool
	MetricsPort   int

	// Storage
	UploadMaxSize int64
	StoragePath   string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (ignore error in production)
	_ = godotenv.Load()

	cfg := &Config{
		// Application
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnvAsInt("APP_PORT", 8080),
		AppName: getEnv("APP_NAME", "leet-terminal"),

		// API
		APIVersion:  getEnv("API_VERSION", "v1"),
		APIBaseURL:  getEnv("API_BASE_URL", "http://localhost:8080"),
		CORSOrigins: getEnvAsSlice("CORS_ORIGINS", []string{"http://localhost:5173", "http://localhost:3000"}),

		// Database
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           getEnvAsInt("DB_PORT", 5432),
		DBUser:           getEnv("DB_USER", "leet_user"),
		DBPassword:       getEnv("DB_PASSWORD", "leet_password"),
		DBName:           getEnv("DB_NAME", "leet_terminal"),
		DBSSLMode:        getEnv("DB_SSL_MODE", "disable"),
		DBMaxConnections: getEnvAsInt("DB_MAX_CONNECTIONS", 25),
		DBMaxIdle:        getEnvAsInt("DB_MAX_IDLE_CONNECTIONS", 5),

		// Redis
		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnvAsInt("REDIS_PORT", 6379),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),
		RedisPoolSize: getEnvAsInt("REDIS_POOL_SIZE", 10),

		// RabbitMQ
		RabbitMQHost:     getEnv("RABBITMQ_HOST", "localhost"),
		RabbitMQPort:     getEnvAsInt("RABBITMQ_PORT", 5672),
		RabbitMQUser:     getEnv("RABBITMQ_USER", "guest"),
		RabbitMQPassword: getEnv("RABBITMQ_PASSWORD", "guest"),
		RabbitMQVHost:    getEnv("RABBITMQ_VHOST", "/"),

		// Asynq
		AsynqRedisAddr:   getEnv("ASYNQ_REDIS_ADDR", "localhost:6379"),
		AsynqConcurrency: getEnvAsInt("ASYNQ_CONCURRENCY", 10),

		// JWT
		JWTSecret:            getEnv("JWT_SECRET", "your_secret_key_change_in_production"),
		JWTExpiration:        getEnvAsDuration("JWT_EXPIRATION", 24*time.Hour),
		JWTRefreshExpiration: getEnvAsDuration("JWT_REFRESH_EXPIRATION", 168*time.Hour),

		// Encryption - 32 bytes for AES-256
		EncryptionKey: getEnv("ENCRYPTION_KEY", "dev-key-32-bytes-change-prod!!"),

		// WebSocket
		WSReadBufferSize:    getEnvAsInt("WS_READ_BUFFER_SIZE", 1024),
		WSWriteBufferSize:   getEnvAsInt("WS_WRITE_BUFFER_SIZE", 1024),
		WSHeartbeatInterval: getEnvAsDuration("WS_HEARTBEAT_INTERVAL", 30*time.Second),

		// Scraper
		ScraperMaxConcurrent:  getEnvAsInt("SCRAPER_MAX_CONCURRENT", 10),
		ScraperRequestTimeout: getEnvAsDuration("SCRAPER_REQUEST_TIMEOUT", 30*time.Second),
		ScraperUserAgent:      getEnv("SCRAPER_USER_AGENT", "LeetTerminal/1.0"),
		ScraperRateLimit:      getEnvAsInt("SCRAPER_RATE_LIMIT", 100),
		ScraperCacheTTL:       getEnvAsInt("SCRAPER_CACHE_TTL", 3600),

		// External APIs
		PolymarketAPIKey: getEnv("POLYMARKET_API_KEY", ""),
		PolymarketAPIURL: getEnv("POLYMARKET_API_URL", "https://gamma-api.polymarket.com"),
		KalshiAPIKey:     getEnv("KALSHI_API_KEY", ""),
		ParallelAIAPIKey: getEnv("PARALLEL_AI_API_KEY", ""),
		NewsAPIKey:       getEnv("NEWS_API_KEY", ""),
		NewsAPIURL:       getEnv("NEWS_API_URL", "https://newsapi.org/v2"),

		// Monitoring
		LogLevel:      getEnv("LOG_LEVEL", "info"),
		LogFormat:     getEnv("LOG_FORMAT", "json"),
		EnableMetrics: getEnvAsBool("ENABLE_METRICS", true),
		MetricsPort:   getEnvAsInt("METRICS_PORT", 9090),

		// Storage
		UploadMaxSize: getEnvAsInt64("UPLOAD_MAX_SIZE", 10485760),
		StoragePath:   getEnv("STORAGE_PATH", "/var/lib/leet-terminal/data"),
	}

	return cfg, cfg.Validate()
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.DBPassword == "" || c.DBPassword == "leet_password_change_in_production" {
		if c.AppEnv == "production" {
			return fmt.Errorf("DB_PASSWORD must be set in production")
		}
	}

	if c.JWTSecret == "" || c.JWTSecret == "your_super_secret_jwt_key_change_in_production" {
		if c.AppEnv == "production" {
			return fmt.Errorf("JWT_SECRET must be set in production")
		}
	}

	return nil
}

// DatabaseDSN returns the database connection string
func (c *Config) DatabaseDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

// RedisAddr returns the Redis address
func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%d", c.RedisHost, c.RedisPort)
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
