package ingestion

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/services/config"
)

// NewsFetcher fetches news from RSS feeds and news APIs
type RSSFetcher struct {
	feedURL string
	source  string
	client  *http.Client
}

// NewRSSFetcher creates a new RSS feed fetcher
func NewRSSFetcher(feedURL, source string, cfg *config.Config) *RSSFetcher {
	return &RSSFetcher{
		feedURL: feedURL,
		source:  source,
		client: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
	}
}

func (r *RSSFetcher) Name() string {
	return fmt.Sprintf("rss:%s", r.source)
}

func (r *RSSFetcher) FeedType() string {
	return "rss"
}

// Fetch retrieves and parses RSS feed
func (r *RSSFetcher) Fetch(ctx context.Context) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", r.feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("User-Agent", "Leet-Terminal-News-Aggregator/1.0")
	req.Header.Set("Accept", "application/rss+xml, application/xml, text/xml")

	resp, err := r.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("RSS feed returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	return body, nil
}

// RSS structures for parsing
type RSS struct {
	XMLName xml.Name `xml:"rss"`
	Channel Channel  `xml:"channel"`
}

type Channel struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	Items       []Item `xml:"item"`
}

type Item struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	Author      string `xml:"author"`
	Creator     string `xml:"creator"` // Dublin Core
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
}

// ParseRSS parses RSS XML data
func ParseRSS(data []byte) (*RSS, error) {
	var rss RSS
	if err := xml.Unmarshal(data, &rss); err != nil {
		return nil, fmt.Errorf("unmarshal RSS: %w", err)
	}
	return &rss, nil
}

// NewsAPIFetcher fetches news from NewsAPI.org
type NewsAPIFetcher struct {
	apiKey   string
	query    string
	category string
	client   *http.Client
}

// NewNewsAPIFetcher creates a new NewsAPI fetcher
func NewNewsAPIFetcher(apiKey, query, category string, cfg *config.Config) *NewsAPIFetcher {
	return &NewsAPIFetcher{
		apiKey:   apiKey,
		query:    query,
		category: category,
		client: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
	}
}

func (n *NewsAPIFetcher) Name() string {
	return "newsapi"
}

func (n *NewsAPIFetcher) FeedType() string {
	return "api"
}

// Fetch retrieves news from NewsAPI
func (n *NewsAPIFetcher) Fetch(ctx context.Context) ([]byte, error) {
	baseURL := "https://newsapi.org/v2/everything"
	if n.category != "" {
		baseURL = "https://newsapi.org/v2/top-headlines"
	}

	url := fmt.Sprintf("%s?apiKey=%s", baseURL, n.apiKey)
	if n.query != "" {
		url += fmt.Sprintf("&q=%s", n.query)
	}
	if n.category != "" {
		url += fmt.Sprintf("&category=%s", n.category)
	}
	url += "&pageSize=100&sortBy=publishedAt"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := n.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("rate limited by NewsAPI")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NewsAPI returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	return body, nil
}

// NewsAPIResponse represents the NewsAPI response structure
type NewsAPIResponse struct {
	Status       string           `json:"status"`
	TotalResults int              `json:"totalResults"`
	Articles     []NewsAPIArticle `json:"articles"`
}

type NewsAPIArticle struct {
	Source      NewsAPISource `json:"source"`
	Author      string        `json:"author"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	URL         string        `json:"url"`
	PublishedAt time.Time     `json:"publishedAt"`
	Content     string        `json:"content"`
}

type NewsAPISource struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ParseNewsAPIResponse parses NewsAPI JSON response
func ParseNewsAPIResponse(data []byte) (*NewsAPIResponse, error) {
	var resp NewsAPIResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("unmarshal NewsAPI response: %w", err)
	}
	return &resp, nil
}

// Default RSS feeds for legal news sources
var DefaultNewsFeeds = map[string]string{
	"reuters-business":   "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
	"bbc-news":           "http://feeds.bbci.co.uk/news/rss.xml",
	"techcrunch":         "https://techcrunch.com/feed/",
	"hacker-news":        "https://news.ycombinator.com/rss",
	"financial-times":    "https://www.ft.com/?format=rss",
	"economist":          "https://www.economist.com/finance-and-economics/rss.xml",
	"coindesk":           "https://www.coindesk.com/arc/outboundfeeds/rss/",
	"bloomberg-crypto":   "https://www.bloomberg.com/crypto/rss.xml",
}

// ParsePubDate attempts to parse common RSS date formats
func ParsePubDate(dateStr string) (time.Time, error) {
	dateStr = strings.TrimSpace(dateStr)

	formats := []string{
		time.RFC1123Z,
		time.RFC1123,
		time.RFC822Z,
		time.RFC822,
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
		"Mon, 02 Jan 2006 15:04:05 -0700",
		"Mon, 2 Jan 2006 15:04:05 -0700",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}

