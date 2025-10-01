// ✅ API PUBLIQUE - PAS BESOIN DE TOKEN !

export async function getWiseComparison(route, amount) {
  try {
    // Configuration de la requête
    const sourceCurrency = route === 'brleur' ? 'BRL' : 'EUR';
    const targetCurrency = route === 'brleur' ? 'EUR' : 'BRL';
    const sendAmount = Math.max(1, Math.round(amount * 100) / 100);
    
    // Construction de l'URL avec les paramètres
    const url = new URL('https://api.wise.com/v4/comparisons/');
    url.searchParams.set('sourceCurrency', sourceCurrency);
    url.searchParams.set('targetCurrency', targetCurrency);
    url.searchParams.set('sendAmount', sendAmount);
    
    // ✅ SANS filtre pour avoir TOUS les providers disponibles
    // (le filtre POPULAR limite trop pour EUR↔BRL)
    
    console.log('📡 Fetching Wise comparison:', url.toString());
    
    // Requête GET simple, SANS authentification
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EUR-BRL-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wise API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Log pour debug
    console.log('✅ Wise data received:', {
      totalProviders: data.providers?.length || 0,
      amount: data.amount
    });
    
    // Extraction : pour chaque provider, on prend la meilleure quote
    const providers = [];
    
    // Providers à exclure
    const excludeProviders = ['Xoom']; // TODO: enquêter sur Xoom (taux suspect)
    
    // Providers prioritaires (toujours afficher si disponibles)
    const priorityProviders = ['Wise', 'PayPal', 'Western Union'];
    
    for (const provider of data.providers || []) {
      // Skip providers exclus
      if (excludeProviders.includes(provider.name)) {
        console.log(`⏭️ Skipping ${provider.name}`);
        continue;
      }
      
      // Trier les quotes par receivedAmount (décroissant)
      let quotes = provider.quotes?.filter(q => q.receivedAmount && q.rate) || [];
      
      // Pour Instarem, forcer quote FR si disponible
      if (provider.name === 'Instarem') {
        const frQuote = quotes.find(q => q.sourceCountry === 'FR');
        if (frQuote) {
          quotes = [frQuote]; // Utiliser uniquement la quote FR
          console.log(`🇫🇷 Instarem: using FR quote (${frQuote.receivedAmount.toFixed(2)})`);
        }
      }
      
      const bestQuote = quotes.sort((a, b) => b.receivedAmount - a.receivedAmount)[0];
      
      if (bestQuote) {
        providers.push({
          provider: provider.name,
          out: bestQuote.receivedAmount,
          rate: bestQuote.rate,
          fee: bestQuote.fee,
          markup: bestQuote.markup,
          sourceCountry: bestQuote.sourceCountry,
          deliveryMin: bestQuote.deliveryEstimation?.duration?.min,
          deliveryMax: bestQuote.deliveryEstimation?.duration?.max,
          priority: priorityProviders.includes(provider.name), // Flag prioritaire
        });
      }
    }
    
    // Tri : providers prioritaires d'abord, puis par montant reçu
    providers.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return b.out - a.out;
    });
    
    console.log('📊 Processed providers:', providers.map(p => `${p.provider}${p.priority ? '*' : ''}: ${p.out.toFixed(2)} (fee: ${p.fee})`).join(', '));
    
    return { 
      providers, 
      timestamp: new Date().toISOString(),
      sourceAmount: data.amount 
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch Wise comparison:', error.message);
    // ❌ PAS DE FALLBACK - on retourne null
    return null;
  }
}