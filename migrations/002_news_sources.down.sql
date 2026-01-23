-- Remove default news sources
DELETE FROM news_sources WHERE user_id IS NULL;

-- Drop indexes
DROP INDEX IF EXISTS idx_articles_language;
DROP INDEX IF EXISTS idx_articles_category;
DROP INDEX IF EXISTS idx_articles_published_at;
DROP INDEX IF EXISTS idx_articles_url_hash;
DROP INDEX IF EXISTS idx_articles_source_id;
DROP INDEX IF EXISTS idx_news_sources_type;
DROP INDEX IF EXISTS idx_news_sources_last_scraped;
DROP INDEX IF EXISTS idx_news_sources_is_active;
DROP INDEX IF EXISTS idx_news_sources_user_id;

-- Drop trigger
DROP TRIGGER IF EXISTS news_sources_updated_at ON news_sources;
DROP FUNCTION IF EXISTS update_news_sources_updated_at();

-- Remove columns from articles
ALTER TABLE articles DROP COLUMN IF EXISTS summary;
ALTER TABLE articles DROP COLUMN IF EXISTS word_count;
ALTER TABLE articles DROP COLUMN IF EXISTS language;
ALTER TABLE articles DROP COLUMN IF EXISTS tags;
ALTER TABLE articles DROP COLUMN IF EXISTS category;
ALTER TABLE articles DROP COLUMN IF EXISTS published_at;
ALTER TABLE articles DROP COLUMN IF EXISTS author;
ALTER TABLE articles DROP COLUMN IF EXISTS url_hash;
ALTER TABLE articles DROP COLUMN IF EXISTS source_id;

-- Drop news_sources table
DROP TABLE IF EXISTS news_sources CASCADE;
