// Affiliate/referral links
export const LINKS = {
  // Exchanges
  KRAKEN: 'https://www.kraken.com/sign-up',
  BINANCE_EU: 'https://accounts.binance.com/register?ref=74116949',
  BINANCE_BR: 'https://accounts.binance.com/register?ref=74116949',
  BITVAVO: 'https://bitvavo.com/',
  BITSTAMP: 'https://www.bitstamp.net/',
  COINBASE: 'https://www.coinbase.com/',
  
  // Brazilian exchanges
  BITSO: 'https://bitso.com/',
  MERCADO_BITCOIN: 'https://www.mercadobitcoin.com.br/',
  FOXBIT: 'https://foxbit.com.br/',
  
  // Off-chain providers
  WISE: 'https://wise.com/invite/dic/charlied197',
  REMITLY: 'https://www.remitly.com/',
  INSTAREM: 'https://www.instarem.com/',
};

// Fee structure for on-chain calculations
export const FEES = {
  TRADE_EU: 0.001,      // 0,1%
  TRADE_BR: 0.001,      // 0,1% (ajusté)
  NETWORK_USDC_FIXED: 1.0,
  WITHDRAW_BRL_FIXED: 3.5,
  SAFETY_DISCOUNT: 0,   // SUPPRIMÉ
};

// Default amounts
export const DEFAULTS = {
  EUR: 1000,
  BRL: 5000,
};

// Supported languages
export const LANGUAGES = {
  FR: 'fr',
  PT: 'pt',
  EN: 'en',
};

// Providers to show in comparisons
export const PROVIDERS = ['Wise', 'Remitly', 'Instarem'];

export const PROVIDER_LINKS = {
  'Wise': 'https://wise.com/invite/dic/charlied197',
  'Remitly': 'https://remit.ly/gmt9kg4h',
  'Instarem': 'https://www.instarem.com/',
  'PayPal': 'https://www.paypal.com/',
  'Western Union': 'https://www.westernunion.com/',
  'Skrill': 'https://www.skrill.com/',
  'BNP Paribas': 'https://mabanque.bnpparibas/',
  'OFX': 'https://www.ofx.com/',
};