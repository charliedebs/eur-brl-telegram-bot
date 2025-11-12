/**
 * Platform-Agnostic Bot Engine
 *
 * Works for Telegram, WhatsApp, and any future platform
 * Delegates business logic to specialized handlers
 */

import { logger } from '../utils/logger.js';
import { DatabaseService } from '../services/database.js';
import { AlertsService } from '../services/alerts.js';
import { messages } from '../bot/messages/messages-loader.js';
import { parseUserIntent } from './nlu.js';

// Import handlers
import { ComparisonHandler } from './handlers/comparison-handler.js';
import { GuideHandler } from './handlers/guide-handler.js';
import { AlertHandler } from './handlers/alert-handler.js';
import { PremiumHandler } from './handlers/premium-handler.js';

export class BotEngine {
  constructor(adapter) {
    this.adapter = adapter;
    this.db = new DatabaseService();
    this.alerts = new AlertsService(this.db);

    // Initialize handlers
    this.handlers = {
      comparison: new ComparisonHandler(this.db, messages),
      guide: new GuideHandler(this.db, messages),
      alert: new AlertHandler(this.db, messages),
      premium: new PremiumHandler(this.db, messages)
    };

    // Session storage (in-memory for now, can be moved to Redis)
    this.sessions = new Map();
  }

  /**
   * Get or create session for user
   */
  getSession(userId, platform) {
    const sessionKey = `${platform}:${userId}`;
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, {
        userId,
        platform,
        messageHistory: [],
        lastRoute: null,
        lastAmount: null,
        lastIsTargetMode: false,
        awaitingAmount: null,
        awaitingConvertAmount: false,
        awaitingConvertRoute: null,
        awaitingFaqQuestion: false,
        awaitingAlertName: null,
        awaitingCustomPercent: null,
        awaitingAbsoluteThreshold: null,
        awaitingPaymentHelp: false,
        alertDraft: null
      });
    }
    return this.sessions.get(sessionKey);
  }

  /**
   * Update session data
   */
  updateSession(userId, platform, updates) {
    const session = this.getSession(userId, platform);
    Object.assign(session, updates);
  }

  /**
   * Process incoming message
   */
  async processMessage({ userId, text, platform, username, chatType = 'private' }) {
    try {
      logger.info('[BOT-ENGINE] Processing message:', {
        userId,
        platform,
        text: text.substring(0, 50)
      });

      // Get or create user (use platform-aware method)
      let user = await this.db.getUserByPlatform(platform, userId);
      if (!user) {
        // Detect language from first message or default to Portuguese
        const detectedLang = this.detectLanguage(text) || 'pt';
        user = await this.db.createUserByPlatform(platform, userId, detectedLang);

        // Check if user creation failed
        if (!user) {
          logger.error('[BOT-ENGINE] Failed to create user - database schema issue?', {
            userId,
            platform,
            hint: 'If using WhatsApp, ensure telegram_id column is nullable in Supabase'
          });

          // Return error message
          return {
            text: '❌ Erro de configuração. Contate o administrador.\n\nError: Database configuration issue. Please contact admin.',
            error: true
          };
        }

        logger.info('[BOT-ENGINE] New user created:', { userId, platform, lang: detectedLang });
      }

      // Get session
      const session = this.getSession(userId, platform);
      const lang = user?.language || 'pt';

      // Create context for handlers
      const context = {
        userId,
        user,
        session,
        platform,
        chatType,
        text,
        lang,
        db: this.db,
        alerts: this.alerts,
        handlers: this.handlers
      };

      // Check for session-based text input (waiting for specific input)
      const sessionResponse = await this.handleSessionInput(context);
      if (sessionResponse) {
        return sessionResponse;
      }

      // Route message to appropriate handler
      return await this.routeMessage(context);

    } catch (error) {
      logger.error('[BOT-ENGINE] Error processing message:', {
        error: error.message,
        stack: error.stack,
        userId,
        platform
      });

      return {
        text: '❌ Erro ao processar mensagem / Error processing message',
        error: true
      };
    }
  }

  /**
   * Handle session-based text input
   * (e.g., waiting for amount, waiting for custom percentage, etc.)
   */
  async handleSessionInput(context) {
    const { session, text, lang } = context;

    // Awaiting amount for comparison
    if (session.awaitingAmount || session.awaitingConvertAmount) {
      const route = session.awaitingAmount;
      return await this.handlers.comparison.handleTextAmount(
        context.userId,
        lang,
        text,
        route,
        (txt, opts) => this.formatResponse(txt, opts),
        (updates) => this.updateSession(context.userId, context.platform, updates),
        (msg, type, opts) => this.buildKeyboard(msg, type, opts)
      );
    }

    // Awaiting FAQ question
    if (session.awaitingFaqQuestion) {
      this.updateSession(context.userId, context.platform, { awaitingFaqQuestion: false });
      return await this.handlers.guide.processFaqQuestionText(
        context.userId,
        lang,
        text,
        (txt) => this.formatResponse(txt)
      );
    }

    // Awaiting alert name
    if (session.awaitingAlertName) {
      const alertId = session.awaitingAlertName.alertId;
      this.updateSession(context.userId, context.platform, { awaitingAlertName: null });
      return await this.handlers.alert.handleAlertRenameText(
        context.userId,
        lang,
        alertId,
        text,
        (txt) => this.formatResponse(txt)
      );
    }

    // Awaiting custom percentage for alert
    if (session.awaitingCustomPercent) {
      const { pair, refType } = session.awaitingCustomPercent;
      const percent = parseFloat(text.replace(',', '.'));

      if (isNaN(percent) || percent < 1 || percent > 10) {
        return this.formatResponse('❌ Pourcentage invalide. Entre 1 et 10.');
      }

      this.updateSession(context.userId, context.platform, { awaitingCustomPercent: null });

      // Continue with alert creation
      const alertData = {
        pair,
        threshold_type: 'relative',
        threshold_value: percent,
        reference_type: refType
      };

      const msg = this.handlers.alert.getMsg(lang);
      return this.formatResponse(msg.ALERT_CHOOSE_COOLDOWN, {
        keyboard: this.buildKeyboard(msg, 'alert_choose_cooldown_v2', { alertData })
      });
    }

    // Awaiting absolute threshold for alert
    if (session.awaitingAbsoluteThreshold) {
      const { pair } = session.awaitingAbsoluteThreshold;
      const threshold = parseFloat(text.replace(',', '.'));

      if (isNaN(threshold) || threshold <= 0) {
        return this.formatResponse('❌ Valeur invalide.');
      }

      this.updateSession(context.userId, context.platform, { awaitingAbsoluteThreshold: null });

      // Continue with alert creation
      const alertData = {
        pair,
        threshold_type: 'absolute',
        threshold_value: threshold,
        reference_type: null
      };

      const msg = this.handlers.alert.getMsg(lang);
      return this.formatResponse(msg.ALERT_CHOOSE_COOLDOWN, {
        keyboard: this.buildKeyboard(msg, 'alert_choose_cooldown_v2', { alertData })
      });
    }

    // Awaiting payment help message
    if (session.awaitingPaymentHelp) {
      this.updateSession(context.userId, context.platform, { awaitingPaymentHelp: false });
      return await this.handlers.premium.processPaymentHelpText(
        context.userId,
        lang,
        text,
        (txt) => this.formatResponse(txt)
      );
    }

    return null; // No session-based input waiting
  }

  /**
   * Route message to appropriate handler
   */
  async routeMessage(context) {
    const { text, lang, chatType } = context;
    const lowerText = text.toLowerCase().trim();

    // === COMMANDS ===

    // /start
    if (lowerText.startsWith('/start') || lowerText === 'start') {
      return this.handleStart(context);
    }

    // /help
    if (lowerText.startsWith('/help') || lowerText.includes('ajuda') || lowerText.includes('aide')) {
      return this.handleHelp(context);
    }

    // /rate [amount]
    if (lowerText.startsWith('/rate') || lowerText.startsWith('/taxa')) {
      const args = text.split(' ').slice(1).join(' ').trim();
      return await this.handlers.comparison.handleRateCommand(
        context.userId,
        lang,
        args,
        (txt, opts) => this.formatResponse(txt, opts),
        (msg, type, opts) => this.buildKeyboard(msg, type, opts)
      );
    }

    // /convert [amount] [currency?]
    if (lowerText.startsWith('/convert') || lowerText.startsWith('/converter')) {
      const args = text.split(' ').slice(1).join(' ').trim();
      return await this.handlers.comparison.handleConvertCommand(
        context.userId,
        lang,
        args,
        (txt, opts) => this.formatResponse(txt, opts),
        (msg, type, opts) => this.buildKeyboard(msg, type, opts),
        (updates) => this.updateSession(context.userId, context.platform, updates)
      );
    }

    // /alert [params]
    if (lowerText.startsWith('/alert') || lowerText.startsWith('/alerta') || lowerText.startsWith('/alerte')) {
      const args = text.split(' ').slice(1).join(' ').trim();
      return await this.handlers.alert.handleAlertCommand(
        context.userId,
        lang,
        args,
        chatType,
        (txt, opts) => this.formatResponse(txt, opts),
        (msg, type, opts) => this.buildKeyboard(msg, type, opts)
      );
    }

    // /alerts (list)
    if (lowerText.startsWith('/alerts') || lowerText.startsWith('/alertas') || lowerText.startsWith('/alertes')) {
      return await this.handlers.alert.handleAlertList(
        context.userId,
        lang,
        (txt, opts) => this.formatResponse(txt, opts),
        () => {}, // answerFn (not needed for messages)
        (txt, opts) => this.formatResponse(txt, opts),
        (msg, type, opts) => this.buildKeyboard(msg, type, opts)
      );
    }

    // /premium
    if (lowerText.startsWith('/premium')) {
      return await this.handlers.premium.handlePremiumCommand(
        context.userId,
        lang,
        (txt, opts) => this.formatResponse(txt, opts),
        (msg, type, opts) => this.buildKeyboard(msg, type, opts)
      );
    }

    // /lang or /language
    if (lowerText.startsWith('/lang') || lowerText.startsWith('/language') || lowerText.startsWith('/idioma')) {
      return this.handleLanguageSelection(context);
    }

    // NLU for natural language
    try {
      const intent = await parseUserIntent(text, { language: lang });

      if (intent.intent === 'compare' && intent.entities?.amount) {
        const amount = intent.entities.amount;
        const route = intent.entities.route || 'eurbrl';

        this.updateSession(context.userId, context.platform, {
          lastRoute: route,
          lastAmount: amount
        });

        return await this.handlers.comparison.showComparison(
          context.userId,
          lang,
          route,
          amount,
          false,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );
      }

      if (intent.intent === 'premium' || intent.intent === 'premium_status') {
        return await this.handlers.premium.handlePremiumCommand(
          context.userId,
          lang,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );
      }
    } catch (error) {
      logger.error('[BOT-ENGINE] NLU error:', { error: error.message });
    }

    // Default response
    const msg = messages[lang];
    return this.formatResponse(msg.UNKNOWN_COMMAND || 'Comando não reconhecido. Use /help para ver os comandos disponíveis.', {
      keyboard: this.buildKeyboard(msg, 'main')
    });
  }

  /**
   * Handle /start command
   */
  handleStart(context) {
    const { lang } = context;
    const msg = messages[lang];

    return this.formatResponse(msg.INTRO_TEXT || msg.WELCOME, {
      keyboard: this.buildKeyboard(msg, 'lang_select')
    });
  }

  /**
   * Handle /help command
   */
  handleHelp(context) {
    const { lang } = context;
    const msg = messages[lang];

    return this.formatResponse(msg.ABOUT_TEXT || msg.HELP, {
      keyboard: this.buildKeyboard(msg, 'main')
    });
  }

  /**
   * Handle language selection
   */
  handleLanguageSelection(context) {
    const text = {
      pt: '🌐 <b>Escolha o idioma</b>\nChoose your language\nChoisis ta langue',
      fr: '🌐 <b>Choisis ta langue</b>\nEscolha o idioma\nChoose your language',
      en: '🌐 <b>Choose your language</b>\nEscolha o idioma\nChoisis ta langue'
    };

    const msg = messages.en; // Use English as neutral
    return this.formatResponse(text[context.lang] || text.en, {
      keyboard: this.buildKeyboard(msg, 'lang_select')
    });
  }

  /**
   * Detect language from text (simple heuristic)
   */
  detectLanguage(text) {
    const lower = text.toLowerCase();

    // French indicators
    if (lower.match(/bonjour|merci|salut|combien|je veux|comment/)) {
      return 'fr';
    }

    // English indicators
    if (lower.match(/hello|thank|please|how much|i want|convert/)) {
      return 'en';
    }

    // Portuguese indicators (default)
    if (lower.match(/olá|obrigad|quanto|quero|como|converter/)) {
      return 'pt';
    }

    return 'pt'; // Default
  }

  /**
   * Format response for platform adapter
   */
  formatResponse(text, options = {}) {
    return {
      text,
      parse_mode: options.parse_mode || 'HTML',
      keyboard: options.keyboard || null,
      image: options.image || null,
      error: options.error || false
    };
  }

  /**
   * Build keyboard (platform-agnostic)
   * The adapter will convert this to platform-specific format
   */
  buildKeyboard(msg, type, options = {}) {
    // This should return a generic keyboard structure
    // The platform adapter will convert it to Telegram inline keyboard or WhatsApp menu
    return {
      type,
      options,
      msg
    };
  }

  /**
   * Handle button/callback click
   * This is called by platform adapters when user clicks a button
   */
  async handleCallback({ userId, callbackData, platform }) {
    try {
      logger.info('[BOT-ENGINE] Handling callback:', {
        userId,
        platform,
        callbackData
      });

      // Get user
      const user = await this.db.getUserByPlatform(platform, userId);
      if (!user) {
        logger.warn('[BOT-ENGINE] User not found for callback:', { userId, platform });
        return this.formatResponse('❌ User not found. Use /start to begin.');
      }

      const session = this.getSession(userId, platform);
      const lang = user.language || 'pt';
      const msg = messages[lang];

      // Parse callback data
      const [action, ...params] = callbackData.split(':');

      // Route to appropriate handler
      switch (action) {
        // === Language Selection ===
        case 'lang':
          const newLang = params[0];
          await this.db.updateUserByPlatform(platform, userId, { language: newLang });

          // Restore context if available
          if (session.lastRoute && session.lastAmount) {
            return await this.handlers.comparison.showComparison(
              userId,
              newLang,
              session.lastRoute,
              session.lastAmount,
              session.lastIsTargetMode || false,
              (txt, opts) => this.formatResponse(txt, opts),
              (msg, type, opts) => this.buildKeyboard(msg, type, opts)
            );
          } else {
            const newMsg = messages[newLang];
            return this.formatResponse(newMsg.promptAmt, {
              keyboard: this.buildKeyboard(newMsg, 'main')
            });
          }

        // === Route Selection ===
        case 'route':
          const [route, amount] = params;
          return await this.handlers.comparison.handleRouteSelection(
            userId,
            lang,
            route,
            parseFloat(amount),
            (txt, opts) => this.formatResponse(txt, opts),
            (updates) => this.updateSession(userId, platform, updates),
            (msg, type, opts) => this.buildKeyboard(msg, type, opts)
          );

        // === Guide ===
        case 'guide':
          if (params[0] === 'step') {
            const [_, step, guideRoute, guideAmount] = params;
            return await this.handlers.guide.handleGuideStep(
              userId,
              lang,
              step,
              guideRoute,
              parseFloat(guideAmount),
              (txt, opts) => this.formatResponse(txt, opts),
              (msg, type, opts) => this.buildKeyboard(msg, type, opts)
            );
          }
          break;

        // === Alerts ===
        case 'alert':
          // Delegate to alert handler
          // Implementation depends on specific alert actions
          break;

        // === Premium ===
        case 'premium':
          if (params[0] === 'pricing') {
            return await this.handlers.premium.handlePremiumPricing(
              userId,
              lang,
              (txt, opts) => this.formatResponse(txt, opts),
              () => {}, // answerFn
              (msg, type, opts) => this.buildKeyboard(msg, type, opts)
            );
          }
          break;

        // === Actions ===
        case 'action':
          return await this.handleAction(userId, lang, platform, params, session, msg);

        default:
          logger.warn('[BOT-ENGINE] Unknown callback action:', { action, params });
          return this.formatResponse('❌ Action not recognized.');
      }

    } catch (error) {
      logger.error('[BOT-ENGINE] Error handling callback:', {
        error: error.message,
        stack: error.stack,
        userId,
        callbackData
      });

      return this.formatResponse('❌ Error processing action.');
    }
  }

  /**
   * Alias for handleCallback - for backwards compatibility
   * Platform adapters may call either handleButtonClick or handleCallback
   */
  async handleButtonClick({ userId, buttonId, platform }) {
    return this.handleCallback({
      userId,
      callbackData: buttonId,
      platform
    });
  }

  /**
   * Handle generic actions
   */
  async handleAction(userId, lang, platform, params, session, msg) {
    const [actionType, ...actionParams] = params;

    switch (actionType) {
      case 'back_main':
        return this.formatResponse(msg.promptAmt, {
          keyboard: this.buildKeyboard(msg, 'main')
        });

      case 'start_guide':
        const [route, amount] = actionParams;
        return await this.handlers.guide.handleGuideTransition(
          userId,
          lang,
          route,
          parseFloat(amount),
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'guide_navigation':
        const [navRoute, navAmount] = actionParams;
        return await this.handlers.guide.handleGuideNavigation(
          userId,
          lang,
          navRoute,
          parseFloat(navAmount),
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'faq_menu':
        const faqRoute = actionParams[0] || session.lastRoute || 'eurbrl';
        const faqAmount = actionParams[1] ? parseFloat(actionParams[1]) : session.lastAmount || 1000;
        return await this.handlers.guide.handleFaqMenu(
          userId,
          lang,
          faqRoute,
          faqAmount,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      default:
        logger.warn('[BOT-ENGINE] Unknown action type:', { actionType, actionParams });
        return this.formatResponse('❌ Action not implemented yet.');
    }
  }
}

export default BotEngine;
