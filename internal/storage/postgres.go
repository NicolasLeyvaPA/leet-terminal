package storage

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	_ "github.com/lib/pq"
)

// DB wraps the database connection
type DB struct {
	*sql.DB
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(cfg *config.Config) (*DB, error) {
	db, err := sql.Open("postgres", cfg.DatabaseDSN())
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(cfg.DBMaxConnections)
	db.SetMaxIdleConns(cfg.DBMaxIdle)
	db.SetConnMaxLifetime(time.Hour)

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.DB.Close()
}

// Models for database entities

// User represents a user in the system
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Username     string    `json:"username"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ScrapeJob represents a web scraping job
type ScrapeJob struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	URL         string    `json:"url"`
	Status      string    `json:"status"` // pending, processing, completed, failed
	Result      string    `json:"result,omitempty"`
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// AnalysisJob represents a text analysis job
type AnalysisJob struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	ContentID   string    `json:"content_id"`
	Type        string    `json:"type"` // sentiment, ner, topic
	Status      string    `json:"status"`
	Result      string    `json:"result,omitempty"`
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// PredictionJob represents a prediction modeling job
type PredictionJob struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	DatasetID   string    `json:"dataset_id"`
	ModelType   string    `json:"model_type"` // markov, timeseries, ml
	Status      string    `json:"status"`
	Result      string    `json:"result,omitempty"`
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}
