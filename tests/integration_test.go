package ingestion_test

import (
	"context"
	"database/sql"
	"log"
	"os"
	"testing"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
	"github.com/NicolasLeyvaPA/leet-terminal/services/db"
	"github.com/NicolasLeyvaPA/leet-terminal/services/ingestion"
	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

// Integration test requires a running TimescaleDB instance
// Skip if INTEGRATION_TEST env var is not set

func TestIntegrationPipeline(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test (set INTEGRATION_TEST=1 to run)")
	}

	ctx := context.Background()

	// Setup test database
	dsn := os.Getenv("TEST_TIMESCALE_DSN")
	if dsn == "" {
		dsn = "postgres://leet_user:leet_password@localhost:5432/leet_terminal_test?sslmode=disable"
	}

	testDB, err := db.ConnectToPostgres(dsn)
	if err != nil {
		t.Fatalf("failed to connect to test DB: %v", err)
	}
	defer testDB.Close()

	// Run migrations
	if err := db.RunSQLFile(ctx, testDB, "../../services/db/migrations/timescaledb_migration_001.sql"); err != nil {
		log.Printf("WARN: migration 001 failed: %v", err)
	}
	if err := db.RunSQLFile(ctx, testDB, "../../services/db/migrations/timescaledb_migration_002.sql"); err != nil {
		log.Printf("WARN: migration 002 failed: %v", err)
	}

	// Create adapter (use same DB for both)
	adapter := db.NewAdapter(testDB, testDB)

	// Test market persistence
	t.Run("PersistMarkets", func(t *testing.T) {
		persister := ingestion.NewPersister(adapter)

		// Load fixture and normalize
		data, err := os.ReadFile("../tests/fixtures/kalshi_response.json")
		if err != nil {
			t.Fatalf("failed to load fixture: %v", err)
		}

		markets, err := ingestion.NormalizeKalshiMarkets(data)
		if err != nil {
			t.Fatalf("normalization failed: %v", err)
		}

		// Persist
		count, err := persister.PersistMarkets(ctx, markets)
		if err != nil {
			t.Fatalf("persistence failed: %v", err)
		}

		if count != 2 {
			t.Errorf("expected 2 markets persisted, got %d", count)
		}

		// Verify retrieval
		marketRepo := adapter.MarketRepo()
		retrieved, err := marketRepo.GetLatestMarketByExternalID(ctx, "PRES-2024-DEM", "kalshi")
		if err != nil {
			t.Fatalf("failed to retrieve market: %v", err)
		}

		if retrieved.ExternalID != "PRES-2024-DEM" {
			t.Errorf("expected external_id 'PRES-2024-DEM', got '%s'", retrieved.ExternalID)
		}
	})

	// Test news persistence with deduplication
	t.Run("PersistNewsWithDeduplication", func(t *testing.T) {
		persister := ingestion.NewPersister(adapter)

		// Load fixture and normalize
		data, err := os.ReadFile("../tests/fixtures/rss_feed.xml")
		if err != nil {
			t.Fatalf("failed to load fixture: %v", err)
		}

		articles, err := ingestion.NormalizeRSSNews(data, "techcrunch")
		if err != nil {
			t.Fatalf("normalization failed: %v", err)
		}

		// Persist first time
		count1, err := persister.PersistNews(ctx, articles)
		if err != nil {
			t.Fatalf("first persistence failed: %v", err)
		}

		if count1 != 3 {
			t.Errorf("expected 3 articles on first insert, got %d", count1)
		}

		// Persist again (should deduplicate)
		count2, err := persister.PersistNews(ctx, articles)
		if err != nil {
			t.Fatalf("second persistence failed: %v", err)
		}

		if count2 != 0 {
			t.Errorf("expected 0 articles on duplicate insert (deduplication), got %d", count2)
		}
	})

	// Test news cleanup
	t.Run("CleanupOldNews", func(t *testing.T) {
		persister := ingestion.NewPersister(adapter)

		// Cleanup news older than 0 days (should delete test data)
		deleted, err := persister.CleanupOldNews(ctx, 0)
		if err != nil {
			t.Fatalf("cleanup failed: %v", err)
		}

		t.Logf("Cleaned up %d old articles", deleted)
	})
}

// TestMockPipeline tests the pipeline with mocked fetchers (no external API calls)
func TestMockPipeline(t *testing.T) {
	ctx := context.Background()

	// Create in-memory mock adapter
	mockAdapter := &mockDB{
		markets: make(map[string]*storage.Market),
		news:    make(map[string]*storage.NewsArticle),
	}

	persister := ingestion.NewPersister(mockAdapter)

	// Test market persistence
	data, _ := os.ReadFile("../tests/fixtures/kalshi_response.json")
	markets, _ := ingestion.NormalizeKalshiMarkets(data)
	count, err := persister.PersistMarkets(ctx, markets)
	if err != nil {
		t.Fatalf("persist markets failed: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2 markets, got %d", count)
	}

	// Verify in-memory storage
	if len(mockAdapter.markets) != 2 {
		t.Errorf("expected 2 markets in mock storage, got %d", len(mockAdapter.markets))
	}
}

// Mock DB adapter for testing
type mockDB struct {
	markets map[string]*storage.Market
	news    map[string]*storage.NewsArticle
}

func (m *mockDB) UserRepo() storage.UserRepo     { return nil }
func (m *mockDB) BetRepo() storage.BetRepo       { return nil }
func (m *mockDB) WalletRepo() storage.WalletRepo { return nil }
func (m *mockDB) Ping(ctx context.Context) error { return nil }
func (m *mockDB) Close() error                   { return nil }

func (m *mockDB) NewsRepo() storage.NewsRepo {
	return &mockNewsRepo{news: m.news}
}

func (m *mockDB) MarketRepo() storage.MarketRepo {
	return &mockMarketRepo{markets: m.markets}
}

type mockMarketRepo struct {
	markets map[string]*storage.Market
}

func (r *mockMarketRepo) CreateMarket(ctx context.Context, market *storage.Market) error {
	market.ID = len(r.markets) + 1
	r.markets[market.ExternalID] = market
	return nil
}

func (r *mockMarketRepo) GetMarketByID(ctx context.Context, id int) (*storage.Market, error) {
	return nil, sql.ErrNoRows
}

func (r *mockMarketRepo) GetLatestMarketByExternalID(ctx context.Context, externalID, source string) (*storage.Market, error) {
	if m, ok := r.markets[externalID]; ok {
		return m, nil
	}
	return nil, sql.ErrNoRows
}

func (r *mockMarketRepo) ListMarkets(ctx context.Context, source string, limit int) ([]*storage.Market, error) {
	return nil, nil
}

func (r *mockMarketRepo) UpdateMarket(ctx context.Context, market *storage.Market) error {
	return nil
}

func (r *mockMarketRepo) DeleteMarket(ctx context.Context, id int) error {
	return nil
}

type mockNewsRepo struct {
	news map[string]*storage.NewsArticle
}

func (r *mockNewsRepo) CreateNews(ctx context.Context, article *storage.NewsArticle) error {
	article.ID = len(r.news) + 1
	r.news[article.URL] = article
	return nil
}

func (r *mockNewsRepo) CreateNewsMetadataOnly(ctx context.Context, article *storage.NewsArticle) error {
	if _, exists := r.news[article.URL]; exists {
		return nil // Duplicate
	}
	article.ID = len(r.news) + 1
	r.news[article.URL] = article
	return nil
}

func (r *mockNewsRepo) GetNewsByID(ctx context.Context, id int) (*storage.NewsArticle, error) {
	return nil, sql.ErrNoRows
}

func (r *mockNewsRepo) GetNewsByURLHash(ctx context.Context, urlHash string) (*storage.NewsArticle, error) {
	return nil, sql.ErrNoRows
}

func (r *mockNewsRepo) UpdateNews(ctx context.Context, article *storage.NewsArticle) error {
	return nil
}

func (r *mockNewsRepo) DeleteNews(ctx context.Context, id int) error {
	return nil
}

func (r *mockNewsRepo) DeleteOldNews(ctx context.Context, olderThan time.Time) (int64, error) {
	return 0, nil
}

