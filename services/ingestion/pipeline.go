package ingestion

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

// Pipeline orchestrates the fetch -> normalize -> persist flow
type Pipeline struct {
	cfg       *config.Config
	persister *Persister
	retrier   *Retrier
}

// NewPipeline creates a new ingestion pipeline
func NewPipeline(cfg *config.Config, db storage.DB) *Pipeline {
	return &Pipeline{
		cfg:       cfg,
		persister: NewPersister(db),
		retrier:   NewRetrier(cfg.MaxRetries, cfg.RetryBackoffSeconds),
	}
}

// RunMarketIngestion fetches and stores market data from all sources
func (p *Pipeline) RunMarketIngestion(ctx context.Context) error {
	log.Println("Starting market ingestion pipeline...")

	totalMarkets := 0

	// Kalshi ingestion
	if p.cfg.KalshiAPIKey != "" {
		count, err := p.ingestKalshi(ctx)
		if err != nil {
			log.Printf("ERROR: Kalshi ingestion failed: %v", err)
		} else {
			totalMarkets += count
			log.Printf("Kalshi: ingested %d markets", count)
		}
	} else {
		log.Println("Kalshi ingestion skipped (no API key)")
	}

	// Polymarket ingestion (no API key required for public endpoints)
	count, err := p.ingestPolymarket(ctx)
	if err != nil {
		log.Printf("ERROR: Polymarket ingestion failed: %v", err)
	} else {
		totalMarkets += count
		log.Printf("Polymarket: ingested %d markets", count)
	}

	log.Printf("Market ingestion complete: %d total markets", totalMarkets)
	return nil
}

// RunNewsIngestion fetches and stores news from all sources
func (p *Pipeline) RunNewsIngestion(ctx context.Context) error {
	log.Println("Starting news ingestion pipeline...")

	totalArticles := 0

	// RSS feeds ingestion
	for source, feedURL := range DefaultNewsFeeds {
		count, err := p.ingestRSSFeed(ctx, feedURL, source)
		if err != nil {
			log.Printf("ERROR: RSS feed %s failed: %v", source, err)
			continue
		}
		totalArticles += count
		log.Printf("RSS %s: ingested %d articles", source, count)
	}

	// NewsAPI ingestion (if API key provided)
	if p.cfg.NewsAPIKey != "" {
		count, err := p.ingestNewsAPI(ctx)
		if err != nil {
			log.Printf("ERROR: NewsAPI ingestion failed: %v", err)
		} else {
			totalArticles += count
			log.Printf("NewsAPI: ingested %d articles", count)
		}
	}

	log.Printf("News ingestion complete: %d total articles", totalArticles)

	// Run cleanup
	deleted, err := p.persister.CleanupOldNews(ctx, p.cfg.NewsRetentionDays)
	if err != nil {
		log.Printf("WARN: News cleanup failed: %v", err)
	} else if deleted > 0 {
		log.Printf("News cleanup: removed %d old articles", deleted)
	}

	return nil
}

// RunFullIngestion runs both market and news ingestion
func (p *Pipeline) RunFullIngestion(ctx context.Context) error {
	if err := p.RunMarketIngestion(ctx); err != nil {
		log.Printf("Market ingestion had errors: %v", err)
	}

	if err := p.RunNewsIngestion(ctx); err != nil {
		log.Printf("News ingestion had errors: %v", err)
	}

	return nil
}

// Private ingestion methods with retry logic

func (p *Pipeline) ingestKalshi(ctx context.Context) (int, error) {
	fetcher := NewKalshiFetcher(p.cfg)

	// Fetch with retry
	data, err := p.retrier.DoWithRetry(ctx, func() ([]byte, error) {
		return fetcher.Fetch(ctx)
	})
	if err != nil {
		return 0, fmt.Errorf("fetch kalshi: %w", err)
	}

	// Normalize
	markets, err := NormalizeKalshiMarkets(data)
	if err != nil {
		return 0, fmt.Errorf("normalize kalshi: %w", err)
	}

	// Persist
	count, err := p.persister.PersistMarkets(ctx, markets)
	if err != nil {
		return count, fmt.Errorf("persist kalshi: %w", err)
	}

	return count, nil
}

func (p *Pipeline) ingestPolymarket(ctx context.Context) (int, error) {
	fetcher := NewPolymarketFetcher(p.cfg)

	// Fetch with retry
	data, err := p.retrier.DoWithRetry(ctx, func() ([]byte, error) {
		return fetcher.Fetch(ctx)
	})
	if err != nil {
		return 0, fmt.Errorf("fetch polymarket: %w", err)
	}

	// Normalize
	markets, err := NormalizePolymarketMarkets(data)
	if err != nil {
		return 0, fmt.Errorf("normalize polymarket: %w", err)
	}

	// Persist
	count, err := p.persister.PersistMarkets(ctx, markets)
	if err != nil {
		return count, fmt.Errorf("persist polymarket: %w", err)
	}

	return count, nil
}

func (p *Pipeline) ingestRSSFeed(ctx context.Context, feedURL, source string) (int, error) {
	fetcher := NewRSSFetcher(feedURL, source, p.cfg)

	// Fetch with retry
	data, err := p.retrier.DoWithRetry(ctx, func() ([]byte, error) {
		return fetcher.Fetch(ctx)
	})
	if err != nil {
		return 0, fmt.Errorf("fetch RSS: %w", err)
	}

	// Normalize
	articles, err := NormalizeRSSNews(data, source)
	if err != nil {
		return 0, fmt.Errorf("normalize RSS: %w", err)
	}

	// Persist
	count, err := p.persister.PersistNews(ctx, articles)
	if err != nil {
		return count, fmt.Errorf("persist RSS: %w", err)
	}

	return count, nil
}

func (p *Pipeline) ingestNewsAPI(ctx context.Context) (int, error) {
	// Ingest business and technology news
	fetcher := NewNewsAPIFetcher(p.cfg.NewsAPIKey, "prediction markets OR crypto OR politics", "", p.cfg)

	// Fetch with retry
	data, err := p.retrier.DoWithRetry(ctx, func() ([]byte, error) {
		return fetcher.Fetch(ctx)
	})
	if err != nil {
		return 0, fmt.Errorf("fetch NewsAPI: %w", err)
	}

	// Normalize
	articles, err := NormalizeNewsAPIArticles(data)
	if err != nil {
		return 0, fmt.Errorf("normalize NewsAPI: %w", err)
	}

	// Persist
	count, err := p.persister.PersistNews(ctx, articles)
	if err != nil {
		return count, fmt.Errorf("persist NewsAPI: %w", err)
	}

	return count, nil
}

// Retrier implements exponential backoff retry logic
type Retrier struct {
	maxRetries      int
	backoffSeconds  int
}

func NewRetrier(maxRetries, backoffSeconds int) *Retrier {
	return &Retrier{
		maxRetries:     maxRetries,
		backoffSeconds: backoffSeconds,
	}
}

// DoWithRetry executes the function with exponential backoff
func (r *Retrier) DoWithRetry(ctx context.Context, fn func() ([]byte, error)) ([]byte, error) {
	var lastErr error

	for attempt := 0; attempt <= r.maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			backoff := time.Duration(r.backoffSeconds*(1<<uint(attempt-1))) * time.Second
			log.Printf("Retry attempt %d/%d after %v...", attempt, r.maxRetries, backoff)

			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		data, err := fn()
		if err == nil {
			return data, nil
		}

		lastErr = err
		log.Printf("Attempt %d failed: %v", attempt+1, err)
	}

	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

