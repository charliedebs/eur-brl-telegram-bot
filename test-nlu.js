// test-nlu.js
// Place ce fichier à la racine et lance : node test-nlu.js

import 'dotenv/config';
import { parseUserIntent, parseUserIntentBatch } from './src/services/nlu.js';

console.log('🧪 Test du service NLU\n');

// Vérification de l'API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY non trouvé dans .env');
  console.error('👉 Va sur https://platform.openai.com/api-keys');
  console.error('👉 Crée une API key');
  console.error('👉 Ajoute-la dans .env : OPENAI_API_KEY=sk-...');
  process.exit(1);
}

console.log(`✅ API Key trouvée : ${process.env.OPENAI_API_KEY.substring(0, 10)}...\n`);

// Messages de test couvrant tous les cas
const testMessages = [
  // Greetings (FR)
  'salut',
  'bonjour',
  'yo',
  'hey',
  
  // Greetings (PT)
  'oi',
  'olá',
  'bom dia',
  'boa tarde',
  
  // Greetings (EN)
  'hi',
  'hello',
  'hey there',
  
  // Compare (FR)
  'je veux changer 1000€ en reais',
  '1000 euros vers BRL',
  '500€',
  'combien pour 2000 reais en euros',
  'R$5000 en EUR',
  
  // Compare (PT)
  'quanto custa 1000 euros em reais',
  'quero trocar 3000 reais em euros',
  'converter R$2000 para EUR',
  
  // Compare (EN)
  'convert 1000 euros to reais',
  'how much is 500 EUR in BRL',
  '€1000 to BRL',
  
  // Help
  'aide',
  'ajuda',
  'help',
  'comment ça marche',
  
  // About
  'c\'est quoi ce bot',
  'qui es-tu',
  'about',
  'info',
  
  // Unknown
  'blabla random',
  '123456',
  'dhsajkdhsajkdh'
];

// Test séquentiel
async function runTests() {
  console.log('═'.repeat(70));
  console.log('  TEST SÉQUENTIEL - Messages variés');
  console.log('═'.repeat(70));
  console.log('');
  
  let totalCost = 0;
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n[${i + 1}/${testMessages.length}] 💬 "${message}"`);
    console.log('─'.repeat(70));
    
    const result = await parseUserIntent(message);
    
    // Affichage coloré selon l'intention
    const intentEmoji = {
      'greeting': '👋',
      'compare': '💱',
      'help': '❓',
      'about': 'ℹ️',
      'unknown': '❔'
    };
    
    console.log(`${intentEmoji[result.intent] || '❔'} Intent: ${result.intent}`);
    console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    
    if (Object.keys(result.entities).length > 0) {
      console.log('📦 Entities:');
      for (const [key, value] of Object.entries(result.entities)) {
        if (value !== null && value !== undefined) {
          console.log(`   • ${key}: ${value}`);
        }
      }
    } else {
      console.log('📦 Entities: (none)');
    }
    
    // Estimation du coût (approximative)
    const avgTokens = 80; // environ 80 tokens par message
    const costPerMessage = (avgTokens * 0.00015) / 1000;
    totalCost += costPerMessage;
    
    // Petit délai pour ne pas spammer l'API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('  RÉSUMÉ');
  console.log('═'.repeat(70));
  console.log(`📊 Messages testés: ${testMessages.length}`);
  console.log(`💰 Coût estimé total: ~$${totalCost.toFixed(6)} (~€${(totalCost * 0.92).toFixed(6)})`);
  console.log(`💰 Coût moyen par message: ~$${(totalCost / testMessages.length).toFixed(6)}`);
  console.log('');
  console.log('💡 Pour 1000 users × 5 messages/mois = 5000 messages');
  console.log(`   → Coût mensuel estimé: ~$${(totalCost / testMessages.length * 5000).toFixed(2)}`);
  console.log('');
  console.log('✅ Tous les tests terminés !');
  console.log('═'.repeat(70));
}

// Test groupé (plus rapide, pour debug)
async function runBatchTest() {
  console.log('\n\n');
  console.log('═'.repeat(70));
  console.log('  TEST GROUPÉ - Échantillon rapide');
  console.log('═'.repeat(70));
  console.log('');
  
  const sampleMessages = [
    'salut',
    'je veux changer 1000€ en reais',
    'aide',
    'c\'est quoi ce bot',
    'blabla'
  ];
  
  console.log(`📋 Test de ${sampleMessages.length} messages échantillon...\n`);
  
  const results = await parseUserIntentBatch(sampleMessages);
  
  console.log('Résultats:');
  console.log('');
  
  for (const result of results) {
    console.log(`💬 "${result.message}"`);
    console.log(`   → Intent: ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
    if (result.entities.amount) console.log(`   → Amount: ${result.entities.amount}`);
    if (result.entities.route) console.log(`   → Route: ${result.entities.route}`);
    if (result.entities.language) console.log(`   → Language: ${result.entities.language}`);
    console.log('');
  }
  
  console.log('✅ Test groupé terminé !');
}

// Menu interactif
async function main() {
  console.log('🎯 Que veux-tu tester ?\n');
  console.log('1. Test complet (tous les messages, ~30 sec)');
  console.log('2. Test rapide (échantillon, ~5 sec)');
  console.log('3. Test personnalisé (entre ton message)\n');
  
  const mode = process.argv[2] || '1';
  
  switch (mode) {
    case '1':
      await runTests();
      break;
    case '2':
      await runBatchTest();
      break;
    case '3':
      const customMessage = process.argv[3] || 'je veux changer 1000€ en reais';
      console.log(`💬 Test du message: "${customMessage}"\n`);
      const result = await parseUserIntent(customMessage);
      console.log('Résultat:');
      console.log(JSON.stringify(result, null, 2));
      break;
    default:
      console.log('❌ Mode invalide. Utilise 1, 2 ou 3');
      console.log('Exemples:');
      console.log('  node test-nlu.js 1          # Test complet');
      console.log('  node test-nlu.js 2          # Test rapide');
      console.log('  node test-nlu.js 3 "salut"  # Test personnalisé');
  }
}

// Exécution
main().catch(error => {
  console.error('\n❌ Erreur pendant les tests:');
  console.error(error);
  process.exit(1);
});