import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `Tu es un assistant qui analyse les messages d'un bot de change EUR↔BRL.

Détecte l'intention et extrait les entités.

Retourne UNIQUEMENT du JSON valide, rien d'autre.

Format:
{
  "intent": "greeting|compare|help|about|unknown",
  "entities": {
    "amount": number ou null,
    "route": "eurbrl|brleur" ou null,
    "language": "fr|pt|en" (OBLIGATOIRE si détectable)
  },
  "confidence": 0-1
}

RÈGLES STRICTES pour la LANGUE:
- Mots français (je, veux, changer, euros, combien, pour) → language = "fr"
- Mots portugais (oi, quero, trocar, quanto, custa, reais) → language = "pt"  
- Mots anglais (want, change, convert, how much) → language = "en"
- TOUJOURS inclure "language" si tu détectes ne serait-ce qu'un seul mot dans une langue
- Si plusieurs langues, prends celle dominante

RÈGLES pour ROUTE (direction du change):
1. Cas standard:
   - "euros en/vers/para reais" → route = "eurbrl"
   - "reais en/vers/para euros" → route = "brleur"

2. Cas "acheter/obtenir/recevoir X":
   - "acheter/obtenir/recevoir X EUROS" → route = "brleur" (je vends BRL pour obtenir EUR)
   - "acheter/obtenir/recevoir X REAIS" → route = "eurbrl" (je vends EUR pour obtenir BRL)
   - "comprar/obter/receber X EUROS" → route = "brleur"
   - "comprar/obter/receber X REAIS" → route = "eurbrl"

3. Cas "vendre X":
   - "vendre/vender X EUROS" → route = "eurbrl" (je vends EUR pour obtenir BRL)
   - "vendre/vender X REAIS" → route = "brleur" (je vends BRL pour obtenir EUR)

4. Si seulement "X euros" ou "X reais" sans contexte → route = null

RÈGLES pour INTENT:
- greeting = salutations (oi, olá, salut, bonjour, hello, hey, bom dia, boa tarde, boa noite, hi)
- compare = toute demande de conversion/comparaison/change (même partielle)
- help = demande d'aide explicite (aide, ajuda, help, comment ça marche, como funciona)
- about = question sur le bot (c'est quoi, qui es-tu, quem é você, what is this, about, info)
- unknown = vraiment rien compris

Exemples:
"yo" → {"intent":"greeting","entities":{"language":"fr"},"confidence":0.95}
"oi" → {"intent":"greeting","entities":{"language":"pt"},"confidence":0.95}
"hello" → {"intent":"greeting","entities":{"language":"en"},"confidence":0.95}

"1000€ en reais" → {"intent":"compare","entities":{"amount":1000,"route":"eurbrl","language":"fr"},"confidence":0.9}
"je veux changer 500 euros" → {"intent":"compare","entities":{"amount":500,"route":"eurbrl","language":"fr"},"confidence":0.9}
"je veux changer 500€" → {"intent":"compare","entities":{"amount":500,"route":"eurbrl","language":"fr"},"confidence":0.9}
"quanto custa 2000 reais em euros" → {"intent":"compare","entities":{"amount":2000,"route":"brleur","language":"pt"},"confidence":0.9}

"je souhaiterais acheter 2500€" → {"intent":"compare","entities":{"amount":2500,"route":"brleur","language":"fr"},"confidence":0.85}
"quero comprar 1000 euros" → {"intent":"compare","entities":{"amount":1000,"route":"brleur","language":"pt"},"confidence":0.85}
"I want to buy 500 BRL" → {"intent":"compare","entities":{"amount":500,"route":"eurbrl","language":"en"},"confidence":0.85}

"vendre 1000€" → {"intent":"compare","entities":{"amount":1000,"route":"eurbrl","language":"fr"},"confidence":0.85}
"vender 2000 reais" → {"intent":"compare","entities":{"amount":2000,"route":"brleur","language":"pt"},"confidence":0.85}

"aide" → {"intent":"help","entities":{"language":"fr"},"confidence":1}
"ajuda" → {"intent":"help","entities":{"language":"pt"},"confidence":1}

"c'est quoi ce bot" → {"intent":"about","entities":{"language":"fr"},"confidence":0.9}
"quem é você" → {"intent":"about","entities":{"language":"pt"},"confidence":0.9}

"500€" → {"intent":"compare","entities":{"amount":500,"route":eurbrl,"language":"fr"},"confidence":0.7}
"blabla random" → {"intent":"unknown","entities":{},"confidence":0.5}
`;

/**
 * Parse l'intention de l'utilisateur avec GPT-4o-mini
 * @param {string} userMessage - Message de l'utilisateur
 * @returns {Promise<Object>} - { intent, entities, confidence }
 */
export async function parseUserIntent(userMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1, // ← Légèrement plus flexible que 0, mais reste cohérent
      max_tokens: 150,
      response_format: { type: "json_object" }
    });
    
    const parsed = JSON.parse(response.choices[0].message.content);
    
    console.log('[NLU]', { 
      input: userMessage, 
      output: parsed,
      tokens: response.usage.total_tokens,
      cost: `~${(response.usage.total_tokens * 0.00015 / 1000).toFixed(6)}`
    });
    
    // 🚨 Log spécial si confidence basse (pour améliorer le prompt)
    if (parsed.confidence < 0.6) {
      console.warn('[NLU] ⚠️ Low confidence:', {
        message: userMessage,
        intent: parsed.intent,
        confidence: parsed.confidence
      });
    }
    
    return parsed;
  } catch (error) {
    console.error('[NLU] Error:', error);
    // Fallback : intention unknown
    return {
      intent: 'unknown',
      entities: {},
      confidence: 0
    };
  }
}

/**
 * Version batch pour analyser plusieurs messages (utile pour tests)
 * @param {Array<string>} messages 
 * @returns {Promise<Array<Object>>}
 */
export async function parseUserIntentBatch(messages) {
  const results = [];
  for (const message of messages) {
    const result = await parseUserIntent(message);
    results.push({ message, ...result });
  }
  return results;
}