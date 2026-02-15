package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
)

// PolymarketFetcher fetches market data from Polymarket API
type PolymarketFetcher struct {
	baseURL string
	client  *http.Client
}

// NewPolymarketFetcher creates a new Polymarket API fetcher
func NewPolymarketFetcher(cfg *config.Config) *PolymarketFetcher {
	return &PolymarketFetcher{
		baseURL: cfg.PolymarketAPIURL,
		client: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
	}
}

func (p *PolymarketFetcher) Name() string {
	return "polymarket"
}

func (p *PolymarketFetcher) Source() string {
	return "polymarket"
}

// Fetch retrieves active markets from Polymarket
func (p *PolymarketFetcher) Fetch(ctx context.Context) ([]byte, error) {
	// Fetch active events (markets)
	url := fmt.Sprintf("%s/events?closed=false&limit=100&order=volume&ascending=false", p.baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("rate limited by Polymarket API")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("polymarket API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	return body, nil
}

// PolymarketEvent represents the Polymarket API event response structure
type PolymarketEvent struct {
	ID          string             `json:"id"`
	Slug        string             `json:"slug"`
	Title       string             `json:"title"`
	Description string             `json:"description"`
	EndDate     time.Time          `json:"endDate"`
	CreationDate time.Time         `json:"creationDate"`
	Category    string             `json:"category"`
	Markets     []PolymarketMarket `json:"markets"`
	Closed      bool               `json:"closed"`
	Active      bool               `json:"active"`
}

type PolymarketMarket struct {
	ConditionID    string    `json:"conditionId"`
	Question       string    `json:"question"`
	OutcomeA       string    `json:"outcomeA"`
	OutcomeB       string    `json:"outcomeB"`
	OutcomePrices  []float64 `json:"outcomePrices"`
	Volume         float64   `json:"volume"`
	Liquidity      float64   `json:"liquidity"`
	EndDate        time.Time `json:"endDate"`
	Closed         bool      `json:"closed"`
	Active         bool      `json:"active"`
}

// ParsePolymarketResponse parses the raw Polymarket API response
func ParsePolymarketResponse(data []byte) ([]PolymarketEvent, error) {
	var events []PolymarketEvent
	if err := json.Unmarshal(data, &events); err != nil {
		return nil, fmt.Errorf("unmarshal polymarket response: %w", err)
	}
	return events, nil
}
