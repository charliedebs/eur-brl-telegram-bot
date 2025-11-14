# WhatsApp Button Text Compliance Audit Report

**EUR-BRL Telegram Bot Messages Files**
**Audit Date: November 14, 2025**

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total buttons analyzed | 327 | ✅ |
| Buttons exceeding 20 chars | 116 (35.5%) | ⚠️ |
| Buttons exceeding 24 chars | **56 (17.1%)** | 🔴 |

**Critical Issue:** 56 buttons exceed WhatsApp's 24-character list title limit and will display truncated text.

---

## WhatsApp Platform Limits

- **20 characters**: Maximum for WhatsApp Reply Button text (recommended safe limit)
- **24 characters**: Maximum for WhatsApp List Item title text
- **64 characters**: Maximum for WhatsApp Button header text

When buttons exceed these limits, WhatsApp's API will truncate the text, potentially breaking user experience.

---

## Breakdown by Language

### English (109 total buttons)
- Exceeding 20 chars: **35 buttons**
- Exceeding 24 chars: **17 buttons**
- Most critical: `renewPlan12months` (35 chars)

### Portuguese (109 total buttons)
- Exceeding 20 chars: **40 buttons**
- Exceeding 24 chars: **20 buttons**
- Most critical: `renewPlan12months` (36 chars)

### French (109 total buttons)
- Exceeding 20 chars: **41 buttons**
- Exceeding 24 chars: **19 buttons**
- Most critical: `renewPlan12months` (37 chars) - **LONGEST OVERALL**

---

## Top 20 Longest Button Labels

| # | Length | Language | Button Key | Current Text | Status |
|---|--------|----------|-----------|--------|--------|
| 1 | 37 | French | renewPlan12months | 🔄 Prolonger 12 mois - R$ 50,00 (-17%) | 🔴 OVER 24 |
| 2 | 36 | Portuguese | renewPlan12months | 🔄 Renovar 12 meses - R$ 50,00 (-17%) | 🔴 OVER 24 |
| 3 | 35 | English | renewPlan12months | 🔄 Renew 12 months - R$ 50.00 (-17%) | 🔴 OVER 24 |
| 4 | 35 | French | renewPlan6months | 🔄 Prolonger 6 mois - R$ 28,00 (-7%) | 🔴 OVER 24 |
| 5 | 34 | Portuguese | renewPlan6months | 🔄 Renovar 6 meses - R$ 28,00 (-7%) | 🔴 OVER 24 |
| 6 | 34 | French | aboutReferrals | 🤝 À propos des liens de parrainage | 🔴 OVER 24 |
| 7 | 34 | French | premiumDetails | ℹ️ Voir toutes les fonctionnalités | 🔴 OVER 24 |
| 8 | 33 | English | whyNotExact | 🤔 Why can't we give exact amount? | 🔴 OVER 24 |
| 9 | 33 | English | renewPlan6months | 🔄 Renew 6 months - R$ 28.00 (-7%) | 🔴 OVER 24 |
| 10 | 33 | Portuguese | nextStep2 | 👉 Ir para etapa 2 (transferência) | 🔴 OVER 24 |
| 11 | 33 | French | minAmount | 💰 C'est quoi le montant minimum ? | 🔴 OVER 24 |
| 12 | 32 | Portuguese | step2Done | ✅ Tenho meu endereço → continuar | 🔴 OVER 24 |
| 13 | 32 | French | step1_2Done | ✅ J'ai trouvé le marché EUR/USDC | 🔴 OVER 24 |
| 14 | 32 | French | nextStep2 | 👉 Passer à l'étape 2 (transfert) | 🔴 OVER 24 |
| 15 | 31 | Portuguese | premiumDetails | ℹ️ Ver todas as funcionalidades | 🔴 OVER 24 |
| 16 | 31 | French | whyNotExact | 🤔 Pourquoi pas le solde exact ? | 🔴 OVER 24 |
| 17 | 30 | English | calcdetails | 🔍 On-chain calculation details | 🔴 OVER 24 |
| 18 | 30 | English | step2Done | ✅ I have my address → continue | 🔴 OVER 24 |
| 19 | 30 | Portuguese | calcdetails | 🔍 Detalhes do cálculo on-chain | 🔴 OVER 24 |
| 20 | 30 | Portuguese | step1_2Done | ✅ Encontrei o mercado EUR/USDC | 🔴 OVER 24 |

---

## Critical Issues - Buttons Over 24 Characters

### Category 1: Premium Subscription Labels (HIGHEST PRIORITY)

**Impact:** Affects payment flow and conversions. These buttons appear in pricing screens.

#### English
```javascript
// ❌ CURRENT
renewPlan12months: '🔄 Renew 12 months - R$ 50.00 (-17%)',  // 35 chars
renewPlan6months: '🔄 Renew 6 months - R$ 28.00 (-7%)',    // 33 chars

// ✅ RECOMMENDED
renewPlan12months: '🔄 Renew 12m - R$ 50 (-17%)',           // 28 chars
renewPlan6months: '🔄 Renew 6m - R$ 28 (-7%)',             // 25 chars
```

#### Portuguese
```javascript
// ❌ CURRENT
renewPlan12months: '🔄 Renovar 12 meses - R$ 50,00 (-17%)',  // 36 chars
renewPlan6months: '🔄 Renovar 6 meses - R$ 28,00 (-7%)',    // 34 chars

// ✅ RECOMMENDED
renewPlan12months: '🔄 Renovar 12m - R$ 50 (-17%)',          // 29 chars
renewPlan6months: '🔄 Renovar 6m - R$ 28 (-7%)',            // 26 chars
```

#### French
```javascript
// ❌ CURRENT
renewPlan12months: '🔄 Prolonger 12 mois - R$ 50,00 (-17%)',  // 37 chars ⚠️ LONGEST
renewPlan6months: '🔄 Prolonger 6 mois - R$ 28,00 (-7%)',    // 35 chars

// ✅ RECOMMENDED
renewPlan12months: '🔄 Prolonger 12m - R$ 50 (-17%)',         // 30 chars
renewPlan6months: '🔄 Prolonger 6m - R$ 28 (-7%)',           // 28 chars
```

**Shortening strategy:**
- Replace "months/meses/mois" with "m" (saves 6-7 chars)
- Remove ".00" from currency amounts (saves 3 chars)
- Total savings: 8-10 characters per button

---

### Category 2: Navigation & Step Buttons

**Impact:** User flow navigation buttons, moderate priority

#### English - step2Done
```javascript
// ❌ CURRENT (30 chars)
step2Done: '✅ I have my address → continue'

// ✅ RECOMMENDED (23 chars)
step2Done: '✅ Address ready → next'
```

#### Portuguese - step2Done
```javascript
// ❌ CURRENT (32 chars)
step2Done: '✅ Tenho meu endereço → continuar'

// ✅ RECOMMENDED (30 chars)
step2Done: '✅ Endereço pronto → continuar'
```

#### French - step2Done
```javascript
// ❌ CURRENT (30 chars)
step2Done: '✅ J\'ai mon adresse → continuer'

// ✅ RECOMMENDED (22 chars)
step2Done: '✅ Adresse → continuar'
```

---

### Category 3: Information & Details Buttons

#### English - calcdetails
```javascript
// ❌ CURRENT (30 chars)
calcdetails: '🔍 On-chain calculation details'

// ✅ RECOMMENDED (19 chars)
calcdetails: '🔍 On-chain details'
```

#### Portuguese - calcdetails
```javascript
// ❌ CURRENT (30 chars)
calcdetails: '🔍 Detalhes do cálculo on-chain'

// ✅ RECOMMENDED (20 chars)
calcdetails: '🔍 Detalhes on-chain'
```

#### French - calcdetails
```javascript
// ❌ CURRENT (28 chars)
calcdetails: '🔍 Détails du calcul on-chain'

// ✅ RECOMMENDED (19 chars)
calcdetails: '🔍 Détails on-chain'
```

---

### Category 4: FAQ & Premium Buttons

#### English - whyNotExact
```javascript
// ❌ CURRENT (33 chars)
whyNotExact: '🤔 Why can\'t we give exact amount?'

// ✅ RECOMMENDED (15 chars)
whyNotExact: '🤔 Why estimates?'
```

#### Portuguese - whyNotExact
```javascript
// ❌ CURRENT (28 chars)
whyNotExact: '🤔 Por que não o saldo exato?'

// ✅ RECOMMENDED (21 chars)
whyNotExact: '🤔 Por que estimativa?'
```

#### French - whyNotExact
```javascript
// ❌ CURRENT (31 chars)
whyNotExact: '🤔 Pourquoi pas le solde exact ?'

// ✅ RECOMMENDED (18 chars)
whyNotExact: '🤔 Pourquoi estimé?'
```

---

### Category 5: Referral Information

#### French - aboutReferrals (34 chars)
```javascript
// ❌ CURRENT
aboutReferrals: '🤝 À propos des liens de parrainage'

// ✅ RECOMMENDED (19 chars)
aboutReferrals: '🤝 Liens parrainage'
```

#### French - minAmount (33 chars)
```javascript
// ❌ CURRENT
minAmount: '💰 C\'est quoi le montant minimum ?'

// ✅ RECOMMENDED (18 chars)
minAmount: '💰 Montant minimum?'
```

---

### Category 6: Navigation Steps

#### English - nextStep2
```javascript
// ❌ CURRENT (25 chars)
nextStep2: '👉 Go to step 2 (transfer)'

// ✅ RECOMMENDED (19 chars)
nextStep2: '👉 Step 2: Transfer'
```

#### Portuguese - nextStep2
```javascript
// ❌ CURRENT (33 chars)
nextStep2: '👉 Ir para etapa 2 (transferência)'

// ✅ RECOMMENDED (25 chars)
nextStep2: '👉 Etapa 2: Transferência'
```

#### French - nextStep2
```javascript
// ❌ CURRENT (32 chars)
nextStep2: '👉 Passer à l\'étape 2 (transfert)'

// ✅ RECOMMENDED (21 chars)
nextStep2: '👉 Étape 2: Transfert'
```

---

## Buttons Between 20-24 Characters (Moderate Issues)

These buttons fit within the 24-char limit but are at the edge of WhatsApp's 20-char reply button limit and may wrap on mobile screens:

### English
- `plan12months`: 29ch → "12m - R$50 (-17%)" (16ch)
- `plan6months`: 27ch → "6m - R$28 (-7%)" (14ch)
- `viewOffchain`: 28ch → "View offchain" (13ch)

### Portuguese
- `pauseSpontaneousAlerts`: 28ch → "Pausar 1 semana" (15ch)
- `step2_3Done`: 27ch → "Confirmei" (9ch)

### French
- `pauseSpontaneousAlerts`: 30ch → "Pause 1 semaine" (15ch)
- `viewOffchain`: 28ch → "Voir offchain" (13ch)

---

## Affected Files

1. `/home/user/eur-brl-telegram-bot/src/bot/messages/messages-en.js`
   - 17 buttons exceeding 24 chars
   - 35 buttons exceeding 20 chars

2. `/home/user/eur-brl-telegram-bot/src/bot/messages/messages-pt.js`
   - 20 buttons exceeding 24 chars
   - 40 buttons exceeding 20 chars

3. `/home/user/eur-brl-telegram-bot/src/bot/messages/messages-fr.js`
   - 19 buttons exceeding 24 chars
   - 41 buttons exceeding 20 chars

---

## Recommended Action Plan

### IMMEDIATE (Critical - affects payment flow)
1. Fix all 12 `renewPlan*` buttons across 3 languages
2. Fix premium-related buttons (`premiumDetails`, `aboutReferrals`)
3. Fix step navigation buttons that exceed 24 chars
4. Testing on WhatsApp Business API

**Estimated impact:** ~30 character saves per language in renew plan buttons

### SHORT-TERM (High priority - user experience)
5. Fix FAQ buttons (`whyNotExact`, `minAmount`)
6. Optimize calculation buttons (`calcdetails`)
7. Review and shorten step completion buttons
8. Test on actual WhatsApp mobile app

### MEDIUM-TERM (Best practices)
9. Create button text length style guide
10. Add pre-commit hooks to validate button lengths
11. Establish character count limits for new buttons
12. Create translation guidelines for multilingual projects

---

## Shortening Strategies

### Strategy 1: Abbreviations
- "months" → "m", "meses" → "m", "mois" → "m" (saves 6-7 chars)
- "about" → remove where context is clear

### Strategy 2: Remove Unnecessary Words
- "I have my address" → "Address ready" (saves 5 chars)
- "go to" → remove and restructure (saves 6 chars)
- "can't we give" → change to question format

### Strategy 3: Currency Formatting
- Remove decimals: "$50.00" → "$50" (saves 3 chars)
- Use local format: "€" prefix is shorter

### Strategy 4: Emoji Optimization
- Some buttons have emoji that could be removed if space is critical
- Emoji count as 1-2 chars each in WhatsApp's calculation

### Strategy 5: Step Numbering
- Option 1: Keep "1.2" format but remove emoji
- Option 2: Restructure as "Step 1.2: Title"

---

## Testing Recommendations

1. **WhatsApp Business API Test**
   - Create test buttons with long text
   - Verify truncation behavior
   - Test on multiple devices

2. **Mobile Testing**
   - Test on iPhone 12 mini (smallest viewport)
   - Test on Samsung Galaxy A12 (common in Brazil)
   - Check text wrapping behavior

3. **Keyboard Configuration**
   - Test integration with keyboard.js
   - Verify buttons still fit in button panels
   - Check multi-button layouts

4. **User Acceptance Testing**
   - Test with premium users
   - Test with step-by-step guide users
   - Verify no loss of meaning in shortened text

---

## Summary Table - All Buttons Exceeding 24 Characters

### Priority Ranking

| Priority | Count | Categories | Action Timeline |
|----------|-------|------------|-----------------|
| CRITICAL | 12 | Premium renewal buttons | Immediate (1-2 weeks) |
| HIGH | 20 | Navigation, info, FAQ buttons | Short-term (2-4 weeks) |
| MEDIUM | 24 | Step buttons, alternative buttons | Medium-term (1-2 months) |

### Total Impact
- **56 buttons to review/fix**
- **Average savings per button: 5-8 characters**
- **Total character reduction possible: 280-450 characters**

---

## Conclusion

The audit identified **56 buttons (17.1%)** exceeding WhatsApp's 24-character list title limit. Most critical are the premium renewal buttons which appear in conversion funnels. With systematic application of abbreviations and text optimization, all buttons can be brought into compliance within 4-8 weeks.

**Recommended immediate action:** Fix the 12 `renewPlan*` buttons as they impact payment flows and premium conversions.
