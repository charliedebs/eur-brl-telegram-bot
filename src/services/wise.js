const WISE_API_TOKEN = process.env.WISE_API_TOKEN;

export async function getWiseComparison(route, amount) {
  if (!WISE_API_TOKEN) {
    console.warn('WISE_API_TOKEN not configured');
    return null;
  }
  
  try {
    const sourceCurrency = route === 'brleur' ? 'BRL' : 'EUR';
    const targetCurrency = route === 'brleur' ? 'EUR' : 'BRL';
    const sourceAmount = Math.max(1, Math.round(amount * 100) / 100);
    
    const response = await fetch('https://api.wise.com/v4/comparisons', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ sourceCurrency, targetCurrency, sourceAmount })
    });
    
    if (!response.ok) throw new Error(`Wise API error: ${response.status}`);
    
    const data = await response.json();
    const keepProviders = ['Wise', 'Remitly', 'Instarem'];
    
    const providers = (data.providers || [])
      .filter(p => keepProviders.includes(p.name))
      .map(p => ({
        provider: p.name,
        out: p.targetAmount,
        rate: p.rate,
        fee: p.fee
      }))
      .filter(p => p.out && p.rate)
      .sort((a, b) => b.out - a.out);
    
    return { providers, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Failed to fetch Wise comparison:', error);
    return null;
  }
}

export function getWiseFallback(route, amount, crossRate) {
  const estimatedRate = crossRate * 0.98;
  const estimatedOut = route === 'eurbrl' 
    ? amount * estimatedRate 
    : amount / estimatedRate;
  
  return {
    providers: [{
      provider: 'Wise (est.)',
      out: estimatedOut,
      rate: estimatedRate,
      fee: null
    }],
    timestamp: new Date().toISOString(),
    fallback: true
  };
}