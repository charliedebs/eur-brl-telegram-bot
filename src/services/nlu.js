import OpenAI from 'openai';
import { logNLUResult } from './nlu-logger.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================
// PATTERNS REGEX (pas besoin d'IA pour ça)
// ============================================

const OBVIOUS_PATTERNS = [
  // EUR → BRL
  { 
    regex: /^(\d+(?:[.,]\d+)?)\s*€?\s*(?:to|→|vers|para|em)\s*(?:brl|reais?)/i,
    route: 'eurbrl',
    confidence: 0.95
  },
  {
    regex: /^€?\s*(\d+(?:[.,]\d+)?)\s*(?:to|→|vers|para|em)\s*(?:brl|reais?)/i,
    route: 'eurbrl',
    confidence: 0.95
  },
  {
    regex: /^(\d+(?:[.,]\d+)?)\s*(?:euros?|eur)\s*(?:to|→|vers|para|em)\s*(?:brl|reais?)/i,
    route: 'eurbrl',
    confidence: 0.95
  },
  
  // BRL → EUR
  {
    regex: /^(\d+(?:[.,]\d+)?)\s*(?:r\$|reais?)\s*(?:to|→|vers|para|em)\s*(?:eur|euros?)/i,
    route: 'brleur',
    confidence: 0.95
  },
  {
    regex: /^r\$?\s*(\d+(?:[.,]\d+)?)\s*(?:to|→|vers|para|em)\s*(?:eur|euros?)/i,
    route: 'brleur',
    confidence: 0.95
  },
  
  // Juste montant avec symbole
  {
    regex: /^€?\s*(\d+(?:[.,]\d+)?)\s*€?$/i,
    route: 'eurbrl',
    confidence: 0.8
  },
  {
    regex: /^r\$?\s*(\d+(?:[.,]\d+)?)\s*(?:reais?)?$/i,
    route: 'brleur',
    confidence: 0.8
  }
];

function tryPatternMatch(text) {
  const cleaned = text.trim();
  
  for (const pattern of OBVIOUS_PATTERNS) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      const amountStr = match[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (isFinite(amount) && amount > 0) {
        return {
          intent: 'compare',
          entities: {
            amount,
            route: pattern.route,
            language: null // Pas assez d'info pour langue
          },
          confidence: pattern.confidence,
          source: 'regex'
        };
      }
    }
  }
  
  return null;
}

// ============================================
// PROMPT SYSTÈME
// ============================================

const SYSTEM_PROMPT = `Tu es un assistant qui analyse les messages d'un bot de change EUR↔BRL.

Détecte l'intention et extrait les entités.

Retourne UNIQUEMENT du JSON valide, rien d'autre.

Format:
{
  "intent": "greeting|compare|help|about|unknown",
  "entities": {
    "amount": number ou null,
    "route": "eurbrl|brleur" ou null,
    "language": "fr|pt|en" ou null
  },
  "confidence": 0-1
}

RÈGLES CRITIQUES pour LANGUE:

**Indicateurs PORTUGAIS (forte confiance):**
- Verbes: quero, queria, gostaria, posso, preciso, vou, tenho, estou
- Mots question: quanto, como, onde, quando, que, qual
- Pronoms: eu, você, meu, minha
- Connecteurs: mas, porque, então, também

**Indicateurs FRANÇAIS (forte confiance):**
- Verbes: veux, voudrais, peux, dois, vais, suis, sais
- Mots question: combien, comment, où, quand, que, quel
- Articles: le, la, les, un, une, des
- Pronoms: je, tu, mon, ma
- Connecteurs: mais, parce que, donc, aussi

**Indicateurs ANGLAIS (forte confiance):**
- Verbes: want, would, can, should, will, am
- Mots question: how much, how, where, when, what
- Articles: the, a, an
- Pronoms: I, you, my
- Connecteurs: but, because, so, also

**IMPORTANT - Ce qui N'est PAS un indicateur:**
- ❌ Devises: €, R$, EUR, BRL
- ❌ Chiffres: 1000, 5000
- ❌ Noms propres: Wise, Kraken

**RÈGLES:**
1. Minimum 2 indicateurs forts pour détecter langue
2. Si < 2 indicateurs → language = null
3. En cas d'égalité → language = null

RÈGLES pour ROUTE:
1. "change/trocar X REAIS" → brleur (possède reais)
2. "change/trocar X EUROS" → eurbrl (possède euros)
3. "acheter/comprar X EUROS" → brleur (veut euros)
4. "acheter/comprar X REAIS" → eurbrl (veut reais)

RÈGLES pour INTENT:
- greeting = salut, oi, hello, hey, bonjour, bom dia
- compare = demande conversion/comparaison
- help = aide, ajuda, help
- about = c'est quoi, quem é, what is
- unknown = incompréhensible

Exemples:
"I want to change 1000 reais" → {"intent":"compare","entities":{"amount":1000,"route":"brleur","language":"en"},"confidence":0.9}
"quero trocar 1000€" → {"intent":"compare","entities":{"amount":1000,"route":"eurbrl","language":"pt"},"confidence":0.85}
"je veux changer 500 euros" → {"intent":"compare","entities":{"amount":500,"route":"eurbrl","language":"fr"},"confidence":0.9}
"1000€" → {"intent":"compare","entities":{"amount":1000,"route":"eurbrl","language":null},"confidence":0.7}
"quanto custa 1000 euros" → {"intent":"compare","entities":{"amount":1000,"route":"brleur","language":"pt"},"confidence":0.9}
`;

// ============================================
// PARSE AVEC IA + FALLBACK
// ============================================

export async function parseUserIntent(userMessage, context = {}) {
  const startTime = Date.now();
  
  // 🚀 ÉTAPE 1 : Essaie patterns regex d'abord
  const patternResult = tryPatternMatch(userMessage);
  if (patternResult) {
    const processingTime = Date.now() - startTime;
    console.log('[NLU] ✅ Pattern match (no AI needed):', patternResult);
    
    // Log sans user_id (pas critique pour patterns)
    if (context.userId) {
      await logNLUResult({
        userId: context.userId,
        userMessage,
        detectedIntent: patternResult.intent,
        detectedEntities: patternResult.entities,
        confidence: patternResult.confidence,
        wasSuccessful: true,
        processingTime
      });
    }
    
    return patternResult;
  }
  
  // 🤖 ÉTAPE 2 : Appel IA si pattern ne match pas
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: "json_object" }
    });
    
    const parsed = JSON.parse(response.choices[0].message.content);
    const processingTime = Date.now() - startTime;
    
    // Patch: si pas de langue détectée, utilise contexte
    if (!parsed.entities.language && context.language) {
      parsed.entities.language = context.language;
    }
    
    console.log('[NLU] 🤖 AI result:', { 
      input: userMessage, 
      output: parsed,
      tokens: response.usage.total_tokens,
      time: processingTime + 'ms'
    });
    
    // Log
    if (context.userId) {
      await logNLUResult({
        userId: context.userId,
        userMessage,
        detectedIntent: parsed.intent,
        detectedEntities: parsed.entities,
        confidence: parsed.confidence,
        wasSuccessful: true,
        processingTime
      });
    }
    
    return parsed;
  } catch (error) {
    console.error('[NLU] ❌ Error:', error);
    
    const processingTime = Date.now() - startTime;
    
    // Fallback
    const fallback = {
      intent: 'unknown',
      entities: {
        language: context.language || 'fr'
      },
      confidence: 0,
      error: true
    };
    
    // Log erreur
    if (context.userId) {
      await logNLUResult({
        userId: context.userId,
        userMessage,
        detectedIntent: 'unknown',
        detectedEntities: {},
        confidence: 0,
        wasSuccessful: false,
        processingTime
      });
    }
    
    return fallback;
  }
}

/**
 * Version batch pour tests
 */
export async function parseUserIntentBatch(messages) {
  const results = [];
  for (const message of messages) {
    const result = await parseUserIntent(message);
    results.push({ message, ...result });
  }
  return results;
}