# News Scraper Architecture Plan

## Overview
A comprehensive news scraping system that aggregates content from multiple sources including public APIs and web scraping, stores plaintext reports, and allows dynamic source management through the frontend.

## Data Flow

```
Frontend → API → Queue → Scraper Worker → Storage → Frontend
   ↓         ↓                    ↓            ↓
Add Source  Create Job         Fetch News   PostgreSQL
            Schedule           Parse Content  (articles table)
```

## Components

### 1. News Sources Management

#### Database Schema (news_sources table)
```sql
CREATE TABLE news_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'api', 'rss', 'web'
    url TEXT NOT NULL,
    api_key TEXT, -- encrypted, for API sources
    config JSONB DEFAULT '{}', -- source-specific config
    is_active BOOLEAN DEFAULT true,
    scrape_interval_minutes INTEGER DEFAULT 60,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_sources_user_id ON news_sources(user_id);
CREATE INDEX idx_news_sources_is_active ON news_sources(is_active);
CREATE INDEX idx_news_sources_last_scraped ON news_sources(last_scraped_at);
```

### 2. Supported News Sources

#### A. Public News APIs
- **NewsAPI.org** - Free tier: 100 requests/day, 1000+ sources
  - Endpoint: `https://newsapi.org/v2/everything`
  - Categories: business, technology, politics, sports, etc.
  
- **GNews API** - Free tier: 100 requests/day
  - Endpoint: `https://gnews.io/api/v4/search`
  - Multi-language support
  
- **The Guardian API** - Free tier: 500 requests/day
  - Endpoint: `https://content.guardianapis.com/search`
  - High-quality journalism
  
- **New York Times API** - Free tier: 1000 requests/day
  - Endpoint: `https://api.nytimes.com/svc/search/v2/articlesearch.json`
  - Archive access

#### B. RSS Feeds
- BBC News RSS
- Reuters RSS
- TechCrunch RSS
- HackerNews RSS
- Reddit RSS (subreddits)

#### C. Web Scraping
- Custom news websites using Colly
- JavaScript-rendered sites using Chromium (already in Dockerfile)
- Rate limiting to avoid bans

### 3. Scraper Engine Architecture

#### Job Types
1. **Scheduled Scrape Job** - Runs periodically for all active sources
2. **On-Demand Scrape Job** - User-triggered for specific source
3. **Initial Scrape Job** - Runs when new source is added

#### Processing Pipeline
```
1. Fetch Content
   ├── API Request (with retry logic)
   ├── RSS Parse (XML parser)
   └── Web Scrape (HTML parser)

2. Extract Data
   ├── Title
   ├── Content (plaintext)
   ├── Author
   ├── Published Date
   ├── URL
   ├── Summary/Description
   └── Category/Tags

3. Clean & Normalize
   ├── Remove HTML tags
   ├── Extract main content
   ├── Remove ads/navigation
   ├── Normalize whitespace
   └── Detect language

4. Deduplicate
   ├── Check URL hash
   ├── Check content similarity
   └── Skip if already stored

5. Store to Database
   ├── Insert into articles table
   ├── Update source last_scraped_at
   └── Create analysis job (optional)
```

### 4. API Endpoints

#### News Sources Management
```
POST   /api/v1/news/sources              - Add new source
GET    /api/v1/news/sources              - List user's sources
GET    /api/v1/news/sources/:id          - Get source details
PUT    /api/v1/news/sources/:id          - Update source config
DELETE /api/v1/news/sources/:id          - Remove source
POST   /api/v1/news/sources/:id/scrape   - Trigger immediate scrape
```

#### Articles/Reports Access
```
GET    /api/v1/news/articles             - List scraped articles
GET    /api/v1/news/articles/:id         - Get article content
GET    /api/v1/news/articles/search      - Search articles
GET    /api/v1/news/articles/trending    - Get trending topics
```

### 5. Storage Strategy

#### Article Storage
```go
type Article struct {
    ID              string    // UUID
    SourceID        string    // Reference to news_sources
    URL             string    // Original article URL
    URLHash         string    // SHA256 hash for deduplication
    Title           string    // Article headline
    Content         string    // Plaintext content
    Summary         string    // Short description
    Author          string    // Article author
    PublishedAt     time.Time // Original publish date
    ScrapedAt       time.Time // When we scraped it
    Category        string    // News category
    Tags            []string  // JSON array
    Language        string    // Detected language
    Sentiment       float64   // Sentiment score (-1 to 1)
    WordCount       int       // Content length
    ReadTimeMinutes int       // Estimated read time
    Metadata        map[string]interface{} // Additional data
}
```

### 6. Scraper Worker Implementation

#### Features
- **Concurrent Processing** - Process multiple sources in parallel
- **Rate Limiting** - Respect API limits and prevent bans
- **Error Handling** - Retry failed requests, log errors
- **Content Extraction** - Smart parsing for different formats
- **Deduplication** - Skip already-scraped articles
- **Scheduling** - Cron-based or interval-based scraping

#### Scraper Configuration
```go
type ScraperConfig struct {
    MaxConcurrency     int           // Max parallel scrapes
    RequestTimeout     time.Duration // HTTP timeout
    RetryAttempts      int           // Max retry count
    RetryDelay         time.Duration // Delay between retries
    UserAgent          string        // Custom user agent
    RateLimit          int           // Requests per minute
    ContentMaxLength   int           // Max article length
    JavaScriptEnabled  bool          // Use headless browser
}
```

### 7. Content Processing

#### Text Extraction Strategies

**API Sources:**
- Direct JSON parsing
- Already clean plaintext

**RSS Feeds:**
```go
1. Parse XML
2. Extract <description> or <content:encoded>
3. Strip HTML tags
4. Clean whitespace
```

**Web Scraping:**
```go
1. Identify main content container
   - Common selectors: article, .post-content, .article-body
   - Remove: nav, footer, sidebar, ads, comments
   
2. Extract text nodes
   - Preserve paragraph structure
   - Remove scripts/styles
   
3. Clean HTML
   - Convert <br> to newlines
   - Preserve links in metadata
   - Remove empty paragraphs
   
4. Generate summary
   - First 200 words or first 2 paragraphs
   - Extract meta description
```

### 8. Scheduled Scraping

#### Implementation Options

**Option 1: Internal Scheduler**
```go
// In scraper worker
func (s *Scraper) RunScheduler() {
    ticker := time.NewTicker(5 * time.Minute)
    for range ticker.C {
        sources := s.getActiveSources()
        for _, source := range sources {
            if time.Since(source.LastScraped) > source.Interval {
                s.enqueueScrapeJob(source)
            }
        }
    }
}
```

**Option 2: Asynq Periodic Tasks** (Recommended)
```go
// Setup periodic tasks
scheduler := asynq.NewScheduler(
    asynq.RedisClientOpt{Addr: redisAddr},
    &asynq.SchedulerOpts{Location: time.UTC},
)

// Every 5 minutes, check for sources to scrape
scheduler.Register(
    "*/5 * * * *", // cron expression
    asynq.NewTask("news:check_sources", nil),
)
```

### 9. Frontend Integration

#### News Panel Features
```jsx
- Add News Source form
  - Source type selector (API/RSS/Web)
  - URL input
  - API key input (for API sources)
  - Scrape interval slider
  
- Sources list
  - Source name, type, status
  - Last scraped time
  - Articles count
  - Enable/disable toggle
  - Manual scrape button
  
- Articles feed
  - Real-time updates via WebSocket
  - Infinite scroll
  - Filter by source, date, category
  - Search functionality
  - Article preview modal
```

### 10. Implementation Phases

#### Phase 1: Core Infrastructure (Day 1)
- [ ] Create news_sources table migration
- [ ] Update articles table with source_id
- [ ] Add news source API endpoints
- [ ] Basic CRUD operations

#### Phase 2: Scraper Engine (Day 2)
- [ ] Implement NewsAPI.org integration
- [ ] Implement RSS feed parser
- [ ] Implement web scraper with Colly
- [ ] Content extraction & cleaning
- [ ] Deduplication logic

#### Phase 3: Job Processing (Day 3)
- [ ] Create scrape job handlers
- [ ] Implement scheduled scraping
- [ ] Add rate limiting
- [ ] Error handling & retries

#### Phase 4: Frontend (Day 4)
- [ ] News source management UI
- [ ] Articles feed component
- [ ] Real-time updates
- [ ] Search & filtering

#### Phase 5: Advanced Features (Day 5+)
- [ ] Sentiment analysis integration
- [ ] Named entity recognition
- [ ] Topic clustering
- [ ] Trending topics detection
- [ ] Email notifications for keywords

### 11. Environment Variables

```env
# News API Keys (optional, free tier available)
NEWSAPI_KEY=your_newsapi_key
GNEWS_API_KEY=your_gnews_key
GUARDIAN_API_KEY=your_guardian_key
NYT_API_KEY=your_nyt_key

# Scraper Settings
SCRAPER_MAX_CONCURRENCY=10
SCRAPER_REQUEST_TIMEOUT=30s
SCRAPER_RETRY_ATTEMPTS=3
SCRAPER_RATE_LIMIT=60  # requests per minute
SCRAPER_USER_AGENT="LeetTerminal/1.0 NewsBot"

# Content Settings
CONTENT_MAX_LENGTH=50000
ENABLE_JAVASCRIPT_SCRAPING=false
```

### 12. Security Considerations

- **API Key Encryption** - Store API keys encrypted in database
- **Rate Limiting** - Prevent abuse of scraping
- **Content Validation** - Sanitize all scraped content
- **User Quotas** - Limit sources per user (e.g., 10 sources)
- **CORS** - Proxy external requests through backend
- **XSS Prevention** - Strip all scripts from scraped content

### 13. Performance Optimizations

- **Caching** - Cache articles for 5 minutes
- **Pagination** - Limit articles per request
- **Indexes** - Database indexes on frequently queried fields
- **Batch Processing** - Process multiple articles in one transaction
- **Connection Pooling** - Reuse HTTP connections
- **Compression** - Gzip content storage

### 14. Monitoring & Metrics

- Total articles scraped
- Articles per source
- Scraping success/failure rates
- Average scraping time per source
- API quota usage
- Popular sources/categories
- User engagement with articles

## Example Source Configurations

### NewsAPI.org
```json
{
  "source_type": "api",
  "url": "https://newsapi.org/v2/everything",
  "config": {
    "query": "artificial intelligence",
    "language": "en",
    "sortBy": "publishedAt",
    "pageSize": 100
  }
}
```

### RSS Feed
```json
{
  "source_type": "rss",
  "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
  "config": {
    "category": "world-news",
    "max_items": 50
  }
}
```

### Web Scraping
```json
{
  "source_type": "web",
  "url": "https://techcrunch.com",
  "config": {
    "article_selector": "article.post-block",
    "title_selector": "h2.post-block__title",
    "content_selector": ".article-content",
    "max_depth": 2
  }
}
```

## Next Steps

1. Create database migration for news_sources
2. Implement news source API handlers
3. Enhance scraper engine with multi-source support
4. Add NewsAPI.org integration
5. Implement RSS parser
6. Create frontend news management panel
