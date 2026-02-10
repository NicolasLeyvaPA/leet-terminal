-- Example migration: add index for fast sliding window queries on news_articles
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);

-- Example migration: add index for fast sliding window queries on bets
CREATE INDEX IF NOT EXISTS idx_bets_placed_at ON bets(placed_at DESC);