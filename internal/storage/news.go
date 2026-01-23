package storage

import (
	"time"
)

// NewsSource represents a news source configuration
type NewsSource struct {
	ID                   string                 `json:"id"`
	UserID               *string                `json:"user_id,omitempty"` // Null for global sources
	Name                 string                 `json:"name"`
	SourceType           string                 `json:"source_type"` // api, rss, web
	URL                  string                 `json:"url"`
	APIKeyEncrypted      *string                `json:"-"` // Never expose in JSON
	Config               map[string]interface{} `json:"config"`
	IsActive             bool                   `json:"is_active"`
	ScrapeIntervalMinutes int                   `json:"scrape_interval_minutes"`
	LastScrapedAt        *time.Time             `json:"last_scraped_at,omitempty"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
}

// ArticleExtended extends the Article model with news-specific fields
type ArticleExtended struct {
	ID          string     `json:"id"`
	SourceID    *string    `json:"source_id,omitempty"`
	ScrapeJobID *string    `json:"scrape_job_id,omitempty"`
	URL         string     `json:"url"`
	URLHash     string     `json:"url_hash"` // SHA-256 hash for deduplication
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	Summary     *string    `json:"summary,omitempty"`
	Author      *string    `json:"author,omitempty"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	Category    *string    `json:"category,omitempty"`
	Tags        []string   `json:"tags,omitempty"`
	Language    string     `json:"language"`
	WordCount   int        `json:"word_count"`
	HTML        *string    `json:"-"` // Don't expose raw HTML
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// NewsScrapeStats represents scraping statistics
type NewsScrapeStats struct {
	SourceID        string    `json:"source_id"`
	SourceName      string    `json:"source_name"`
	TotalArticles   int       `json:"total_articles"`
	Last24Hours     int       `json:"last_24_hours"`
	LastScrapedAt   *time.Time `json:"last_scraped_at"`
	SuccessRate     float64   `json:"success_rate"`
	AverageScrapeTime float64 `json:"average_scrape_time_seconds"`
}
