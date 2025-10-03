// test-premium.js
// Test des fonctionnalités Premium

import 'dotenv/config';
import { DatabaseService } from './src/services/database.js';
import { getRates } from './src/services/rates.js';

const db = new DatabaseService();

console.log('🧪 Test Premium Features\n');
console.log('='.repeat(60));

// Ton telegram_id pour les tests
const TEST_TELEGRAM_ID = parseInt(process.argv[2]) || 999888777;

async function runTests() {
  let passed = 0;
  let failed = 0;

  // ==========================================
  // TEST 1: Vérifier user existe
  // ==========================================
  console.log('\n📋 TEST 1: User Setup');
  console.log('-'.repeat(60));

  try {
    let user = await db.getUser(TEST_TELEGRAM_ID);
    
    if (!user) {
      console.log('Creating test user...');
      user = await db.createUser(TEST_TELEGRAM_ID, 'pt');
    }
    
    if (user) {
      console.log(`✅ User exists: ${user.telegram_id}`);
      passed++;
    } else {
      console.log('❌ Failed to get/create user');
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ==========================================
  // TEST 2: Activer Premium test
  // ==========================================
  console.log('\n💎 TEST 2: Premium Activation');
  console.log('-'.repeat(60));

  try {
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 3);
    
    await db.updateUser(TEST_TELEGRAM_ID, {
      premium_until: premiumUntil.toISOString(),
      subscription_type: 'pix_3months',
      subscription_amount: 15.00
    });
    
    const isPremium = await db.isPremium(TEST_TELEGRAM_ID);
    
    if (isPremium) {
      console.log(`✅ Premium activated until ${premiumUntil.toISOString()}`);
      passed++;
    } else {
      console.log('❌ Premium not activated');
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ==========================================
  // TEST 3: Créer alerte test
  // ==========================================
  console.log('\n🔔 TEST 3: Create Alert');
  console.log('-'.repeat(60));

  try {
    const user = await db.getUser(TEST_TELEGRAM_ID);
    
    const alertData = {
      pair: 'eurbrl',
      preset: 'balanced',
      threshold_percent: 3.0
    };
    
    const alert = await db.createAlert(user.id, alertData);
    
    if (alert) {
      console.log(`✅ Alert created: ${alert.pair} +${alert.threshold_percent}%`);
      console.log(`   ID: ${alert.id}`);
      passed++;
    } else {
      console.log('❌ Failed to create alert');
      failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ==========================================
  // TEST 4: Lister alertes
  // ==========================================
  console.log('\n📊 TEST 4: List Alerts');
  console.log('-'.repeat(60));

  try {
    const alerts = await db.getUserAlerts(TEST_TELEGRAM_ID);
    
    console.log(`✅ Found ${alerts.length} alert(s):`);
    alerts.forEach(a => {
      console.log(`   • ${a.pair} +${a.threshold_percent}% (${a.preset})`);
    });
    passed++;
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ==========================================
  // TEST 5: Vérifier condition alerte
  // ==========================================
  console.log('\n🎯 TEST 5: Check Alert Condition');
  console.log('-'.repeat(60));

  try {
    const rates = await getRates();
    const avg30d = await db.getAverage30Days('eurbrl');
    
    if (!avg30d) {
      console.log('⚠️ No average data yet (need historical data)');
      console.log('   Run: node test-save-rates.js');
    } else {
      const currentRate = rates.cross;
      const threshold3pct = avg30d * 1.03;
      
      console.log(`Current rate: ${currentRate.toFixed(4)}`);
      console.log(`Average 30d: ${avg30d.toFixed(4)}`);
      console.log(`Threshold +3%: ${threshold3pct.toFixed(4)}`);
      
      if (currentRate >= threshold3pct) {
        console.log('✅ Alert would trigger! 🔔');
      } else {
        const diff = ((threshold3pct - currentRate) / avg30d * 100).toFixed(2);
        console.log(`ℹ️ Alert NOT triggered (need +${diff}% more)`);
      }
      
      passed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ==========================================
  // TEST 6: Simuler alerte gratuite
  // ==========================================
  console.log('\n📢 TEST 6: Free Alert Criteria');
  console.log('-'.repeat(60));

  try {
    const rates = await getRates();
    const history = await db.getRateHistory('eurbrl', 90);
    
    if (history.length === 0) {
      console.log('⚠️ No historical data');
      console.log('   Need to run CRON job to accumulate data');
    } else {
      const rates90d = history.map(h => parseFloat(h.rate));
      const max90d = Math.max(...rates90d);
      const currentRate = rates.cross;
      
      const is90dayHigh = currentRate >= max90d * 0.995;
      
      console.log(`Current rate: ${currentRate.toFixed(4)}`);
      console.log(`90d max: ${max90d.toFixed(4)}`);
      console.log(`Is 90d high: ${is90dayHigh ? '✅ YES' : '❌ NO'}`);
      
      const avg7d = rates90d.slice(-7).reduce((a, b) => a + b, 0) / 7;
      const weeklyChange = Math.abs((currentRate - avg7d) / avg7d);
      const isSignificant = weeklyChange > 0.05;
      
      console.log(`Weekly change: ${(weeklyChange * 100).toFixed(2)}%`);
      console.log(`Is significant (>5%): ${isSignificant ? '✅ YES' : '❌ NO'}`);
      
      const lastAlert = await db.getLastFreeAlert('eurbrl');
      const daysSince = lastAlert 
        ? (Date.now() - new Date(lastAlert.sent_at)) / (1000 * 60 * 60 * 24)
        : 999;
      const cooldownOK = daysSince > 14;
      
      console.log(`Days since last alert: ${daysSince.toFixed(1)}`);
      console.log(`Cooldown OK (>14d): ${cooldownOK ? '✅ YES' : '❌ NO'}`);
      
      const shouldSend = is90dayHigh && isSignificant && cooldownOK;
      
      console.log('\n' + '─'.repeat(40));
      if (shouldSend) {
        console.log('🎉 FREE ALERT WOULD BE SENT! 🔔');
      } else {
        console.log('ℹ️ Free alert criteria not met');
      }
      
      passed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    failed++;
  }

  // ==========================================
  // RÉSUMÉ
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTATS');
  console.log('='.repeat(60));
  console.log(`✅ Tests réussis: ${passed}`);
  console.log(`❌ Tests échoués: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 TOUS LES TESTS PASSENT !');
    console.log('✅ Premium features fonctionnelles');
    console.log('\n💡 Prochaines étapes :');
    console.log('   1. Teste dans Telegram avec /premium');
    console.log('   2. Teste création alerte avec /alerts');
    console.log('   3. Deploy sur Railway');
    console.log('   4. Vérifie les CRON jobs dans les logs\n');
  } else {
    console.log('\n⚠️ Certains tests ont échoué');
    console.log('Vérifie les erreurs ci-dessus\n');
  }
}

// ==========================================
// HELPER: Sauvegarder quelques taux pour tests
// ==========================================

async function saveTestRates() {
  console.log('\n💾 Saving test rates...');
  
  try {
    const rates = await getRates();
    
    for (let i = 0; i < 30; i++) {
      // Variation aléatoire ±2%
      const variation = 1 + (Math.random() - 0.5) * 0.04;
      const testRate = rates.cross * variation;
      
      await db.saveRateHistory({
        pair: 'eurbrl',
        rate: testRate,
        usdc_eur: rates.usdcEUR,
        usdc_brl: rates.usdcBRL
      });
      
      console.log(`  Day ${i + 1}: ${testRate.toFixed(4)}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Test rates saved\n');
  } catch (error) {
    console.error('❌ Error saving test rates:', error.message);
  }
}

// ==========================================
// EXÉCUTION
// ==========================================

const mode = process.argv[3];

if (mode === 'save-rates') {
  saveTestRates()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  runTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

// ==========================================
// USAGE
// ==========================================
/*

# Test normal (utilise telegram_id par défaut)
node test-premium.js

# Test avec ton telegram_id spécifique
node test-premium.js 123456789

# Sauvegarder des taux de test (30 jours)
node test-premium.js 123456789 save-rates

*/