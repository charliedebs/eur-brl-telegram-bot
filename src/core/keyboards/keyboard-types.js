// src/core/keyboards/keyboard-types.js
// Centralized keyboard definitions - platform-agnostic
// Both Telegram and WhatsApp adapters import from here

import { DEFAULTS, LINKS, PROVIDER_LINKS } from '../../config/constants.js';

/**
 * Define keyboard structure for a given type
 * Returns array of button definitions: [{ text, id, url?, row? }, ...]
 *
 * Button structure:
 * - text: Display text
 * - id: Callback data / button identifier
 * - url: Optional URL for link buttons
 * - row: Optional row number for layout control (platform-specific handling)
 *
 * @param {Object} msg - Localized message object
 * @param {string} type - Keyboard type identifier
 * @param {Object} options - Additional options (route, amount, alerts, etc.)
 * @returns {Array} Array of button definitions
 */
export function getKeyboardDefinition(msg, type, options = {}) {
  const { route = 'eurbrl', amount = DEFAULTS.EUR, alerts = [] } = options;
  const locale = options.locale || 'fr-FR';

  switch (type) {
    // Language selection
    case 'lang_select':
      return [
        { text: msg.btn.langFR, id: 'lang:fr', row: 0 },
        { text: msg.btn.langPT, id: 'lang:pt', row: 0 },
        { text: msg.btn.langEN, id: 'lang:en', row: 0 },
      ];

    // Main menu
    case 'main': {
      const isPremium = options.isPremium || false;
      const buttons = [
        { text: msg.btn.eurbrl(DEFAULTS.EUR, locale), id: `route:eurbrl:${DEFAULTS.EUR}`, row: 0 },
        { text: msg.btn.brleur(DEFAULTS.BRL, locale), id: `route:brleur:${DEFAULTS.BRL}`, row: 1 },
      ];

      if (isPremium) {
        buttons.push({ text: msg.btn.myAlerts, id: 'alert:list', row: 2 });
      } else {
        buttons.push({ text: msg.btn.seePremium, id: 'premium:pricing', row: 2 });
      }

      buttons.push({ text: msg.btn.about, id: 'action:about', row: 3 });

      return buttons;
    }

    // WhatsApp optimized main menu (max 3 buttons for reply buttons)
    case 'main_whatsapp': {
      const isPremium = options.isPremium || false;
      return [
        { text: msg.btn.eurbrl(DEFAULTS.EUR, locale), id: `route:eurbrl:${DEFAULTS.EUR}`, row: 0 },
        { text: msg.btn.brleur(DEFAULTS.BRL, locale), id: `route:brleur:${DEFAULTS.BRL}`, row: 1 },
        { text: '📋 Plus...', id: 'action:more_menu', row: 2 }
      ];
    }

    // WhatsApp "More" menu (when user clicks "Plus...")
    case 'more_menu': {
      const isPremium = options.isPremium || false;
      const buttons = [];

      if (isPremium) {
        buttons.push({ text: msg.btn.myAlerts, id: 'alert:list', row: 0 });
      } else {
        buttons.push({ text: msg.btn.seePremium, id: 'premium:pricing', row: 0 });
      }

      buttons.push(
        { text: msg.btn.about, id: 'action:about', row: 1 },
        { text: msg.btn.help, id: 'action:help', row: 2 },
        { text: '🏠 ' + msg.btn.back, id: 'action:back_main', row: 3 }
      );

      return buttons;
    }

    // About screen
    case 'about':
      return [
        { text: msg.btn.back, id: 'action:back_main', row: 0 },
      ];

    // Route choice
    case 'route_choice':
      return [
        { text: msg.btn.pairEurBrl, id: `route:eurbrl:${amount}`, row: 0 },
        { text: msg.btn.pairBrlEur, id: `route:brleur:${amount}`, row: 1 },
      ];

    // Comparison screen
    case 'comparison':
      return [
        { text: msg.btn.contOn, id: `action:continue_onchain:${route}:${amount}`, row: 0 },
        { text: msg.btn.calcdetails, id: `action:calc_details:${route}:${amount}`, row: 1 },
        { text: msg.btn.stayOff, id: `action:stay_offchain:${route}:${amount}`, row: 2 },
        { text: msg.btn.moreOptions, id: `action:more_options:${route}:${amount}`, row: 3 },
        { text: msg.btn.sources, id: 'action:sources', row: 4 },
      ];

    // WhatsApp optimized comparison (3 main actions + "More...")
    case 'comparison_whatsapp':
      return [
        { text: msg.btn.contOn, id: `action:continue_onchain:${route}:${amount}`, row: 0 },
        { text: msg.btn.stayOff, id: `action:stay_offchain:${route}:${amount}`, row: 1 },
        { text: '⚙️ Plus...', id: `action:comparison_more:${route}:${amount}`, row: 2 },
      ];

    // WhatsApp comparison "More" submenu - All options displayed directly
    case 'comparison_more':
      return [
        { text: msg.btn.calcdetails, id: `action:calc_details:${route}:${amount}`, row: 0 },
        { text: msg.btn.swapMode, id: `action:swap_mode:${route}:${amount}`, row: 1 },
        { text: msg.btn.change, id: `action:change_amount:${route}`, row: 2 },
        { text: '🔔 ' + msg.btn.createAlert, id: 'alert:choose_pair', row: 3 },
        { text: msg.btn.myAlerts, id: 'alert:list', row: 4 },
        { text: msg.btn.sources, id: 'action:sources', row: 5 },
        { text: '🔙 ' + msg.btn.back, id: `route:${route}:${amount}`, row: 6 },
      ];

    // More options
    case 'more_options':
      return [
        { text: msg.btn.swapMode, id: `action:swap_mode:${route}:${amount}`, row: 0 },
        { text: msg.btn.change, id: `action:change_amount:${route}`, row: 1 },
        { text: msg.btn.myAlerts, id: 'alert:list', row: 2 },
        { text: msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: 3 },
      ];

    // WhatsApp optimized more options
    case 'more_options_whatsapp':
      return [
        { text: msg.btn.swapMode, id: `action:swap_mode:${route}:${amount}`, row: 0 },
        { text: msg.btn.change, id: `action:change_amount:${route}`, row: 1 },
        { text: '🔙 ' + msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: 2 },
      ];

    // Sources
    case 'sources':
      return [
        { text: msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: 0 },
      ];

    // Offchain providers
    case 'offchain': {
      const { providers = [] } = options;
      const buttons = [];
      let rowIndex = 0;

      // Wise
      const wiseProvider = providers.find(p => p.provider === 'Wise');
      if (wiseProvider) {
        const wiseLink = PROVIDER_LINKS['Wise'] || '#';
        buttons.push({ text: msg.btn.openWise, id: `url:${wiseLink}`, url: wiseLink, row: rowIndex++ });
      }

      // Remitly
      const remitlyProvider = providers.find(p => p.provider === 'Remitly');
      if (remitlyProvider) {
        const remitlyLink = PROVIDER_LINKS['Remitly'] || '#';
        buttons.push({ text: msg.btn.openRemitly, id: `url:${remitlyLink}`, url: remitlyLink, row: rowIndex++ });
      }

      buttons.push({ text: msg.btn.seeOnchain, id: `action:continue_onchain:${route}:${amount}`, row: rowIndex++ });
      buttons.push({ text: msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: rowIndex++ });

      return buttons;
    }

    // WhatsApp optimized offchain (max 3 buttons)
    case 'offchain_whatsapp': {
      const { providers = [] } = options;
      const wiseProvider = providers.find(p => p.provider === 'Wise');
      const remitlyProvider = providers.find(p => p.provider === 'Remitly');

      // If we have both providers, show Wise + Remitly + More
      if (wiseProvider && remitlyProvider) {
        const wiseLink = PROVIDER_LINKS['Wise'] || '#';
        return [
          { text: msg.btn.openWise, id: `url:${wiseLink}`, url: wiseLink, row: 0 },
          { text: msg.btn.seeOnchain, id: `action:continue_onchain:${route}:${amount}`, row: 1 },
          { text: '🔙 ' + msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: 2 },
        ];
      }

      // If only one provider, show provider + onchain + back
      const buttons = [];
      let rowIndex = 0;

      if (wiseProvider) {
        const wiseLink = PROVIDER_LINKS['Wise'] || '#';
        buttons.push({ text: msg.btn.openWise, id: `url:${wiseLink}`, url: wiseLink, row: rowIndex++ });
      } else if (remitlyProvider) {
        const remitlyLink = PROVIDER_LINKS['Remitly'] || '#';
        buttons.push({ text: msg.btn.openRemitly, id: `url:${remitlyLink}`, url: remitlyLink, row: rowIndex++ });
      }

      buttons.push({ text: msg.btn.seeOnchain, id: `action:continue_onchain:${route}:${amount}`, row: rowIndex++ });
      buttons.push({ text: '🔙 ' + msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: rowIndex++ });

      return buttons;
    }

    // Onchain intro
    case 'onchain_intro': {
      const buttons = [
        { text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: 0 },
        { text: msg.btn.faqDoubt, id: 'action:faq_menu', row: 1 },
      ];

      let rowIndex = 2;

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br', row: rowIndex++ });
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu', row: rowIndex++ });
      } else {
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu', row: rowIndex++ });
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br', row: rowIndex++ });
      }

      buttons.push({ text: msg.btn.back, id: `action:back_comparison:${route}:${amount}`, row: rowIndex++ });

      return buttons;
    }

    // WhatsApp optimized onchain intro
    case 'onchain_intro_whatsapp': {
      return [
        { text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: 0 },
        { text: msg.btn.faqDoubt, id: 'action:faq_menu', row: 1 },
        { text: '🏦 Exchanges', id: `action:onchain_exchanges:${route}:${amount}`, row: 2 },
      ];
    }

    // WhatsApp onchain exchanges submenu
    case 'onchain_exchanges': {
      const buttons = [];
      let rowIndex = 0;

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br', row: rowIndex++ });
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu', row: rowIndex++ });
      } else {
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu', row: rowIndex++ });
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br', row: rowIndex++ });
      }

      buttons.push({ text: '🔙 ' + msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: rowIndex++ });

      return buttons;
    }

    // FAQ menu
    case 'faq_menu':
      return [
        { text: msg.btn.whatIsUSDC, id: 'action:what_usdc', row: 0 },
        { text: msg.btn.whatIsExchange, id: 'action:what_exchange', row: 1 },
        { text: msg.btn.minAmount, id: 'action:faq_min_amount', row: 2 },
        { text: msg.btn.aboutReferrals, id: 'action:about_referrals', row: 3 },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain', row: 4 },
        { text: msg.btn.askQuestion, id: 'action:faq_send_question', row: 5 },
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 6 },
      ];

    // WhatsApp optimized FAQ menu
    case 'faq_menu_whatsapp':
      return [
        { text: msg.btn.whatIsUSDC, id: 'action:what_usdc', row: 0 },
        { text: msg.btn.whatIsExchange, id: 'action:what_exchange', row: 1 },
        { text: '❓ Plus...', id: `action:faq_more:${route}:${amount}`, row: 2 },
      ];

    // WhatsApp FAQ more submenu
    case 'faq_more':
      return [
        { text: msg.btn.minAmount, id: 'action:faq_min_amount', row: 0 },
        { text: msg.btn.aboutReferrals, id: 'action:about_referrals', row: 1 },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain', row: 2 },
        { text: msg.btn.askQuestion, id: 'action:faq_send_question', row: 3 },
        { text: '🔙 ' + msg.btn.back, id: 'action:faq_menu', row: 4 },
      ];

    // FAQ - Why onchain
    case 'faq_why_onchain':
      return [
        { text: msg.btn.back, id: 'action:faq_menu', row: 0 },
      ];

    // FAQ - Send question
    case 'faq_send_question':
      return [
        { text: msg.btn.back, id: 'action:faq_menu', row: 0 },
      ];

    // What is USDC
    case 'what_usdc':
      return [
        { text: msg.btn.whatIsExchange, id: 'action:what_exchange', row: 0 },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain', row: 1 },
        { text: msg.btn.back, id: 'action:faq_menu', row: 2 },
      ];

    // What is Exchange
    case 'what_exchange':
      return [
        { text: msg.btn.whatIsUSDC, id: 'action:what_usdc', row: 0 },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain', row: 1 },
        { text: msg.btn.back, id: 'action:faq_menu', row: 2 },
      ];

    // Proof sources
    case 'proof_sources':
      return [
        { text: '🔗 CoinLaw', id: 'url:https://coinlaw.io/cryptocurrency-based-remittance-statistics/', url: 'https://coinlaw.io/cryptocurrency-based-remittance-statistics/', row: 0 },
        { text: '🔗 World Bank', id: 'url:https://remittanceprices.worldbank.org/', url: 'https://remittanceprices.worldbank.org/', row: 1 },
        { text: '🔗 CFA Institute', id: 'url:https://blogs.cfainstitute.org/investor/2025/08/27/blockchain-in-fx-and-remittances-from-pilot-to-portfolio-impact/', url: 'https://blogs.cfainstitute.org/investor/2025/08/27/blockchain-in-fx-and-remittances-from-pilot-to-portfolio-impact/', row: 2 },
        { text: '🔗 McKinsey', id: 'url:https://www.mckinsey.com/industries/financial-services/our-insights/the-stable-door-opens-how-tokenized-cash-enables-next-gen-payments', url: 'https://www.mckinsey.com/industries/financial-services/our-insights/the-stable-door-opens-how-tokenized-cash-enables-next-gen-payments', row: 3 },
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 4 },
      ];

    // Exchanges EU
    case 'exchanges_eu': {
      const buttons = [
        { text: msg.btn.openKraken, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN, row: 0 },
        { text: msg.btn.openBitstamp, id: `url:${LINKS.BITSTAMP}`, url: LINKS.BITSTAMP, row: 1 },
      ];

      let rowIndex = 2;

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: rowIndex++ });
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br', row: rowIndex++ });
      } else {
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br', row: rowIndex++ });
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: rowIndex++ });
      }

      buttons.push({ text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: rowIndex++ });

      return buttons;
    }

    // WhatsApp optimized Exchanges EU
    case 'exchanges_eu_whatsapp': {
      const mainExchangeButton = { text: msg.btn.openKraken, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN, row: 0 };

      if (route === 'brleur') {
        return [
          mainExchangeButton,
          { text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: 1 },
          { text: '🔙 ' + msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 2 },
        ];
      } else {
        return [
          mainExchangeButton,
          { text: msg.btn.createBR, id: 'action:exchanges_br', row: 1 },
          { text: '🔙 ' + msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 2 },
        ];
      }
    }

    // Exchanges BR
    case 'exchanges_br': {
      const buttons = [
        { text: msg.btn.openBinanceBR, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR, row: 0 },
        { text: msg.btn.openBitso, id: `url:${LINKS.BITSO}`, url: LINKS.BITSO, row: 1 },
        { text: msg.btn.openMercadoBitcoin, id: `url:${LINKS.MERCADO_BITCOIN}`, url: LINKS.MERCADO_BITCOIN, row: 2 },
        { text: msg.btn.openFoxbit, id: `url:${LINKS.FOXBIT}`, url: LINKS.FOXBIT, row: 3 },
      ];

      let rowIndex = 4;

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu', row: rowIndex++ });
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: rowIndex++ });
      } else {
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: rowIndex++ });
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu', row: rowIndex++ });
      }

      buttons.push({ text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: rowIndex++ });

      return buttons;
    }

    // WhatsApp optimized Exchanges BR (show top exchange + more options)
    case 'exchanges_br_whatsapp': {
      const mainExchangeButton = { text: msg.btn.openBinanceBR, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR, row: 0 };

      if (route === 'brleur') {
        return [
          mainExchangeButton,
          { text: msg.btn.createEU, id: 'action:exchanges_eu', row: 1 },
          { text: '🔙 ' + msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 2 },
        ];
      } else {
        return [
          mainExchangeButton,
          { text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}`, row: 1 },
          { text: '🔙 ' + msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 2 },
        ];
      }
    }

    // Guide transition
    case 'guide_transition':
      return [
        { text: msg.btn.startStep1(route), id: `guide:step:1.1:${route}:${amount}`, row: 0 },
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}`, row: 1 },
      ];

    // Step 1.1
    case 'step_1_1': {
      const exchangeButton = route === 'brleur'
        ? { text: msg.btn.openBinanceBR, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR, row: 1 }
        : { text: msg.btn.openKraken, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN, row: 1 };

      return [
        { text: msg.btn.step1Done(route), id: `guide:step:1.2:${route}:${amount}`, row: 0 },
        exchangeButton,
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}`, row: 2 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 3 },
        { text: msg.btn.back, id: `action:start_guide:${route}:${amount}`, row: 4 },
      ];
    }

    // WhatsApp optimized Step 1.1
    case 'step_1_1_whatsapp': {
      const exchangeButton = route === 'brleur'
        ? { text: msg.btn.openBinanceBR, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR, row: 1 }
        : { text: msg.btn.openKraken, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN, row: 1 };

      return [
        { text: msg.btn.step1Done(route), id: `guide:step:1.2:${route}:${amount}`, row: 0 },
        exchangeButton,
        { text: '⚙️ Plus...', id: `action:step_more:1.1:${route}:${amount}`, row: 2 },
      ];
    }

    // Generic step more submenu (navigation for all steps)
    case 'step_more': {
      const [stepNum] = (options.stepId || '1.1').split(':');
      const prevStepMap = {
        '1.1': 'action:start_guide',
        '1.2': 'guide:step:1.1',
        '1.3': 'guide:step:1.2',
        '1.4': 'guide:step:1.3',
        '2.1': 'guide:step:1.4',
        '2.2': 'guide:step:2.1',
        '2.3': 'guide:step:2.2',
        '2.4': 'guide:step:2.3',
        '3.1': 'guide:step:2.4',
        '3.2': 'guide:step:3.1',
        '3.3': 'guide:step:3.2',
        '3.4': 'guide:step:3.3',
      };

      const buttons = [];

      // Skip to next section (if not in section 3)
      if (stepNum.startsWith('1.')) {
        buttons.push({ text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}`, row: 0 });
      } else if (stepNum.startsWith('2.')) {
        buttons.push({ text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}`, row: 0 });
      }

      buttons.push(
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 1 },
        { text: '🔙 ' + msg.btn.back, id: `${prevStepMap[stepNum]}:${route}:${amount}`, row: 2 }
      );

      return buttons;
    }

    // Step 1.2
    case 'step_1_2':
      return [
        { text: msg.btn.step1_2Done(route), id: `guide:step:1.3:${route}:${amount}`, row: 0 },
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}`, row: 1 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 2 },
        { text: msg.btn.back, id: `guide:step:1.1:${route}:${amount}`, row: 3 },
      ];

    // WhatsApp optimized Step 1.2
    case 'step_1_2_whatsapp':
      return [
        { text: msg.btn.step1_2Done(route), id: `guide:step:1.3:${route}:${amount}`, row: 0 },
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}`, row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:1.2:${route}:${amount}`, row: 2 },
      ];

    // Step 1.3
    case 'step_1_3':
      return [
        { text: msg.btn.step1_3Done, id: `guide:step:1.4:${route}:${amount}`, row: 0 },
        { text: msg.btn.marketVsLimit, id: 'action:market_vs_limit', row: 1 },
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}`, row: 2 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 3 },
        { text: msg.btn.back, id: `guide:step:1.2:${route}:${amount}`, row: 4 },
      ];

    // WhatsApp optimized Step 1.3
    case 'step_1_3_whatsapp':
      return [
        { text: msg.btn.step1_3Done, id: `guide:step:1.4:${route}:${amount}`, row: 0 },
        { text: msg.btn.marketVsLimit, id: 'action:market_vs_limit', row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:1.3:${route}:${amount}`, row: 2 },
      ];

    // Step 1.4
    case 'step_1_4':
      return [
        { text: msg.btn.nextStep2, id: `guide:step:2.1:${route}:${amount}`, row: 0 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 1 },
        { text: msg.btn.back, id: `guide:step:1.3:${route}:${amount}`, row: 2 },
      ];

    // Step 2.1
    case 'step_2_1': {
      const exchangeButton = route === 'brleur'
        ? { text: msg.btn.openKraken, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN, row: 1 }
        : { text: msg.btn.openBinanceBR, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR, row: 1 };

      return [
        { text: msg.btn.step2Done, id: `guide:step:2.2:${route}:${amount}`, row: 0 },
        exchangeButton,
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}`, row: 2 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 3 },
        { text: msg.btn.back, id: `guide:step:1.4:${route}:${amount}`, row: 4 },
      ];
    }

    // WhatsApp optimized Step 2.1
    case 'step_2_1_whatsapp': {
      const exchangeButton = route === 'brleur'
        ? { text: msg.btn.openKraken, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN, row: 1 }
        : { text: msg.btn.openBinanceBR, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR, row: 1 };

      return [
        { text: msg.btn.step2Done, id: `guide:step:2.2:${route}:${amount}`, row: 0 },
        exchangeButton,
        { text: '⚙️ Plus...', id: `action:step_more:2.1:${route}:${amount}`, row: 2 },
      ];
    }

    // Step 2.2
    case 'step_2_2':
      return [
        { text: msg.btn.step2_2Done, id: `guide:step:2.3:${route}:${amount}`, row: 0 },
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}`, row: 1 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 2 },
        { text: msg.btn.back, id: `guide:step:2.1:${route}:${amount}`, row: 3 },
      ];

    // WhatsApp optimized Step 2.2
    case 'step_2_2_whatsapp':
      return [
        { text: msg.btn.step2_2Done, id: `guide:step:2.3:${route}:${amount}`, row: 0 },
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}`, row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:2.2:${route}:${amount}`, row: 2 },
      ];

    // Step 2.3
    case 'step_2_3':
      return [
        { text: msg.btn.step2_3Done, id: `guide:step:2.4:${route}:${amount}`, row: 0 },
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}`, row: 1 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 2 },
        { text: msg.btn.back, id: `guide:step:2.2:${route}:${amount}`, row: 3 },
      ];

    // WhatsApp optimized Step 2.3
    case 'step_2_3_whatsapp':
      return [
        { text: msg.btn.step2_3Done, id: `guide:step:2.4:${route}:${amount}`, row: 0 },
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}`, row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:2.3:${route}:${amount}`, row: 2 },
      ];

    // Step 2.4
    case 'step_2_4':
      return [
        { text: msg.btn.step3Start(route), id: `guide:step:3.1:${route}:${amount}`, row: 0 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 1 },
        { text: msg.btn.back, id: `guide:step:2.3:${route}:${amount}`, row: 2 },
      ];

    // Step 3.1
    case 'step_3_1':
      return [
        { text: msg.btn.step3_1Done, id: `guide:step:3.2:${route}:${amount}`, row: 0 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 1 },
        { text: msg.btn.back, id: `guide:step:2.4:${route}:${amount}`, row: 2 },
      ];

    // Step 3.2
    case 'step_3_2':
      return [
        { text: msg.btn.step3_2Done, id: `guide:step:3.3:${route}:${amount}`, row: 0 },
        { text: msg.btn.marketVsLimit, id: 'action:market_vs_limit', row: 1 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 2 },
        { text: msg.btn.back, id: `guide:step:3.1:${route}:${amount}`, row: 3 },
      ];

    // WhatsApp optimized Step 3.2
    case 'step_3_2_whatsapp':
      return [
        { text: msg.btn.step3_2Done, id: `guide:step:3.3:${route}:${amount}`, row: 0 },
        { text: msg.btn.marketVsLimit, id: 'action:market_vs_limit', row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:3.2:${route}:${amount}`, row: 2 },
      ];

    // Step 3.3
    case 'step_3_3':
      return [
        { text: msg.btn.step3_3Done(route), id: `guide:step:3.4:${route}:${amount}`, row: 0 },
        { text: msg.btn.whyNotExact, id: 'action:why_not_exact', row: 1 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 2 },
        { text: msg.btn.back, id: `guide:step:3.2:${route}:${amount}`, row: 3 },
      ];

    // WhatsApp optimized Step 3.3
    case 'step_3_3_whatsapp':
      return [
        { text: msg.btn.step3_3Done(route), id: `guide:step:3.4:${route}:${amount}`, row: 0 },
        { text: msg.btn.whyNotExact, id: 'action:why_not_exact', row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:3.3:${route}:${amount}`, row: 2 },
      ];

    // Step 3.4
    case 'step_3_4':
      return [
        { text: msg.btn.setAlert, id: 'alerts:start', row: 0 },
        { text: msg.btn.premium, id: 'premium:open', row: 1 },
        { text: msg.btn.giveFeedback, id: 'action:feedback', row: 2 },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}`, row: 3 },
        { text: msg.btn.back, id: `guide:step:3.3:${route}:${amount}`, row: 4 },
      ];

    // WhatsApp optimized Step 3.4
    case 'step_3_4_whatsapp':
      return [
        { text: msg.btn.setAlert, id: 'alerts:start', row: 0 },
        { text: msg.btn.premium, id: 'premium:open', row: 1 },
        { text: '⚙️ Plus...', id: `action:step_more:3.4:${route}:${amount}`, row: 2 },
      ];

    // Why not exact
    case 'why_not_exact':
      return [
        { text: msg.btn.back, id: `guide:step:3.3:${route}:${amount}`, row: 0 },
      ];

    // Market vs Limit
    case 'market_vs_limit':
      return [
        { text: msg.btn.back, id: 'action:back_context', row: 0 },
      ];

    // Guide Navigation
    case 'guide_navigation':
      return [
        { text: msg.btn.backToComparison, id: `action:back_comparison:${route}:${amount}`, row: 0 },
        { text: msg.btn.viewOffchain, id: `action:stay_offchain:${route}:${amount}`, row: 1 },
        { text: msg.btn.toMainMenu, id: 'action:back_main', row: 2 },
        { text: msg.btn.goToStep11(route), id: `guide:step:1.1:${route}:${amount}`, row: 3 },
        { text: msg.btn.goToStep12, id: `guide:step:1.2:${route}:${amount}`, row: 4 },
        { text: msg.btn.goToStep13, id: `guide:step:1.3:${route}:${amount}`, row: 5 },
        { text: msg.btn.goToStep14, id: `guide:step:1.4:${route}:${amount}`, row: 6 },
        { text: msg.btn.goToStep21(route), id: `guide:step:2.1:${route}:${amount}`, row: 7 },
        { text: msg.btn.goToStep22, id: `guide:step:2.2:${route}:${amount}`, row: 8 },
        { text: msg.btn.goToStep23, id: `guide:step:2.3:${route}:${amount}`, row: 9 },
        { text: msg.btn.goToStep24, id: `guide:step:2.4:${route}:${amount}`, row: 10 },
        { text: msg.btn.goToStep31, id: `guide:step:3.1:${route}:${amount}`, row: 11 },
        { text: msg.btn.goToStep32(route), id: `guide:step:3.2:${route}:${amount}`, row: 12 },
        { text: msg.btn.goToStep33(route), id: `guide:step:3.3:${route}:${amount}`, row: 13 },
        { text: msg.btn.goToStep34, id: `guide:step:3.4:${route}:${amount}`, row: 14 },
      ];

    // WhatsApp optimized guide navigation (hierarchical)
    case 'guide_navigation_whatsapp':
      return [
        { text: msg.btn.toMainMenu, id: 'action:back_main', row: 0 },
        { text: msg.btn.backToComparison, id: `action:back_comparison:${route}:${amount}`, row: 1 },
        { text: '📍 Aller à étape...', id: `action:guide_steps:${route}:${amount}`, row: 2 },
      ];

    // WhatsApp guide steps submenu (list of all steps)
    case 'guide_steps':
      return [
        { text: '1.1 - ' + msg.btn.goToStep11(route).replace('🔢 ', ''), id: `guide:step:1.1:${route}:${amount}`, row: 0 },
        { text: '1.2 - ' + msg.btn.goToStep12.replace('🔢 ', ''), id: `guide:step:1.2:${route}:${amount}`, row: 1 },
        { text: '1.3 - ' + msg.btn.goToStep13.replace('🔢 ', ''), id: `guide:step:1.3:${route}:${amount}`, row: 2 },
        { text: '1.4 - ' + msg.btn.goToStep14.replace('🔢 ', ''), id: `guide:step:1.4:${route}:${amount}`, row: 3 },
        { text: '2.1 - ' + msg.btn.goToStep21(route).replace('🔢 ', ''), id: `guide:step:2.1:${route}:${amount}`, row: 4 },
        { text: '2.2 - ' + msg.btn.goToStep22.replace('🔢 ', ''), id: `guide:step:2.2:${route}:${amount}`, row: 5 },
        { text: '2.3 - ' + msg.btn.goToStep23.replace('🔢 ', ''), id: `guide:step:2.3:${route}:${amount}`, row: 6 },
        { text: '2.4 - ' + msg.btn.goToStep24.replace('🔢 ', ''), id: `guide:step:2.4:${route}:${amount}`, row: 7 },
        { text: '3.1 - ' + msg.btn.goToStep31.replace('🔢 ', ''), id: `guide:step:3.1:${route}:${amount}`, row: 8 },
        { text: '3.2 - ' + msg.btn.goToStep32(route).replace('🔢 ', ''), id: `guide:step:3.2:${route}:${amount}`, row: 9 },
      ];

    // WhatsApp guide steps submenu part 2 (remaining steps)
    case 'guide_steps_2':
      return [
        { text: '3.3 - ' + msg.btn.goToStep33(route).replace('🔢 ', ''), id: `guide:step:3.3:${route}:${amount}`, row: 0 },
        { text: '3.4 - ' + msg.btn.goToStep34.replace('🔢 ', ''), id: `guide:step:3.4:${route}:${amount}`, row: 1 },
        { text: '🔙 ' + msg.btn.back, id: `action:guide_navigation:${route}:${amount}`, row: 2 },
      ];

    // Alerts list
    case 'alerts_list': {
      const { alerts = [], isPaused } = options;
      const buttons = [];
      let rowIndex = 0;

      alerts.forEach((alert) => {
        let label;

        if (alert.name) {
          const pairText = alert.pair === 'eurbrl' ? 'EUR→BRL' : 'BRL→EUR';
          label = `${alert.name} - ${pairText}`;
        } else {
          const pairText = alert.pair === 'eurbrl' ? 'EUR→BRL' : 'BRL→EUR';

          let criteria;
          if (alert.threshold_type === 'absolute') {
            criteria = `≥${alert.threshold_value}`;
          } else {
            const refShort = {
              current: 'actuel',
              avg30d: '30j',
              avg90d: '90j',
              avg365d: '1an'
            };
            criteria = `+${alert.threshold_value}% vs ${refShort[alert.reference_type] || alert.reference_type}`;
          }

          label = `${pairText}: ${criteria}`;
        }

        if (label.length > 60) {
          label = label.substring(0, 57) + '...';
        }

        buttons.push({ text: label, id: `alert:view:${alert.id}`, row: rowIndex++ });
      });

      if (isPaused) {
        buttons.push({ text: msg.btn.resumeSpontaneousAlerts, id: 'spontaneous:resume', row: rowIndex++ });
      }

      buttons.push({ text: msg.btn.createAlert, id: 'alert:choose_pair', row: rowIndex++ });
      buttons.push({ text: msg.btn.back, id: 'action:back_main', row: rowIndex++ });

      return buttons;
    }

    // Alert pair choice
    case 'alert_choose_pair':
      return [
        { text: msg.btn.pairEurBrl, id: 'alert:create:eurbrl', row: 0 },
        { text: msg.btn.pairBrlEur, id: 'alert:create:brleur', row: 1 },
        { text: msg.btn.back, id: 'alert:list', row: 2 },
      ];

    // Alert type choice
    case 'alert_choose_type': {
      const { pair } = options;
      return [
        { text: msg.btn.relativeAlert, id: `alert:type:relative:${pair}`, row: 0 },
        { text: msg.btn.absoluteAlert, id: `alert:type:absolute:${pair}`, row: 1 },
        { text: msg.btn.back, id: 'alert:choose_pair', row: 2 },
      ];
    }

    // Alert choose reference
    case 'alert_choose_reference': {
      const { pair, currentRate, avg30d, avg90d, avg365d, locale } = options;

      return [
        { text: msg.btn.refCurrent(currentRate, locale), id: `alert:ref:current:${pair}`, row: 0 },
        { text: msg.btn.refAvg30d(avg30d, locale), id: `alert:ref:avg30d:${pair}`, row: 1 },
        { text: msg.btn.refAvg90d(avg90d, locale), id: `alert:ref:avg90d:${pair}`, row: 2 },
        { text: msg.btn.refAvg365d(avg365d, locale), id: `alert:ref:avg365d:${pair}`, row: 3 },
        { text: msg.btn.back, id: `alert:type:relative:${pair}`, row: 4 },
      ];
    }

    // Alert choose percent
    case 'alert_choose_percent': {
      const { pair, refType } = options;
      return [
        { text: msg.btn.conservative, id: `alert:percent:2:${refType}:${pair}`, row: 0 },
        { text: msg.btn.balanced, id: `alert:percent:3:${refType}:${pair}`, row: 1 },
        { text: msg.btn.aggressive, id: `alert:percent:5:${refType}:${pair}`, row: 2 },
        { text: msg.btn.custom, id: `alert:percent:custom:${refType}:${pair}`, row: 3 },
        { text: msg.btn.back, id: `alert:type:relative:${pair}`, row: 4 },
      ];
    }

    // Alert choose cooldown
    case 'alert_choose_cooldown_v2': {
      const { alertData } = options;
      const thresholdStr = typeof alertData.threshold_value === 'number'
        ? alertData.threshold_value.toString()
        : alertData.threshold_value;

      const shortcode = [
        alertData.threshold_type.slice(0, 3),
        thresholdStr,
        alertData.reference_type || 'null',
        alertData.pair
      ].join('-');

      return [
        { text: msg.btn.chooseCooldown15, id: `alert:cd2:15:${shortcode}`, row: 0 },
        { text: msg.btn.chooseCooldown1h, id: `alert:cd2:60:${shortcode}`, row: 1 },
        { text: msg.btn.chooseCooldown6h, id: `alert:cd2:360:${shortcode}`, row: 2 },
        { text: msg.btn.chooseCooldown24h, id: `alert:cd2:1440:${shortcode}`, row: 3 },
        { text: msg.btn.chooseCooldown1week, id: `alert:cd2:10080:${shortcode}`, row: 4 },
        { text: msg.btn.back, id: `alert:create:${alertData.pair}`, row: 5 },
      ];
    }

    // Premium pricing (subscriptions)
    case 'premium_pricing':
      return [
        { text: msg.btn.premiumDetails, id: 'premium:details', row: 0 },
        { text: msg.btn.subMPMonthly, id: 'premium:sub:mp:monthly', row: 1 },
        { text: msg.btn.subMPQuarterly, id: 'premium:sub:mp:quarterly', row: 2 },
        { text: msg.btn.subMPSemiannual, id: 'premium:sub:mp:semiannual', row: 3 },
        { text: msg.btn.subMPAnnual, id: 'premium:sub:mp:annual', row: 4 },
        { text: msg.btn.seeOneshot, id: 'premium:oneshot_pricing', row: 5 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 6 },
        { text: msg.btn.back, id: 'action:back_main', row: 7 },
      ];

    // WhatsApp optimized premium pricing
    case 'premium_pricing_whatsapp':
      return [
        { text: msg.btn.subMPMonthly, id: 'premium:sub:mp:monthly', row: 0 },
        { text: msg.btn.subMPQuarterly, id: 'premium:sub:mp:quarterly', row: 1 },
        { text: '💳 Plus...', id: 'action:premium_more', row: 2 },
      ];

    // WhatsApp premium more submenu
    case 'premium_more':
      return [
        { text: msg.btn.premiumDetails, id: 'premium:details', row: 0 },
        { text: msg.btn.subMPSemiannual, id: 'premium:sub:mp:semiannual', row: 1 },
        { text: msg.btn.subMPAnnual, id: 'premium:sub:mp:annual', row: 2 },
        { text: msg.btn.seeOneshot, id: 'premium:oneshot_pricing', row: 3 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 4 },
        { text: '🔙 ' + msg.btn.back, id: 'premium:pricing', row: 5 },
      ];

    // Premium one-shot pricing
    case 'premium_oneshot_pricing':
      return [
        { text: msg.btn.oneshot3m, id: 'premium:oneshot:mp:3months', row: 0 },
        { text: msg.btn.oneshot6m, id: 'premium:oneshot:mp:6months', row: 1 },
        { text: msg.btn.oneshot12m, id: 'premium:oneshot:mp:12months', row: 2 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 3 },
        { text: msg.btn.backToSubscriptions, id: 'premium:pricing', row: 4 },
      ];

    // Premium details
    case 'premium_details':
      return [
        { text: msg.btn.backToPricing, id: 'premium:pricing', row: 0 },
        { text: msg.btn.plan3months, id: 'premium:subscribe:quarterly', row: 1 },
        { text: msg.btn.plan6months, id: 'premium:subscribe:semiannual', row: 2 },
        { text: msg.btn.plan12months, id: 'premium:subscribe:annual', row: 3 },
        { text: msg.btn.back, id: 'premium:pricing', row: 4 },
      ];

    // Premium pricing for renew
    case 'premium_pricing_renew':
      return [
        { text: msg.btn.renewPlan3months, id: 'premium:subscribe:quarterly', row: 0 },
        { text: msg.btn.renewPlan6months, id: 'premium:subscribe:semiannual', row: 1 },
        { text: msg.btn.renewPlan12months, id: 'premium:subscribe:annual', row: 2 },
        { text: msg.btn.createAlert, id: 'alert:choose_pair', row: 3 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 4 },
        { text: msg.btn.back, id: 'action:back_main', row: 5 },
      ];

    // Premium subscription active
    case 'premium_subscription_active':
      return [
        { text: msg.btn.createAlert, id: 'alert:choose_pair', row: 0 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 1 },
        { text: msg.btn.back, id: 'action:back_main', row: 2 },
      ];

    // Premium one-shot renew
    case 'premium_oneshot_renew':
      return [
        { text: msg.btn.addMoreTime, id: 'premium:renew_oneshot', row: 0 },
        { text: msg.btn.switchToSubscription, id: 'premium:renew_subscription', row: 1 },
        { text: msg.btn.createAlert, id: 'alert:choose_pair', row: 2 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 3 },
        { text: msg.btn.back, id: 'action:back_main', row: 4 },
      ];

    // Premium one-shot pricing renew
    case 'premium_oneshot_pricing_renew':
      return [
        { text: msg.btn.oneshot3m, id: 'premium:oneshot:mp:3months:renew', row: 0 },
        { text: msg.btn.oneshot6m, id: 'premium:oneshot:mp:6months:renew', row: 1 },
        { text: msg.btn.oneshot12m, id: 'premium:oneshot:mp:12months:renew', row: 2 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 3 },
        { text: msg.btn.back, id: 'premium:back_to_renew', row: 4 },
      ];

    // Premium subscription pricing renew
    case 'premium_subscription_pricing_renew':
      return [
        { text: msg.btn.subMPMonthly, id: 'premium:sub:mp:monthly:renew', row: 0 },
        { text: msg.btn.subMPQuarterly, id: 'premium:sub:mp:quarterly:renew', row: 1 },
        { text: msg.btn.subMPSemiannual, id: 'premium:sub:mp:semiannual:renew', row: 2 },
        { text: msg.btn.subMPAnnual, id: 'premium:sub:mp:annual:renew', row: 3 },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help', row: 4 },
        { text: msg.btn.back, id: 'premium:back_to_renew', row: 5 },
      ];

    // Free alert (broadcast)
    case 'free_alert': {
      const freeAlertPair = options.pair || 'eurbrl';
      const freeAlertAmount = options.amount || 1000;
      return [
        { text: msg.btn.compareNow, id: `route:${freeAlertPair}:${freeAlertAmount}`, row: 0 },
        { text: msg.btn.seePremium, id: 'premium:pricing', row: 1 },
      ];
    }

    // Premium alert (triggered)
    case 'premium_alert': {
      const alertPair = options.pair || 'eurbrl';
      const alertAmount = options.amount || 1000;
      const alertId = options.alertId;
      return [
        { text: msg.btn.compareNow, id: `route:${alertPair}:${alertAmount}`, row: 0 },
        { text: msg.btn.editMyAlert, id: `alert:view:${alertId}`, row: 1 },
        { text: msg.btn.deleteMyAlert, id: `alert:delete:${alertId}`, row: 2 },
        { text: msg.btn.myAlerts, id: 'alert:list', row: 3 },
      ];
    }

    // Spontaneous premium alert
    case 'spontaneous_premium_alert': {
      const spontPair = options.pair || 'eurbrl';
      const spontAmount = options.amount || 1000;
      return [
        { text: msg.btn.compareNow, id: `route:${spontPair}:${spontAmount}`, row: 0 },
        { text: msg.btn.pauseSpontaneousAlerts, id: 'spontaneous:pause', row: 1 },
      ];
    }

    // Triggered alert
    case 'triggered_alert': {
      const triggeredPair = options.pair || 'eurbrl';
      const triggeredAmount = options.amount || 1000;
      return [
        { text: msg.btn.compareNow, id: `route:${triggeredPair}:${triggeredAmount}`, row: 0 },
        { text: msg.btn.back, id: 'action:back_main', row: 1 },
      ];
    }

    // Not premium
    case 'not_premium':
      return [
        { text: msg.btn.seePremium, id: 'premium:pricing', row: 0 },
        { text: msg.btn.back, id: 'action:back_main', row: 1 },
      ];

    // Error fallback
    case 'error_fallback':
      return [
        { text: msg.btn.help, id: 'action:about', row: 0 },
        { text: msg.btn.seePremium, id: 'premium:pricing', row: 1 },
        { text: msg.btn.mainMenu, id: 'action:back_main', row: 2 },
      ];

    // Premium suggestion
    case 'premium_suggestion':
      return [
        { text: msg.btn.seePremium, id: 'premium:pricing', row: 0 },
        { text: msg.btn.mainMenu, id: 'action:back_main', row: 1 },
      ];

    // Status info
    case 'status_info':
      return [
        { text: msg.btn.eurbrl(1000, locale), id: 'route:eurbrl:1000', row: 0 },
        { text: msg.btn.seePremium, id: 'premium:pricing', row: 1 },
        { text: msg.btn.mainMenu, id: 'action:back_main', row: 2 },
      ];

    // Default: back to main
    default:
      return [
        { text: msg.btn.back, id: 'action:back_main', row: 0 },
      ];
  }
}

export default getKeyboardDefinition;
