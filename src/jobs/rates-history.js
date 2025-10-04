// src/jobs/rates-history.js
// CRON Job : Sauvegarde taux historiques toutes les 2h

import 'dotenv/config';
import { DatabaseService } from '../services/database.js';

const db = new DatabaseService();

// Paires Yahoo Finance
const YAHOO_PAIRS = {
  'EURBRL=X': 'eurbrl',
  'EURUSD=X': 'eurusd', 
  'USDBRL=X': 'usdbrl'
};

/**
 * Fetch taux depuis Yahoo Finance
 */
async function fetchYahooRate(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }
    
    const data = await response.json();
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    
    if (!rate || isNaN(rate)) {
      throw new Error('Invalid rate data');
    }
    
    return rate;
    
  } catch (error) {
    console.error(`[YAHOO] ❌ ${symbol} failed:`, error.message);
    return null;
  }
}

/**
 * Calculer paire inverse
 */
function calculateInverseRate(rate, originalPair) {
  const inverseRate = 1 / rate;
  
  // Mapping des paires inverses
  const inverseMap = {
    'eurbrl': 'brleur',
    'eurusd': 'usdeur',
    'usdbrl': 'brlusd'
  };
  
  return {
    pair: inverseMap[originalPair],
    rate: inverseRate
  };
}

/**
 * Job principal : sauvegarde toutes les paires
 */
export async function saveRatesHistory() {
  console.log('\n⏰ [CRON-RATES] Starting rates history job...');
  console.log(`[CRON-RATES] Time: ${new Date().toISOString()}`);
  
  const results = {
    success: [],
    failed: []
  };
  
  try {
    // 1. Fetch les 3 paires directes depuis Yahoo
    for (const [symbol, pair] of Object.entries(YAHOO_PAIRS)) {
      console.log(`[CRON-RATES] 📡 Fetching ${symbol}...`);
      
      const rate = await fetchYahooRate(symbol);
      
      if (rate) {
        // Sauvegarder paire directe
        const saved = await db.saveRateHistory({
          pair,
          rate,
          timestamp: new Date().toISOString()
        });
        
        if (saved) {
          results.success.push({ pair, rate });
          console.log(`[CRON-RATES] ✅ ${pair}: ${rate.toFixed(4)}`);
          
          // Calculer et sauvegarder paire inverse
          const inverse = calculateInverseRate(rate, pair);
          const savedInverse = await db.saveRateHistory({
            pair: inverse.pair,
            rate: inverse.rate,
            timestamp: new Date().toISOString()
          });
          
          if (savedInverse) {
            results.success.push({ pair: inverse.pair, rate: inverse.rate });
            console.log(`[CRON-RATES] ✅ ${inverse.pair}: ${inverse.rate.toFixed(4)}`);
          }
        } else {
          results.failed.push({ pair, error: 'Failed to save' });
        }
      } else {
        results.failed.push({ pair, error: 'Failed to fetch' });
      }
      
      // Petit délai entre requêtes Yahoo
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 2. Résumé
    console.log('\n' + '='.repeat(60));
    console.log('[CRON-RATES] 📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${results.success.length} pairs`);
    console.log(`❌ Failed: ${results.failed.length} pairs`);
    
    if (results.success.length > 0) {
      console.log('\nSaved rates:');
      results.success.forEach(r => {
        console.log(`  • ${r.pair.toUpperCase()}: ${r.rate.toFixed(4)}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed pairs:');
      results.failed.forEach(r => {
        console.log(`  • ${r.pair}: ${r.error}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
    
    return results;
    
  } catch (error) {
    console.error('[CRON-RATES] 💥 Critical error:', error);
    return results;
  }
}

/**
 * Test manuel (pour développement)
 * Détection compatible Windows + Unix
 */
const isMainModule = process.argv[1] && (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
);

if (isMainModule) {
  console.log('🧪 Manual execution - Testing rates history job\n');
  saveRatesHistory()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}