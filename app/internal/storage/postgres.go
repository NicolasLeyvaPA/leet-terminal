package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
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

// News source database methods

// CreateNewsSource creates a new news source in the database
func (db *DB) CreateNewsSource(source *NewsSource) error {
	query := `
		INSERT INTO news_sources (
			id, user_id, name, source_type, url, api_key_encrypted, 
			config, is_active, scrape_interval_minutes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	
	configJSON, err := json.Marshal(source.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	_, err = db.Exec(
		query,
		source.ID,
		source.UserID,
		source.Name,
		source.SourceType,
		source.URL,
		source.APIKeyEncrypted,
		configJSON,
		source.IsActive,
		source.ScrapeIntervalMinutes,
		source.CreatedAt,
		source.UpdatedAt,
	)
	
	return err
}

// GetNewsSource retrieves a specific news source by ID
func (db *DB) GetNewsSource(id string, userID *string) (*NewsSource, error) {
	query := `
		SELECT id, user_id, name, source_type, url, api_key_encrypted, 
		       config, is_active, scrape_interval_minutes, last_scraped_at,
		       created_at, updated_at
		FROM news_sources
		WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
	`
	
	var source NewsSource
	var configJSON []byte
	
	err := db.QueryRow(query, id, userID).Scan(
		&source.ID,
		&source.UserID,
		&source.Name,
		&source.SourceType,
		&source.URL,
		&source.APIKeyEncrypted,
		&configJSON,
		&source.IsActive,
		&source.ScrapeIntervalMinutes,
		&source.LastScrapedAt,
		&source.CreatedAt,
		&source.UpdatedAt,
	)
	
	if err != nil {
		return nil, err
	}
	
	if err := json.Unmarshal(configJSON, &source.Config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}
	
	return &source, nil
}

// ListNewsSources retrieves all news sources for a user (including global sources)
func (db *DB) ListNewsSources(userID *string) ([]NewsSource, error) {
	query := `
		SELECT id, user_id, name, source_type, url, api_key_encrypted,
		       config, is_active, scrape_interval_minutes, last_scraped_at,
		       created_at, updated_at
		FROM news_sources
		WHERE user_id = $1 OR user_id IS NULL
		ORDER BY created_at DESC
	`
	
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var sources []NewsSource
	for rows.Next() {
		var source NewsSource
		var configJSON []byte
		
		err := rows.Scan(
			&source.ID,
			&source.UserID,
			&source.Name,
			&source.SourceType,
			&source.URL,
			&source.APIKeyEncrypted,
			&configJSON,
			&source.IsActive,
			&source.ScrapeIntervalMinutes,
			&source.LastScrapedAt,
			&source.CreatedAt,
			&source.UpdatedAt,
		)
		
		if err != nil {
			return nil, err
		}
		
		if err := json.Unmarshal(configJSON, &source.Config); err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %w", err)
		}
		
		sources = append(sources, source)
	}
	
	return sources, rows.Err()
}

// ListActiveNewsSources retrieves all active news sources
func (db *DB) ListActiveNewsSources() ([]NewsSource, error) {
	query := `
		SELECT id, user_id, name, source_type, url, api_key_encrypted,
		       config, is_active, scrape_interval_minutes, last_scraped_at,
		       created_at, updated_at
		FROM news_sources
		WHERE is_active = true
		ORDER BY COALESCE(last_scraped_at, '1970-01-01'::timestamptz) ASC
	`
	
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var sources []NewsSource
	for rows.Next() {
		var source NewsSource
		var configJSON []byte
		
		err := rows.Scan(
			&source.ID,
			&source.UserID,
			&source.Name,
			&source.SourceType,
			&source.URL,
			&source.APIKeyEncrypted,
			&configJSON,
			&source.IsActive,
			&source.ScrapeIntervalMinutes,
			&source.LastScrapedAt,
			&source.CreatedAt,
			&source.UpdatedAt,
		)
		
		if err != nil {
			return nil, err
		}
		
		if err := json.Unmarshal(configJSON, &source.Config); err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %w", err)
		}
		
		sources = append(sources, source)
	}
	
	return sources, rows.Err()
}

// UpdateNewsSource updates a news source
func (db *DB) UpdateNewsSource(id string, userID *string, updates map[string]interface{}) error {
	// Build dynamic update query
	setClauses := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1
	
	if name, ok := updates["name"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, name)
		argIdx++
	}
	
	if isActive, ok := updates["is_active"].(bool); ok {
		setClauses = append(setClauses, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, isActive)
		argIdx++
	}
	
	if interval, ok := updates["scrape_interval_minutes"].(int); ok {
		setClauses = append(setClauses, fmt.Sprintf("scrape_interval_minutes = $%d", argIdx))
		args = append(args, interval)
		argIdx++
	}
	
	if config, ok := updates["config"].(map[string]interface{}); ok {
		configJSON, err := json.Marshal(config)
		if err != nil {
			return fmt.Errorf("failed to marshal config: %w", err)
		}
		setClauses = append(setClauses, fmt.Sprintf("config = $%d", argIdx))
		args = append(args, configJSON)
		argIdx++
	}
	
	if apiKey, ok := updates["api_key_encrypted"].(*string); ok {
		setClauses = append(setClauses, fmt.Sprintf("api_key_encrypted = $%d", argIdx))
		args = append(args, apiKey)
		argIdx++
	}
	
	if len(setClauses) == 1 {
		return fmt.Errorf("no fields to update")
	}
	
	args = append(args, id, userID)
	query := fmt.Sprintf(
		"UPDATE news_sources SET %s WHERE id = $%d AND user_id = $%d",
		strings.Join(setClauses, ", "),
		argIdx,
		argIdx+1,
	)
	
	result, err := db.Exec(query, args...)
	if err != nil {
		return err
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rows == 0 {
		return fmt.Errorf("news source not found or unauthorized")
	}
	
	return nil
}

// DeleteNewsSource deletes a news source
func (db *DB) DeleteNewsSource(id string, userID *string) error {
	query := `DELETE FROM news_sources WHERE id = $1 AND user_id = $2`
	
	result, err := db.Exec(query, id, userID)
	if err != nil {
		return err
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rows == 0 {
		return fmt.Errorf("news source not found or unauthorized")
	}
	
	return nil
}

// UpdateNewsSourceLastScraped updates the last_scraped_at timestamp
func (db *DB) UpdateNewsSourceLastScraped(id string) error {
	query := `UPDATE news_sources SET last_scraped_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := db.Exec(query, id)
	return err
}

// Article database methods

// CreateArticle creates a new article in the database
func (db *DB) CreateArticle(article *ArticleExtended) error {
	query := `
		INSERT INTO articles (
			id, source_id, scrape_job_id, url, url_hash, title, content,
			summary, author, published_at, category, tags, language,
			word_count, html, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		ON CONFLICT (url_hash) DO UPDATE SET
			content = EXCLUDED.content,
			summary = EXCLUDED.summary,
			updated_at = EXCLUDED.updated_at
	`
	
	tagsJSON, _ := json.Marshal(article.Tags)
	metadataJSON, _ := json.Marshal(article.Metadata)
	
	_, err := db.Exec(
		query,
		article.ID,
		article.SourceID,
		article.ScrapeJobID,
		article.URL,
		article.URLHash,
		article.Title,
		article.Content,
		article.Summary,
		article.Author,
		article.PublishedAt,
		article.Category,
		tagsJSON,
		article.Language,
		article.WordCount,
		article.HTML,
		metadataJSON,
		article.CreatedAt,
		article.UpdatedAt,
	)
	
	return err
}

// GetArticlesBySourceID retrieves all articles for a specific news source
func (db *DB) GetArticlesBySourceID(sourceID string, limit int) ([]ArticleExtended, error) {
	if limit <= 0 {
		limit = 50
	}
	
	query := `
		SELECT id, source_id, scrape_job_id, url, url_hash, title, content,
		       summary, author, published_at, category, tags, language,
		       word_count, metadata, created_at, updated_at
		FROM articles
		WHERE source_id = $1
		ORDER BY COALESCE(published_at, created_at) DESC
		LIMIT $2
	`
	
	rows, err := db.Query(query, sourceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var articles []ArticleExtended
	for rows.Next() {
		var article ArticleExtended
		var tagsJSON, metadataJSON []byte
		
		err := rows.Scan(
			&article.ID,
			&article.SourceID,
			&article.ScrapeJobID,
			&article.URL,
			&article.URLHash,
			&article.Title,
			&article.Content,
			&article.Summary,
			&article.Author,
			&article.PublishedAt,
			&article.Category,
			&tagsJSON,
			&article.Language,
			&article.WordCount,
			&metadataJSON,
			&article.CreatedAt,
			&article.UpdatedAt,
		)
		
		if err != nil {
			return nil, err
		}
		
		json.Unmarshal(tagsJSON, &article.Tags)
		json.Unmarshal(metadataJSON, &article.Metadata)
		
		articles = append(articles, article)
	}
	
	return articles, rows.Err()
}
