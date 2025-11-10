#!/usr/bin/env node
// src/utils/backfill-rates.js
// Backfill historical rate data from Yahoo Finance

import 'dotenv/config';
import { DatabaseService } from '../services/database.js';
import { logger } from './logger.js';

const db = new DatabaseService();

/**
 * Fetch historical data from Yahoo Finance
 * @param {string} symbol - e.g. 'EURBRL=X'
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Array>} Array of {date, rate}
 */
async function fetchHistoricalRates(symbol, days = 365) {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (days * 24 * 60 * 60);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];

    if (!result || !result.timestamp || !result.indicators.quote[0].close) {
      throw new Error('Invalid data structure from Yahoo');
    }

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    const rates = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null) {
        rates.push({
          date: new Date(timestamps[i] * 1000),
          rate: closes[i]
        });
      }
    }

    return rates;

  } catch (error) {
    logger.error(`[BACKFILL] Failed to fetch ${symbol}:`, { error: error.message });
    return [];
  }
}

/**
 * Save historical rates to database for all pairs
 */
async function backfillRates(days = 365) {
  logger.info(`\n📥 [BACKFILL] Starting backfill for last ${days} days...`);

  const pairs = {
    'EURBRL=X': { direct: 'eurbrl', inverse: 'brleur' },
    'EURUSD=X': { direct: 'eurusd', inverse: 'usdeur' },
    'USDBRL=X': { direct: 'usdbrl', inverse: 'brlusd' }
  };

  let totalInserted = 0;
  let totalSkipped = 0;

  try {
    // Check what dates we already have
    const { data: existing } = await db.supabase
      .from('rates_history')
      .select('timestamp')
      .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    const existingDates = new Set(
      (existing || []).map(r => new Date(r.timestamp).toDateString())
    );

    logger.info(`[BACKFILL] Found ${existingDates.size} existing dates in database`);

    // Process each pair
    for (const [symbol, pairNames] of Object.entries(pairs)) {
      logger.info(`\n[BACKFILL] 📡 Fetching ${symbol}...`);

      const rates = await fetchHistoricalRates(symbol, days);

      if (rates.length === 0) {
        logger.error(`[BACKFILL] ❌ Failed to fetch ${symbol} data`);
        continue;
      }

      logger.info(`[BACKFILL] ✅ Fetched ${rates.length} data points for ${symbol}`);

      let inserted = 0;
      let skipped = 0;

      for (const { date, rate } of rates) {
        const dateStr = date.toDateString();

        if (existingDates.has(dateStr)) {
          skipped++;
          continue;
        }

        // Calculate inverse rate
        const inverseRate = 1 / rate;

        // Insert direct pair
        const { error: errorDirect } = await db.supabase
          .from('rates_history')
          .insert({
            pair: pairNames.direct,
            rate: rate,
            source: 'yahoo_backfill',
            timestamp: date.toISOString()
          });

        if (errorDirect) {
          logger.error(`[BACKFILL] Failed to insert ${pairNames.direct} for ${dateStr}:`, { error: errorDirect.message });
          continue;
        }

        // Insert inverse pair
        const { error: errorInverse } = await db.supabase
          .from('rates_history')
          .insert({
            pair: pairNames.inverse,
            rate: inverseRate,
            source: 'yahoo_backfill',
            timestamp: date.toISOString()
          });

        if (errorInverse) {
          logger.error(`[BACKFILL] Failed to insert ${pairNames.inverse} for ${dateStr}:`, { error: errorInverse.message });
        }

        inserted++;

        // Rate limit: avoid overwhelming the database
        if (inserted % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          process.stdout.write(`\r[BACKFILL] ${symbol}: Inserted ${inserted}, Skipped ${skipped}`);
        }
      }

      console.log(''); // New line after progress
      logger.info(`[BACKFILL] ${symbol} complete: Inserted ${inserted}, Skipped ${skipped}`);

      totalInserted += inserted;
      totalSkipped += skipped;

      // Delay between different pairs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info(`\n[BACKFILL] ✅ ALL PAIRS COMPLETE!`);
    logger.info(`  - Total inserted: ${totalInserted} dates`);
    logger.info(`  - Total skipped: ${totalSkipped} existing dates`);
    logger.info(`  - Pairs: EUR/BRL, EUR/USD, USD/BRL (+ inverses)`);

    return {
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped
    };

  } catch (error) {
    logger.error('[BACKFILL] ❌ Error:', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

/**
 * CLI interface
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 365;

  console.log('📊 Rate History Backfill Tool\n');
  console.log(`📅 Fetching last ${days} days of rates from Yahoo Finance`);
  console.log(`💱 Pairs: EUR/BRL, EUR/USD, USD/BRL (+ inverses)`);
  console.log(`💾 Storing in Supabase rates_history table\n`);

  backfillRates(days)
    .then(result => {
      if (result.success) {
        console.log('\n✅ BACKFILL COMPLETE');
        process.exit(0);
      } else {
        console.error('\n❌ BACKFILL FAILED:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 UNEXPECTED ERROR:', error);
      process.exit(1);
    });
}

export { backfillRates };
