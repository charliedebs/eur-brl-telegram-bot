// src/core/nlu.js
// Natural Language Understanding - Context-Aware & Intelligent
// Architecture CORE : Fonctionne pour Telegram ET WhatsApp

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ==========================================
// PATTERNS REGEX (5% des cas évidents)
// ==========================================

const REGEX_PATTERNS = [
  // Montant + devise + direction explicite
  {
    pattern: /(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)\s*(?:to|para|vers|em|→|en)\s*(?:brl|reais?|r\$)/i,
    extract: (match) => ({
      intent: 'compare',
      entities: {
        amount: parseAmount(match[1]),
        route: 'eurbrl'
      },
      confidence: 0.95
    })
  },
  {
    pattern: /(\d+(?:[.,]\d+)?)\s*(?:r\$|reais?|brl)\s*(?:to|para|vers|em|→|en)\s*(?:€|euros?|eur)/i,
    extract: (match) => ({
      intent: 'compare',
      entities: {
        amount: parseAmount(match[1]),
        route: 'brleur'
      },
      confidence: 0.95
    })
  },
  // Greetings évidents
  {
    pattern: /^(oi|olá|hey|hi|hello|salut|bonjour|bom dia|boa tarde|boa noite)$/i,
    extract: () => ({
      intent: 'greeting',
      entities: {},
      confidence: 0.98
    })
  },
  // Help évidents
  {
    pattern: /^(ajuda|help|aide|como funciona|how does it work|comment ça marche)$/i,
    extract: () => ({
      intent: 'help',
      entities: {},
      confidence: 0.98
    })
  }
];

function parseAmount(str) {
  // Gère 1000, 1.000, 1,000
  return parseFloat(str.replace(/[.,]/g, match => match === ',' ? '.' : ''));
}

function tryRegexMatch(text) {
  const normalized = text.trim().toLowerCase();
  
  for (const { pattern, extract } of REGEX_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      console.log('[NLU] ⚡ Regex match:', pattern.source);
      return extract(match);
    }
  }
  
  return null;
}

// ==========================================
// PROMPT IA (95% des cas)
// ==========================================

function buildSystemPrompt(context) {
  return `Tu es un assistant conversationnel intelligent pour un bot de change EUR↔BRL.

Ta mission : comprendre l'intention de l'utilisateur MÊME si le message est imprécis, ambigu, ou incomplet.

CONTEXTE UTILISATEUR :
- Langue habituelle : ${context.language || 'inconnu'}
- Historique (3 derniers messages) : ${JSON.stringify(context.history || [])}
- Dernier montant utilisé : ${context.lastAmount || 'aucun'}
- Dernière route utilisée : ${context.lastRoute || 'aucune'}
- Dernière comparaison : ${context.lastComparison ? JSON.stringify(context.lastComparison) : 'aucune'}

RÈGLES D'INTELLIGENCE CONTEXTUELLE :

1. **Utilise le contexte pour deviner ce qui manque**
   - Si user dit "1000" et context.lastRoute="eurbrl" → assume route eurbrl
   - Si user dit "et 2000?" après une comparaison → garde même route
   
2. **Détecte la route intelligemment**
   - "change X REAIS" → brleur (je possède reais, je veux euros)
   - "change X EUROS" → eurbrl (je possède euros, je veux reais)
   - "acheter X EUROS" → brleur (je veux obtenir euros)
   - "acheter X REAIS" → eurbrl (je veux obtenir reais)
   - "combien coûte X EUROS" → eurbrl (prix en reais)
   - "quanto custa X REAIS" → brleur (prix en euros)
   
3. **Détecte la langue avec MINIMUM 2 indicateurs forts**
   Indicateurs de langue :
   - PT : quero, quanto, custa, posso, preciso, tenho
   - FR : veux, combien, coûte, peux, besoin, j'ai
   - EN : want, how much, cost, can, need, have
   
   ⚠️ Les DEVISES ne sont PAS des indicateurs de langue !
   - €, EUR, R$, BRL → utilisables dans toutes les langues
   
4. **Inertie de langue**
   - Si context.language existe, ne change QUE si confidence ≥ 0.85
   - Ou si c'est un greeting explicite dans une nouvelle langue
   
5. **Fais des inférences logiques**
   - "plus cher" après comparaison → fait référence au dernier résultat
   - "et avec Wise?" → veut comparer avec Wise
   - "même chose mais 5000" → garde route, change montant

6. **Confidence scoring**
   - 0.9-1.0 : Très clair, action directe
   - 0.7-0.9 : Clair, mais confirmer si pas de contexte
   - 0.5-0.7 : Ambigu, demander clarification
   - < 0.5 : Incompréhensible, fallback boutons

INTENTIONS POSSIBLES :
- greeting : salutations (oi, hello, salut...)
- compare : demande de comparaison EUR↔BRL
- help : demande d'aide
- about : demande d'info sur le bot
- clarification : référence à un résultat précédent
- unknown : message incompréhensible

ENTITÉS À EXTRAIRE :
{
  "amount": number ou null,
  "route": "eurbrl" | "brleur" | null,
  "language": "pt" | "fr" | "en" | null
}

FORMAT DE RÉPONSE (JSON uniquement) :
{
  "intent": "greeting|compare|help|about|clarification|unknown",
  "entities": {
    "amount": 1000,
    "route": "eurbrl",
    "language": "pt"
  },
  "confidence": 0.85,
  "reasoning": "Explication courte de ton analyse"
}

EXEMPLES CONTEXTUELS :

User: "1000"
Context: {lastRoute: "eurbrl"}
→ {"intent":"compare","entities":{"amount":1000,"route":"eurbrl"},"confidence":0.8,"reasoning":"Montant seul, on reprend lastRoute"}

User: "e em euros?"
Context: {lastAmount: 5000, language: "pt"}
→ {"intent":"compare","entities":{"amount":5000,"route":"brleur","language":"pt"},"confidence":0.85,"reasoning":"'em euros' = veut recevoir euros, donc BRL→EUR"}

User: "quero trocar 2000 reais"
Context: {language: "pt"}
→ {"intent":"compare","entities":{"amount":2000,"route":"brleur","language":"pt"},"confidence":0.9,"reasoning":"'trocar reais' = possède reais, veut euros"}

User: "combien ça coûte 1000€"
Context: {}
→ {"intent":"compare","entities":{"amount":1000,"route":"eurbrl","language":"fr"},"confidence":0.9,"reasoning":"'combien coûte X€' = prix en BRL"}

User: "plus cher"
Context: {lastComparison: {onchain: 6200, wise: 6100}}
→ {"intent":"clarification","entities":{},"confidence":0.7,"reasoning":"Fait référence au dernier résultat, Wise était plus cher"}

User: "hello there"
Context: {language: "pt"}
→ {"intent":"greeting","entities":{"language":"en"},"confidence":0.95,"reasoning":"Greeting explicite en anglais, confidence élevée = changement OK"}

User: "€5000"
Context: {}
→ {"intent":"compare","entities":{"amount":5000,"route":"eurbrl"},"confidence":0.85,"reasoning":"€ = possède euros, veut convertir en BRL"}

User: "R$3000"
Context: {}
→ {"intent":"compare","entities":{"amount":3000,"route":"brleur"},"confidence":0.85,"reasoning":"R$ = possède reais, veut convertir en EUR"}

Maintenant, analyse ce message avec le contexte fourni.`;
}

// ==========================================
// ANALYSE IA
// ==========================================

async function analyzeWithAI(text, context) {
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: text }
      ],
      temperature: 0.1, // Plus déterministe
      max_tokens: 200,
      response_format: { type: "json_object" }
    });
    
    const processingTime = Date.now() - startTime;
    const parsed = JSON.parse(response.choices[0].message.content);
    
    console.log('[NLU] 🤖 AI analysis:', {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      time: processingTime + 'ms'
    });
    
    return {
      ...parsed,
      processingTime
    };
  } catch (error) {
    console.error('[NLU] ❌ AI error:', error.message);
    
    // Fallback : unknown
    return {
      intent: 'unknown',
      entities: {},
      confidence: 0,
      reasoning: 'AI failed',
      processingTime: Date.now() - startTime
    };
  }
}

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

export async function parseUserIntent(text, context = {}) {
  console.log('[NLU] 📥 Input:', text);
  console.log('[NLU] 📋 Context:', context);
  
  // 1. Essayer regex d'abord (rapide)
  const regexResult = tryRegexMatch(text);
  if (regexResult) {
    return regexResult;
  }
  
  // 2. Sinon, IA avec contexte
  const aiResult = await analyzeWithAI(text, context);
  
  // 3. Appliquer inertie de langue
  if (context.language && aiResult.entities.language) {
    if (aiResult.entities.language !== context.language) {
      // Changement de langue détecté
      if (aiResult.intent === 'greeting' || aiResult.confidence >= 0.85) {
        console.log('[NLU] 🔄 Language change allowed:', context.language, '→', aiResult.entities.language);
      } else {
        console.log('[NLU] 🔒 Language change blocked (low confidence)');
        aiResult.entities.language = context.language; // Garder langue actuelle
      }
    }
  }
  
  return aiResult;
}

// ==========================================
// EXPORT DEFAULT
// ==========================================

export default {
  parseUserIntent
};