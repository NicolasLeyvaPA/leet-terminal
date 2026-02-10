-- Migration 001: TimescaleDB setup (wallets, news_articles, bets hypertables)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- wallets table stored in TimescaleDB for high-ingest or co-located analytics
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- news articles and bets (hypertables)
CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('news_articles', 'published_at', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    article_id INTEGER,
    amount NUMERIC NOT NULL,
    placed_at TIMESTAMPTZ NOT NULL,
    wallet_address TEXT,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('bets', 'placed_at', if_not_exists => TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_placed_at ON bets(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
