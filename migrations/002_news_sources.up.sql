-- Create news sources table
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('api', 'rss', 'web')),
    url TEXT NOT NULL,
    api_key_encrypted TEXT, -- Encrypted API key for API sources
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    scrape_interval_minutes INTEGER DEFAULT 60,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_source UNIQUE(user_id, url)
);

CREATE INDEX idx_news_sources_user_id ON news_sources(user_id);
CREATE INDEX idx_news_sources_is_active ON news_sources(is_active);
CREATE INDEX idx_news_sources_last_scraped ON news_sources(last_scraped_at);
CREATE INDEX idx_news_sources_type ON news_sources(source_type);

-- Add source_id to existing articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS url_hash VARCHAR(64);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE articles ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX idx_articles_source_id ON articles(source_id);
CREATE INDEX idx_articles_url_hash ON articles(url_hash);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_language ON articles(language);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_news_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_sources_updated_at
    BEFORE UPDATE ON news_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_news_sources_updated_at();

-- Insert some default public news sources (no API key needed)
INSERT INTO news_sources (name, source_type, url, config, is_active, scrape_interval_minutes)
VALUES 
    ('HackerNews RSS', 'rss', 'https://news.ycombinator.com/rss', '{"category": "technology"}', true, 30),
    ('BBC World News RSS', 'rss', 'https://feeds.bbci.co.uk/news/world/rss.xml', '{"category": "world"}', true, 60),
    ('TechCrunch RSS', 'rss', 'https://techcrunch.com/feed/', '{"category": "technology"}', true, 60),
    ('Reuters Top News RSS', 'rss', 'https://www.reutersagency.com/feed/', '{"category": "general"}', true, 60)
ON CONFLICT (user_id, url) DO NOTHING;
