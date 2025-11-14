/**
 * Guide Handler
 *
 * Handles all on-chain guide steps (1.1-3.4):
 * - Part 1: Starting point (1.1-1.4) - Deposit & buy USDC
 * - Part 2: Transfer (2.1-2.4) - Send USDC cross-border
 * - Part 3: Destination (3.1-3.4) - Sell USDC & withdraw
 */

import { getRates, calculateOnChain, getLocale, formatAmount } from '../../services/rates.js';
import { logger } from '../../utils/logger.js';

export class GuideHandler {
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
   * Handle guide transition (from comparison to guide)
   */
  async handleGuideTransition(userId, lang, route, amount, editFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const text = msg.GUIDE_TRANSITION(route);
    const keyboard = kbBuilder(msg, 'guide_transition', { route, amount });

    return editFn(text, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle guide navigation menu
   */
  async handleGuideNavigation(userId, lang, route, amount, editFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const text = msg.GUIDE_NAVIGATION(route);
    const keyboard = kbBuilder(msg, 'guide_navigation', { route, amount });

    return editFn(text, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle specific guide step
   */
  async handleGuideStep(userId, lang, step, route, amount, editFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    try {
      const rates = await getRates();

      let text = '';
      let kbType = '';

      switch (step) {
        case '1.1':
          text = msg.STEP_1_1(amount, locale, route);
          kbType = 'step_1_1';
          break;

        case '1.2':
          text = msg.STEP_1_2(amount, locale, route);
          kbType = 'step_1_2';
          break;

        case '1.3':
          // Calculate USDC amount based on route
          const usdcAfterBuy = rates
            ? (route === 'brleur'
                ? (amount / rates.usdcBRL) * 0.999   // BRL → USDC
                : amount * (1 / rates.usdcEUR) * 0.999)  // EUR → USDC
            : amount;
          text = msg.STEP_1_3(usdcAfterBuy, locale, route);
          kbType = 'step_1_3';
          break;

        case '1.4':
          text = msg.STEP_1_4(route);
          kbType = 'step_1_4';
          break;

        case '2.1':
          text = msg.STEP_2_1(route);
          kbType = 'step_2_1';
          break;

        case '2.2':
          // Calculate USDC amount based on route
          const usdcAmount = rates
            ? (route === 'brleur'
                ? (amount / rates.usdcBRL) * 0.999   // BRL → USDC
                : amount * (1 / rates.usdcEUR) * 0.999)  // EUR → USDC
            : amount;
          text = msg.STEP_2_2(usdcAmount, locale, route);
          kbType = 'step_2_2';
          break;

        case '2.3':
          text = msg.STEP_2_3;
          kbType = 'step_2_3';
          break;

        case '2.4':
          text = msg.STEP_2_4(route);
          kbType = 'step_2_4';
          break;

        case '3.1':
          text = msg.STEP_3_1(route);
          kbType = 'step_3_1';
          break;

        case '3.2':
          const onchain = rates ? calculateOnChain(route, amount, rates) : { out: amount * 6 };
          text = msg.STEP_3_2(onchain.out, locale, route);
          kbType = 'step_3_2';
          break;

        case '3.3':
          const onchainCalc = rates ? calculateOnChain(route, amount, rates) : { out: amount * 6 };
          const finalNet = route === 'brleur' ? (onchainCalc.out - 0) : (onchainCalc.out - 3.5);
          text = msg.STEP_3_3(finalNet, locale, route);
          kbType = 'step_3_3';
          break;

        case '3.4':
          text = msg.STEP_3_4(route);
          kbType = 'step_3_4';
          break;

        default:
          logger.warn('[GUIDE] Unknown guide step:', { step, userId });
          return editFn(msg.ERROR_GENERAL);
      }

      const keyboard = kbBuilder(msg, kbType, { route, amount, locale });
      return editFn(text, { parse_mode: 'HTML', keyboard });

    } catch (error) {
      logger.error('[GUIDE] Error showing guide step:', {
        error: error.message,
        userId,
        step,
        route,
        amount
      });
      return editFn(msg.ERROR_GENERAL);
    }
  }

  /**
   * Handle FAQ menu
   */
  async handleFaqMenu(userId, lang, route, amount, editFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'faq_menu', { route, amount });

    return editFn(msg.FAQ_MENU, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle specific FAQ topics
   */
  async handleFaqTopic(userId, lang, topic, route, editFn, kbBuilder) {
    const msg = this.getMsg(lang);

    let text, kbType;

    switch (topic) {
      case 'why_onchain':
        text = msg.FAQ_WHY_ONCHAIN;
        kbType = 'faq_why_onchain';
        break;

      case 'min_amount':
        text = msg.FAQ_MIN_AMOUNT;
        kbType = 'faq_menu';
        break;

      case 'about_referrals':
        text = msg.REFERRAL_EXPLANATION;
        kbType = 'faq_menu';
        break;

      case 'exchanges_eu':
        text = msg.EXCHANGES_EU;
        kbType = 'exchanges_eu';
        break;

      case 'exchanges_br':
        text = msg.EXCHANGES_BR;
        kbType = 'exchanges_br';
        break;

      case 'what_usdc':
        text = msg.WHAT_IS_USDC(route);
        kbType = 'what_usdc';
        break;

      case 'what_exchange':
        text = msg.WHAT_IS_EXCHANGE(route);
        kbType = 'what_exchange';
        break;

      case 'why_not_exact':
        text = msg.WHY_NOT_EXACT;
        kbType = 'simple_back';
        break;

      case 'market_vs_limit':
        text = msg.MARKET_VS_LIMIT;
        kbType = 'simple_back';
        break;

      default:
        text = msg.FAQ_MENU;
        kbType = 'faq_menu';
    }

    const keyboard = kbBuilder(msg, kbType, { route });
    return editFn(text, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle FAQ question submission (custom question from user)
   */
  async handleFaqQuestion(userId, lang, editFn, sessionUpdate, kbBuilder) {
    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'faq_send_question');

    sessionUpdate({ awaitingFaqQuestion: true });

    return editFn(msg.FAQ_SEND_QUESTION, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Process custom FAQ question text
   */
  async processFaqQuestionText(userId, lang, questionText, replyFn) {
    const msg = this.getMsg(lang);

    try {
      // Store question in database or send to admin
      await this.db.logFaqQuestion(userId, questionText);

      // Confirm to user
      const confirmText = {
        pt: '✅ Sua pergunta foi enviada! Responderemos em breve.',
        fr: '✅ Votre question a été envoyée ! Nous répondrons bientôt.',
        en: '✅ Your question has been sent! We will respond soon.'
      };

      return replyFn(confirmText[lang] || confirmText.pt);

    } catch (error) {
      logger.error('[GUIDE] Error processing FAQ question:', {
        error: error.message,
        userId
      });
      return replyFn(msg.ERROR_GENERAL);
    }
  }

  /**
   * Handle "stay off-chain" decision (view alternatives)
   */
  async handleStayOffchain(userId, lang, route, amount, editFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    // Show off-chain alternatives screen
    const text = msg.OFFCHAIN_ALTERNATIVES(route, amount, locale);
    const keyboard = kbBuilder(msg, 'offchain_alternatives', { route, amount });

    return editFn(text, { parse_mode: 'HTML', keyboard });
  }
}
