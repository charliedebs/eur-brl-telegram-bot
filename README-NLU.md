# 🤖 Phase 0 : NLU (Natural Language Understanding)

## ✅ Ce qui a été ajouté

### 1. Service NLU (`src/services/nlu.js`)
- Utilise GPT-4o-mini d'OpenAI pour analyser l'intention des messages
- Détecte automatiquement :
  - **Intent** : greeting, compare, help, about, unknown
  - **Entities** : amount, route (eurbrl/brleur), language (fr/pt/en)
  - **Confidence** : niveau de confiance (0-1)

### 2. Middleware dans le bot (`src/bot/index.js`)
- Intercepte tous les messages texte
- Parse l'intention avec l'IA
- Redirige intelligemment vers les bons handlers
- Détection automatique de la langue
- Fallback si l'IA ne comprend pas

### 3. Script de test (`test-nlu.js`)
- Test complet avec 30+ messages variés
- Test rapide avec échantillon
- Test personnalisé pour un message spécifique
- Calcul du coût estimé

## 🚀 Installation

### 1. Installer la dépendance OpenAI

```bash
npm install openai
```

### 2. Obtenir une API key OpenAI

1. Va sur https://platform.openai.com/api-keys
2. Crée une nouvelle API key (secret key)
3. Copie-la (tu ne pourras plus la revoir après)

### 3. Ajouter la clé dans `.env`

```bash
# Ajoute cette ligne dans ton .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 4. Tester le service NLU

```bash
# Test complet (tous les messages, ~30 sec)
npm run test:nlu

# Test rapide (échantillon, ~5 sec)
npm run test:nlu:fast

# Test personnalisé
npm run test:nlu:custom "je veux changer 1000€ en reais"
```

## 📊 Coûts

### Modèle utilisé : GPT-4o-mini
- **Prix** : $0.150 / 1M tokens input + $0.600 / 1M tokens output
- **Moyenne par message** : ~80 tokens = **$0.00012 par message**

### Estimation mensuelle
```
Scénario : 1000 users × 5 messages texte/mois = 5000 messages

Coût total : 5000 × $0.00012 = $0.60/mois
Soit environ : 0,55€/mois
```

**C'est essentiellement gratuit** ☕ (moins qu'un café par mois)

### Comparaison freemium vs premium
```
1000 users freemium : ~0,55€/mois
100 users premium   : ~0,06€/mois
─────────────────────────────────
Total NLU          : ~0,61€/mois

Revenus premium (conservateur) : ~77€/mois
Ratio coût/revenu NLU : 0,8%
```

## 🎯 Ce que ça apporte

### Avant (sans NLU)
```
User: "je veux changer 1000 euros en reais"
Bot: ⚠️ Montant invalide
```

### Après (avec NLU)
```
User: "je veux changer 1000 euros en reais"
Bot: [Affiche directement la comparaison EUR→BRL pour 1000€]
```

### Exemples de messages compris

#### Greetings (détection de langue)
- `salut` → greeting FR
- `oi` → greeting PT
- `hello` → greeting EN

#### Comparaisons
- `je veux changer 1000€ en reais` → compare (amount: 1000, route: eurbrl)
- `quanto custa 500 reais em euros` → compare (amount: 500, route: brleur)
- `convert 2000 EUR to BRL` → compare (amount: 2000, route: eurbrl)
- `1000€` → compare (amount: 1000, route: null → demande route)

#### Aide & Info
- `aide` / `ajuda` / `help` → help
- `c'est quoi ce bot` / `about` → about

## 🔧 Comment ça marche

### 1. Flow utilisateur

```
User écrit un message
         ↓
Middleware NLU (bot.on('text'))
         ↓
parseUserIntent(text) → appel OpenAI
         ↓
Retourne { intent, entities, confidence }
         ↓
Switch selon intent:
  - greeting → affiche intro
  - compare → affiche comparaison (si amount+route)
  - help → affiche aide
  - about → affiche à propos
  - unknown → fallback parsing manuel
```

### 2. Architecture

```
src/
├── services/
│   └── nlu.js              ← Service NLU (nouveau)
│       ├── parseUserIntent()
│       └── parseUserIntentBatch()
├── bot/
│   └── index.js            ← Middleware NLU ajouté
│       └── bot.on('text')  ← Analyse avant traitement
```

### 3. Prompt système

Le prompt système est optimisé pour :
- Détecter les 5 intentions principales
- Extraire les entités (montant, route, langue)
- Retourner du JSON structuré
- Être fiable avec peu de tokens (~80 tokens/message)

## 🧪 Tests

### Test complet
```bash
npm run test:nlu
```

Teste 30+ messages variés :
- Greetings en FR/PT/EN
- Comparaisons avec montants
- Demandes d'aide
- Messages inconnus

### Test rapide
```bash
npm run test:nlu:fast
```

Teste 5 messages échantillon pour vérifier que tout marche.

### Test personnalisé
```bash
npm run test:nlu:custom "ton message ici"
```

Teste un message spécifique pour voir comment l'IA l'interprète.

## 📈 Monitoring

Le service NLU log automatiquement :
```javascript
[NLU] {
  input: "je veux changer 1000€ en reais",
  output: {
    intent: "compare",
    entities: { amount: 1000, route: "eurbrl" },
    confidence: 0.9
  },
  tokens: 82,
  cost: "~$0.000123"
}
```

Tu peux suivre :
- Quels messages sont envoyés
- Comment l'IA les interprète
- Combien de tokens sont utilisés
- Le coût par message

## 🚨 Fallback

Si l'API OpenAI est down ou retourne une erreur :
```javascript
return {
  intent: 'unknown',
  entities: {},
  confidence: 0
}
```

Le bot continue de fonctionner avec le parsing manuel classique.

## ⚡ Performance

- **Latence** : ~200-500ms par message (appel API)
- **Rate limit OpenAI** : 10,000 req/min (largement suffisant)
- **Coût** : négligeable (~0,55€/mois pour 1000 users)

## 🎉 Prochaines étapes

Maintenant que la Phase 0 est terminée, tu peux :

1. **Tester en local** : Lance le bot et teste avec des messages variés
2. **Déployer** : Push sur ton serveur et teste en prod
3. **Monitorer** : Vérifie les logs pour voir comment l'IA performe
4. **Passer à la Phase 1** : Historique & Alertes gratuites

## 📝 Notes importantes

### Détection de langue
L'IA détecte automatiquement la langue et met à jour le profil utilisateur :
```javascript
if (intent.entities.language && intent.entities.language !== ctx.state.lang) {
  await db.updateUser(ctx.from.id, { language: intent.entities.language });
  ctx.state.lang = intent.entities.language;
}
```

### Backward compatibility
Le parsing manuel reste en place comme fallback :
```javascript
case 'unknown':
  // Fallback : essaie parsing manuel
  const amount = parseAmount(text);
  const route = detectRoute(text);
  // ...
```

### Amélioration continue
Tu peux ajuster le prompt système dans `nlu.js` si besoin pour améliorer la détection.

---

**🎊 Phase 0 terminée !** Le bot comprend maintenant le langage naturel avec une IA pour ~0,55€/mois.