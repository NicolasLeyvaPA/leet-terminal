package api

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateNewsSource adds a new news source
func (h *Handler) CreateNewsSource(c *gin.Context) {
	userID, _ := c.Get("user_id")
	
	var req struct {
		Name                  string                 `json:"name" binding:"required"`
		SourceType            string                 `json:"source_type" binding:"required,oneof=api rss web"`
		URL                   string                 `json:"url" binding:"required,url"`
		APIKey                string                 `json:"api_key"`
		Config                map[string]interface{} `json:"config"`
		ScrapeIntervalMinutes int                    `json:"scrape_interval_minutes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.ScrapeIntervalMinutes <= 0 {
		req.ScrapeIntervalMinutes = 60
	}
	if req.Config == nil {
		req.Config = make(map[string]interface{})
	}

	// TODO: Encrypt API key if provided
	// For now, storing as-is (should use crypto/aes)
	
	sourceID := uuid.New().String()
	userIDStr := userID.(string)
	
	source := &storage.NewsSource{
		ID:                    sourceID,
		UserID:                &userIDStr,
		Name:                  req.Name,
		SourceType:            req.SourceType,
		URL:                   req.URL,
		Config:                req.Config,
		IsActive:              true,
		ScrapeIntervalMinutes: req.ScrapeIntervalMinutes,
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}

	// TODO: Save to database
	// For now, just enqueue an immediate scrape job
	if h.queue != nil {
		h.queue.EnqueueNewsSourceScrape(sourceID, req.URL, req.SourceType, req.Config)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "News source created successfully",
		"source":  source,
	})
}

// ListNewsSources returns all news sources for the user
func (h *Handler) ListNewsSources(c *gin.Context) {
	// userID, _ := c.Get("user_id")
	
	// TODO: Fetch from database using userID
	// For now, return empty array
	sources := []storage.NewsSource{}

	c.JSON(http.StatusOK, gin.H{
		"sources": sources,
		"total":   len(sources),
	})
}

// GetNewsSource returns a specific news source
func (h *Handler) GetNewsSource(c *gin.Context) {
	sourceID := c.Param("id")
	// userID, _ := c.Get("user_id")

	// TODO: Fetch from database and verify ownership using userID
	_ = sourceID

	c.JSON(http.StatusOK, gin.H{
		"message": "Feature not implemented yet",
	})
}

// UpdateNewsSource updates a news source configuration
func (h *Handler) UpdateNewsSource(c *gin.Context) {
	sourceID := c.Param("id")
	// userID, _ := c.Get("user_id")

	var req struct {
		Name                  *string                 `json:"name"`
		IsActive              *bool                   `json:"is_active"`
		ScrapeIntervalMinutes *int                    `json:"scrape_interval_minutes"`
		Config                *map[string]interface{} `json:"config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Update in database and verify ownership using userID
	_ = sourceID

	c.JSON(http.StatusOK, gin.H{
		"message": "News source updated successfully",
	})
}

// DeleteNewsSource removes a news source
func (h *Handler) DeleteNewsSource(c *gin.Context) {
	sourceID := c.Param("id")
	// userID, _ := c.Get("user_id")

	// TODO: Delete from database and verify ownership using userID
	_ = sourceID

	c.JSON(http.StatusOK, gin.H{
		"message": "News source deleted successfully",
	})
}

// TriggerNewsSourceScrape manually triggers a scrape for a specific source
func (h *Handler) TriggerNewsSourceScrape(c *gin.Context) {
	sourceID := c.Param("id")
	// userID, _ := c.Get("user_id")

	// TODO: Verify ownership using userID and fetch source details

	// Enqueue scrape job
	if h.queue != nil {
		// TODO: Get actual source details from database
		h.queue.EnqueueNewsSourceScrape(sourceID, "", "", nil)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Scrape job enqueued",
		"source_id": sourceID,
	})
}

// ListArticles returns scraped articles
func (h *Handler) ListArticles(c *gin.Context) {
	// Query parameters
	sourceID := c.Query("source_id")
	category := c.Query("category")
	limit := c.DefaultQuery("limit", "50")
	offset := c.DefaultQuery("offset", "0")

	// TODO: Fetch from database with filters
	_ = sourceID
	_ = category
	_ = limit
	_ = offset

	articles := []storage.ArticleExtended{}

	c.JSON(http.StatusOK, gin.H{
		"articles": articles,
		"total":    len(articles),
	})
}

// GetArticle returns a specific article
func (h *Handler) GetArticle(c *gin.Context) {
	articleID := c.Param("id")

	// TODO: Fetch from database
	_ = articleID

	c.JSON(http.StatusOK, gin.H{
		"message": "Feature not implemented yet",
	})
}

// SearchArticles searches articles by keywords
func (h *Handler) SearchArticles(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	// TODO: Implement full-text search
	articles := []storage.ArticleExtended{}

	c.JSON(http.StatusOK, gin.H{
		"articles": articles,
		"total":    len(articles),
		"query":    query,
	})
}

// hashURL creates a SHA-256 hash of a URL for deduplication
func hashURL(url string) string {
	h := sha256.New()
	h.Write([]byte(url))
	return hex.EncodeToString(h.Sum(nil))
}
