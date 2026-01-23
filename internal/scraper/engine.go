package scraper

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/cache"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/config"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"github.com/PuerkitoBio/goquery"
	"github.com/gocolly/colly/v2"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// Engine handles web scraping operations
type Engine struct {
	db          *storage.DB
	cache       *cache.RedisClient
	config      *config.Config
	logger      *zap.Logger
	rssParser   *RSSParser
	newsAPI     *NewsAPIClient
}

// NewEngine creates a new scraper engine
func NewEngine(db *storage.DB, cache *cache.RedisClient, cfg *config.Config, logger *zap.Logger) *Engine {
	return &Engine{
		db:        db,
		cache:     cache,
		config:    cfg,
		logger:    logger,
		rssParser: NewRSSParser(logger),
		newsAPI:   NewNewsAPIClient(cfg.NewsAPIKey, logger),
	}
}

// HandleScrapeJob processes a scrape job from the queue
func (e *Engine) HandleScrapeJob(ctx context.Context, task *asynq.Task) error {
	var payload map[string]string
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		e.logger.Error("Failed to unmarshal scrape job payload", zap.Error(err))
		return err
	}

	jobID := payload["job_id"]
	url := payload["url"]

	e.logger.Info("Processing scrape job",
		zap.String("job_id", jobID),
		zap.String("url", url),
	)

	// Perform scraping
	result, err := e.Scrape(url)
	if err != nil {
		e.logger.Error("Scraping failed",
			zap.String("job_id", jobID),
			zap.String("url", url),
			zap.Error(err),
		)
		return err
	}

	e.logger.Info("Scraping completed",
		zap.String("job_id", jobID),
		zap.Int("content_length", len(result)),
	)

	return nil
}

// Scrape performs web scraping on the given URL
func (e *Engine) Scrape(url string) (string, error) {
	c := colly.NewCollector(
		colly.UserAgent(e.config.ScraperUserAgent),
		colly.MaxDepth(2),
		colly.Async(false),
	)

	c.SetRequestTimeout(e.config.ScraperRequestTimeout)

	_ = c.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: e.config.ScraperMaxConcurrent,
		Delay:       1 * time.Second,
	})

	var scrapedData struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Content     string   `json:"content"`
		Links       []string `json:"links"`
		Images      []string `json:"images"`
	}

	c.OnHTML("html", func(h *colly.HTMLElement) {
		scrapedData.Title = h.DOM.Find("title").Text()

		h.DOM.Find("meta[name='description']").Each(func(i int, s *goquery.Selection) {
			if desc, exists := s.Attr("content"); exists {
				scrapedData.Description = desc
			}
		})

		scrapedData.Content = h.DOM.Find("body").Text()

		h.DOM.Find("a[href]").Each(func(i int, s *goquery.Selection) {
			if link, exists := s.Attr("href"); exists {
				scrapedData.Links = append(scrapedData.Links, link)
			}
		})

		h.DOM.Find("img[src]").Each(func(i int, s *goquery.Selection) {
			if img, exists := s.Attr("src"); exists {
				scrapedData.Images = append(scrapedData.Images, img)
			}
		})
	})

	c.OnError(func(r *colly.Response, err error) {
		e.logger.Error("Scraping error", zap.String("url", url), zap.Error(err))
	})

	if err := c.Visit(url); err != nil {
		return "", fmt.Errorf("failed to visit URL: %w", err)
	}

	resultJSON, err := json.Marshal(scrapedData)
	if err != nil {
		return "", fmt.Errorf("failed to marshal result: %w", err)
	}

	return string(resultJSON), nil
}

// HandleNewsSourceScrape processes a news source scraping job
func (e *Engine) HandleNewsSourceScrape(ctx context.Context, task *asynq.Task) error {
	var payload struct {
		SourceID   string                 `json:"source_id"`
		URL        string                 `json:"url"`
		SourceType string                 `json:"source_type"`
		Config     map[string]interface{} `json:"config"`
	}

	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		e.logger.Error("Failed to unmarshal news scrape payload", zap.Error(err))
		return err
	}

	e.logger.Info("Processing news source scrape",
		zap.String("source_id", payload.SourceID),
		zap.String("type", payload.SourceType),
		zap.String("url", payload.URL),
	)

	var articles []storage.ArticleExtended
	var err error

	switch payload.SourceType {
	case "rss":
		articles, err = e.scrapeRSS(payload.URL)
	case "api":
		articles, err = e.scrapeNewsAPI(payload.Config)
	case "web":
		articles, err = e.scrapeWebPage(payload.URL)
	default:
		return fmt.Errorf("unsupported source type: %s", payload.SourceType)
	}

	if err != nil {
		e.logger.Error("News scraping failed",
			zap.String("source_id", payload.SourceID),
			zap.String("type", payload.SourceType),
			zap.Error(err),
		)
		return err
	}

	e.logger.Info("News scraping completed",
		zap.String("source_id", payload.SourceID),
		zap.Int("articles", len(articles)),
	)

	// TODO: Store articles in database with source_id
	// For now, just log success
	for i, article := range articles {
		e.logger.Debug("Scraped article",
			zap.Int("index", i),
			zap.String("title", article.Title),
			zap.String("url", article.URL),
		)
	}

	return nil
}

// scrapeRSS scrapes articles from an RSS feed
func (e *Engine) scrapeRSS(feedURL string) ([]storage.ArticleExtended, error) {
	return e.rssParser.ParseFeed(feedURL)
}

// scrapeNewsAPI fetches articles from NewsAPI
func (e *Engine) scrapeNewsAPI(config map[string]interface{}) ([]storage.ArticleExtended, error) {
	params := NewsAPIParams{
		PageSize: 100,
	}

	// Extract config parameters
	if query, ok := config["query"].(string); ok {
		params.Query = query
	}
	if category, ok := config["category"].(string); ok {
		params.Category = category
	}
	if country, ok := config["country"].(string); ok {
		params.Country = country
	}
	if sortBy, ok := config["sort_by"].(string); ok {
		params.SortBy = sortBy
	}

	// Determine which endpoint to use
	if params.Category != "" || params.Country != "" {
		return e.newsAPI.GetTopHeadlines(params)
	}

	return e.newsAPI.GetEverything(params)
}

// scrapeWebPage scrapes a single web page for news article
func (e *Engine) scrapeWebPage(url string) ([]storage.ArticleExtended, error) {
	c := colly.NewCollector(
		colly.UserAgent(e.config.ScraperUserAgent),
		colly.MaxDepth(1),
	)

	c.SetRequestTimeout(e.config.ScraperRequestTimeout)

	var article storage.ArticleExtended

	c.OnHTML("html", func(h *colly.HTMLElement) {
		// Extract title
		article.Title = h.DOM.Find("title").Text()
		if article.Title == "" {
			article.Title = h.DOM.Find("h1").First().Text()
		}

		// Extract meta description
		h.DOM.Find("meta[name='description']").Each(func(i int, s *goquery.Selection) {
			if desc, exists := s.Attr("content"); exists {
				article.Summary = &desc
			}
		})

		// Extract author
		h.DOM.Find("meta[name='author']").Each(func(i int, s *goquery.Selection) {
			if author, exists := s.Attr("content"); exists {
				article.Author = &author
			}
		})

		// Extract main content (try common article selectors)
		selectors := []string{
			"article",
			"[role='main']",
			".article-content",
			".post-content",
			"main",
		}

		for _, selector := range selectors {
			content := h.DOM.Find(selector).First().Text()
			if len(content) > len(article.Content) {
				article.Content = content
			}
		}

		// Fallback to body if no article content found
		if article.Content == "" {
			article.Content = h.DOM.Find("body").Text()
		}

		article.URL = url
		article.URLHash = hashURLString(url)
		article.Language = "en"
		article.WordCount = len(article.Content) / 5 // Rough estimate
		article.CreatedAt = time.Now()
		article.UpdatedAt = time.Now()
	})

	if err := c.Visit(url); err != nil {
		return nil, fmt.Errorf("failed to scrape web page: %w", err)
	}

	return []storage.ArticleExtended{article}, nil
}

// extractDomain extracts domain from URL
func extractDomain(url string) string {
	// Simple domain extraction
	start := 0
	if idx := len("https://"); len(url) > idx {
		start = idx
	}
	
	end := len(url)
	if idx := start; idx < len(url) {
		for i := start; i < len(url); i++ {
			if url[i] == '/' {
				end = i
				break
			}
		}
	}
	
	domain := url[start:end]
	if len(domain) > 4 && domain[:4] == "www." {
		domain = domain[4:]
	}
	
	return domain
}

// hashURLString creates a SHA-256 hash of a URL for deduplication
func hashURLString(url string) string {
	h := sha256.New()
	h.Write([]byte(url))
	return hex.EncodeToString(h.Sum(nil))
}
