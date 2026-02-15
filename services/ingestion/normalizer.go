package ingestion

import (
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/storage"
)

// Normalizer transforms raw API data into our domain models

// NormalizeKalshiMarkets converts Kalshi API response to Market models
func NormalizeKalshiMarkets(data []byte) ([]*storage.Market, error) {
	resp, err := ParseKalshiResponse(data)
	if err != nil {
		return nil, err
	}

	var markets []*storage.Market
	now := time.Now()

	for _, event := range resp.Events {
		for _, km := range event.Markets {
			// Calculate mid prices
			yesPrice := (km.YesBid + km.YesAsk) / 2.0
			noPrice := (km.NoBid + km.NoAsk) / 2.0

			// Store raw data
			rawData, _ := json.Marshal(km)

			market := &storage.Market{
				ExternalID:  km.Ticker,
				Source:      "kalshi",
				Title:       km.Title,
				Description: event.SubTitle,
				Category:    event.Category,
				Status:      normalizeStatus(km.Status),
				CloseTime: sql.NullTime{
					Time:  km.CloseTime,
					Valid: !km.CloseTime.IsZero(),
				},
				ResolveTime: sql.NullTime{
					Time:  km.ExpirationTime,
					Valid: !km.ExpirationTime.IsZero(),
				},
				YesPrice:       sqlNullFloat(yesPrice),
				NoPrice:        sqlNullFloat(noPrice),
				LastTradePrice: sqlNullFloat(km.LastPrice),
				Volume:         sqlNullFloat(km.Volume),
				OpenInterest:   sqlNullFloat(km.OpenInterest),
				Tags:           []string{event.Category, "kalshi"},
				CreatedAt:      now, // Kalshi doesn't provide creation time
				UpdatedAt:      now,
				FetchedAt:      now,
				RawData:        rawData,
			}

			markets = append(markets, market)
		}
	}

	return markets, nil
}

// NormalizePolymarketMarkets converts Polymarket API response to Market models
func NormalizePolymarketMarkets(data []byte) ([]*storage.Market, error) {
	events, err := ParsePolymarketResponse(data)
	if err != nil {
		return nil, err
	}

	var markets []*storage.Market
	now := time.Now()

	for _, event := range events {
		for _, pm := range event.Markets {
			// Polymarket uses 0-1 prices
			var yesPrice, noPrice float64
			if len(pm.OutcomePrices) >= 2 {
				yesPrice = pm.OutcomePrices[0]
				noPrice = pm.OutcomePrices[1]
			}

			// Store raw data
			rawData, _ := json.Marshal(pm)

			status := "open"
			if pm.Closed {
				status = "closed"
			} else if !pm.Active {
				status = "inactive"
			}

			market := &storage.Market{
				ExternalID:  pm.ConditionID,
				Source:      "polymarket",
				Title:       pm.Question,
				Description: event.Description,
				Category:    event.Category,
				Status:      status,
				CloseTime: sql.NullTime{
					Time:  pm.EndDate,
					Valid: !pm.EndDate.IsZero(),
				},
				YesPrice:       sqlNullFloat(yesPrice),
				NoPrice:        sqlNullFloat(noPrice),
				LastTradePrice: sqlNullFloat(yesPrice), // Use yes price as last trade
				Volume:         sqlNullFloat(pm.Volume),
				Liquidity:      sqlNullFloat(pm.Liquidity),
				Tags:           []string{event.Category, "polymarket"},
				CreatedAt:      event.CreationDate,
				UpdatedAt:      now,
				FetchedAt:      now,
				RawData:        rawData,
			}

			markets = append(markets, market)
		}
	}

	return markets, nil
}

// NormalizeRSSNews converts RSS feed items to NewsArticle models (metadata only)
func NormalizeRSSNews(data []byte, source string) ([]*storage.NewsArticle, error) {
	rss, err := ParseRSS(data)
	if err != nil {
		return nil, err
	}

	var articles []*storage.NewsArticle

	for _, item := range rss.Channel.Items {
		// Parse publication date
		pubDate, err := ParsePubDate(item.PubDate)
		if err != nil {
			// Skip items with unparseable dates or use current time
			pubDate = time.Now()
		}

		// Determine author (RSS uses different fields)
		author := item.Author
		if author == "" {
			author = item.Creator
		}
		if author == "" {
			author = rss.Channel.Title // Use feed title as fallback
		}

		// Clean title (remove HTML tags if any)
		title := cleanHTML(item.Title)

		article := &storage.NewsArticle{
			Title:       title,
			Content:     "", // Metadata only - no full content
			Source:      source,
			URL:         item.Link,
			Author:      author,
			PublishedAt: pubDate.Format(time.RFC3339),
		}

		articles = append(articles, article)
	}

	return articles, nil
}

// NormalizeNewsAPIArticles converts NewsAPI response to NewsArticle models
func NormalizeNewsAPIArticles(data []byte) ([]*storage.NewsArticle, error) {
	resp, err := ParseNewsAPIResponse(data)
	if err != nil {
		return nil, err
	}

	var articles []*storage.NewsArticle

	for _, item := range resp.Articles {
		source := item.Source.Name
		if source == "" {
			source = "newsapi"
		}

		article := &storage.NewsArticle{
			Title:       item.Title,
			Content:     "", // Metadata only - no full content
			Source:      source,
			URL:         item.URL,
			Author:      item.Author,
			PublishedAt: item.PublishedAt.Format(time.RFC3339),
		}

		articles = append(articles, article)
	}

	return articles, nil
}

// Helper functions

func normalizeStatus(status string) string {
	status = strings.ToLower(status)
	switch status {
	case "active", "open":
		return "open"
	case "closed", "finalized":
		return "closed"
	case "settled", "resolved":
		return "resolved"
	default:
		return status
	}
}

func sqlNullFloat(f float64) sql.NullFloat64 {
	if f == 0 {
		return sql.NullFloat64{Valid: false}
	}
	return sql.NullFloat64{Float64: f, Valid: true}
}

func cleanHTML(s string) string {
	// Simple HTML tag removal (for better implementation, use html.UnescapeString)
	s = strings.ReplaceAll(s, "<p>", "")
	s = strings.ReplaceAll(s, "</p>", "")
	s = strings.ReplaceAll(s, "<br>", " ")
	s = strings.ReplaceAll(s, "<br/>", " ")
	s = strings.ReplaceAll(s, "&nbsp;", " ")
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&lt;", "<")
	s = strings.ReplaceAll(s, "&gt;", ">")
	s = strings.ReplaceAll(s, "&quot;", "\"")
	return strings.TrimSpace(s)
}
