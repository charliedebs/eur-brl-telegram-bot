// src/services/rates.js
// Version optimisée avec Binance API - Pairs USDC directes (0% écart)

import { FEES } from '../config/constants.js';

// Cache simple en mémoire (1 minute de validité)
let ratesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * Fetch rates from Binance Public API avec pairs USDC directes
 * Pairs utilisées:
 * - USDCBRL (USDC/BRL) - direct
 * - EURUSDC (EUR/USDC) - direct OU USDCEUR inversé
 */
async function fetchBinanceRates() {
  try {
    // Fetch les 2 pairs en parallèle
    const [usdcBrlResponse, eurUsdcResponse] = await Promise.all([
      // USDC/BRL direct
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCBRL'),
      
      // EUR/USDC direct (ou USDCEUR si pair inversée sur Binance)
      // On teste d'abord EURUSDC, si ça fail on essaie USDCEUR
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC')
    ]);
    
    if (!usdcBrlResponse.ok) {
      throw new Error(`Binance USDCBRL error: ${usdcBrlResponse.status}`);
    }
    
    const usdcBrlData = await usdcBrlResponse.json();
    const usdcBRL = parseFloat(usdcBrlData.price);
    
    // Gérer EUR/USDC (peut être EURUSDC ou USDCEUR selon Binance)
    let usdcEUR;
    
    if (eurUsdcResponse.ok) {
      // EURUSDC existe (EUR/USDC)
      const eurUsdcData = await eurUsdcResponse.json();
      const eurUsdc = parseFloat(eurUsdcData.price);
      usdcEUR = 1 / eurUsdc; // Inverser pour avoir USDC/EUR
      console.log('[RATES-BINANCE] Using EURUSDC pair');
    } else {
      // Essayer USDCEUR (USDC/EUR)
      console.log('[RATES-BINANCE] EURUSDC not found, trying USDCEUR...');
      const usdcEurResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCEUR');
      
      if (!usdcEurResponse.ok) {
        throw new Error('Neither EURUSDC nor USDCEUR available on Binance');
      }
      
      const usdcEurData = await usdcEurResponse.json();
      usdcEUR = parseFloat(usdcEurData.price);
      console.log('[RATES-BINANCE] Using USDCEUR pair');
    }
    
    if (!usdcBRL || !usdcEUR || isNaN(usdcBRL) || isNaN(usdcEUR)) {
      throw new Error('Invalid rate data from Binance');
    }
    
    return {
      usdcBRL,
      usdcEUR,
      source: 'binance'
    };
    
  } catch (error) {
    console.error('[RATES-BINANCE] ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Fetch rates from CoinGecko (fallback)
 */
async function fetchCoinGeckoRates() {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const url = apiKey 
      ? `https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl,eur&x_cg_demo_api_key=${apiKey}`
      : 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl,eur';
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EUR-BRL-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const usdcBRL = data['usd-coin']?.brl;
    const usdcEUR = data['usd-coin']?.eur;
    
    if (!usdcBRL || !usdcEUR) {
      throw new Error('Missing rate data from CoinGecko');
    }
    
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

/**
 * Get rates avec stratégie multi-source
 * 1. Binance (principal, pairs USDC directes)
 * 2. CoinGecko (fallback)
 * 3. Cache (si tout fail)
 */
export async function getRates() {
  // 1. Vérifier le cache
  if (ratesCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      console.log(`[RATES] ✅ Using cache (age: ${Math.round(age/1000)}s)`);
      return ratesCache;
    }
  }

  // 2. Essayer Binance (principal)
  try {
    console.log('[RATES] 📡 Fetching from Binance...');
    const { usdcBRL, usdcEUR, source } = await fetchBinanceRates();
    
    const eurToUsdc = 1 / usdcEUR;
    const cross = eurToUsdc * usdcBRL;
    
    const rates = {
      usdcBRL,
      usdcEUR,
      eurToUsdc,
      cross,
      timestamp: new Date().toISOString(),
      source
    };
    
    // Mettre à jour le cache
    ratesCache = rates;
    cacheTimestamp = Date.now();
    
    console.log(`[RATES] ✅ Binance: EUR/BRL = ${cross.toFixed(4)}`);
    return rates;
    
  } catch (binanceError) {
    console.warn('[RATES] ⚠️ Binance failed, trying CoinGecko fallback...');
    
    // 3. Fallback sur CoinGecko
    try {
      const { usdcBRL, usdcEUR, source } = await fetchCoinGeckoRates();
      
      const eurToUsdc = 1 / usdcEUR;
      const cross = eurToUsdc * usdcBRL;
      
      const rates = {
        usdcBRL,
        usdcEUR,
        eurToUsdc,
        cross,
        timestamp: new Date().toISOString(),
        source
      };
      
      // Mettre à jour le cache
      ratesCache = rates;
      cacheTimestamp = Date.now();
      
      console.log(`[RATES] ✅ CoinGecko: EUR/BRL = ${cross.toFixed(4)}`);
      return rates;
      
    } catch (coinGeckoError) {
      console.error('[RATES] ❌ CoinGecko also failed');
      
      // 4. Dernier recours : cache stale
      if (ratesCache) {
        const age = Date.now() - cacheTimestamp;
        console.warn(`[RATES] ⚠️ Using stale cache (age: ${Math.round(age/1000)}s)`);
        return ratesCache;
      }
      
      // 5. Vraiment rien
      console.error('[RATES] 💥 All sources failed, no cache available');
      return null;
    }
  }
}

// Calculate EUR → BRL
function calculateEURtoBRL(eurIn, rates) {
  const { eurToUsdc, usdcBRL } = rates;
  
  const usdcAfterBuy = eurIn * (1 - FEES.TRADE_EU) * eurToUsdc;
  const usdcAfterNetwork = Math.max(0, usdcAfterBuy - FEES.NETWORK_USDC_FIXED);
  const brlAfterTrade = usdcAfterNetwork * (1 - FEES.TRADE_BR) * (1 - FEES.SAFETY_DISCOUNT) * usdcBRL;
  const brlNet = Math.max(0, brlAfterTrade - FEES.WITHDRAW_BRL_FIXED);
  
  return {
    in: eurIn,
    out: brlNet,
    rate: brlNet / eurIn,
    breakdown: { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet }
  };
}

// Calculate BRL → EUR
function calculateBRLtoEUR(brlIn, rates) {
  const { eurToUsdc, usdcBRL } = rates;
  
  const usdcFromBRL = (brlIn / usdcBRL) * (1 - FEES.TRADE_BR) * (1 - FEES.SAFETY_DISCOUNT);
  const usdcAfterNetwork = Math.max(0, usdcFromBRL - FEES.NETWORK_USDC_FIXED);
  const eurOut = (usdcAfterNetwork / eurToUsdc) * (1 - FEES.TRADE_EU);
  const eurNet = Math.max(0, eurOut);
  
  return {
    in: brlIn,
    out: eurNet,
    rate: eurNet / brlIn,
    breakdown: { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet }
  };
}

// Main calculation
export function calculateOnChain(route, amount, rates) {
  return route === 'eurbrl' 
    ? calculateEURtoBRL(amount, rates)
    : calculateBRLtoEUR(amount, rates);
}

// Format helpers
export function formatAmount(amount, decimals = 2, locale = 'fr-FR') {
  if (typeof amount !== 'number' || !isFinite(amount)) return '—';
  return amount.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatRate(rate, locale = 'fr-FR') {
  return formatAmount(rate, 4, locale);
}

export function getLocale(lang) {
  switch (lang) {
    case 'pt': return 'pt-BR';
    case 'en': return 'en-US';
    default: return 'fr-FR';
  }
}