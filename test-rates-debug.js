// test-real-rates.js
// Test avec les VRAIS taux CoinGecko + Wise

import 'dotenv/config';
import { getRates, calculateOnChain } from './src/services/rates.js';
import { getWiseComparison } from './src/services/wise.js';

console.log('🧪 TEST AVEC VRAIS TAUX (CoinGecko + Wise)\n');
console.log('='.repeat(80));

async function testRealRates() {
  // ==========================================
  // ÉTAPE 1 : Récupérer les taux CoinGecko
  // ==========================================
  console.log('\n📡 ÉTAPE 1 : Récupération taux CoinGecko\n');
  console.log('-'.repeat(80));
  
  const rates = await getRates();
  
  if (!rates) {
    console.log('❌ ERREUR : Impossible de récupérer les taux CoinGecko');
    console.log('   → Vérifie ta connexion internet');
    console.log('   → Vérifie si CoinGecko API est up');
    return;
  }
  
  console.log('✅ Taux CoinGecko récupérés:');
  console.log(`   USDC/EUR: ${rates.usdcEUR.toFixed(4)}`);
  console.log(`   USDC/BRL: ${rates.usdcBRL.toFixed(4)}`);
  console.log(`   EUR/USDC: ${rates.eurToUsdc.toFixed(4)}`);
  console.log(`   Cross EUR/BRL: ${rates.cross.toFixed(4)}`);
  console.log(`   Timestamp: ${rates.timestamp}`);
  
  // ==========================================
  // ÉTAPE 2 : Calculer on-chain EUR → BRL
  // ==========================================
  console.log('\n\n💎 ÉTAPE 2 : Calcul on-chain EUR → BRL (1000€)\n');
  console.log('-'.repeat(80));
  
  const amount = 1000;
  const onchainEURBRL = calculateOnChain('eurbrl', amount, rates);
  
  console.log('Résultat on-chain:');
  console.log(`   Input:  ${onchainEURBRL.in} EUR`);
  console.log(`   Output: ${onchainEURBRL.out.toFixed(2)} BRL`);
  console.log(`   Taux effectif: ${onchainEURBRL.rate.toFixed(4)}`);
  
  console.log('\nBreakdown:');
  console.log(`   1. USDC après achat EU:  ${onchainEURBRL.breakdown.usdcAfterBuy.toFixed(2)} USDC`);
  console.log(`   2. USDC après réseau:    ${onchainEURBRL.breakdown.usdcAfterNetwork.toFixed(2)} USDC`);
  console.log(`   3. BRL après trade BR:   ${onchainEURBRL.breakdown.brlAfterTrade.toFixed(2)} BRL`);
  console.log(`   4. BRL net (après Pix):  ${onchainEURBRL.breakdown.brlNet.toFixed(2)} BRL`);
  
  // ==========================================
  // ÉTAPE 3 : Récupérer taux Wise
  // ==========================================
  console.log('\n\n🏦 ÉTAPE 3 : Récupération taux Wise (off-chain)\n');
  console.log('-'.repeat(80));
  
  const wiseData = await getWiseComparison('eurbrl', amount);
  
  if (!wiseData || !wiseData.providers || wiseData.providers.length === 0) {
    console.log('⚠️ ATTENTION : Aucun provider off-chain trouvé');
    console.log('   → Wise API peut être down ou rate-limited');
    return;
  }
  
  console.log(`✅ ${wiseData.providers.length} providers trouvés:\n`);
  
  const bestBank = wiseData.providers[0];
  const others = wiseData.providers.slice(1, 6); // Top 6
  
  // Afficher tous les providers
  wiseData.providers.forEach((p, i) => {
    const isPriority = p.priority ? ' ⭐' : '';
    console.log(`   ${i + 1}. ${p.provider}${isPriority}`);
    console.log(`      Output: ${p.out.toFixed(2)} BRL`);
    console.log(`      Rate: ${p.rate.toFixed(4)}`);
    console.log(`      Fee: ${p.fee !== null ? p.fee.toFixed(2) + ' EUR' : 'N/A'}`);
  });
  
  // ==========================================
  // ÉTAPE 4 : COMPARAISON On-chain vs Best Off-chain
  // ==========================================
  console.log('\n\n📊 ÉTAPE 4 : COMPARAISON On-chain vs Off-chain\n');
  console.log('='.repeat(80));
  
  console.log(`Input: ${amount} EUR\n`);
  
  console.log('🌍 On-chain:');
  console.log(`   Output:        ${onchainEURBRL.out.toFixed(2)} BRL`);
  console.log(`   Taux effectif: ${onchainEURBRL.rate.toFixed(4)}`);
  
  console.log(`\n🏦 Best off-chain (${bestBank.provider}):`);
  console.log(`   Output:        ${bestBank.out.toFixed(2)} BRL`);
  console.log(`   Taux effectif: ${bestBank.rate.toFixed(4)}`);
  console.log(`   Fee:           ${bestBank.fee !== null ? bestBank.fee.toFixed(2) + ' EUR' : 'N/A'}`);
  
  const delta = ((onchainEURBRL.out - bestBank.out) / bestBank.out) * 100;
  const winner = delta >= 0 ? 'on-chain' : bestBank.provider;
  
  console.log(`\n💰 Différence:`);
  console.log(`   ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}% en faveur de ${winner}`);
  console.log(`   Soit ${(onchainEURBRL.out - bestBank.out).toFixed(2)} BRL de différence`);
  
  if (delta >= 3) {
    console.log('\n✅ On-chain CLAIREMENT meilleur (+3% ou plus)');
  } else if (delta >= 0) {
    console.log('\n✅ On-chain légèrement meilleur');
  } else if (delta >= -3) {
    console.log('\n⚠️ Off-chain légèrement meilleur');
  } else {
    console.log('\n❌ Off-chain CLAIREMENT meilleur (-3% ou plus)');
    console.log('   🔴 PROBLÈME : On-chain devrait être meilleur !');
  }
  
  // ==========================================
  // ÉTAPE 5 : Vérifier cohérence des taux affichés
  // ==========================================
  console.log('\n\n🔍 ÉTAPE 5 : Vérification cohérence taux\n');
  console.log('='.repeat(80));
  
  console.log('Taux cross CoinGecko:');
  console.log(`   ${rates.cross.toFixed(4)} (référence marchés)`);
  
  console.log('\nTaux effectif on-chain:');
  console.log(`   ${onchainEURBRL.rate.toFixed(4)} (après tous frais)`);
  
  console.log('\nTaux effectif best off-chain:');
  console.log(`   ${bestBank.rate.toFixed(4)} (${bestBank.provider})`);
  
  const diffOnchainVsCross = ((onchainEURBRL.rate - rates.cross) / rates.cross) * 100;
  console.log(`\n📉 Perte on-chain vs cross:`);
  console.log(`   ${diffOnchainVsCross.toFixed(2)}% (normal, dû aux frais)`);
  
  if (diffOnchainVsCross < -5) {
    console.log('   ✅ Normal (frais ~0.5-1%)');
  } else if (diffOnchainVsCross < -10) {
    console.log('   ⚠️ Perte importante (>10%) - vérifie les frais');
  } else {
    console.log('   🔴 ANORMAL - problème dans les calculs');
  }
  
  // ==========================================
  // ÉTAPE 6 : Simuler l'affichage dans le bot
  // ==========================================
  console.log('\n\n💬 ÉTAPE 6 : Simulation message bot\n');
  console.log('='.repeat(80));
  
  console.log('Ce que l\'utilisateur devrait voir:\n');
  
  console.log('💱 EUR → BRL\n');
  console.log(`📊 Réf. ${rates.cross.toFixed(4)} • ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}\n`);
  
  console.log('🌍 On-chain');
  console.log(`€${amount.toLocaleString('fr-FR')} → R$${onchainEURBRL.out.toLocaleString('fr-FR', {minimumFractionDigits: 2})} (${onchainEURBRL.rate.toFixed(4)})\n`);
  
  console.log(`🏦 ${bestBank.provider}`);
  console.log(`€${amount.toLocaleString('fr-FR')} → R$${bestBank.out.toLocaleString('fr-FR', {minimumFractionDigits: 2})} (${bestBank.rate.toFixed(4)})\n`);
  
  if (others.length > 0) {
    const othersList = others.map(p => 
      `${p.provider} R$${p.out.toLocaleString('fr-FR', {minimumFractionDigits: 0})}`
    ).join(' • ');
    console.log(`Autres: ${othersList}\n`);
  }
  
  console.log(`✅ ${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}% on-chain`);
  
  // ==========================================
  // DIAGNOSTIC FINAL
  // ==========================================
  console.log('\n\n🎯 DIAGNOSTIC FINAL\n');
  console.log('='.repeat(80));
  
  const issues = [];
  
  // Check 1: Taux CoinGecko OK
  if (rates.cross < 5 || rates.cross > 8) {
    issues.push('🔴 Taux CoinGecko suspect (hors range 5-8)');
  } else {
    console.log('✅ Taux CoinGecko cohérents');
  }
  
  // Check 2: Calcul on-chain OK
  const expectedLoss = 0.5; // ~0.5% de perte attendue
  if (Math.abs(diffOnchainVsCross + expectedLoss) > 0.3) {
    issues.push('🔴 Perte on-chain anormale (devrait être ~0.5%)');
  } else {
    console.log('✅ Calculs on-chain corrects');
  }
  
  // Check 3: On-chain meilleur que off-chain
  if (delta < 0) {
    issues.push(`🔴 On-chain MOINS bon que off-chain (${delta.toFixed(2)}%)`);
  } else if (delta < 2) {
    console.log(`⚠️ On-chain à peine meilleur (+${delta.toFixed(2)}%) - peut être normal`);
  } else {
    console.log(`✅ On-chain meilleur (+${delta.toFixed(2)}%)`);
  }
  
  // Check 4: Wise API fonctionne
  if (wiseData.providers.length < 3) {
    issues.push('⚠️ Peu de providers Wise (API peut être limitée)');
  } else {
    console.log(`✅ Wise API OK (${wiseData.providers.length} providers)`);
  }
  
  if (issues.length > 0) {
    console.log('\n\n⚠️ PROBLÈMES DÉTECTÉS:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('\n\n🎉 TOUT EST OK ! Aucun problème détecté.');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Exécution
testRealRates().catch(error => {
  console.error('\n💥 ERREUR CRITIQUE:\n');
  console.error(error);
  console.log('\n💡 Vérifie:');
  console.log('   • Connexion internet');
  console.log('   • Variables d\'environnement (.env)');
  console.log('   • APIs CoinGecko et Wise sont up');
  process.exit(1);
});