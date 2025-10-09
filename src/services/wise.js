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
    const excludeProviders = ['Xoom', 'Instarem']; // TODO: enquêter sur Xoom (taux suspect)
    
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
      
          const bestQuote = quotes.sort((a, b) => b.receivedAmount - a.receivedAmount)[0];
      
      if (bestQuote) {

        const effectiveRate = bestQuote.receivedAmount / sendAmount;

        providers.push({
          provider: provider.name,
          out: bestQuote.receivedAmount,
          rate: effectiveRate, // ← CORRECTION : taux effectif basé sur montant reçu
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

/**
 * Version inversée : calculer montant source nécessaire pour recevoir targetAmount
 * @param {string} route - 'eurbrl' | 'brleur'
 * @param {number} targetAmount - Montant qu'on veut RECEVOIR
 * @returns {object} { providers: [{ provider, in: source_needed, out: target, rate }] }
 */
export async function getWiseComparisonReverse(route, targetAmount) {
  try {
    const [sourceCurrency, targetCurrency] = route === 'eurbrl' 
      ? ['EUR', 'BRL'] 
      : ['BRL', 'EUR'];
    
    // Wise API v4 avec targetAmount (receiveAmount)
    const url = `https://api.wise.com/v4/public/comparisons/?sourceCurrency=${sourceCurrency}&targetCurrency=${targetCurrency}&receiveAmount=${targetAmount}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      console.error('[WISE-REVERSE] API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.providers || data.providers.length === 0) {
      console.warn('[WISE-REVERSE] No providers found');
      return null;
    }
    
    const providers = data.providers
      .filter(p => p.sendAmount && p.receiveAmount)
      .map(p => ({
        provider: p.name || 'Unknown',
        in: parseFloat(p.sendAmount),      // Montant SOURCE à envoyer
        out: parseFloat(p.receiveAmount),  // Montant CIBLE reçu (= targetAmount normalement)
        rate: parseFloat(p.sendAmount) / parseFloat(p.receiveAmount),
        fees: p.fee ? parseFloat(p.fee) : 0
      }))
      .sort((a, b) => a.in - b.in); // Trier par montant source ASC (moins = mieux)
    
    console.log(`[WISE-REVERSE] ${route}: ${providers.length} providers for target ${targetAmount} ${targetCurrency}`);
    
    return { providers };
    
  } catch (error) {
    console.error('[WISE-REVERSE] Error:', error);
    return null;
  }
}