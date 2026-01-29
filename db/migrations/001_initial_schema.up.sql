-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Scrape jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    result JSONB,
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_scrape_jobs_user_id ON scrape_jobs(user_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);

-- Analysis jobs table
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    result JSONB,
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_type ON analysis_jobs(type);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- Prediction jobs table
CREATE TABLE IF NOT EXISTS prediction_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dataset_id UUID,
    model_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    result JSONB,
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_prediction_jobs_user_id ON prediction_jobs(user_id);
CREATE INDEX idx_prediction_jobs_status ON prediction_jobs(status);
CREATE INDEX idx_prediction_jobs_model_type ON prediction_jobs(model_type);
CREATE INDEX idx_prediction_jobs_created_at ON prediction_jobs(created_at DESC);

-- Articles/Content table (for scraped content)
CREATE TABLE IF NOT EXISTS articles (
    id UUID DEFAULT uuid_generate_v4(),
    scrape_job_id UUID REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    content TEXT,
    html TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
);

CREATE INDEX idx_articles_scrape_job_id ON articles(scrape_job_id);
CREATE INDEX idx_articles_url ON articles(url);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);

-- Convert articles to hypertable for time-series data
SELECT create_hypertable('articles', 'created_at', if_not_exists => TRUE);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID DEFAULT uuid_generate_v4(),
    analysis_job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    content_id UUID,
    analysis_type VARCHAR(50) NOT NULL,
    result JSONB NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
);

CREATE INDEX idx_analysis_results_job_id ON analysis_results(analysis_job_id);
CREATE INDEX idx_analysis_results_content_id ON analysis_results(content_id);
CREATE INDEX idx_analysis_results_type ON analysis_results(analysis_type);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at DESC);

-- Convert analysis_results to hypertable
SELECT create_hypertable('analysis_results', 'created_at', if_not_exists => TRUE);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID DEFAULT uuid_generate_v4(),
    prediction_job_id UUID NOT NULL REFERENCES prediction_jobs(id) ON DELETE CASCADE,
    model_type VARCHAR(50) NOT NULL,
    input_data JSONB,
    prediction_data JSONB NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
);

CREATE INDEX idx_predictions_job_id ON predictions(prediction_job_id);
CREATE INDEX idx_predictions_model_type ON predictions(model_type);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);

-- Convert predictions to hypertable
SELECT create_hypertable('predictions', 'created_at', if_not_exists => TRUE);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    permissions JSONB DEFAULT '[]'::jsonb,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Convert audit_logs to hypertable
SELECT create_hypertable('audit_logs', 'created_at', if_not_exists => TRUE);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW job_statistics AS
SELECT
    'scrape' as job_type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM scrape_jobs
WHERE completed_at IS NOT NULL
GROUP BY status
UNION ALL
SELECT
    'analysis' as job_type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM analysis_jobs
WHERE completed_at IS NOT NULL
GROUP BY status
UNION ALL
SELECT
    'prediction' as job_type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM prediction_jobs
WHERE completed_at IS NOT NULL
GROUP BY status;

-- Create materialized view for user statistics
CREATE MATERIALIZED VIEW user_statistics AS
SELECT
    u.id as user_id,
    u.username,
    u.email,
    COUNT(DISTINCT sj.id) as total_scrape_jobs,
    COUNT(DISTINCT aj.id) as total_analysis_jobs,
    COUNT(DISTINCT pj.id) as total_prediction_jobs,
    u.created_at as user_since,
    u.last_login
FROM users u
LEFT JOIN scrape_jobs sj ON u.id = sj.user_id
LEFT JOIN analysis_jobs aj ON u.id = aj.user_id
LEFT JOIN prediction_jobs pj ON u.id = pj.user_id
GROUP BY u.id, u.username, u.email, u.created_at, u.last_login;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_statistics_user_id ON user_statistics(user_id);

-- Refresh materialized view function (call this periodically)
CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
END;
$$ LANGUAGE plpgsql;
