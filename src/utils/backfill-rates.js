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
 * Save historical rates to database
 */
async function backfillRates(days = 365) {
  logger.info(`\n📥 [BACKFILL] Starting backfill for last ${days} days...`);

  try {
    // Fetch EUR/BRL historical data
    logger.info('[BACKFILL] Fetching EUR/BRL from Yahoo Finance...');
    const eurBrlRates = await fetchHistoricalRates('EURBRL=X', days);

    if (eurBrlRates.length === 0) {
      logger.error('[BACKFILL] ❌ Failed to fetch EUR/BRL data');
      return { success: false, error: 'No data fetched' };
    }

    logger.info(`[BACKFILL] ✅ Fetched ${eurBrlRates.length} EUR/BRL data points`);

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

    // Insert only missing dates
    let inserted = 0;
    let skipped = 0;

    for (const { date, rate } of eurBrlRates) {
      const dateStr = date.toDateString();

      if (existingDates.has(dateStr)) {
        skipped++;
        continue;
      }

      // Calculate BRL/EUR
      const brlEurRate = 1 / rate;

      // Insert EUR/BRL
      const { error: errorEur } = await db.supabase
        .from('rates_history')
        .insert({
          pair: 'eurbrl',
          rate: rate,
          source: 'yahoo_backfill',
          timestamp: date.toISOString()
        });

      if (errorEur) {
        logger.error(`[BACKFILL] Failed to insert EUR/BRL for ${dateStr}:`, { error: errorEur.message });
        continue;
      }

      // Insert BRL/EUR
      const { error: errorBrl } = await db.supabase
        .from('rates_history')
        .insert({
          pair: 'brleur',
          rate: brlEurRate,
          source: 'yahoo_backfill',
          timestamp: date.toISOString()
        });

      if (errorBrl) {
        logger.error(`[BACKFILL] Failed to insert BRL/EUR for ${dateStr}:`, { error: errorBrl.message });
      }

      inserted++;

      // Rate limit: avoid overwhelming the database
      if (inserted % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        process.stdout.write(`\r[BACKFILL] Inserted: ${inserted}, Skipped: ${skipped}`);
      }
    }

    console.log(''); // New line after progress
    logger.info(`\n[BACKFILL] ✅ Complete!`);
    logger.info(`  - Inserted: ${inserted} new dates`);
    logger.info(`  - Skipped: ${skipped} existing dates`);
    logger.info(`  - Total in range: ${eurBrlRates.length}`);

    return {
      success: true,
      inserted,
      skipped,
      total: eurBrlRates.length
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
  console.log(`📅 Fetching last ${days} days of EUR/BRL rates from Yahoo Finance`);
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
