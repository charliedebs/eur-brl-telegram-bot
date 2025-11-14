# 📝 TODO LIST - EUR/BRL Telegram Bot

## 🔧 Améliorations UX

### Guide Navigation
**Priority:** Medium
**Description:** Simplifier le menu de navigation du guide

**Actuellement:** Affiche les 12 steps individuels (1.1, 1.2, 1.3, etc.)

**Souhaité:** Afficher 3 sections principales:
- 📍 Part 1: Départ (Steps 1.1-1.4)
- 📍 Part 2: Transfert (Steps 2.1-2.4)
- 📍 Part 3: Arrivée (Steps 3.1-3.4)

**Fichiers à modifier:**
- `src/platforms/telegram/keyboards.js` - Guide navigation keyboard
- `src/bot/messages/messages-*.js` - Navigation labels (PT, EN, FR)

**Estimation:** 30 min

---

## 💳 Premium Features

### Remove One-Off Premium Option
**Priority:** Medium
**Status:** Pending
**Platforms:** Both WhatsApp and Telegram

**Description:** Remove the one-off (one-time purchase) premium option from the bot. Users should only be able to subscribe with recurring subscriptions (monthly, quarterly, semiannual, annual).

**Files to modify:**
1. `src/core/keyboards/keyboard-types.js`
   - Remove `premium_oneshot_pricing` keyboard
   - Remove `premium_oneshot_renew` keyboard
   - Remove `premium_oneshot_pricing_renew` keyboard
   - Update `premium_pricing` keyboard to remove one-shot option
   - Update `premium_pricing_whatsapp` keyboard

2. `src/core/handlers/premium-handler.js`
   - Remove handlers for one-shot payment processing
   - Remove handlers for one-shot renewal

3. `src/bot/messages/messages-*.js` (all languages: fr, pt, en)
   - Remove one-shot button labels (oneshot3m, oneshot6m, oneshot12m)
   - Remove one-shot messaging
   - Update premium pricing messages

4. Database (if applicable)
   - Check if there are any one-off premium references
   - May need migration for existing one-off users

**Testing required:**
- Test premium pricing flow on both platforms
- Ensure existing one-off users are not affected (grandfathered)
- Test renewal flows

**Estimation:** 2 hours

---

## 🚀 En Cours

_Aucune tâche en cours_

---

## ✅ Completed

- [x] Migration SQL multi-plateforme (002_add_platform_support.sql)
- [x] Database service réécrit avec méthodes multi-plateforme
- [x] 4 handlers créés (comparison, guide, alert, premium)
- [x] Bot-engine platform-agnostic
- [x] Telegram adapter enhanced
- [x] Keyboards migré vers platforms/telegram/
- [x] Fix import paths keyboards.js
- [x] Deploy Render réussi
- [x] WhatsApp adapter complet (src/platforms/whatsapp/)
- [x] WhatsApp menus texte avec sélection numérique
- [x] WhatsApp authentication (QR code)
- [x] Integration WhatsApp dans server.js
- [x] Documentation WhatsApp complète (docs/WHATSAPP_INTEGRATION.md)
- [x] Guide de démarrage rapide (WHATSAPP_QUICKSTART.md)
- [x] Phase 1: WhatsApp UX improvements (context preservation, streamlined navigation)
- [x] Phase 2: Comparison screen reorganization (Alert, Convert, More Options)
- [x] Phase 2: Numbered FAQ menu system for WhatsApp
- [x] Phase 2: Step navigation coherence improvements
- [x] Phase 2: Consolidated all options in single More Options menu

---

**Last Updated:** 14 novembre 2025, 16:30 UTC
