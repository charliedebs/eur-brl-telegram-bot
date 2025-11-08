// src/services/rates.js
// Yahoo Finance (référence officielle EUR/BRL) + CoinGecko/CMC (on-chain via USDC)

import { FEES } from '../config/constants.js';

// Cache simple en mémoire (1 minute de validité)
let ratesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

// ==========================================
// YAHOO FINANCE - Taux FX officiel (RÉFÉRENCE UNIQUEMENT)
// ==========================================

async function fetchYahooRate() {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/EURBRL=X?interval=1d',
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
    const yahooRate = data.chart.result[0].meta.regularMarketPrice;

    if (!yahooRate || isNaN(yahooRate)) {
      throw new Error('Invalid Yahoo rate data');
    }

    return yahooRate;

  } catch (error) {
    console.error('[RATES-YAHOO] ❌ Error:', error.message);
    throw error;
  }
}

// ==========================================
// COINGECKO - Source principale pour on-chain (USDC)
// ==========================================

async function fetchCoinGeckoRates() {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;

    const headers = {
      'Accept': 'application/json'
    };

    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl,eur',
      { headers }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const usdcBRL = data['usd-coin']?.brl;
    const usdcEUR = data['usd-coin']?.eur;

    if (!usdcBRL || !usdcEUR) {
      throw new Error('Missing rate data from CoinGecko');
    }

    console.log(`[RATES-COINGECKO] ✅ USDC/BRL = ${usdcBRL.toFixed(4)}, USDC/EUR = ${usdcEUR.toFixed(4)}`);

    return {
      usdcBRL,
      usdcEUR,
      source: 'coingecko'
    };

  } catch (error) {
    console.error('[RATES-COINGECKO] ❌ Error:', error.message);
    throw error;
  }
}

// ==========================================
// COINMARKETCAP - Fallback pour on-chain (USDC)
// ==========================================

async function fetchCoinMarketCapRates() {
  try {
    const apiKey = process.env.CMC_API_KEY;

    if (!apiKey) {
      throw new Error('CMC_API_KEY not configured');
    }

    // CMC Free tier: cryptocurrency/quotes/latest
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=USDC&convert=BRL,EUR',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CoinMarketCap API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.status?.error_code) {
      throw new Error(`CMC error: ${data.status.error_message}`);
    }

    // CMC returns data by symbol
    const usdcData = data.data?.USDC;

    if (!usdcData) {
      throw new Error('USDC data not found in CMC response');
    }

    const usdcBRL = usdcData.quote?.BRL?.price;
    const usdcEUR = usdcData.quote?.EUR?.price;

    if (!usdcBRL || !usdcEUR) {
      throw new Error('Missing BRL or EUR quote from CoinMarketCap');
    }

    console.log(`[RATES-CMC] ✅ USDC/BRL = ${usdcBRL.toFixed(4)}, USDC/EUR = ${usdcEUR.toFixed(4)}`);

    return {
      usdcBRL,
      usdcEUR,
      source: 'coinmarketcap'
    };

  } catch (error) {
    console.error('[RATES-CMC] ❌ Error:', error.message);
    throw error;
  }
}

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

export async function getRates() {
  // 1. Vérifier cache
  if (ratesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('[RATES] ✅ Using cache');
    return ratesCache;
  }

  console.log('[RATES] 🔄 Cache expired or missing, fetching fresh rates...');

  // 2. Yahoo Finance pour la référence OFFICIELLE
  let yahooRate = null;
  let yahooFrozen = false;

  try {
    console.log('[RATES] 📡 Fetching Yahoo Finance reference...');
    yahooRate = await fetchYahooRate();
    console.log(`[RATES-YAHOO] ✅ EUR/BRL = ${yahooRate.toFixed(4)}`);
  } catch (yahooError) {
    console.warn('[RATES-YAHOO] ⚠️ Yahoo failed (likely weekend/market closed)');
    yahooFrozen = true;
  }

  // 3. CoinGecko pour on-chain (USDC bridge) - source principale
  let usdcBRL, usdcEUR, onchainSource;

  try {
    console.log('[RATES] 📡 Fetching CoinGecko for on-chain rates...');
    const geckoData = await fetchCoinGeckoRates();
    usdcBRL = geckoData.usdcBRL;
    usdcEUR = geckoData.usdcEUR;
    onchainSource = geckoData.source;
  } catch (geckoError) {
    console.warn('[RATES] ⚠️ CoinGecko failed, trying CoinMarketCap fallback...');

    try {
      const cmcData = await fetchCoinMarketCapRates();
      usdcBRL = cmcData.usdcBRL;
      usdcEUR = cmcData.usdcEUR;
      onchainSource = cmcData.source;
    } catch (cmcError) {
      console.error('[RATES] ❌ Both CoinGecko and CMC failed for on-chain rates');

      // Fallback au cache stale si disponible
      if (ratesCache) {
        const age = Date.now() - cacheTimestamp;
        console.warn(`[RATES] ⚠️ Using stale cache (age: ${Math.round(age/1000)}s)`);
        return ratesCache;
      }

      console.error('[RATES] 💥 All sources failed, no cache available');
      return null;
    }
  }

  // 4. Calculer le cross rate on-chain via USDC
  const eurToUsdc = 1 / usdcEUR;
  const onchainCross = eurToUsdc * usdcBRL;

  // 5. Déterminer la référence à afficher
  let referenceRate;
  let referenceSource;

  if (yahooRate) {
    // Yahoo disponible = référence officielle
    referenceRate = yahooRate;
    referenceSource = 'yahoo';
  } else {
    // Yahoo indisponible (weekend) = utiliser le cross on-chain
    referenceRate = onchainCross;
    referenceSource = onchainSource;
    yahooFrozen = true;
  }

  // 6. Construire l'objet de résultat
  const rates = {
    // Référence officielle (Yahoo ou frozen)
    cross: referenceRate,
    referenceSource,
    yahooFrozen,

    // Taux on-chain via USDC
    usdcBRL,
    usdcEUR,
    eurToUsdc,
    crossBinance: onchainCross, // Nom conservé pour compatibilité
    source: onchainSource,

    timestamp: new Date().toISOString()
  };

  // Mettre à jour le cache
  ratesCache = rates;
  cacheTimestamp = Date.now();

  console.log(`[RATES] ✅ Complete: Reference=${referenceRate.toFixed(4)} (${referenceSource}${yahooFrozen ? ', frozen' : ''}), On-chain=${onchainCross.toFixed(4)} (${onchainSource})`);

  return rates;
}

// ==========================================
// CALCULS ON-CHAIN
// ==========================================

export async function fetchOnChainRates(from, to, amount) {
  const rates = await getRates();

  if (!rates) {
    throw new Error('Unable to fetch rates');
  }

  const { usdcBRL, eurToUsdc } = rates;

  let result;
  if (from === 'EUR' && to === 'BRL') {
    const usdcAmount = amount * eurToUsdc;
    const brlAmount = usdcAmount * usdcBRL;
    const impliedRate = brlAmount / amount;

    result = {
      you_get: brlAmount,
      rate: impliedRate,
      fee: 0,
      you_send: amount
    };
  } else if (from === 'BRL' && to === 'EUR') {
    const usdcAmount = amount / usdcBRL;
    const eurAmount = usdcAmount / eurToUsdc;
    const impliedRate = amount / eurAmount;

    result = {
      you_get: eurAmount,
      rate: impliedRate,
      fee: 0,
      you_send: amount
    };
  }

  return result;
}

// ==========================================
// CALCULS PROVIDERS TRADITIONNELS
// ==========================================

export function fetchProviderRate(provider, from, to, amount) {
  const baseRate = ratesCache?.cross || 6.0;

  if (from === 'EUR' && to === 'BRL') {
    const markup = FEES[provider].markup;
    const appliedRate = baseRate * (1 - markup);
    const youGet = amount * appliedRate;
    const fee = FEES[provider].fee;

    return {
      you_get: youGet - fee,
      rate: appliedRate,
      fee,
      you_send: amount
    };
  } else if (from === 'BRL' && to === 'EUR') {
    const markup = FEES[provider].markup;
    const appliedRate = baseRate * (1 + markup);
    const youGet = amount / appliedRate;
    const fee = FEES[provider].fee;

    return {
      you_get: youGet - fee,
      rate: appliedRate,
      fee,
      you_send: amount
    };
  }
}
