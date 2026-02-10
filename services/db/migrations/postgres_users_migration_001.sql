-- Example migration: add index for fast lookup on wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);