-- Migration 002: Market data ingestion tables and enhanced news schema
-- This migration adds support for Kalshi and Polymarket data ingestion

-- Extend news_articles table with metadata-only fields (legal compliance)
-- Add columns for URL, author, and deduplication
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS url_hash TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW();

-- Make content nullable for metadata-only records
ALTER TABLE news_articles ALTER COLUMN content DROP NOT NULL;

-- Create unique index on url_hash for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_url_hash ON news_articles(url_hash) WHERE url_hash IS NOT NULL;

-- Index for cleanup queries (retention window)
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles(fetched_at DESC);

-- Markets table (TimescaleDB hypertable for Kalshi + Polymarket)
CREATE TABLE IF NOT EXISTS markets (
    id SERIAL,
    external_id TEXT NOT NULL,              -- Kalshi: event_ticker, Polymarket: condition_id
    source TEXT NOT NULL,                   -- 'kalshi' or 'polymarket'
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,

    -- Market state
    status TEXT NOT NULL,                   -- 'open', 'closed', 'resolved', 'settled'
    close_time TIMESTAMPTZ,
    resolve_time TIMESTAMPTZ,

    -- Pricing data
    yes_price NUMERIC(10,4),                -- Current yes price (0-1 or 0-100 depending on source)
    no_price NUMERIC(10,4),                 -- Current no price
    last_trade_price NUMERIC(10,4),

    -- Volume and liquidity
    volume NUMERIC(20,2),                   -- Total volume traded
    liquidity NUMERIC(20,2),                -- Available liquidity
    open_interest NUMERIC(20,2),            -- Open interest

    -- Metadata
    tags TEXT[],                            -- Categorical tags
    created_at TIMESTAMPTZ NOT NULL,        -- When market was created on platform
    updated_at TIMESTAMPTZ DEFAULT NOW(),   -- Last update timestamp
    fetched_at TIMESTAMPTZ DEFAULT NOW(),   -- When we fetched this data

    -- Raw payload storage (JSONB for flexibility)
    raw_data JSONB,

    PRIMARY KEY (id, fetched_at)
);

-- Convert to hypertable partitioned by fetched_at
SELECT create_hypertable('markets', 'fetched_at', if_not_exists => TRUE);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_markets_external_id ON markets(external_id, source);
CREATE INDEX IF NOT EXISTS idx_markets_source ON markets(source);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_close_time ON markets(close_time) WHERE close_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_markets_updated_at ON markets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);

-- GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_markets_tags ON markets USING GIN(tags);

-- GIN index for JSONB raw_data queries
CREATE INDEX IF NOT EXISTS idx_markets_raw_data ON markets USING GIN(raw_data);

-- Market snapshots view (latest snapshot per market)
CREATE OR REPLACE VIEW markets_latest AS
SELECT DISTINCT ON (external_id, source)
    *
FROM markets
ORDER BY external_id, source, fetched_at DESC;

-- Junction table for future semantic matching (news <-> markets)
CREATE TABLE IF NOT EXISTS market_news_links (
    id SERIAL PRIMARY KEY,
    market_id INTEGER NOT NULL,
    news_id INTEGER NOT NULL,
    relevance_score NUMERIC(3,2),           -- 0.00 to 1.00
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    match_method TEXT,                      -- 'keyword', 'semantic', 'manual'

    UNIQUE(market_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_market_news_links_market ON market_news_links(market_id);
CREATE INDEX IF NOT EXISTS idx_market_news_links_news ON market_news_links(news_id);
CREATE INDEX IF NOT EXISTS idx_market_news_links_score ON market_news_links(relevance_score DESC);

-- Add retention policy: compress data older than 7 days
SELECT add_compression_policy('markets', INTERVAL '7 days', if_not_exists => TRUE);

-- Comments for documentation
COMMENT ON TABLE markets IS 'Time-series market data from Kalshi and Polymarket';
COMMENT ON COLUMN markets.external_id IS 'Platform-specific unique identifier';
COMMENT ON COLUMN markets.raw_data IS 'Original JSON response for debugging and future schema evolution';
COMMENT ON TABLE market_news_links IS 'Junction table linking markets to relevant news articles';

