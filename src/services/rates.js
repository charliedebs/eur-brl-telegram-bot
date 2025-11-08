// src/services/rates.js
// Version complète avec Yahoo + Kraken + CoinMarketCap + fallback CoinGecko

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
// KRAKEN - Source principale (pas de clé API nécessaire)
// ==========================================

async function fetchKrakenRates() {
  try {
    // Kraken utilise des noms de pairs spéciaux
    const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=USDCBRL,EURUSDC', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EUR-BRL-Bot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Kraken API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken error: ${data.error.join(', ')}`);
    }

    // Kraken renvoie les noms de pairs avec des préfixes variables
    const result = data.result;

    // Trouver USDC/BRL (peut être USDCBRL, XUSDCZBRL, etc.)
    let usdcBRL = null;
    for (const [pair, data] of Object.entries(result)) {
      if (pair.includes('USDC') && pair.includes('BRL')) {
        usdcBRL = parseFloat(data.c[0]); // c[0] = current price
        console.log(`[RATES-KRAKEN] Found USDC/BRL pair: ${pair} = ${usdcBRL}`);
        break;
      }
    }

    // Trouver EUR/USDC
    let eurUsdc = null;
    for (const [pair, data] of Object.entries(result)) {
      if (pair.includes('EUR') && pair.includes('USDC')) {
        eurUsdc = parseFloat(data.c[0]);
        console.log(`[RATES-KRAKEN] Found EUR/USDC pair: ${pair} = ${eurUsdc}`);
        break;
      }
    }

    // Si pas trouvé, essayer les pairs individuellement
    if (!usdcBRL || !eurUsdc) {
      console.log('[RATES-KRAKEN] Pairs not found in combined request, trying separately...');

      if (!usdcBRL) {
        const brlResp = await fetch('https://api.kraken.com/0/public/Ticker?pair=USDCBRL');
        const brlData = await brlResp.json();
        if (brlData.result) {
          const firstPair = Object.values(brlData.result)[0];
          usdcBRL = parseFloat(firstPair.c[0]);
        }
      }

      if (!eurUsdc) {
        const eurResp = await fetch('https://api.kraken.com/0/public/Ticker?pair=EURUSDC');
        const eurData = await eurResp.json();
        if (eurData.result) {
          const firstPair = Object.values(eurData.result)[0];
          eurUsdc = parseFloat(firstPair.c[0]);
        }
      }
    }

    if (!usdcBRL || !eurUsdc || isNaN(usdcBRL) || isNaN(eurUsdc)) {
      throw new Error('Missing or invalid rate data from Kraken');
    }

    const usdcEUR = 1 / eurUsdc;

    return {
      usdcBRL,
      usdcEUR,
      source: 'kraken'
    };

  } catch (error) {
    console.error('[RATES-KRAKEN] ❌ Error:', error.message);
    throw error;
  }
}

// ==========================================
// COINMARKETCAP - Fallback 1 (nécessite clé API gratuite)
// ==========================================

async function fetchCoinMarketCapRates() {
  try {
    const apiKey = process.env.CMC_API_KEY;

    if (!apiKey) {
      throw new Error('CMC_API_KEY not configured');
    }

    // CMC utilise des IDs: USDC=3408
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=3408&convert=BRL,EUR',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status?.error_code) {
      throw new Error(`CMC error: ${data.status.error_message}`);
    }

    const usdcData = data.data['3408']; // USDC ID
    const usdcBRL = usdcData?.quote?.BRL?.price;
    const usdcEUR = usdcData?.quote?.EUR?.price;

    if (!usdcBRL || !usdcEUR) {
      throw new Error('Missing rate data from CoinMarketCap');
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

  // 2. Kraken (principal - pas de clé API nécessaire)
  try {
    console.log('[RATES] 📡 Fetching from Kraken...');
    const { usdcBRL, usdcEUR, source } = await fetchKrakenRates();
    
    const eurToUsdc = 1 / usdcEUR;
    const crossKraken = eurToUsdc * usdcBRL;

    // 3. Yahoo Finance (référence FX officielle)
    let crossReference = crossKraken; // Fallback
    let referenceSource = 'kraken';
    
    try {
      console.log('[RATES] 📡 Fetching Yahoo reference...');
      const yahooRate = await fetchYahooRate();
      crossReference = yahooRate;
      referenceSource = 'yahoo';
      console.log(`[RATES] ✅ Yahoo: EUR/BRL = ${yahooRate.toFixed(4)}`);
    } catch (yahooError) {
      console.warn('[RATES] ⚠️ Yahoo failed, using Kraken cross as reference');
    }

    const rates = {
      usdcBRL,
      usdcEUR,
      eurToUsdc,
      cross: crossReference,
      crossBinance: crossKraken, // Keep field name for compatibility
      timestamp: new Date().toISOString(),
      source,
      referenceSource
    };
    
    // Mettre à jour le cache
    ratesCache = rates;
    cacheTimestamp = Date.now();

    console.log(`[RATES] ✅ Complete: Ref=${crossReference.toFixed(4)} (${referenceSource}), Kraken=${crossKraken.toFixed(4)}`);
    return rates;

  } catch (krakenError) {
    console.warn('[RATES] ⚠️ Kraken failed, trying CoinMarketCap fallback...');

    // 4. Fallback CoinMarketCap (si Kraken fail)
    try {
      const { usdcBRL, usdcEUR, source } = await fetchCoinMarketCapRates();

      const eurToUsdc = 1 / usdcEUR;
      const crossCMC = eurToUsdc * usdcBRL;

      // Essayer Yahoo même si Kraken a fail
      let crossReference = crossCMC;
      let referenceSource = 'coinmarketcap';
      
      try {
        const yahooRate = await fetchYahooRate();
        crossReference = yahooRate;
        referenceSource = 'yahoo';
      } catch {
        console.warn('[RATES] ⚠️ Yahoo also failed, using CoinMarketCap cross');
      }

      const rates = {
        usdcBRL,
        usdcEUR,
        eurToUsdc,
        cross: crossReference,
        crossBinance: crossCMC, // Keep field name for compatibility
        timestamp: new Date().toISOString(),
        source,
        referenceSource
      };

      ratesCache = rates;
      cacheTimestamp = Date.now();

      console.log(`[RATES] ✅ CoinMarketCap: EUR/BRL = ${crossReference.toFixed(4)}`);
      return rates;

    } catch (cmcError) {
      console.warn('[RATES] ⚠️ CoinMarketCap also failed, trying CoinGecko fallback...');

      // 5. Fallback CoinGecko (dernier recours)
      try {
        const { usdcBRL, usdcEUR, source } = await fetchCoinGeckoRates();

        const eurToUsdc = 1 / usdcEUR;
        const crossCoinGecko = eurToUsdc * usdcBRL;

        // Essayer Yahoo même si CMC a fail
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
          crossBinance: crossCoinGecko, // Keep field name for compatibility
          timestamp: new Date().toISOString(),
          source,
          referenceSource
        };

        ratesCache = rates;
        cacheTimestamp = Date.now();

        console.log(`[RATES] ✅ CoinGecko: EUR/BRL = ${crossReference.toFixed(4)}`);
        return rates;

      } catch (coinGeckoError) {
        console.error('[RATES] ❌ All sources failed (Kraken, CMC, CoinGecko)');

        // 6. Cache stale en dernier recours
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