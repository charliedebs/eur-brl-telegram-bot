// src/jobs/rates-history.js
// CRON Job : Sauvegarde taux historiques toutes les 2h

import 'dotenv/config';
import { DatabaseService } from '../services/database.js';
import { logger } from '../utils/logger.js';

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
    logger.error(`[YAHOO] ❌ ${symbol} failed:`, { error: error.message });
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
  logger.info('\n⏰ [CRON-RATES] Starting rates history job...');
  logger.info(`[CRON-RATES] Time: ${new Date().toISOString()}`);

  const results = {
    success: [],
    failed: []
  };

  try {
    // 1. Fetch les 3 paires directes depuis Yahoo
    for (const [symbol, pair] of Object.entries(YAHOO_PAIRS)) {
      logger.info(`[CRON-RATES] 📡 Fetching ${symbol}...`);
      
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
          logger.info(`[CRON-RATES] ✅ ${pair}: ${rate.toFixed(4)}`);

          // Calculer et sauvegarder paire inverse
          const inverse = calculateInverseRate(rate, pair);
          const savedInverse = await db.saveRateHistory({
            pair: inverse.pair,
            rate: inverse.rate,
            timestamp: new Date().toISOString()
          });

          if (savedInverse) {
            results.success.push({ pair: inverse.pair, rate: inverse.rate });
            logger.info(`[CRON-RATES] ✅ ${inverse.pair}: ${inverse.rate.toFixed(4)}`);
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
    logger.info('\n' + '='.repeat(60));
    logger.info('[CRON-RATES] 📊 SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`✅ Success: ${results.success.length} pairs`);
    logger.info(`❌ Failed: ${results.failed.length} pairs`);

    if (results.success.length > 0) {
      logger.info('\nSaved rates:');
      results.success.forEach(r => {
        logger.info(`  • ${r.pair.toUpperCase()}: ${r.rate.toFixed(4)}`);
      });
    }

    if (results.failed.length > 0) {
      logger.error('\n❌ Failed pairs:');
      results.failed.forEach(r => {
        logger.error(`  • ${r.pair}: ${r.error}`);
      });
    }

    logger.info('='.repeat(60) + '\n');
    
    return results;

  } catch (error) {
    logger.error('[CRON-RATES] 💥 Critical error:', { error: error.message, stack: error.stack });
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
  logger.info('🧪 Manual execution - Testing rates history job\n');
  saveRatesHistory()
    .then(() => {
      logger.info('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n💥 Test failed:', { error: error.message, stack: error.stack });
      process.exit(1);
    });
}