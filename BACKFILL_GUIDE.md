# Backfill Rate History Guide

## What is Backfilling?

When the bot is offline or paused, it doesn't collect historical rate data. This missing data is needed for calculating spontaneous alert thresholds (30-day and 90-day averages). The backfill script fetches missing historical data from Yahoo Finance.

## How to Run Backfill on Render

### Method 1: Render Shell (Recommended)

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your `eurbrlbot` service
3. Click the **"Shell"** tab in the left sidebar
4. Run the backfill command:

```bash
node src/utils/backfill-rates.js --days=365
```

5. Wait for completion (shows "✅ Backfill complete")

### Method 2: SSH (Advanced)

If you have SSH enabled on your Render service:

```bash
# Connect via SSH
ssh render@eurbrlbot.onrender.com

# Run backfill
cd /opt/render/project/src
node src/utils/backfill-rates.js --days=365
```

## Command Options

```bash
# Backfill last 90 days (default)
node src/utils/backfill-rates.js

# Backfill last 365 days (recommended before launch)
node src/utils/backfill-rates.js --days=365

# Backfill last 30 days
node src/utils/backfill-rates.js --days=30
```

## What the Script Does

1. ✅ Fetches historical EUR/BRL rates from Yahoo Finance
2. ✅ Checks which dates already exist in database
3. ✅ Only inserts missing dates (skips existing data)
4. ✅ Calculates BRL/EUR inverse rates automatically
5. ✅ Tags backfilled data with source: `yahoo_backfill`

## When to Run Backfill

- **Before launch**: Run with `--days=365` to have a full year of data
- **After extended downtime**: Run to fill gaps when bot was offline
- **Regular maintenance**: Not needed once bot runs 24/7 on paid tier

## Verification

After running backfill, you can verify the data in Supabase:

1. Go to your Supabase dashboard
2. Navigate to Table Editor → `rates_history`
3. Check for entries with `source = 'yahoo_backfill'`
4. Verify dates are filled without gaps

## Troubleshooting

**Error: "Cannot find module"**
- Make sure you're in the project root directory

**Error: "Yahoo Finance API failed"**
- Yahoo Finance might be temporarily unavailable
- Wait a few minutes and try again

**No data inserted**
- Database might already have all the data
- Check the console output for "already exists" messages

## Notes

- Backfill only inserts missing dates
- Safe to run multiple times (won't create duplicates)
- Uses Yahoo Finance public API (no API key needed)
- Data source: `EURBRL=X` ticker symbol
