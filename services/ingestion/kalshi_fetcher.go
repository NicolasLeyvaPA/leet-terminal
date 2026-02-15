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

// KalshiFetcher fetches market data from Kalshi API
type KalshiFetcher struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// NewKalshiFetcher creates a new Kalshi API fetcher
func NewKalshiFetcher(cfg *config.Config) *KalshiFetcher {
	return &KalshiFetcher{
		apiKey:  cfg.KalshiAPIKey,
		baseURL: "https://api.elections.kalshi.com/trade-api/v2",
		client: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
	}
}

func (k *KalshiFetcher) Name() string {
	return "kalshi"
}

func (k *KalshiFetcher) Source() string {
	return "kalshi"
}

// Fetch retrieves active markets from Kalshi
func (k *KalshiFetcher) Fetch(ctx context.Context) ([]byte, error) {
	// Fetch active events with markets
	url := fmt.Sprintf("%s/events?status=active&limit=100", k.baseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// Kalshi requires API key in header
	if k.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", k.apiKey))
	}
	req.Header.Set("Accept", "application/json")

	resp, err := k.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("rate limited by Kalshi API")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kalshi API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	return body, nil
}

// KalshiEvent represents the Kalshi API event response structure
type KalshiEvent struct {
	EventTicker string        `json:"event_ticker"`
	Title       string        `json:"title"`
	Category    string        `json:"category"`
	SubTitle    string        `json:"sub_title"`
	Markets     []KalshiMarket `json:"markets"`
}

type KalshiMarket struct {
	Ticker         string    `json:"ticker"`
	EventTicker    string    `json:"event_ticker"`
	Title          string    `json:"title"`
	Status         string    `json:"status"`
	YesBid         float64   `json:"yes_bid"`
	YesAsk         float64   `json:"yes_ask"`
	NoBid          float64   `json:"no_bid"`
	NoAsk          float64   `json:"no_ask"`
	LastPrice      float64   `json:"last_price"`
	Volume         float64   `json:"volume"`
	OpenInterest   float64   `json:"open_interest"`
	CloseTime      time.Time `json:"close_time"`
	ExpirationTime time.Time `json:"expiration_time"`
}

type KalshiResponse struct {
	Events []KalshiEvent `json:"events"`
	Cursor string        `json:"cursor"`
}

// ParseKalshiResponse parses the raw Kalshi API response
func ParseKalshiResponse(data []byte) (*KalshiResponse, error) {
	var resp KalshiResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("unmarshal kalshi response: %w", err)
	}
	return &resp, nil
}

