# WhatsApp UX Compliance Guide
**For EUR-BRL Telegram Bot - WhatsApp Cloud API Integration**

---

## 📋 WhatsApp API Limits & Requirements

### Character Limits
| Element | Limit | Implementation |
|---------|-------|----------------|
| Reply Button Title | 20 chars | Truncated in cloud-adapter.js:122 |
| List Row Title | 24 chars | Truncated in cloud-adapter.js:159 |
| List Row Description | 72 chars | Truncated in cloud-adapter.js:160 |
| Message Body | 1-1024 chars | Validated with fallback in cloud-adapter.js:104-108 |

### Button Limits
| Button Count | Format Used | Max Buttons |
|--------------|-------------|-------------|
| 1-3 | Reply Buttons | 3 |
| 4-10 | List Message | 10 |
| 11+ | Numbered Text Menu | Unlimited |

---

## ✅ Current Implementation Status

### Automatic Platform Detection
**Location**: `src/core/bot-engine.js:509-534`

The bot automatically detects WhatsApp users and serves optimized keyboards:

```javascript
const whatsappKeyboards = [
  'main', 'comparison', 'onchain_intro', 'faq_menu',
  'premium_pricing', 'exchanges_eu', 'exchanges_br'
];

// Auto-selects keyboard_type_whatsapp when available
if (options.platform === 'whatsapp' && whatsappKeyboards.includes(type)) {
  finalType = type + '_whatsapp';
}
```

**Benefit**: No manual platform checks needed throughout code.

---

### Empty Text Fallback
**Location**: `src/platforms/whatsapp/cloud-adapter.js:104-108`

```javascript
let formattedText = this.formatText(text);
if (!formattedText || formattedText.trim().length === 0) {
  formattedText = '📱 Menu'; // Fallback text if empty
}
```

**Why**: WhatsApp API rejects empty body text with 400 error.

---

### Character Truncation
**Location**: `src/platforms/whatsapp/cloud-adapter.js`

```javascript
// Reply buttons (20 char limit)
title: btn.text.substring(0, 20)

// List rows (24 char limit)
title: btn.text.substring(0, 24)

// List descriptions (72 char limit)
description: btn.url ? btn.url.substring(0, 72) : ''
```

**Note**: Silent truncation can lose context. Consider WhatsApp-specific labels.

---

## 🎨 WhatsApp-Optimized Keyboards

### Main Menu
**Telegram**: 4 buttons (EUR→BRL, BRL→EUR, Premium, About)
**WhatsApp**: 3 buttons (EUR→BRL, BRL→EUR, Menu)

```javascript
case 'main_whatsapp':
  return [
    { text: msg.btn.eurbrl(DEFAULTS.EUR, locale), id: `route:eurbrl:${DEFAULTS.EUR}` },
    { text: msg.btn.brleur(DEFAULTS.BRL, locale), id: `route:brleur:${DEFAULTS.BRL}` },
    { text: '📋 Menu', id: 'action:more_menu' }
  ];
```

**Triggers**: Reply Buttons (3)

---

### Comparison Screen
**Telegram**: 5 buttons (Continue On-chain, Calc Details, Stay Off-chain, More Options, Sources)
**WhatsApp**: 3 buttons (Set Alert, Convert, More Options)

```javascript
case 'comparison_whatsapp':
  return [
    { text: msg.btn.setAlert, id: `alert:quick_create:${route}:${amount}` },
    { text: convertLabel, id: `action:convert_choice:${route}:${amount}` },
    { text: msg.btn.moreOptions, id: `action:comparison_more:${route}:${amount}` }
  ];
```

**Triggers**: Reply Buttons (3)

**Submenu** (`comparison_more`): 5 buttons → List format

---

### FAQ Menu
**Telegram**: 7 buttons (all FAQs listed)
**WhatsApp**: Numbered text menu with 4 buttons

```javascript
case 'faq_menu_whatsapp':
  return [
    { text: beginnerLabel, id: 'action:beginner_guide' },
    { text: msg.btn.askQuestion, id: 'action:faq_send_question' },
    { text: moreFaqLabel, id: `action:faq_more:${route}:${amount}` },
    { text: '🔙 ' + msg.btn.back, id: `action:onchain_intro:${route}:${amount}` }
  ];
```

**Triggers**: List format (4 buttons)

**Text Menu**: User types 1-5 to select FAQ

```
🤔 DÚVIDAS ?

Responda com o número ou faça sua pergunta:

📚 Guia iniciante
1️⃣ O que é USDC?
2️⃣ O que é uma exchange?

💰 Custos & Limites
3️⃣ Valor mínimo
4️⃣ Sobre indicações
5️⃣ Por que on-chain é vantajoso

💬 Digite sua pergunta para mais ajuda
```

---

### Premium Pricing
**Telegram**: 7 buttons (all plans)
**WhatsApp**: 3 buttons (Monthly, Quarterly, Plus...)

```javascript
case 'premium_pricing_whatsapp':
  return [
    { text: msg.btn.subMPMonthly, id: 'premium:sub:mp:monthly' },
    { text: msg.btn.subMPQuarterly, id: 'premium:sub:mp:quarterly' },
    { text: '💳 Plus...', id: 'action:premium_more' }
  ];
```

**Triggers**: Reply Buttons (3)

**Submenu** (`premium_more`): 5 buttons → List format

---

## 🔧 Session Management

### Automatic Cleanup on Button Clicks
**Location**: `src/core/bot-engine.js:540-548`

```javascript
// Clear all session awaiting flags when user clicks any button
this.updateSession(userId, platform, {
  awaitingFaqChoice: false,
  awaitingFaqQuestion: false,
  awaitingPaymentHelp: false,
  awaitingAmount: null,
  awaitingConvertAmount: false
});
```

**Why**: Prevents state confusion when user navigates during input flows.

**Example**:
1. User enters FAQ menu → `awaitingFaqChoice = true`
2. User clicks "Back" button → Flag cleared automatically
3. User types "1000" → Treated as amount, not FAQ choice ✅

---

### FAQ Number Validation
**Location**: `src/core/bot-engine.js:194-204`

```javascript
if (choice >= 1 && choice <= 5) {
  // Valid choice
} else if (!isNaN(choice)) {
  // Invalid number - provide feedback
  return this.formatResponse('❌ Escolha um número entre 1 e 5...');
} else {
  // Text - treat as custom question
}
```

**UX Improvement**: Clear feedback instead of confusing behavior.

---

## 📱 Button Format Decision Tree

```
How many buttons?
│
├─ 1-3 buttons → Use Reply Buttons (quick reply)
│  └─ Max 20 chars per button
│  └─ User taps button
│  └─ Examples: main_whatsapp, comparison_whatsapp
│
├─ 4-10 buttons → Use List Message
│  └─ Max 24 chars per row title
│  └─ Max 72 chars per row description
│  └─ User opens menu → selects from list
│  └─ Examples: comparison_more, faq_menu_whatsapp, premium_more
│
└─ 11+ buttons → Use Numbered Text Menu
   └─ No character limit
   └─ User types number
   └─ Examples: FAQ numbered menu (1-5)
```

---

## 🎯 Best Practices

### ✅ DO
- **Use reply buttons for 1-3 options** (fastest UX)
- **Use lists for 4-10 options** (organized menu)
- **Use numbered menus for >10 options** (or when buttons need more context)
- **Keep button text concise** (remove unnecessary words)
- **Test button text lengths** before deploying
- **Provide fallback text** for empty messages
- **Clear session state** on navigation
- **Validate user input** for numbered menus

### ❌ DON'T
- **Don't use reply buttons for >3 options** (API error)
- **Don't use lists for >10 items** (API error)
- **Don't send empty message bodies** (API rejects)
- **Don't assume user follows linear flow** (they click back/forward)
- **Don't leave session flags active** after navigation
- **Don't treat all numbers as valid choices** (validate range)

---

## 🔍 Testing Checklist

### Button Rendering
- [ ] Reply buttons (1-3) render correctly
- [ ] List messages (4-10) render correctly
- [ ] Numbered menus display full text
- [ ] All button labels fit within limits
- [ ] No truncation mid-word

### Navigation
- [ ] Back buttons work from all screens
- [ ] User can navigate away during input flows
- [ ] Session state clears on button clicks
- [ ] No dead-end screens

### Input Validation
- [ ] Numbers 1-5 trigger FAQ actions
- [ ] Numbers outside range show error
- [ ] Text triggers custom FAQ question
- [ ] Empty input handled gracefully

### Error Handling
- [ ] Empty message bodies use fallback
- [ ] Invalid callbacks show error message
- [ ] API errors logged with context
- [ ] User receives helpful feedback

---

## 📊 Current Compliance Score

| Requirement | Status | Notes |
|-------------|--------|-------|
| Reply button limit (3) | ✅ PASS | Enforced in keyboards |
| List row limit (10) | ✅ PASS | Enforced in keyboards |
| Character limits (20/24/72) | ✅ PASS | Truncated in adapter |
| Non-empty body text | ✅ PASS | Fallback implemented |
| Button title clarity | ⚠️ PARTIAL | Some truncation loses context |
| Session management | ✅ PASS | Auto-cleanup on buttons |
| Input validation | ✅ PASS | FAQ number validation |
| Platform detection | ✅ PASS | Auto-selects WhatsApp keyboards |

**Overall**: 🟢 **COMPLIANT** with minor improvements needed

---

## 🚀 Future Improvements

### 1. WhatsApp-Specific Button Labels
**Priority**: HIGH

Add `_wa` suffix versions of long button labels:

```javascript
// messages-pt.js
btn: {
  // Telegram (no limit)
  subMPAnnual: '🔄 R$ 50/12 meses (-31%)',

  // WhatsApp (20 char max)
  subMPAnnual_wa: 'R$50/ano (-31%)'
}
```

**Benefit**: No context loss from truncation.

---

### 2. Multi-Section Lists
**Priority**: MEDIUM

Group related buttons in list sections:

```javascript
sections: [
  {
    title: "💱 Conversão",
    rows: [/* conversion options */]
  },
  {
    title: "⚙️ Configurações",
    rows: [/* settings options */]
  }
]
```

**Benefit**: Better visual organization.

---

### 3. Message Threading
**Priority**: LOW

Use `reply_to_message_id` for context:

```javascript
await this.sendMessage(chatId, 'Choose an option:', {
  buttons,
  reply_to_message_id: previousMessageId
});
```

**Benefit**: Threaded conversations.

---

## 📚 References

- [WhatsApp Cloud API - Interactive Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [Meta's WhatsApp SDK](https://github.com/Secreto31126/whatsapp-api-js)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Maintained By**: Development Team
