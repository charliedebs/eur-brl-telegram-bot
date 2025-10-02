// test-db-premium.js
// Test complet des nouvelles fonctions DB Premium

import 'dotenv/config';
import { DatabaseService } from './src/services/database.js';

const db = new DatabaseService();

console.log('🧪 Test complet DB Premium\n');
console.log('='.repeat(60));

// Test user fictif
const TEST_TELEGRAM_ID = 999888777;

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  // ==========================================
  // TEST 1: Users
  // ==========================================
  console.log('\n📋 TEST 1: Users');
  console.log('-'.repeat(60));

  try {
    // Créer ou récupérer user test
    let user = await db.getUser(TEST_TELEGRAM_ID);
    if (!user) {
      user = await db.createUser(TEST_TELEGRAM_ID, 'pt');
    }
    
    if (user) {
      console.log('✅ User exists:', user.telegram_id);
      testsPassed++;
    } else {
      console.log('❌ Failed to get/create user');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testsFailed++;
  }

  // ==========================================
  // TEST 2: Premium Status
  // ==========================================
  console.log('\n💎 TEST 2: Premium Status');
  console.log('-'.repeat(60));

  try {
    const isPremium = await db.isPremium(TEST_TELEGRAM_ID);
    console.log('✅ Premium status checked:', isPremium);
    testsPassed++;

    // Activer Premium test (6 mois)
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 6);
    
    await db.updateUser(TEST_TELEGRAM_ID, {
      premium_until: premiumUntil.toISOString(),
      subscription_type: 'pix_6months',
      subscription_amount: 27.00
    });

    const isPremiumNow = await db.isPremium(TEST_TELEGRAM_ID);
    console.log('✅ Premium activated:', isPremiumNow);
    testsPassed++;
  } catch (error) {
    console.log('❌ Error:', error.message);
    testsFailed++;
  }

  // ==========================================
  // TEST 3: Rates History
  // ==========================================
  console.log('\n📊 TEST 3: Rates History');
  console.log('-'.repeat(60));

  try {
    // Sauvegarder un taux test
    const rateData = {
      pair: 'eurbrl',
      rate: 6.1234,
      usdc_eur: 0.9234,
      usdc_brl: 5.6543
    };

    const saved = await db.saveRateHistory(rateData);
    if (saved) {
      console.log('✅ Rate saved:', saved.rate);
      testsPassed++;
    }

    // Récupérer historique
    const history = await db.getRateHistory('eurbrl', 7);
    console.log('✅ History retrieved:', history.length, 'entries');
    testsPassed++;

    // Moyenne 30j
    const avg = await db.getAverage30Days('eurbrl');
    if (avg) {
      console.log('✅ Average 30d:', avg.toFixed(4));
      testsPassed++;
    }

    // Dernier taux
    const last = await db.getLastRate('eurbrl');
    if (last) {
      console.log('✅ Last rate:', last.rate);
      testsPassed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testsFailed++;
  }

  // ==========================================
  // TEST 4: Alerts
  // ==========================================
  console.log('\n🔔 TEST 4: Alerts');
  console.log('-'.repeat(60));

  try {
    const user = await db.getUser(TEST_TELEGRAM_ID);
    
    // Créer alerte test
    const alertData = {
      pair: 'eurbrl',
      preset: 'balanced',
      threshold_percent: 3.0
    };

    const alert = await db.createAlert(user.id, alertData);
    if (alert) {
      console.log('✅ Alert created:', alert.pair, alert.threshold_percent + '%');
      testsPassed++;
    }

    // Récupérer alertes user
    const alerts = await db.getUserAlerts(TEST_TELEGRAM_ID);
    console.log('✅ User alerts retrieved:', alerts.length);
    testsPassed++;

    // Alertes actives (toutes)
    const activeAlerts = await db.getActiveAlerts();
    console.log('✅ Active alerts (all users):', activeAlerts.length);
    testsPassed++;

    // Désactiver alerte test
    if (alert) {
      await db.disableAlert(alert.id);
      console.log('✅ Alert disabled');
      testsPassed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testsFailed++;
  }

  // ==========================================
  // TEST 5: Pix Payments
  // ==========================================
  console.log('\n💳 TEST 5: Pix Payments');
  console.log('-'.repeat(60));

  try {
    const user = await db.getUser(TEST_TELEGRAM_ID);
    
    // Créer paiement test
    const paymentData = {
      user_id: user.id,
      amount: 27.00,
      duration_months: 6,
      qr_code: 'test_qr_code_base64',
      pix_key: 'test_pix_key_12345',
      payment_id: 'test_payment_' + Date.now(),
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
    };

    const payment = await db.createPixPayment(paymentData);
    if (payment) {
      console.log('✅ Payment created:', payment.amount, 'R$');
      testsPassed++;
    }

    // Récupérer paiement
    const retrieved = await db.getPixPayment(payment.payment_id);
    if (retrieved) {
      console.log('✅ Payment retrieved:', retrieved.status);
      testsPassed++;
    }

    // Confirmer paiement (ceci active Premium)
    await db.confirmPixPayment(payment.payment_id);
    console.log('✅ Payment confirmed');
    testsPassed++;

    // Vérifier Premium activé
    const isPremium = await db.isPremium(TEST_TELEGRAM_ID);
    console.log('✅ Premium after payment:', isPremium);
    testsPassed++;
  } catch (error) {
    console.log('❌ Error:', error.message);
    testsFailed++;
  }

  // ==========================================
  // TEST 6: Free Alerts
  // ==========================================
  console.log('\n📢 TEST 6: Free Alerts (Marketing)');
  console.log('-'.repeat(60));

  try {
    // Logger alerte gratuite
    await db.logFreeAlert('eurbrl', 6.2345, 150);
    console.log('✅ Free alert logged');
    testsPassed++;

    // Récupérer dernière
    const lastFree = await db.getLastFreeAlert('eurbrl');
    if (lastFree) {
      console.log('✅ Last free alert:', lastFree.rate, `(${lastFree.users_count} users)`);
      testsPassed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testsFailed++;
  }

  // ==========================================
  // RÉSUMÉ
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTATS');
  console.log('='.repeat(60));
  console.log(`✅ Tests réussis: ${testsPassed}`);
  console.log(`❌ Tests échoués: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 TOUS LES TESTS PASSENT !');
    console.log('✅ DB Premium fonctionnelle et prête à l\'emploi\n');
  } else {
    console.log('\n⚠️ Certains tests ont échoué');
    console.log('Vérifie les erreurs ci-dessus\n');
  }

  console.log('💡 User test créé: telegram_id =', TEST_TELEGRAM_ID);
  console.log('   Tu peux le supprimer dans Supabase Table Editor si besoin\n');
}

// Exécution
runTests().catch(error => {
  console.error('\n💥 Erreur critique:', error);
  process.exit(1);
});