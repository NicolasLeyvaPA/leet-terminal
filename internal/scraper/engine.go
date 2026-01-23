package scraper

import (
	"context"
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
	db     *storage.DB
	cache  *cache.RedisClient
	config *config.Config
	logger *zap.Logger
}

// NewEngine creates a new scraper engine
func NewEngine(db *storage.DB, cache *cache.RedisClient, cfg *config.Config, logger *zap.Logger) *Engine {
	return &Engine{
		db:     db,
		cache:  cache,
		config: cfg,
		logger: logger,
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
