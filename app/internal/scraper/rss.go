package scraper

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/NicolasLeyvaPA/leet-terminal/internal/storage"
	"go.uber.org/zap"
)

// RSSFeed represents an RSS feed
type RSSFeed struct {
	Channel RSSChannel `xml:"channel"`
}

// RSSChannel represents the channel element
type RSSChannel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Items       []RSSItem `xml:"item"`
}

// RSSItem represents an item/article in the feed
type RSSItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	GUID        string `xml:"guid"`
	Author      string `xml:"author"`
	Category    string `xml:"category"`
}

// RSSParser handles RSS feed parsing
type RSSParser struct {
	logger *zap.Logger
	client *http.Client
}

// NewRSSParser creates a new RSS parser
func NewRSSParser(logger *zap.Logger) *RSSParser {
	return &RSSParser{
		logger: logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ParseFeed fetches and parses an RSS feed
func (p *RSSParser) ParseFeed(url string) ([]storage.ArticleExtended, error) {
	p.logger.Info("Parsing RSS feed", zap.String("url", url))

	// Fetch feed
	resp, err := p.client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("RSS feed returned status %d", resp.StatusCode)
	}

	// Read body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read RSS feed body: %w", err)
	}

	// Parse XML
	var feed RSSFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, fmt.Errorf("failed to parse RSS feed: %w", err)
	}

	// Convert to ArticleExtended
	articles := make([]storage.ArticleExtended, 0, len(feed.Channel.Items))
	for _, item := range feed.Channel.Items {
		article := p.convertRSSItemToArticle(item)
		articles = append(articles, article)
	}

	p.logger.Info("Parsed RSS feed",
		zap.String("url", url),
		zap.Int("articles", len(articles)),
	)

	return articles, nil
}

// convertRSSItemToArticle converts an RSS item to an ArticleExtended
func (p *RSSParser) convertRSSItemToArticle(item RSSItem) storage.ArticleExtended {
	// Parse publication date
	pubDate := p.parseRSSDate(item.PubDate)

	// Clean HTML from description
	content := p.cleanHTML(item.Description)

	// Calculate word count
	wordCount := len(strings.Fields(content))

	// Generate summary
	summary := p.generateSummary(content, 200)

	// Convert category to pointer
	var categoryPtr *string
	if item.Category != "" {
		categoryPtr = &item.Category
	}

	// Convert author to pointer
	var authorPtr *string
	if item.Author != "" {
		authorPtr = &item.Author
	}

	return storage.ArticleExtended{
		Title:       item.Title,
		Content:     content,
		URL:         item.Link,
		URLHash:     p.hashURL(item.Link),
		Summary:     &summary,
		Author:      authorPtr,
		PublishedAt: &pubDate,
		Category:    categoryPtr,
		Tags:        p.extractTags(item.Category),
		Language:    "en", // Default to English
		WordCount:   wordCount,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

// parseRSSDate attempts to parse various RSS date formats
func (p *RSSParser) parseRSSDate(dateStr string) time.Time {
	if dateStr == "" {
		return time.Now()
	}

	// Try common RSS date formats
	formats := []string{
		time.RFC1123Z,
		time.RFC1123,
		time.RFC822Z,
		time.RFC822,
		"Mon, 02 Jan 2006 15:04:05 -0700",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t
		}
	}

	p.logger.Warn("Failed to parse RSS date, using current time",
		zap.String("date", dateStr),
	)
	return time.Now()
}

// cleanHTML removes HTML tags from text
func (p *RSSParser) cleanHTML(html string) string {
	// Simple HTML tag removal (in production, use a proper HTML parser)
	result := html
	result = strings.ReplaceAll(result, "<p>", "\n")
	result = strings.ReplaceAll(result, "</p>", "\n")
	result = strings.ReplaceAll(result, "<br>", "\n")
	result = strings.ReplaceAll(result, "<br/>", "\n")
	
	// Remove all other tags
	inTag := false
	cleaned := strings.Builder{}
	for _, r := range result {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			cleaned.WriteRune(r)
		}
	}

	// Clean up whitespace
	text := cleaned.String()
	text = strings.TrimSpace(text)
	
	// Replace multiple newlines with double newline
	for strings.Contains(text, "\n\n\n") {
		text = strings.ReplaceAll(text, "\n\n\n", "\n\n")
	}

	return text
}

// extractDomain extracts the domain from a URL
func (p *RSSParser) extractDomain(url string) string {
	// Remove protocol
	domain := strings.TrimPrefix(url, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	
	// Get first part (domain)
	parts := strings.Split(domain, "/")
	if len(parts) > 0 {
		domain = parts[0]
	}

	// Remove www
	domain = strings.TrimPrefix(domain, "www.")

	return domain
}

// extractTags converts category string to tags array
func (p *RSSParser) extractTags(category string) []string {
	if category == "" {
		return []string{}
	}

	// Split by comma
	tags := strings.Split(category, ",")
	
	// Clean and filter
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			result = append(result, tag)
		}
	}

	return result
}

// generateSummary creates a summary from content
func (p *RSSParser) generateSummary(content string, maxLength int) string {
	if len(content) <= maxLength {
		return content
	}

	// Find last space before maxLength
	summary := content[:maxLength]
	lastSpace := strings.LastIndex(summary, " ")
	if lastSpace > 0 {
		summary = summary[:lastSpace]
	}

	return summary + "..."
}

// hashURL creates a SHA-256 hash of a URL for deduplication
func (p *RSSParser) hashURL(url string) string {
	h := sha256.New()
	h.Write([]byte(url))
	return hex.EncodeToString(h.Sum(nil))
}
