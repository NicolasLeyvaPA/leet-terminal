package ingestion

import (
	"context"
)

// Fetcher defines the interface for fetching data from external sources.
// All implementations must be safe for concurrent use.
type Fetcher interface {
	// Fetch retrieves raw data from the external source.
	// Returns raw JSON bytes and an error if the fetch fails.
	Fetch(ctx context.Context) ([]byte, error)

	// Name returns the identifier for this fetcher (e.g., "kalshi", "polymarket", "rss:techcrunch")
	Name() string
}

// MarketFetcher extends Fetcher for market-specific data sources
type MarketFetcher interface {
	Fetcher
	// Source returns the market source identifier ("kalshi" or "polymarket")
	Source() string
}

// NewsFetcher extends Fetcher for news-specific data sources
type NewsFetcher interface {
	Fetcher
	// FeedType returns the feed type ("rss", "api", or "scrape")
	FeedType() string
}

