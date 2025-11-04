-- EUR/BRL Telegram Bot - Database Schema
-- Supabase PostgreSQL Database Schema
-- This schema documents all tables used by the application

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    language VARCHAR(5) DEFAULT 'pt',
    premium_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_premium_until ON users(premium_until);

-- ==========================================
-- USER_ALERTS TABLE (Premium feature)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    pair VARCHAR(10) NOT NULL, -- 'eurbrl' or 'brleur'
    threshold_type VARCHAR(20) NOT NULL, -- 'absolute' or 'relative'
    threshold_value DECIMAL(10, 4) NOT NULL,
    reference_type VARCHAR(20), -- 'current', 'avg7d', 'avg30d', 'avg90d'
    cooldown_minutes INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_alerts table
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_alerts(active);
CREATE INDEX IF NOT EXISTS idx_user_alerts_pair ON user_alerts(pair);

-- ==========================================
-- RATES_HISTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS rates_history (
    id BIGSERIAL PRIMARY KEY,
    pair VARCHAR(10) NOT NULL, -- 'eurbrl', 'brleur', 'eurusd', 'usdbrl', etc.
    rate DECIMAL(12, 6) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rates_history table
CREATE INDEX IF NOT EXISTS idx_rates_history_pair ON rates_history(pair);
CREATE INDEX IF NOT EXISTS idx_rates_history_timestamp ON rates_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rates_history_pair_timestamp ON rates_history(pair, timestamp DESC);

-- ==========================================
-- FREE_ALERTS_SENT TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS free_alerts_sent (
    id BIGSERIAL PRIMARY KEY,
    pair VARCHAR(10) NOT NULL,
    rate DECIMAL(12, 6) NOT NULL,
    users_sent INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for free_alerts_sent table
CREATE INDEX IF NOT EXISTS idx_free_alerts_pair ON free_alerts_sent(pair);
CREATE INDEX IF NOT EXISTS idx_free_alerts_sent_at ON free_alerts_sent(sent_at DESC);

-- ==========================================
-- PIX_PAYMENTS TABLE (Premium subscription tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS pix_payments (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    pix_key TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
    plan VARCHAR(20), -- 'monthly', 'quarterly', 'annual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for pix_payments table
CREATE INDEX IF NOT EXISTS idx_pix_payments_telegram_id ON pix_payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_created_at ON pix_payments(created_at DESC);

-- ==========================================
-- NLU_LOGS TABLE (Natural Language Understanding analytics)
-- ==========================================
CREATE TABLE IF NOT EXISTS nlu_logs (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT,
    input_text TEXT NOT NULL,
    intent VARCHAR(50),
    entities JSONB,
    confidence DECIMAL(4, 3),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for nlu_logs table
CREATE INDEX IF NOT EXISTS idx_nlu_logs_telegram_id ON nlu_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_nlu_logs_intent ON nlu_logs(intent);
CREATE INDEX IF NOT EXISTS idx_nlu_logs_created_at ON nlu_logs(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Enable RLS on all tables for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlu_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SAMPLE QUERIES
-- ==========================================

-- Get all active premium users
-- SELECT * FROM users WHERE premium_until > NOW();

-- Get rate history for EUR/BRL in last 30 days
-- SELECT * FROM rates_history
-- WHERE pair = 'eurbrl'
-- AND timestamp > NOW() - INTERVAL '30 days'
-- ORDER BY timestamp DESC;

-- Get active alerts for a user
-- SELECT ua.* FROM user_alerts ua
-- JOIN users u ON ua.user_id = u.id
-- WHERE u.telegram_id = 123456789
-- AND ua.active = true;

-- Calculate 7-day average rate
-- SELECT AVG(rate) as avg_7d
-- FROM rates_history
-- WHERE pair = 'eurbrl'
-- AND timestamp > NOW() - INTERVAL '7 days';

-- Get NLU analytics (intent distribution)
-- SELECT intent, COUNT(*) as count
-- FROM nlu_logs
-- GROUP BY intent
-- ORDER BY count DESC;
