// test-wise-comparisons-full.js
import 'dotenv/config';

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;

async function getProfiles() {
  const response = await fetch('https://api.wise.com/v1/profiles', {
    headers: { 'Authorization': `Bearer ${WISE_API_TOKEN}` }
  });
  return response.json();
}

async function testComparisonsAPI(profileId, profileType) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test avec profil ${profileType} (ID: ${profileId})`);
  console.log('='.repeat(60));

  const endpoints = [
    'https://api.wise.com/v4/comparisons',
    'https://api.wise.com/v3/comparisons',
    'https://api.wise.com/v2/comparisons',
    'https://api.wise.com/v1/comparisons',
  ];

  const body = {
    sourceCurrency: 'EUR',
    targetCurrency: 'BRL',
    sourceAmount: 1000,
    profile: profileId
  };

  for (const endpoint of endpoints) {
    console.log(`\n📡 Test: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCÈS !`);
        console.log(`   Providers trouvés: ${data.providers?.length || 0}`);
        
        if (data.providers) {
          console.log('\n   Providers:');
          data.providers.forEach(p => {
            console.log(`   • ${p.name}: ${p.targetAmount} BRL`);
          });
        }
        
        console.log('\n   📄 Réponse complète:');
        console.log(JSON.stringify(data, null, 2));
        
        return true;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Erreur: ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }

  return false;
}

// Exécution
(async () => {
  console.log('🔍 Test exhaustif de l\'API Wise Comparisons\n');

  const profiles = await getProfiles();
  
  console.log('📋 Profils disponibles:');
  profiles.forEach(p => {
    console.log(`  • ${p.type.toUpperCase()} (ID: ${p.id})`);
  });

  // Test avec chaque profil
  for (const profile of profiles) {
    const success = await testComparisonsAPI(profile.id, profile.type);
    if (success) {
      console.log(`\n🎉 L'API Comparisons fonctionne avec le profil ${profile.type}!`);
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('FIN DES TESTS');
  console.log('='.repeat(60));
})();