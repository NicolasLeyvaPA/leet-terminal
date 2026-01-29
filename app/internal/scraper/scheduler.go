package scraper

import (
	"context"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/queue"
	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"go.uber.org/zap"
)

// Scheduler handles periodic news source scraping
type Scheduler struct {
	db     *storage.DB
	queue  *queue.AsynqClient
	logger *zap.Logger
	ticker *time.Ticker
	done   chan bool
}

// NewScheduler creates a new news scraping scheduler
func NewScheduler(db *storage.DB, queue *queue.AsynqClient, logger *zap.Logger, checkInterval time.Duration) *Scheduler {
	return &Scheduler{
		db:     db,
		queue:  queue,
		logger: logger,
		ticker: time.NewTicker(checkInterval),
		done:   make(chan bool),
	}
}

// Start begins the periodic scheduling
func (s *Scheduler) Start(ctx context.Context) {
	s.logger.Info("Starting news source scheduler")

	// Run immediately on start
	s.checkAndEnqueueSources()

	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.checkAndEnqueueSources()
			case <-s.done:
				s.logger.Info("News source scheduler stopped")
				return
			case <-ctx.Done():
				s.logger.Info("News source scheduler context cancelled")
				return
			}
		}
	}()
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	s.ticker.Stop()
	s.done <- true
}

// checkAndEnqueueSources checks for sources that need scraping and enqueues them
func (s *Scheduler) checkAndEnqueueSources() {
	s.logger.Debug("Checking news sources for scraping")

	// Get all active news sources
	sources, err := s.db.ListActiveNewsSources()
	if err != nil {
		s.logger.Error("Failed to fetch active news sources", zap.Error(err))
		return
	}

	now := time.Now()
	enqueuedCount := 0

	for _, source := range sources {
		shouldScrape := false

		if source.LastScrapedAt == nil {
			// Never scraped before, scrape now
			shouldScrape = true
		} else {
			// Check if enough time has passed since last scrape
			nextScrapeTime := source.LastScrapedAt.Add(time.Duration(source.ScrapeIntervalMinutes) * time.Minute)
			if now.After(nextScrapeTime) {
				shouldScrape = true
			}
		}

		if shouldScrape {
			s.logger.Info("Enqueueing news source for scraping",
				zap.String("source_id", source.ID),
				zap.String("name", source.Name),
				zap.String("type", source.SourceType),
			)

			if err := s.queue.EnqueueNewsSourceScrape(source.ID, source.URL, source.SourceType, source.Config); err != nil {
				s.logger.Error("Failed to enqueue news source",
					zap.String("source_id", source.ID),
					zap.Error(err),
				)
				continue
			}

			enqueuedCount++
		}
	}

	if enqueuedCount > 0 {
		s.logger.Info("Enqueued news sources for scraping",
			zap.Int("count", enqueuedCount),
			zap.Int("total_active", len(sources)),
		)
	}
}
