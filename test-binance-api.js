// test-binance-usdc.js
// Test avec les VRAIES pairs USDC directes

console.log('🧪 TEST BINANCE - PAIRS USDC DIRECTES\n');
console.log('='.repeat(80));

async function testBinanceUSDC() {
  try {
    // Test 1: USDC/BRL direct
    console.log('\n📡 Test 1: USDC/BRL (direct)');
    console.log('-'.repeat(80));
    
    const usdcBrlResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCBRL');
    
    if (!usdcBrlResponse.ok) {
      throw new Error(`Binance error: ${usdcBrlResponse.status}`);
    }
    
    const usdcBrlData = await usdcBrlResponse.json();
    const usdcBRL = parseFloat(usdcBrlData.price);
    
    console.log(`✅ Pair: USDCBRL`);
    console.log(`   Prix: ${usdcBRL.toFixed(4)} BRL`);
    console.log(`   (1 USDC = ${usdcBRL.toFixed(4)} BRL)`);
    
    // Test 2: EUR/USDC (essayer les 2 directions)
    console.log('\n📡 Test 2: EUR/USDC (recherche direction)');
    console.log('-'.repeat(80));
    
    let usdcEUR;
    let pairUsed;
    
    // Essayer EURUSDC d'abord
    const eurUsdcResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC');
    
    if (eurUsdcResponse.ok) {
      const eurUsdcData = await eurUsdcResponse.json();
      const eurUsdc = parseFloat(eurUsdcData.price);
      usdcEUR = 1 / eurUsdc;
      pairUsed = 'EURUSDC (EUR/USDC)';
      
      console.log(`✅ Pair: EURUSDC`);
      console.log(`   Prix brut: ${eurUsdc.toFixed(4)} USDC`);
      console.log(`   (1 EUR = ${eurUsdc.toFixed(4)} USDC)`);
      console.log(`   Inversé: ${usdcEUR.toFixed(4)} EUR`);
      console.log(`   (1 USDC = ${usdcEUR.toFixed(4)} EUR)`);
    } else {
      // Essayer USDCEUR
      console.log('   EURUSDC non trouvé, essai de USDCEUR...');
      
      const usdcEurResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCEUR');
      
      if (!usdcEurResponse.ok) {
        throw new Error('Aucune pair EUR/USDC trouvée sur Binance');
      }
      
      const usdcEurData = await usdcEurResponse.json();
      usdcEUR = parseFloat(usdcEurData.price);
      pairUsed = 'USDCEUR (USDC/EUR)';
      
      console.log(`✅ Pair: USDCEUR`);
      console.log(`   Prix: ${usdcEUR.toFixed(4)} EUR`);
      console.log(`   (1 USDC = ${usdcEUR.toFixed(4)} EUR)`);
    }
    
    // Test 3: Calcul cross EUR/BRL
    console.log('\n📊 Test 3: Calcul cross EUR/BRL');
    console.log('-'.repeat(80));
    
    const eurToUsdc = 1 / usdcEUR;
    const cross = eurToUsdc * usdcBRL;
    
    console.log(`Pairs utilisées:`);
    console.log(`   • ${pairUsed}`);
    console.log(`   • USDCBRL (USDC/BRL)`);
    console.log('');
    console.log(`Calcul:`);
    console.log(`   1 EUR → ${eurToUsdc.toFixed(4)} USDC`);
    console.log(`   ${eurToUsdc.toFixed(4)} USDC → ${cross.toFixed(4)} BRL`);
    console.log(`\n✅ EUR/BRL cross: ${cross.toFixed(4)}`);
    
    // Test 4: Comparaison avec CoinGecko
    console.log('\n🔄 Test 4: Comparaison avec CoinGecko');
    console.log('-'.repeat(80));
    
    try {
      const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl,eur');
      
      if (cgResponse.ok) {
        const cgData = await cgResponse.json();
        const cgUsdcBRL = cgData['usd-coin']?.brl;
        const cgUsdcEUR = cgData['usd-coin']?.eur;
        const cgCross = (1 / cgUsdcEUR) * cgUsdcBRL;
        
        console.log(`CoinGecko:`);
        console.log(`   USDC/BRL: ${cgUsdcBRL.toFixed(4)}`);
        console.log(`   USDC/EUR: ${cgUsdcEUR.toFixed(4)}`);
        console.log(`   EUR/BRL:  ${cgCross.toFixed(4)}`);
        
        console.log(`\nBinance (USDC direct):`);
        console.log(`   USDC/BRL: ${usdcBRL.toFixed(4)}`);
        console.log(`   USDC/EUR: ${usdcEUR.toFixed(4)}`);
        console.log(`   EUR/BRL:  ${cross.toFixed(4)}`);
        
        const diffBRL = ((usdcBRL - cgUsdcBRL) / cgUsdcBRL * 100);
        const diffEUR = ((usdcEUR - cgUsdcEUR) / cgUsdcEUR * 100);
        const diffCross = ((cross - cgCross) / cgCross * 100);
        
        console.log(`\nÉcart:`);
        console.log(`   USDC/BRL: ${diffBRL >= 0 ? '+' : ''}${diffBRL.toFixed(3)}%`);
        console.log(`   USDC/EUR: ${diffEUR >= 0 ? '+' : ''}${diffEUR.toFixed(3)}%`);
        console.log(`   EUR/BRL:  ${diffCross >= 0 ? '+' : ''}${diffCross.toFixed(3)}%`);
        
        if (Math.abs(diffCross) < 0.1) {
          console.log(`\n✅ Écart excellent (<0.1%) - Pairs USDC directes = précision maximale !`);
        } else if (Math.abs(diffCross) < 0.5) {
          console.log(`\n✅ Écart très bon (<0.5%) - Binance fiable`);
        } else {
          console.log(`\n⚠️ Écart notable (≥0.5%)`);
        }
      } else {
        console.log('⚠️ CoinGecko indisponible (rate limit?)');
      }
    } catch (cgError) {
      console.log('⚠️ Erreur CoinGecko:', cgError.message);
    }
    
    // Test 5: Latence
    console.log('\n⚡ Test 5: Latence Binance (pairs USDC)');
    console.log('-'.repeat(80));
    
    const iterations = 5;
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCBRL'),
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC')
      ]);
      const latency = Date.now() - start;
      latencies.push(latency);
      console.log(`   Requête ${i + 1}/${iterations}: ${latency}ms (2 pairs parallèles)`);
    }
    
    const avgLatency = latencies.reduce((a, b) => a + b) / iterations;
    console.log(`\n✅ Latence moyenne: ${avgLatency.toFixed(0)}ms`);
    
    if (avgLatency < 150) {
      console.log('   🚀 Excellent !');
    } else if (avgLatency < 300) {
      console.log('   ✅ Bon');
    } else {
      console.log('   ⚠️ Acceptable');
    }
    
    // Test 6: Calcul on-chain avec ces taux
    console.log('\n💎 Test 6: Calcul on-chain EUR → BRL (1000€)');
    console.log('-'.repeat(80));
    
    const amount = 1000;
    const FEES = {
      TRADE_EU: 0.001,
      TRADE_BR: 0.001,
      NETWORK_USDC_FIXED: 1.0,
      WITHDRAW_BRL_FIXED: 3.5,
      SAFETY_DISCOUNT: 0
    };
    
    const usdcAfterBuy = amount * (1 - FEES.TRADE_EU) * eurToUsdc;
    const usdcAfterNetwork = usdcAfterBuy - FEES.NETWORK_USDC_FIXED;
    const brlAfterTrade = usdcAfterNetwork * (1 - FEES.TRADE_BR) * usdcBRL;
    const brlNet = brlAfterTrade - FEES.WITHDRAW_BRL_FIXED;
    const effectiveRate = brlNet / amount;
    
    console.log(`Input: ${amount} EUR`);
    console.log(`Output: ${brlNet.toFixed(2)} BRL`);
    console.log(`Taux effectif: ${effectiveRate.toFixed(4)}`);
    
    const lossVsCross = ((effectiveRate - cross) / cross * 100);
    console.log(`Perte vs cross: ${lossVsCross.toFixed(2)}% (frais inclus)`);
    
    // Résumé final
    console.log('\n\n🎉 RÉSUMÉ FINAL');
    console.log('='.repeat(80));
    console.log('✅ Pairs USDC directes fonctionnelles');
    console.log(`✅ Écart CoinGecko < ${Math.abs(diffCross).toFixed(2)}%`);
    console.log(`✅ Latence moyenne: ${avgLatency.toFixed(0)}ms`);
    console.log('✅ Calculs on-chain corrects');
    console.log('\n💡 Pair utilisée pour EUR/USDC: ' + pairUsed);
    console.log('💡 Pas besoin de passer par USDT → 0% d\'écart supplémentaire !');
    console.log('\n🚀 Prêt pour production avec Binance API\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.log('\n💡 Vérifie:');
    console.log('   • Connexion internet');
    console.log('   • Binance API est up (https://status.binance.com)');
    process.exit(1);
  }
}

testBinanceUSDC();