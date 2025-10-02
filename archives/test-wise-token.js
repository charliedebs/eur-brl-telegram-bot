// test-wise-token.js
// Place ce fichier à la racine du projet et lance : node test-wise-token.js

import 'dotenv/config';

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;

console.log('🔍 Test du token Wise API\n');

if (!WISE_API_TOKEN) {
  console.error('❌ WISE_API_TOKEN non trouvé dans .env');
  process.exit(1);
}

console.log(`✅ Token trouvé : ${WISE_API_TOKEN.substring(0, 10)}...`);
console.log('\n📡 Test 1 : Appel API Wise Comparisons...\n');

async function testWiseComparison() {
  try {
    const body = {
      sourceCurrency: 'EUR',
      targetCurrency: 'BRL',
      sourceAmount: 1000
    };

    console.log('📤 Requête :');
    console.log(JSON.stringify(body, null, 2));
    console.log('');

    const response = await fetch('https://api.wise.com/v4/comparisons', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log(`📥 Statut HTTP : ${response.status} ${response.statusText}`);
    console.log('');

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Erreur API Wise :');
      console.error('Headers de réponse :', Object.fromEntries(response.headers.entries()));
      console.error('\nCorps de la réponse :');
      console.error(responseText);
      
      if (response.status === 401) {
        console.error('\n💡 Erreur 401 = Token invalide ou expiré');
        console.error('   → Vérifie ton token sur https://wise.com/settings/api-tokens');
      } else if (response.status === 403) {
        console.error('\n💡 Erreur 403 = Token valide mais permissions insuffisantes');
        console.error('   → Ton token doit avoir accès à "Comparisons API"');
      } else if (response.status === 404) {
        console.error('\n💡 Erreur 404 = Endpoint introuvable');
        console.error('   → L\'API Wise a peut-être changé');
        console.error('   → Ou ton compte n\'a pas accès à cette API');
      }
      
      return false;
    }

    const data = JSON.parse(responseText);
    console.log('✅ Réponse réussie !');
    console.log('');
    console.log('📊 Données reçues :');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.providers && data.providers.length > 0) {
      console.log('');
      console.log('✅ Providers trouvés :');
      data.providers.forEach(p => {
        console.log(`  • ${p.name}: ${p.targetAmount} BRL (taux: ${p.rate})`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test :');
    console.error(error);
    return false;
  }
}

// Test 2 : Vérifier le profil Wise
async function testWiseProfile() {
  console.log('\n📡 Test 2 : Vérification du profil Wise...\n');
  
  try {
    const response = await fetch('https://api.wise.com/v1/profiles', {
      headers: {
        'Authorization': `Bearer ${WISE_API_TOKEN}`
      }
    });

    console.log(`📥 Statut HTTP : ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const profiles = await response.json();
      console.log('✅ Profils trouvés :');
      console.log(JSON.stringify(profiles, null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ Erreur profil :', errorText);
    }
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  }
}

// Exécution
(async () => {
  const success = await testWiseComparison();
  await testWiseProfile();
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ TOKEN WISE FONCTIONNE CORRECTEMENT !');
  } else {
    console.log('❌ PROBLÈME AVEC LE TOKEN WISE');
    console.log('\n📝 Actions à faire :');
    console.log('1. Aller sur https://wise.com/settings/api-tokens');
    console.log('2. Vérifier que ton token existe et n\'est pas expiré');
    console.log('3. Vérifier qu\'il a les permissions "Read" au minimum');
    console.log('4. Si besoin, créer un nouveau token');
  }
  console.log('='.repeat(60));
})();