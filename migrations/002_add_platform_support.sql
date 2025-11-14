-- Migration: Add multi-platform support to users table
-- Date: 2025-11-12
-- Purpose: Enable storing users from multiple platforms (Telegram, WhatsApp, etc.)

-- Step 1: Add new columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'telegram',
  ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(255);

-- Step 2: Backfill platform_user_id from telegram_id for existing users
UPDATE users
SET platform_user_id = telegram_id
WHERE platform_user_id IS NULL;

-- Step 3: Add unique constraint on platform + platform_user_id
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_platform_user_unique;

ALTER TABLE users
  ADD CONSTRAINT users_platform_user_unique
  UNIQUE (platform, platform_user_id);

-- Step 4: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_platform_user
  ON users(platform, platform_user_id);

-- Note: telegram_id column is kept for backwards compatibility
-- It will be nullable for non-Telegram users going forward
