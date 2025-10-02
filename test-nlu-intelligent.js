// test-nlu-intelligent.js
// Test complet du NLU intelligent avec contexte

import 'dotenv/config';
import { parseUserIntent } from './src/core/nlu.js';

console.log('🧪 Test NLU Intelligent\n');
console.log('='.repeat(80));

const testCases = [
  // ==========================================
  // Cas REGEX (évidents)
  // ==========================================
  {
    name: 'Regex: EUR to BRL explicite',
    text: '1000€ to BRL',
    context: {},
    expected: { intent: 'compare', route: 'eurbrl', amount: 1000 }
  },
  {
    name: 'Regex: BRL to EUR explicite',
    text: 'R$5000 para EUR',
    context: {},
    expected: { intent: 'compare', route: 'brleur', amount: 5000 }
  },
  {
    name: 'Regex: Greeting évident',
    text: 'oi',
    context: {},
    expected: { intent: 'greeting' }
  },
  
  // ==========================================
  // Contexte : Montant seul
  // ==========================================
  {
    name: 'Context: Montant seul (reprend route)',
    text: '2000',
    context: { lastRoute: 'eurbrl', language: 'fr' },
    expected: { intent: 'compare', route: 'eurbrl', amount: 2000 }
  },
  {
    name: 'Context: Montant seul sans contexte',
    text: '3000',
    context: {},
    expected: { intent: 'compare', amount: 3000 } // route peut être null ou inférée
  },
  
  // ==========================================
  // Détection de route intelligente
  // ==========================================
  {
    name: 'Route: "change reais" = BRL→EUR',
    text: 'quero trocar 2000 reais',
    context: { language: 'pt' },
    expected: { intent: 'compare', route: 'brleur', amount: 2000 }
  },
  {
    name: 'Route: "change euros" = EUR→BRL',
    text: 'je veux changer 1500 euros',
    context: { language: 'fr' },
    expected: { intent: 'compare', route: 'eurbrl', amount: 1500 }
  },
  {
    name: 'Route: "acheter euros" = BRL→EUR',
    text: 'quero comprar 1000 euros',
    context: { language: 'pt' },
    expected: { intent: 'compare', route: 'brleur', amount: 1000 }
  },
  {
    name: 'Route: "acheter reais" = EUR→BRL',
    text: 'je veux acheter 3000 reais',
    context: { language: 'fr' },
    expected: { intent: 'compare', route: 'eurbrl', amount: 3000 }
  },
  {
    name: 'Route: "quanto custa X EUR" = EUR→BRL',
    text: 'quanto custa 500 euros',
    context: { language: 'pt' },
    expected: { intent: 'compare', route: 'eurbrl', amount: 500 }
  },
  {
    name: 'Route: "combien coûte X BRL" = BRL→EUR',
    text: 'combien coûte 2000 reais',
    context: { language: 'fr' },
    expected: { intent: 'compare', route: 'brleur', amount: 2000 }
  },
  
  // ==========================================
  // Détection de langue
  // ==========================================
  {
    name: 'Language: Portugais clair',
    text: 'quero trocar 1000 euros',
    context: {},
    expected: { intent: 'compare', language: 'pt' }
  },
  {
    name: 'Language: Français clair',
    text: 'je veux changer 1000 euros',
    context: {},
    expected: { intent: 'compare', language: 'fr' }
  },
  {
    name: 'Language: Anglais clair',
    text: 'I want to exchange 1000 euros',
    context: {},
    expected: { intent: 'compare', language: 'en' }
  },
  {
    name: 'Language: Inertie (pas changement)',
    text: '1000',
    context: { language: 'pt', lastRoute: 'eurbrl' },
    expected: { language: 'pt' } // Doit garder PT
  },
  {
    name: 'Language: Changement autorisé (greeting)',
    text: 'hello',
    context: { language: 'pt' },
    expected: { intent: 'greeting', language: 'en' }
  },
  
  // ==========================================
  // Cas ambigus
  // ==========================================
  {
    name: 'Ambiguous: Juste devise',
    text: '€5000',
    context: {},
    expected: { intent: 'compare', route: 'eurbrl', amount: 5000 }
  },
  {
    name: 'Ambiguous: Juste devise BRL',
    text: 'R$3000',
    context: {},
    expected: { intent: 'compare', route: 'brleur', amount: 3000 }
  },
  {
    name: 'Ambiguous: Question vague',
    text: 'e em euros?',
    context: { lastAmount: 5000, language: 'pt' },
    expected: { intent: 'compare', route: 'brleur', amount: 5000 }
  },
  
  // ==========================================
  // Autres intentions
  // ==========================================
  {
    name: 'Help: Demande aide',
    text: 'como funciona',
    context: { language: 'pt' },
    expected: { intent: 'help' }
  },
  {
    name: 'About: Info bot',
    text: 'c\'est quoi ce bot',
    context: { language: 'fr' },
    expected: { intent: 'about' }
  },
  {
    name: 'Unknown: Message incompréhensible',
    text: 'asdkjasd kjasd',
    context: {},
    expected: { intent: 'unknown' }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  for (const [index, testCase] of testCases.entries()) {
    console.log(`\n[${index + 1}/${testCases.length}] ${testCase.name}`);
    console.log('Input:', testCase.text);
    console.log('Context:', testCase.context);
    
    try {
      const result = await parseUserIntent(testCase.text, testCase.context);
      
      console.log('Result:', {
        intent: result.intent,
        amount: result.entities.amount,
        route: result.entities.route,
        language: result.entities.language,
        confidence: result.confidence
      });
      
      // Vérifier expected
      let testPassed = true;
      
      if (testCase.expected.intent && result.intent !== testCase.expected.intent) {
        console.log(`❌ Expected intent: ${testCase.expected.intent}, got: ${result.intent}`);
        testPassed = false;
      }
      
      if (testCase.expected.route && result.entities.route !== testCase.expected.route) {
        console.log(`❌ Expected route: ${testCase.expected.route}, got: ${result.entities.route}`);
        testPassed = false;
      }
      
      if (testCase.expected.amount && result.entities.amount !== testCase.expected.amount) {
        console.log(`❌ Expected amount: ${testCase.expected.amount}, got: ${result.entities.amount}`);
        testPassed = false;
      }
      
      if (testCase.expected.language && result.entities.language !== testCase.expected.language) {
        console.log(`❌ Expected language: ${testCase.expected.language}, got: ${result.entities.language}`);
        testPassed = false;
      }
      
      if (testPassed) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log('❌ FAIL');
        failed++;
        failures.push({
          name: testCase.name,
          expected: testCase.expected,
          got: result
        });
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      failed++;
      failures.push({
        name: testCase.name,
        error: error.message
      });
    }
    
    // Petit délai pour éviter rate limit OpenAI
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSULTATS');
  console.log('='.repeat(80));
  console.log(`✅ Tests réussis: ${passed}/${testCases.length} (${Math.round(passed/testCases.length*100)}%)`);
  console.log(`❌ Tests échoués: ${failed}/${testCases.length}`);
  
  if (failures.length > 0) {
    console.log('\n⚠️ ÉCHECS DÉTAILLÉS:');
    failures.forEach((f, i) => {
      console.log(`\n${i+1}. ${f.name}`);
      if (f.error) {
        console.log('   Error:', f.error);
      } else {
        console.log('   Expected:', f.expected);
        console.log('   Got:', {
          intent: f.got.intent,
          amount: f.got.entities?.amount,
          route: f.got.entities?.route,
          language: f.got.entities?.language
        });
      }
    });
  }
  
  if (passed / testCases.length >= 0.95) {
    console.log('\n🎉 EXCELLENT ! Taux de réussite ≥ 95%');
    console.log('✅ NLU prêt pour production\n');
  } else if (passed / testCases.length >= 0.85) {
    console.log('\n👍 BON ! Taux de réussite ≥ 85%');
    console.log('⚠️ Quelques ajustements recommandés\n');
  } else {
    console.log('\n⚠️ ATTENTION ! Taux de réussite < 85%');
    console.log('🔧 Amélioration du prompt nécessaire\n');
  }
}

// Exécution
runTests().catch(error => {
  console.error('\n💥 Erreur critique:', error);
  process.exit(1);
});