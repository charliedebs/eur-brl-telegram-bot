import { FEES } from '../config/constants.js';

// Fetch USDC rates from CoinGecko
export async function getRates() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl,eur'
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const usdcBRL = data['usd-coin']?.brl;
    const usdcEUR = data['usd-coin']?.eur;
    
    if (!usdcBRL || !usdcEUR) {
      throw new Error('Missing rate data');
    }
    
    const eurToUsdc = 1 / usdcEUR;
    const cross = eurToUsdc * usdcBRL;
    
    return {
      usdcBRL,
      usdcEUR,
      eurToUsdc,
      cross,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch rates:', error);
    return null;
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