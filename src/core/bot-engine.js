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

    // Awaiting FAQ numbered choice (WhatsApp numbered menu)
    if (session.awaitingFaqChoice) {
      const choice = parseInt(text);

      // Map numbers to FAQ actions
      const faqActions = [
        'action:what_usdc',           // 1
        'action:what_exchange',        // 2
        'action:faq_min_amount',       // 3
        'action:about_referrals',      // 4
        'action:faq_why_onchain'       // 5
      ];

      if (choice >= 1 && choice <= 5) {
        // Valid numbered choice - clear session and trigger action
        this.updateSession(context.userId, context.platform, { awaitingFaqChoice: false });

        return this.handleCallback({
          userId: context.userId,
          callbackData: faqActions[choice - 1],
          platform: context.platform
        });
      }

      // Not a valid number, treat as custom FAQ question
      this.updateSession(context.userId, context.platform, { awaitingFaqChoice: false });
      return await this.handlers.guide.processFaqQuestionText(
        context.userId,
        lang,
        text,
        (txt) => this.formatResponse(txt)
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

      // Greeting - show welcome message with main keyboard
      if (intent.intent === 'greeting') {
        return this.handleStart(context);
      }

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
          // Handle alert actions
          if (params[0] === 'quick_create') {
            // Quick create alert from comparison screen
            const [_, quickRoute, quickAmount] = params;
            return await this.handlers.alert.handleAlertTypeChoice(
              userId,
              lang,
              quickRoute,
              (txt, opts) => this.formatResponse(txt, opts),
              () => {}, // answerFn
              (msg, type, opts) => this.buildKeyboard(msg, type, opts)
            );
          }
          // Other alert actions handled elsewhere
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

        // For WhatsApp, use numbered FAQ menu
        if (platform === 'whatsapp') {
          this.updateSession(userId, platform, {
            awaitingFaqChoice: true,
            lastRoute: faqRoute,
            lastAmount: faqAmount
          });

          const faqMenuText = lang === 'fr'
            ? `🤔 UN DOUTE ?\n\nRépondez avec le numéro ou posez votre question:\n\n<b>📚 Guide débutant</b>\n1️⃣ Qu'est-ce que l'USDC ?\n2️⃣ Qu'est-ce qu'un exchange ?\n\n<b>💰 Coûts & Limites</b>\n3️⃣ Montant minimum\n4️⃣ À propos des parrainages\n5️⃣ Pourquoi l'on-chain est avantageux\n\n💬 Tapez simplement votre question pour plus d'aide`
            : lang === 'pt'
            ? `🤔 DÚVIDAS ?\n\nResponda com o número ou faça sua pergunta:\n\n<b>📚 Guia iniciante</b>\n1️⃣ O que é USDC?\n2️⃣ O que é uma exchange?\n\n<b>💰 Custos & Limites</b>\n3️⃣ Valor mínimo\n4️⃣ Sobre indicações\n5️⃣ Por que on-chain é vantajoso\n\n💬 Digite sua pergunta para mais ajuda`
            : `🤔 QUESTIONS?\n\nReply with the number or ask your question:\n\n<b>📚 Beginner's Guide</b>\n1️⃣ What is USDC?\n2️⃣ What is an exchange?\n\n<b>💰 Costs & Limits</b>\n3️⃣ Minimum amount\n4️⃣ About referrals\n5️⃣ Why on-chain is better\n\n💬 Type your question for more help`;

          return this.formatResponse(faqMenuText, {
            parse_mode: 'HTML',
            keyboard: this.buildKeyboard(msg, 'faq_menu_whatsapp', { route: faqRoute, amount: faqAmount })
          });
        }

        // For Telegram, use regular FAQ menu
        return await this.handlers.guide.handleFaqMenu(
          userId,
          lang,
          faqRoute,
          faqAmount,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'more_menu':
        // WhatsApp "Plus..." menu
        const user = await this.db.getUserByPlatform(platform, userId);
        const isPremium = user?.premium_until && new Date(user.premium_until) > new Date();
        return this.formatResponse(msg.MORE_MENU || '📋 Plus d\'options', {
          keyboard: this.buildKeyboard(msg, 'more_menu', { isPremium })
        });

      case 'help':
        return this.handleHelp({ userId, user: await this.db.getUserByPlatform(platform, userId), platform, lang });

      case 'about':
        return this.formatResponse(msg.ABOUT_TEXT || msg.INFO_TEXT, {
          keyboard: this.buildKeyboard(msg, 'about')
        });

      case 'convert':
        // Prompt user to enter amount to convert
        this.updateSession(userId, platform, {
          awaitingConvertAmount: true,
          awaitingConvertRoute: actionParams[0] || 'eurbrl'
        });
        return this.formatResponse(msg.ASK_AMOUNT || 'Quel montant souhaitez-vous convertir?');

      case 'continue_onchain':
        // Show guide for continuing on-chain
        const [continueRoute, continueAmount] = actionParams;
        return await this.handlers.guide.handleGuideTransition(
          userId,
          lang,
          continueRoute,
          parseFloat(continueAmount),
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'convert_choice':
        // WhatsApp: Show conversion choice (on-chain vs off-chain) with context
        const [convRoute, convAmount] = actionParams;
        const convRouteDisplay = convRoute === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        const convMsg = lang === 'fr'
          ? `📊 ${convRouteDisplay} ${parseFloat(convAmount).toLocaleString('fr-FR')}\n\n💱 Choisissez votre méthode de conversion:`
          : lang === 'pt'
          ? `📊 ${convRouteDisplay} ${parseFloat(convAmount).toLocaleString('pt-BR')}\n\n💱 Escolha seu método de conversão:`
          : `📊 ${convRouteDisplay} ${parseFloat(convAmount).toLocaleString('en-US')}\n\n💱 Choose your conversion method:`;

        return this.formatResponse(convMsg, {
          keyboard: this.buildKeyboard(msg, 'convert_choice', {
            route: convRoute,
            amount: parseFloat(convAmount)
          })
        });

      case 'comparison_more':
        // WhatsApp: Show comparison "More" submenu with context
        const [compRoute, compAmount] = actionParams;
        const routeDisplay = compRoute === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        const contextMsg = lang === 'fr'
          ? `📊 ${routeDisplay} ${parseFloat(compAmount).toLocaleString(lang === 'fr' ? 'fr-FR' : lang === 'pt' ? 'pt-BR' : 'en-US')}\n\n⚙️ Options & Détails:`
          : lang === 'pt'
          ? `📊 ${routeDisplay} ${parseFloat(compAmount).toLocaleString('pt-BR')}\n\n⚙️ Opções & Detalhes:`
          : `📊 ${routeDisplay} ${parseFloat(compAmount).toLocaleString('en-US')}\n\n⚙️ Options & Details:`;

        return this.formatResponse(contextMsg, {
          keyboard: this.buildKeyboard(msg, 'comparison_more', {
            route: compRoute,
            amount: parseFloat(compAmount)
          })
        });

      case 'onchain_intro':
        // Show onchain intro
        const [onchainRoute, onchainAmount] = actionParams;
        return await this.handlers.guide.handleOnchainIntro(
          userId,
          lang,
          onchainRoute,
          parseFloat(onchainAmount),
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'onchain_exchanges':
        // WhatsApp: Show exchanges submenu with context
        const [exchRoute, exchAmount] = actionParams;
        const exchMsg = lang === 'fr'
          ? '🏦 Choisissez votre plateforme d\'échange:\n\nSélectionnez une exchange pour commencer.'
          : lang === 'pt'
          ? '🏦 Escolha sua plataforma de câmbio:\n\nSelecione uma exchange para começar.'
          : '🏦 Choose your exchange platform:\n\nSelect an exchange to get started.';

        return this.formatResponse(exchMsg, {
          keyboard: this.buildKeyboard(msg, 'onchain_exchanges', {
            route: exchRoute,
            amount: parseFloat(exchAmount)
          })
        });

      case 'guide_steps':
        // WhatsApp: Show guide steps menu
        const [stepsRoute, stepsAmount] = actionParams;
        return this.formatResponse('📍 Choisissez une étape:', {
          keyboard: this.buildKeyboard(msg, 'guide_steps', {
            route: stepsRoute,
            amount: parseFloat(stepsAmount)
          })
        });

      case 'faq_more':
        // WhatsApp: Show FAQ more submenu with context
        const [faqMoreRoute, faqMoreAmount] = actionParams;
        const faqMsg = lang === 'fr'
          ? '❓ Autres questions fréquentes:\n\nChoisissez une question ou posez la vôtre directement.'
          : lang === 'pt'
          ? '❓ Outras perguntas frequentes:\n\nEscolha uma pergunta ou faça a sua diretamente.'
          : '❓ More frequently asked questions:\n\nChoose a question or ask your own.';

        return this.formatResponse(faqMsg, {
          keyboard: this.buildKeyboard(msg, 'faq_more', {
            route: faqMoreRoute,
            amount: parseFloat(faqMoreAmount)
          })
        });

      case 'step_more':
        // WhatsApp: Show step navigation submenu with step context
        const [stepId, stepRoute, stepAmount] = actionParams;
        const stepDisplay = stepId || '1.1';
        const navMsg = lang === 'fr'
          ? `📍 Navigation - Étape ${stepDisplay}\n\n⚙️ Options:`
          : lang === 'pt'
          ? `📍 Navegação - Passo ${stepDisplay}\n\n⚙️ Opções:`
          : `📍 Navigation - Step ${stepDisplay}\n\n⚙️ Options:`;

        return this.formatResponse(navMsg, {
          keyboard: this.buildKeyboard(msg, 'step_more', {
            stepId: stepId,
            route: stepRoute,
            amount: parseFloat(stepAmount)
          })
        });

      case 'premium_more':
        // WhatsApp: Show premium more submenu with context
        const premiumMsg = lang === 'fr'
          ? '💳 Autres options Premium:\n\nDécouvrez tous nos plans et options de paiement.'
          : lang === 'pt'
          ? '💳 Outras opções Premium:\n\nDescubra todos os nossos planos e opções de pagamento.'
          : '💳 More Premium options:\n\nDiscover all our plans and payment options.';

        return this.formatResponse(premiumMsg, {
          keyboard: this.buildKeyboard(msg, 'premium_more', {})
        });

      case 'stay_offchain':
        // Show offchain providers details
        const [offRoute, offAmount] = actionParams;
        return await this.handlers.comparison.handleOffchainSelection(
          userId,
          lang,
          offRoute,
          parseFloat(offAmount),
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'calc_details':
        // Show calculation details
        const [calcRoute, calcAmount] = actionParams;
        return await this.handlers.comparison.handleCalcDetails(
          userId,
          lang,
          calcRoute,
          parseFloat(calcAmount),
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'sources':
        // Show sources information
        return this.formatResponse(msg.SOURCES_TEXT || 'Sources des données de taux de change...', {
          keyboard: this.buildKeyboard(msg, 'sources', session.lastRoute ? {
            route: session.lastRoute,
            amount: session.lastAmount || 1000
          } : {})
        });

      case 'more_options':
        // Show more options menu
        const [moreRoute, moreAmount] = actionParams;
        return this.formatResponse(msg.MORE_OPTIONS_TEXT || 'Plus d\'options:', {
          keyboard: this.buildKeyboard(msg, 'more_options', {
            route: moreRoute,
            amount: parseFloat(moreAmount)
          })
        });

      case 'back_comparison':
        // Go back to comparison
        const [backRoute, backAmount] = actionParams;
        return await this.handlers.comparison.showComparison(
          userId,
          lang,
          backRoute,
          parseFloat(backAmount),
          session.lastIsTargetMode || false,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'swap_mode':
        // Swap between source and target mode
        const [swapRoute, swapAmount] = actionParams;
        const newIsTargetMode = !session.lastIsTargetMode;
        this.updateSession(userId, platform, { lastIsTargetMode: newIsTargetMode });
        return await this.handlers.comparison.showComparison(
          userId,
          lang,
          swapRoute,
          parseFloat(swapAmount),
          newIsTargetMode,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'change_amount':
        // Prompt to change amount
        const changeRoute = actionParams[0];
        this.updateSession(userId, platform, {
          awaitingAmount: changeRoute
        });
        return this.formatResponse(msg.ASK_AMOUNT || 'Quel montant?');

      case 'exchanges_eu':
        // Show EU exchanges
        return this.formatResponse(msg.EXCHANGES_EU_TEXT || 'Plateformes européennes recommandées:', {
          keyboard: this.buildKeyboard(msg, 'exchanges_eu', {
            route: session.lastRoute || 'eurbrl',
            amount: session.lastAmount || 1000
          })
        });

      case 'exchanges_br':
        // Show BR exchanges
        return this.formatResponse(msg.EXCHANGES_BR_TEXT || 'Plateformes brésiliennes recommandées:', {
          keyboard: this.buildKeyboard(msg, 'exchanges_br', {
            route: session.lastRoute || 'eurbrl',
            amount: session.lastAmount || 1000
          })
        });

      case 'beginner_guide':
        // Show beginner guide menu (USDC + Exchange combined)
        const beginnerMsg = lang === 'fr'
          ? '📚 Guide débutant\n\nChoisissez un sujet pour en savoir plus sur les bases:'
          : lang === 'pt'
          ? '📚 Guia para iniciantes\n\nEscolha um tópico para saber mais sobre os conceitos básicos:'
          : '📚 Beginner\'s Guide\n\nChoose a topic to learn more about the basics:';

        return this.formatResponse(beginnerMsg, {
          keyboard: this.buildKeyboard(msg, 'beginner_guide')
        });

      case 'what_usdc':
      case 'what_exchange':
      case 'faq_min_amount':
      case 'about_referrals':
      case 'faq_why_onchain':
      case 'faq_send_question':
        // FAQ actions - delegate to guide handler
        return await this.handlers.guide.handleFaqAction(
          userId,
          lang,
          actionType,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts),
          (updates) => this.updateSession(userId, platform, updates)
        );

      case 'market_vs_limit':
      case 'why_not_exact':
      case 'back_context':
        // Contextual help actions
        return await this.handlers.guide.handleContextualHelp(
          userId,
          lang,
          actionType,
          session,
          (txt, opts) => this.formatResponse(txt, opts),
          (msg, type, opts) => this.buildKeyboard(msg, type, opts)
        );

      case 'feedback':
        // Ask for feedback
        this.updateSession(userId, platform, { awaitingFeedback: true });
        return this.formatResponse(msg.ASK_FEEDBACK || 'Partagez votre feedback:');

      default:
        logger.warn('[BOT-ENGINE] Unknown action type:', { actionType, actionParams });
        return this.formatResponse('❌ Action not implemented yet.');
    }
  }
}

export default BotEngine;
