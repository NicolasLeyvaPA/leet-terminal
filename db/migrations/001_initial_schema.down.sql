-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS user_statistics CASCADE;

-- Drop views
DROP VIEW IF EXISTS job_statistics CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS refresh_user_statistics();

-- Drop tables (in reverse order of creation due to foreign keys)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS prediction_jobs CASCADE;
DROP TABLE IF EXISTS analysis_jobs CASCADE;
DROP TABLE IF EXISTS scrape_jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop extensions
DROP EXTENSION IF EXISTS timescaledb;
DROP EXTENSION IF EXISTS "uuid-ossp";
