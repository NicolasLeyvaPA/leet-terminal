
-- TimescaleDB init: create news, bets and wallets tables
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT[],
    source TEXT,
    content TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('news_articles', 'published_at', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT[],
    source TEXT,
    content TEXT NOT NULL,
    volume NUMERIC,
    placed_at TIMESTAMPTZ NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('bets', 'placed_at', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    address TEXT UNIQUE NOT NULL,
    volume NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('wallets', 'created_at', if_not_exists => TRUE);