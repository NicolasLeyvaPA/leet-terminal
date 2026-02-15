package ingestion

import (
	"os"
	"testing"
)

// TestNormalizeKalshiMarkets tests Kalshi API response normalization
func TestNormalizeKalshiMarkets(t *testing.T) {
	// Load fixture
	data, err := os.ReadFile("../../tests/fixtures/kalshi_response.json")
	if err != nil {
		t.Fatalf("failed to load fixture: %v", err)
	}

	// Normalize
	markets, err := NormalizeKalshiMarkets(data)
	if err != nil {
		t.Fatalf("normalization failed: %v", err)
	}

	// Assertions
	if len(markets) != 2 {
		t.Errorf("expected 2 markets, got %d", len(markets))
	}

	// Check first market
	m := markets[0]
	if m.Source != "kalshi" {
		t.Errorf("expected source 'kalshi', got '%s'", m.Source)
	}
	if m.ExternalID != "PRES-2024-DEM" {
		t.Errorf("expected external_id 'PRES-2024-DEM', got '%s'", m.ExternalID)
	}
	if m.Status != "open" {
		t.Errorf("expected status 'open', got '%s'", m.Status)
	}
	if !m.YesPrice.Valid {
		t.Error("expected yes_price to be valid")
	}
	if m.Category != "Politics" {
		t.Errorf("expected category 'Politics', got '%s'", m.Category)
	}

	// Check second market
	m2 := markets[1]
	if m2.ExternalID != "BTC-100K-2024" {
		t.Errorf("expected external_id 'BTC-100K-2024', got '%s'", m2.ExternalID)
	}
	if m2.Category != "Crypto" {
		t.Errorf("expected category 'Crypto', got '%s'", m2.Category)
	}
}

// TestNormalizePolymarketMarkets tests Polymarket API response normalization
func TestNormalizePolymarketMarkets(t *testing.T) {
	data, err := os.ReadFile("../../tests/fixtures/polymarket_response.json")
	if err != nil {
		t.Fatalf("failed to load fixture: %v", err)
	}

	markets, err := NormalizePolymarketMarkets(data)
	if err != nil {
		t.Fatalf("normalization failed: %v", err)
	}

	if len(markets) != 2 {
		t.Errorf("expected 2 markets, got %d", len(markets))
	}

	m := markets[0]
	if m.Source != "polymarket" {
		t.Errorf("expected source 'polymarket', got '%s'", m.Source)
	}
	if m.ExternalID != "0x1234567890abcdef" {
		t.Errorf("expected condition_id, got '%s'", m.ExternalID)
	}
	if m.Status != "open" {
		t.Errorf("expected status 'open', got '%s'", m.Status)
	}
	if !m.YesPrice.Valid || m.YesPrice.Float64 != 0.72 {
		t.Errorf("expected yes_price 0.72, got %v", m.YesPrice)
	}
}

// TestNormalizeRSSNews tests RSS feed normalization
func TestNormalizeRSSNews(t *testing.T) {
	data, err := os.ReadFile("../../tests/fixtures/rss_feed.xml")
	if err != nil {
		t.Fatalf("failed to load fixture: %v", err)
	}

	articles, err := NormalizeRSSNews(data, "techcrunch")
	if err != nil {
		t.Fatalf("normalization failed: %v", err)
	}

	if len(articles) != 3 {
		t.Errorf("expected 3 articles, got %d", len(articles))
	}

	a := articles[0]
	if a.Source != "techcrunch" {
		t.Errorf("expected source 'techcrunch', got '%s'", a.Source)
	}
	if a.Title == "" {
		t.Error("expected non-empty title")
	}
	if a.URL == "" {
		t.Error("expected non-empty URL")
	}
	if a.Author != "Sarah Johnson" {
		t.Errorf("expected author 'Sarah Johnson', got '%s'", a.Author)
	}
	if a.Content != "" {
		t.Error("expected empty content (metadata only)")
	}
}

// TestNormalizeNewsAPIArticles tests NewsAPI response normalization
func TestNormalizeNewsAPIArticles(t *testing.T) {
	data, err := os.ReadFile("../../tests/fixtures/newsapi_response.json")
	if err != nil {
		t.Fatalf("failed to load fixture: %v", err)
	}

	articles, err := NormalizeNewsAPIArticles(data)
	if err != nil {
		t.Fatalf("normalization failed: %v", err)
	}

	if len(articles) != 2 {
		t.Errorf("expected 2 articles, got %d", len(articles))
	}

	a := articles[0]
	if a.Source != "Bloomberg" {
		t.Errorf("expected source 'Bloomberg', got '%s'", a.Source)
	}
	if a.Author != "John Smith" {
		t.Errorf("expected author 'John Smith', got '%s'", a.Author)
	}
	if a.Content != "" {
		t.Error("expected empty content (metadata only)")
	}
}

// TestParseRSS tests RSS XML parsing
func TestParseRSS(t *testing.T) {
	data, err := os.ReadFile("../../tests/fixtures/rss_feed.xml")
	if err != nil {
		t.Fatalf("failed to load fixture: %v", err)
	}

	rss, err := ParseRSS(data)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	if rss.Channel.Title != "TechCrunch" {
		t.Errorf("expected channel title 'TechCrunch', got '%s'", rss.Channel.Title)
	}

	if len(rss.Channel.Items) != 3 {
		t.Errorf("expected 3 items, got %d", len(rss.Channel.Items))
	}
}

// TestParsePubDate tests date parsing with various formats
func TestParsePubDate(t *testing.T) {
	tests := []struct {
		input    string
		shouldOK bool
	}{
		{"Mon, 15 Feb 2024 14:30:00 GMT", true},
		{"Mon, 15 Feb 2024 14:30:00 -0700", true},
		{"2024-02-15T14:30:00Z", true},
		{"invalid date", false},
	}

	for _, tt := range tests {
		_, err := ParsePubDate(tt.input)
		if tt.shouldOK && err != nil {
			t.Errorf("expected success for '%s', got error: %v", tt.input, err)
		}
		if !tt.shouldOK && err == nil {
			t.Errorf("expected error for '%s', got success", tt.input)
		}
	}
}

// TestCleanHTML tests HTML cleaning
func TestCleanHTML(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"<p>Hello World</p>", "Hello World"},
		{"Line 1<br>Line 2", "Line 1 Line 2"},
		{"&amp;&lt;&gt;", "&<>"},
		{"  spaces  ", "spaces"},
	}

	for _, tt := range tests {
		result := cleanHTML(tt.input)
		if result != tt.expected {
			t.Errorf("cleanHTML(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}
