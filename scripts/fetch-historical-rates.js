// scripts/fetch-historical-rates.js
// Récupère 90 jours d'historique pour 6 paires de devises via Yahoo Finance

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('📊 FETCH HISTORICAL RATES - 90 DAYS\n');
console.log('='.repeat(80));

// Paires à récupérer (Yahoo Finance symbols)
const PAIRS = {
  'EURBRL=X': 'eurbrl',
  'EURUSD=X': 'eurusd',
  'USDBRL=X': 'usdbrl'
};

/**
 * Fetch historical data from Yahoo Finance
 */
async function fetchYahooHistory(symbol, days = 90) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${days}d`;
  
  console.log(`\n📡 Fetching ${symbol}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EUR-BRL-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data in Yahoo response');
    }
    
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const closes = quotes.close;
    
    // Construire l'historique
    const history = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null) {
        history.push({
          timestamp: new Date(timestamps[i] * 1000).toISOString(),
          rate: closes[i]
        });
      }
    }
    
    console.log(`✅ ${symbol}: ${history.length} days retrieved`);
    console.log(`   Range: ${history[0].timestamp.split('T')[0]} → ${history[history.length-1].timestamp.split('T')[0]}`);
    console.log(`   Rates: ${history[0].rate.toFixed(4)} → ${history[history.length-1].rate.toFixed(4)}`);
    
    return history;
    
  } catch (error) {
    console.error(`❌ ${symbol} failed:`, error.message);
    return null;
  }
}

/**
 * Calculate inverse pair
 */
function calculateInverse(history, originalPair, inversePair) {
  return history.map(entry => ({
    timestamp: entry.timestamp,
    rate: 1 / entry.rate,
    pair: inversePair,
    original_pair: originalPair
  }));
}

/**
 * Save to Supabase
 */
async function saveToDatabase(pair, history) {
  console.log(`\n💾 Saving ${pair} to database...`);
  
  const records = history.map(entry => ({
    pair,
    rate: entry.rate,
    timestamp: entry.timestamp
  }));
  
  // Insert en batch (Supabase limite à 1000 par requête)
  const batchSize = 1000;
  let totalInserted = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('rates_history')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch:`, error.message);
    } else {
      totalInserted += batch.length;
    }
  }
  
  console.log(`✅ ${pair}: ${totalInserted}/${records.length} records saved`);
  return totalInserted;
}

/**
 * Main execution
 */
async function main() {
  let totalRecords = 0;
  const results = {};
  
  // 1. Fetch les 3 paires directes depuis Yahoo
  console.log('\n📥 STEP 1: Fetching direct pairs from Yahoo Finance');
  console.log('-'.repeat(80));
  
  for (const [symbol, pair] of Object.entries(PAIRS)) {
    const history = await fetchYahooHistory(symbol);
    
    if (history) {
      results[pair] = history;
      
      // Calculer la paire inverse
      const inversePair = pair.split('').reverse().join('').replace('lrbrue', 'eurbrl').replace('dsuerue', 'eurusd').replace('lrbdsu', 'usdbrl');
      
      // Mapping correct des inverses
      let inverseKey;
      if (pair === 'eurbrl') inverseKey = 'brleur';
      else if (pair === 'eurusd') inverseKey = 'usdeur';
      else if (pair === 'usdbrl') inverseKey = 'brlusd';
      
      results[inverseKey] = calculateInverse(history, pair, inverseKey);
      
      console.log(`   ↔️  Calculated inverse: ${inverseKey}`);
    }
    
    // Petit délai pour ne pas spammer Yahoo
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 2. Sauvegarder toutes les paires
  console.log('\n\n💾 STEP 2: Saving to database');
  console.log('-'.repeat(80));
  
  for (const [pair, history] of Object.entries(results)) {
    if (history) {
      const saved = await saveToDatabase(pair, history);
      totalRecords += saved;
    }
  }
  
  // 3. Résumé
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Total records saved: ${totalRecords}`);
  console.log(`✅ Pairs processed: ${Object.keys(results).length}`);
  console.log('');
  console.log('Pairs in database:');
  for (const pair of Object.keys(results)) {
    const count = results[pair]?.length || 0;
    console.log(`   • ${pair.toUpperCase()}: ${count} days`);
  }
  console.log('');
  console.log('🎉 Historical data import complete!');
  console.log('✅ Ready for alerts system');
  console.log('='.repeat(80));
}

// Execute
main().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error);
  process.exit(1);
});