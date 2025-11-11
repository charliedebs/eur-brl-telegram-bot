-- Migration: Add spontaneous alerts pause functionality
-- Date: 2025-01-11
-- Description: Adds ability for premium users to pause spontaneous alerts for a specified duration

-- Add new column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spontaneous_alerts_paused_until TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_spontaneous_alerts_paused_until
ON users(spontaneous_alerts_paused_until);

-- Add comment for documentation
COMMENT ON COLUMN users.spontaneous_alerts_paused_until IS
'Timestamp until which spontaneous alerts are paused for this user. NULL means not paused.';
