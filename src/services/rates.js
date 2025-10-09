// src/services/rates.js
// Version complète avec Yahoo + Binance + fallback CoinGecko

import { FEES } from '../config/constants.js';

// Cache simple en mémoire (1 minute de validité)
let ratesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

// ==========================================
// YAHOO FINANCE - Taux FX officiel
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
// BINANCE - Pairs USDC directes
// ==========================================

async function fetchBinanceRates() {
  try {
    const [usdcBrlResponse, eurUsdcResponse] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCBRL'),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC')
    ]);
    
    if (!usdcBrlResponse.ok) {
      throw new Error(`Binance USDCBRL error: ${usdcBrlResponse.status}`);
    }
    
    const usdcBrlData = await usdcBrlResponse.json();
    const usdcBRL = parseFloat(usdcBrlData.price);
    
    let usdcEUR;
    
    if (eurUsdcResponse.ok) {
      const eurUsdcData = await eurUsdcResponse.json();
      const eurUsdc = parseFloat(eurUsdcData.price);
      usdcEUR = 1 / eurUsdc;
      console.log('[RATES-BINANCE] Using EURUSDC pair');
    } else {
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

// ==========================================
// COINGECKO - Fallback uniquement
// ==========================================

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

// ==========================================
// GET RATES - Fonction principale
// ==========================================

export async function getRates() {
  // 1. Vérifier le cache
  if (ratesCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      console.log(`[RATES] ✅ Using cache (age: ${Math.round(age/1000)}s)`);
      return ratesCache;
    }
  }

  // 2. Binance (principal - pour calculs on-chain)
  try {
    console.log('[RATES] 📡 Fetching from Binance...');
    const { usdcBRL, usdcEUR, source } = await fetchBinanceRates();
    
    const eurToUsdc = 1 / usdcEUR;
    const crossBinance = eurToUsdc * usdcBRL;
    
    // 3. Yahoo Finance (référence FX officielle)
    let crossReference = crossBinance; // Fallback
    let referenceSource = 'binance';
    
    try {
      console.log('[RATES] 📡 Fetching Yahoo reference...');
      const yahooRate = await fetchYahooRate();
      crossReference = yahooRate;
      referenceSource = 'yahoo';
      console.log(`[RATES] ✅ Yahoo: EUR/BRL = ${yahooRate.toFixed(4)}`);
    } catch (yahooError) {
      console.warn('[RATES] ⚠️ Yahoo failed, using Binance cross as reference');
    }
    
    const rates = {
      usdcBRL,
      usdcEUR,
      eurToUsdc,
      cross: crossReference,
      crossBinance,
      timestamp: new Date().toISOString(),
      source,
      referenceSource
    };
    
    // Mettre à jour le cache
    ratesCache = rates;
    cacheTimestamp = Date.now();
    
    console.log(`[RATES] ✅ Complete: Ref=${crossReference.toFixed(4)} (${referenceSource}), Binance=${crossBinance.toFixed(4)}`);
    return rates;
    
  } catch (binanceError) {
    console.warn('[RATES] ⚠️ Binance failed, trying CoinGecko fallback...');
    
    // 4. Fallback CoinGecko (uniquement si Binance fail)
    try {
      const { usdcBRL, usdcEUR, source } = await fetchCoinGeckoRates();
      
      const eurToUsdc = 1 / usdcEUR;
      const crossCoinGecko = eurToUsdc * usdcBRL;
      
      // Essayer Yahoo même si Binance a fail
      let crossReference = crossCoinGecko;
      let referenceSource = 'coingecko';
      
      try {
        const yahooRate = await fetchYahooRate();
        crossReference = yahooRate;
        referenceSource = 'yahoo';
      } catch {
        console.warn('[RATES] ⚠️ Yahoo also failed, using CoinGecko cross');
      }
      
      const rates = {
        usdcBRL,
        usdcEUR,
        eurToUsdc,
        cross: crossReference,
        crossBinance: crossCoinGecko,
        timestamp: new Date().toISOString(),
        source,
        referenceSource
      };
      
      ratesCache = rates;
      cacheTimestamp = Date.now();
      
      console.log(`[RATES] ✅ CoinGecko: EUR/BRL = ${crossReference.toFixed(4)}`);
      return rates;
      
    } catch (coinGeckoError) {
      console.error('[RATES] ❌ CoinGecko also failed');
      
      // 5. Cache stale en dernier recours
      if (ratesCache) {
        const age = Date.now() - cacheTimestamp;
        console.warn(`[RATES] ⚠️ Using stale cache (age: ${Math.round(age/1000)}s)`);
        return ratesCache;
      }
      
      console.error('[RATES] 💥 All sources failed, no cache available');
      return null;
    }
  }
}

// ==========================================
// CALCULS ON-CHAIN
// ==========================================

function calculateEURtoBRL(eurIn, rates) {
  const { eurToUsdc, usdcBRL } = rates;
  
  const usdcAfterBuy = eurIn * (1 - FEES.TRADE_EU) * eurToUsdc;
  const usdcAfterNetwork = Math.max(0, usdcAfterBuy - FEES.NETWORK_USDC_FIXED);
  const brlAfterTrade = usdcAfterNetwork * (1 - FEES.TRADE_BR) * usdcBRL;
  const brlNet = Math.max(0, brlAfterTrade - FEES.WITHDRAW_BRL_FIXED);
  
  return {
    in: eurIn,
    out: brlNet,
    rate: brlNet / eurIn,
    breakdown: { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet }
  };
}

function calculateBRLtoEUR(brlIn, rates) {
  const { eurToUsdc, usdcBRL } = rates;
  
  const usdcFromBRL = (brlIn / usdcBRL) * (1 - FEES.TRADE_BR);
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

export function calculateOnChain(route, amount, rates) {
  return route === 'eurbrl' 
    ? calculateEURtoBRL(amount, rates)
    : calculateBRLtoEUR(amount, rates);
}

export function calculateOnChainReverse(route, targetAmount, rates) {
  // Calcul inversé : partir du montant cible pour trouver le montant source nécessaire
  
  if (route === 'eurbrl') {
    // Je veux recevoir X BRL, combien d'EUR faut-il envoyer ?
    
    const brlTarget = targetAmount;
    
    // Étape 4 inverse : Avant Pix (retrait)
    const brlBeforePix = brlTarget + FEES.WITHDRAW_BRL_FIXED;
    
    // Étape 3 inverse : Avant vente USDC
    const brlBeforeTrade = brlBeforePix / (1 - FEES.TRADE_BR);
    const usdcInBrazil = brlBeforeTrade / rates.usdcBRL;
    
    // Étape 2 inverse : Avant transfert blockchain
    const usdcInEurope = usdcInBrazil + FEES.NETWORK_USDC_FIXED;
    
    // Étape 1 inverse : Avant achat USDC en Europe
    const eurNeeded = (usdcInEurope * rates.usdcEUR) / (1 - FEES.TRADE_EU);
    
    const effectiveRate = brlTarget / eurNeeded;
    
    return {
      in: eurNeeded,          // EUR à envoyer
      out: targetAmount,      // BRL à recevoir
      rate: effectiveRate,
      breakdown: {
        eurNeeded,
        usdcBought: usdcInEurope,
        usdcAfterNetwork: usdcInBrazil,
        brlAfterTrade: brlBeforePix,
        brlNet: brlTarget
      }
    };
    
  } else {
    // brleur : Je veux recevoir X EUR, combien de BRL faut-il envoyer ?
    
    const eurTarget = targetAmount;
    
    // Étape 3 inverse : Avant vente USDC en Europe
    const eurBeforeTrade = eurTarget / (1 - FEES.TRADE_EU);
    const usdcInEurope = eurBeforeTrade / rates.usdcEUR;
    
    // Étape 2 inverse : Avant transfert blockchain
    const usdcInBrazil = usdcInEurope + FEES.NETWORK_USDC_FIXED;
    
    // Étape 1 inverse : Avant achat USDC au Brésil
    const brlNeeded = (usdcInBrazil * rates.usdcBRL) / (1 - FEES.TRADE_BR);
    
    const effectiveRate = eurTarget / brlNeeded;
    
    return {
      in: brlNeeded,          // BRL à envoyer
      out: targetAmount,      // EUR à recevoir
      rate: effectiveRate,
      breakdown: {
        brlNeeded,
        usdcBought: usdcInBrazil,
        usdcAfterNetwork: usdcInEurope,
        eurAfterTrade: eurTarget,
        eurNet: eurTarget
      }
    };
  }
}

// ==========================================
// FORMAT HELPERS
// ==========================================

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