/**
 * Comparison Handler
 *
 * Handles all comparison-related logic:
 * - Rate checks (/rate command)
 * - Amount conversions (/convert command)
 * - Comparison displays (on-chain vs off-chain)
 * - Route selection (EUR→BRL vs BRL→EUR)
 * - Target mode calculations
 */

import { getRates, calculateOnChain, getLocale, formatAmount, formatRate, calculateOnChainReverse } from '../../services/rates.js';
import { getWiseComparison, getWiseComparisonReverse } from '../../services/wise.js';
import { logger } from '../../utils/logger.js';
import { parseAndValidateAmount } from '../../utils/validation.js';

export class ComparisonHandler {
  constructor(db, messages) {
    this.db = db;
    this.messages = messages;
  }

  /**
   * Get messages for user's language
   */
  getMsg(lang) {
    return this.messages[lang || 'pt'];
  }

  /**
   * Handle /rate command
   * Shows quick rate check with comparison
   */
  async handleRateCommand(userId, lang, args, replyFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    // Parse and validate amount (default 1000)
    const amount = args ? parseAndValidateAmount(args) : 1000;

    if (!amount) {
      return replyFn(msg.ERROR_INVALID_AMOUNT);
    }

    const [rates, wiseData] = await Promise.all([
      getRates(),
      getWiseComparison('eurbrl', amount)
    ]);

    if (!rates) {
      return replyFn(msg.ERROR_RATES_UNAVAILABLE);
    }

    const onchain = calculateOnChain('eurbrl', amount, rates);
    const bestBank = wiseData?.providers?.[0] || null;

    const now = new Date();
    const timeStr = now.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
    const tzAbbr = new Date().toLocaleTimeString('en-US', {timeZoneName: 'short'}).split(' ')[2];

    const crossInverse = 1 / rates.cross;

    let text = `💱 <b>EUR ↔ BRL</b>

EUR → BRL : ${formatRate(rates.cross, locale)}
BRL → EUR : ${formatRate(crossInverse, locale)}

🌍 <b>On-chain</b>
€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(onchain.out, 0, locale)}`;

    if (bestBank) {
      text += `

🏦 <b>Wise</b>
€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(bestBank.out, 0, locale)}`;
    }

    text += `

⏰ ${timeStr} ${tzAbbr}`;

    const keyboard = kbBuilder(msg, 'rate_quick', { amount, locale });

    return replyFn(text, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle /convert command
   * Shows full comparison screen
   */
  async handleConvertCommand(userId, lang, args, replyFn, kbBuilder, sessionUpdate) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    if (!args) {
      sessionUpdate({ awaitingConvertAmount: true });
      return replyFn(msg.CONVERT_ASK_AMOUNT || "💱 Quel montant veux-tu convertir?\n\nExemple: 253");
    }

    // Pattern: "253" ou "253 eur" ou "253 fr" ou "253 brl pt"
    const match = args.match(/^(\d+(?:[.,]\d+)?)\s*(eur|brl)?\s*(fr|pt|en)?$/);

    if (!match) {
      return replyFn(msg.ERROR_INVALID_AMOUNT);
    }

    const amount = parseAndValidateAmount(match[1]);
    const currency = match[2]; // peut être null
    const forcedLang = match[3]; // peut être null

    if (!amount) {
      return replyFn(msg.ERROR_INVALID_AMOUNT);
    }

    // Appliquer langue forcée si présente
    if (forcedLang && ['fr', 'pt', 'en'].includes(forcedLang)) {
      if (forcedLang !== lang) {
        logger.info('[LANG] Language changed via /convert command:', {
          userId,
          from: lang,
          to: forcedLang
        });
        await this.db.updateUser(userId, { language: forcedLang });
        lang = forcedLang;
      }
    }

    // Déterminer route
    let route = null;
    if (currency === 'eur') {
      route = 'eurbrl';
    } else if (currency === 'brl') {
      route = 'brleur';
    }

    // Si pas de route détectée → demande
    if (!route) {
      sessionUpdate({ awaitingConvertRoute: amount });
      const kb = kbBuilder(msg, 'route_choice', { amount, locale });
      return replyFn(
        msg.askRoute(amount, locale),
        { parse_mode: 'HTML', keyboard: kb }
      );
    }

    // Route détectée → affiche conversion
    sessionUpdate({ lastRoute: route, lastAmount: amount });
    return this.showComparison(userId, lang, route, amount, false, replyFn, kbBuilder);
  }

  /**
   * Show comparison screen (on-chain vs off-chain)
   * Core business logic for comparison display
   */
  async showComparison(userId, lang, route, amount, isTargetMode, replyFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    try {
      const rates = await getRates();
      if (!rates) {
        return replyFn(msg.ERROR_RATES_UNAVAILABLE);
      }

      let onchain, offchain;

      if (route === 'eurbrl') {
        // EUR → BRL
        if (isTargetMode) {
          // User specified target BRL amount
          onchain = calculateOnChainReverse('eurbrl', amount, rates);
          offchain = await getWiseComparisonReverse('eurbrl', amount);
        } else {
          // User specified source EUR amount
          onchain = calculateOnChain('eurbrl', amount, rates);
          offchain = await getWiseComparison('eurbrl', amount);
        }
      } else {
        // BRL → EUR
        if (isTargetMode) {
          // User specified target EUR amount
          onchain = calculateOnChainReverse('brleur', amount, rates);
          offchain = await getWiseComparisonReverse('brleur', amount);
        } else {
          // User specified source BRL amount
          onchain = calculateOnChain('brleur', amount, rates);
          offchain = await getWiseComparison('brleur', amount);
        }
      }

      // Build comparison message using buildComparison
      const bestBank = offchain?.providers?.[0] || null;
      const others = offchain?.providers?.slice(1) || [];

      // Calculate delta (percentage difference)
      let delta = null;
      if (bestBank) {
        if (isTargetMode) {
          // In target mode, compare source amounts needed
          const onchainAmount = onchain.in;
          const offchainAmount = bestBank.in;
          delta = ((onchainAmount - offchainAmount) / offchainAmount) * 100;
        } else {
          // In source mode, compare target amounts received
          const onchainAmount = onchain.out;
          const offchainAmount = bestBank.out;
          delta = ((onchainAmount - offchainAmount) / offchainAmount) * 100;
        }
      }

      const text = msg.buildComparison({
        route,
        amount,
        rates,
        onchain,
        bestBank,
        others,
        delta,
        locale,
        isTargetMode
      });

      const keyboard = kbBuilder(msg, 'comparison', {
        route,
        amount,
        isTargetMode,
        locale
      });

      return replyFn(text, { parse_mode: 'HTML', keyboard });

    } catch (error) {
      logger.error('[COMPARISON] Error showing comparison:', {
        error: error.message,
        userId,
        route,
        amount,
        isTargetMode
      });
      return replyFn(msg.ERROR_GENERAL);
    }
  }

  /**
   * Handle route selection callback
   */
  async handleRouteSelection(userId, lang, route, amount, editFn, sessionUpdate, kbBuilder) {
    sessionUpdate({ lastRoute: route, lastAmount: amount });
    return this.showComparison(userId, lang, route, amount, false, editFn, kbBuilder);
  }

  /**
   * Handle amount change request
   */
  async handleAmountChange(userId, lang, route, replyFn, sessionUpdate) {
    const msg = this.getMsg(lang);
    sessionUpdate({ awaitingAmount: route });
    return replyFn(msg.ENTER_AMOUNT);
  }

  /**
   * Handle target mode toggle
   */
  async handleTargetModeToggle(userId, lang, route, amount, currentMode, editFn, sessionUpdate, kbBuilder) {
    const newMode = !currentMode;
    sessionUpdate({ lastIsTargetMode: newMode });
    return this.showComparison(userId, lang, route, amount, newMode, editFn, kbBuilder);
  }

  /**
   * Parse text input for amount
   */
  async handleTextAmount(userId, lang, text, awaitingContext, replyFn, sessionUpdate, kbBuilder) {
    const msg = this.getMsg(lang);
    const amount = parseAndValidateAmount(text);

    if (!amount) {
      return replyFn(msg.ERROR_INVALID_AMOUNT);
    }

    // Clear awaiting flag
    sessionUpdate({ awaitingAmount: null, awaitingConvertAmount: false });

    // If we have route context, show comparison
    if (awaitingContext && typeof awaitingContext === 'string') {
      const route = awaitingContext; // 'eurbrl' or 'brleur'
      sessionUpdate({ lastRoute: route, lastAmount: amount });
      return this.showComparison(userId, lang, route, amount, false, replyFn, kbBuilder);
    }

    // Otherwise, ask for route
    sessionUpdate({ awaitingConvertRoute: amount });
    const locale = getLocale(lang);
    const kb = kbBuilder(msg, 'route_choice', { amount, locale });
    return replyFn(
      msg.askRoute(amount, locale),
      { parse_mode: 'HTML', keyboard: kb }
    );
  }
}
