package ingestion

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

// Persister handles idempotent storage of ingested data
type Persister struct {
	db storage.DB
}

// NewPersister creates a new persister instance
func NewPersister(db storage.DB) *Persister {
	return &Persister{db: db}
}

// PersistMarkets stores market data with idempotency (always creates new snapshot)
func (p *Persister) PersistMarkets(ctx context.Context, markets []*storage.Market) (int, error) {
	if len(markets) == 0 {
		return 0, nil
	}

	repo := p.db.MarketRepo()
	inserted := 0

	for _, market := range markets {
		if err := repo.CreateMarket(ctx, market); err != nil {
			log.Printf("WARN: failed to persist market %s (%s): %v", market.ExternalID, market.Source, err)
			continue
		}
		inserted++
	}

	return inserted, nil
}

// PersistNews stores news articles with deduplication by URL hash
func (p *Persister) PersistNews(ctx context.Context, articles []*storage.NewsArticle) (int, error) {
	if len(articles) == 0 {
		return 0, nil
	}

	repo := p.db.NewsRepo()
	inserted := 0
	skipped := 0

	for _, article := range articles {
		// Use metadata-only insert which handles deduplication
		err := repo.CreateNewsMetadataOnly(ctx, article)
		if err != nil {
			// Check if it's a duplicate (silently ignored in repo layer)
			if article.ID == 0 {
				skipped++
				continue
			}
			log.Printf("WARN: failed to persist news article %s: %v", article.URL, err)
			continue
		}

		if article.ID > 0 {
			inserted++
		} else {
			skipped++
		}
	}

	log.Printf("News persistence: inserted=%d, skipped=%d (duplicates)", inserted, skipped)
	return inserted, nil
}

// CleanupOldNews removes news articles older than retention period
func (p *Persister) CleanupOldNews(ctx context.Context, retentionDays int) (int64, error) {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)

	repo := p.db.NewsRepo()
	deleted, err := repo.DeleteOldNews(ctx, cutoff)
	if err != nil {
		return 0, fmt.Errorf("cleanup old news: %w", err)
	}

	if deleted > 0 {
		log.Printf("Cleaned up %d old news articles (older than %s)", deleted, cutoff.Format("2006-01-02"))
	}

	return deleted, nil
}

// Stats returns persistence statistics
type PersistStats struct {
	MarketsInserted int
	NewsInserted    int
	NewsSkipped     int
	Errors          []error
}

func (s *PersistStats) String() string {
	return fmt.Sprintf("Markets: %d, News: %d inserted, %d duplicates, %d errors",
		s.MarketsInserted, s.NewsInserted, s.NewsSkipped, len(s.Errors))
}

