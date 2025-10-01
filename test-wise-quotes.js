// test-wise-quotes.js
import 'dotenv/config';

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;

console.log('🔍 Test de l\'API Wise QUOTES (la vraie API publique)\n');

async function testWiseQuote() {
  try {
    // Étape 1 : Récupérer le profil ID
    console.log('📡 Étape 1 : Récupération du profil...\n');
    const profileResponse = await fetch('https://api.wise.com/v1/profiles', {
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`Erreur profil: ${profileResponse.status}`);
    }

    const profiles = await profileResponse.json();
    const profileId = profiles[0].id;
    console.log(`✅ Profile ID: ${profileId}\n`);

    // Étape 2 : Créer une quote EUR -> BRL
    console.log('📡 Étape 2 : Création d\'une quote EUR → BRL...\n');
    
    const quoteBody = {
      sourceCurrency: 'EUR',
      targetCurrency: 'BRL',
      sourceAmount: 1000,
      profile: profileId
    };

    console.log('📤 Requête quote :');
    console.log(JSON.stringify(quoteBody, null, 2));
    console.log('');

    const quoteResponse = await fetch('https://api.wise.com/v3/quotes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quoteBody)
    });

    console.log(`📥 Statut HTTP : ${quoteResponse.status} ${quoteResponse.statusText}\n`);

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('❌ Erreur API Wise Quotes :');
      console.error(errorText);
      return false;
    }

    const quote = await quoteResponse.json();
    
    console.log('✅ QUOTE REÇUE !\n');
    console.log('📊 Détails :');
    console.log(`   Source: ${quote.sourceAmount} ${quote.sourceCurrency}`);
    console.log(`   Target: ${quote.targetAmount} ${quote.targetCurrency}`);
    console.log(`   Taux: ${quote.rate}`);
    console.log(`   Frais: ${quote.fee} ${quote.sourceCurrency}`);
    console.log(`   Type: ${quote.paymentOptions?.[0]?.payIn || 'N/A'} → ${quote.paymentOptions?.[0]?.payOut || 'N/A'}`);
    console.log('');
    console.log('📄 Quote complète :');
    console.log(JSON.stringify(quote, null, 2));

    return true;

  } catch (error) {
    console.error('❌ Erreur lors du test :');
    console.error(error);
    return false;
  }
}

// Exécution
(async () => {
  const success = await testWiseQuote();
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ API WISE QUOTES FONCTIONNE !');
    console.log('\n💡 On peut utiliser cette API pour obtenir les taux réels Wise.');
    console.log('   C\'est l\'API officielle et publique de Wise.');
  } else {
    console.log('❌ PROBLÈME AVEC L\'API WISE QUOTES');
  }
  console.log('='.repeat(60));
})();