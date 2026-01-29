package scraper

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"go.uber.org/zap"
)

// NewsAPIClient handles NewsAPI.org API calls
type NewsAPIClient struct {
	apiKey     string
	baseURL    string
	logger     *zap.Logger
	client     *http.Client
}

// NewsAPIResponse represents the response from NewsAPI
type NewsAPIResponse struct {
	Status       string            `json:"status"`
	TotalResults int               `json:"totalResults"`
	Articles     []NewsAPIArticle  `json:"articles"`
}

// NewsAPIArticle represents an article from NewsAPI
type NewsAPIArticle struct {
	Source      NewsAPISource `json:"source"`
	Author      string        `json:"author"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	URL         string        `json:"url"`
	URLToImage  string        `json:"urlToImage"`
	PublishedAt string        `json:"publishedAt"`
	Content     string        `json:"content"`
}

// NewsAPISource represents the source of a NewsAPI article
type NewsAPISource struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// NewsAPIParams holds parameters for NewsAPI requests
type NewsAPIParams struct {
	Query      string
	Category   string
	Country    string
	PageSize   int
	Page       int
	SortBy     string // relevancy, popularity, publishedAt
}

// NewNewsAPIClient creates a new NewsAPI client
func NewNewsAPIClient(apiKey string, logger *zap.Logger) *NewsAPIClient {
	return &NewsAPIClient{
		apiKey:  apiKey,
		baseURL: "https://newsapi.org/v2", // Could be made configurable
		logger:  logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetTopHeadlines fetches top headlines from NewsAPI
func (c *NewsAPIClient) GetTopHeadlines(params NewsAPIParams) ([]storage.ArticleExtended, error) {
	c.logger.Info("Fetching top headlines from NewsAPI",
		zap.String("query", params.Query),
		zap.String("category", params.Category),
		zap.String("country", params.Country),
	)

	// Build URL
	endpoint := fmt.Sprintf("%s/top-headlines", c.baseURL)
	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	// Add query parameters
	q := u.Query()
	q.Set("apiKey", c.apiKey)
	
	if params.Query != "" {
		q.Set("q", params.Query)
	}
	if params.Category != "" {
		q.Set("category", params.Category)
	}
	if params.Country != "" {
		q.Set("country", params.Country)
	}
	if params.PageSize > 0 {
		q.Set("pageSize", fmt.Sprintf("%d", params.PageSize))
	} else {
		q.Set("pageSize", "100") // Default max
	}
	if params.Page > 0 {
		q.Set("page", fmt.Sprintf("%d", params.Page))
	}

	u.RawQuery = q.Encode()

	// Make request
	resp, err := c.client.Get(u.String())
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from NewsAPI: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("NewsAPI returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResp NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode NewsAPI response: %w", err)
	}

	if apiResp.Status != "ok" {
		return nil, fmt.Errorf("NewsAPI returned status: %s", apiResp.Status)
	}

	// Convert to ArticleExtended
	articles := make([]storage.ArticleExtended, 0, len(apiResp.Articles))
	for _, apiArticle := range apiResp.Articles {
		article := c.convertNewsAPIArticle(apiArticle, params.Category)
		articles = append(articles, article)
	}

	c.logger.Info("Fetched articles from NewsAPI",
		zap.Int("total", apiResp.TotalResults),
		zap.Int("fetched", len(articles)),
	)

	return articles, nil
}

// GetEverything fetches all articles matching search query
func (c *NewsAPIClient) GetEverything(params NewsAPIParams) ([]storage.ArticleExtended, error) {
	c.logger.Info("Searching NewsAPI",
		zap.String("query", params.Query),
		zap.String("sortBy", params.SortBy),
	)

	// Build URL
	endpoint := fmt.Sprintf("%s/everything", c.baseURL)
	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	// Add query parameters
	q := u.Query()
	q.Set("apiKey", c.apiKey)
	
	if params.Query != "" {
		q.Set("q", params.Query)
	}
	if params.SortBy != "" {
		q.Set("sortBy", params.SortBy)
	} else {
		q.Set("sortBy", "publishedAt")
	}
	if params.PageSize > 0 {
		q.Set("pageSize", fmt.Sprintf("%d", params.PageSize))
	} else {
		q.Set("pageSize", "100")
	}
	if params.Page > 0 {
		q.Set("page", fmt.Sprintf("%d", params.Page))
	}

	u.RawQuery = q.Encode()

	// Make request
	resp, err := c.client.Get(u.String())
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from NewsAPI: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("NewsAPI returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResp NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode NewsAPI response: %w", err)
	}

	if apiResp.Status != "ok" {
		return nil, fmt.Errorf("NewsAPI returned status: %s", apiResp.Status)
	}

	// Convert to ArticleExtended
	articles := make([]storage.ArticleExtended, 0, len(apiResp.Articles))
	for _, apiArticle := range apiResp.Articles {
		article := c.convertNewsAPIArticle(apiArticle, params.Category)
		articles = append(articles, article)
	}

	c.logger.Info("Searched NewsAPI",
		zap.Int("total", apiResp.TotalResults),
		zap.Int("fetched", len(articles)),
	)

	return articles, nil
}

// convertNewsAPIArticle converts a NewsAPI article to ArticleExtended
func (c *NewsAPIClient) convertNewsAPIArticle(apiArticle NewsAPIArticle, category string) storage.ArticleExtended {
	// Parse publication date
	pubDate, _ := time.Parse(time.RFC3339, apiArticle.PublishedAt)

	// Combine description and content
	content := apiArticle.Description
	if apiArticle.Content != "" {
		// NewsAPI truncates content, but we'll store what we have
		content = fmt.Sprintf("%s\n\n%s", apiArticle.Description, apiArticle.Content)
	}

	// Calculate word count
	wordCount := len(strings.Fields(content))

	// Extract tags from source name and category
	tags := []string{}
	if apiArticle.Source.Name != "" {
		tags = append(tags, apiArticle.Source.Name)
	}
	if category != "" {
		tags = append(tags, category)
	}

	// Generate summary
	summary := c.generateSummary(apiArticle.Description, 200)

	// Convert fields to pointers
	var authorPtr *string
	if apiArticle.Author != "" {
		authorPtr = &apiArticle.Author
	}

	var categoryPtr *string
	if category != "" {
		categoryPtr = &category
	}

	return storage.ArticleExtended{
		Title:       apiArticle.Title,
		Content:     content,
		URL:         apiArticle.URL,
		URLHash:     c.hashURL(apiArticle.URL),
		Summary:     &summary,
		Author:      authorPtr,
		PublishedAt: &pubDate,
		Category:    categoryPtr,
		Tags:        tags,
		Language:    "en",
		WordCount:   wordCount,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

// generateSummary creates a summary from content
func (c *NewsAPIClient) generateSummary(content string, maxLength int) string {
	if len(content) <= maxLength {
		return content
	}

	// Find last space before maxLength
	summary := content[:maxLength]
	lastSpace := strings.LastIndex(summary, " ")
	if lastSpace > 0 {
		summary = summary[:lastSpace]
	}

	return summary + "..."
}

// hashURL creates a SHA-256 hash of a URL for deduplication
func (c *NewsAPIClient) hashURL(url string) string {
	h := sha256.New()
	h.Write([]byte(url))
	return hex.EncodeToString(h.Sum(nil))
}
