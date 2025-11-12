// src/platforms/whatsapp/keyboards.js
// Convert abstract keyboard objects to simple button arrays for WhatsApp

import { DEFAULTS, LINKS, PROVIDER_LINKS } from '../../config/constants.js';

/**
 * Build keyboard buttons for WhatsApp
 * Returns array of buttons: [{ text: string, id: string }, ...]
 */
export function buildWhatsAppKeyboard(msg, type, options = {}) {
  const { route = 'eurbrl', amount = DEFAULTS.EUR, alerts = [] } = options;
  const locale = options.locale || 'fr-FR';

  switch (type) {
    // Language selection
    case 'lang_select':
      return [
        { text: msg.btn.langFR, id: 'lang:fr' },
        { text: msg.btn.langPT, id: 'lang:pt' },
        { text: msg.btn.langEN, id: 'lang:en' },
      ];

    // Main menu
    case 'main': {
      const isPremium = options.isPremium || false;
      const buttons = [
        { text: msg.btn.eurbrl(DEFAULTS.EUR, locale), id: `route:eurbrl:${DEFAULTS.EUR}` },
        { text: msg.btn.brleur(DEFAULTS.BRL, locale), id: `route:brleur:${DEFAULTS.BRL}` },
      ];

      if (isPremium) {
        buttons.push({ text: msg.btn.myAlerts, id: 'alert:list' });
      } else {
        buttons.push({ text: msg.btn.seePremium, id: 'premium:pricing' });
      }

      buttons.push({ text: msg.btn.about, id: 'action:about' });

      return buttons;
    }

    // About screen
    case 'about':
      return [
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Route choice
    case 'route_choice':
      return [
        { text: msg.btn.pairEurBrl, id: `route:eurbrl:${amount}` },
        { text: msg.btn.pairBrlEur, id: `route:brleur:${amount}` },
      ];

    // Comparison screen
    case 'comparison':
      return [
        { text: msg.btn.contOn, id: `action:continue_onchain:${route}:${amount}` },
        { text: msg.btn.calcdetails, id: `action:calc_details:${route}:${amount}` },
        { text: msg.btn.stayOff, id: `action:stay_offchain:${route}:${amount}` },
        { text: msg.btn.moreOptions, id: `action:more_options:${route}:${amount}` },
        { text: msg.btn.sources, id: 'action:sources' },
      ];

    // More options
    case 'more_options':
      return [
        { text: msg.btn.swapMode, id: `action:swap_mode:${route}:${amount}` },
        { text: msg.btn.change, id: `action:change_amount:${route}` },
        { text: msg.btn.myAlerts, id: 'alert:list' },
        { text: msg.btn.back, id: `action:back_comparison:${route}:${amount}` },
      ];

    // Sources
    case 'sources':
      return [
        { text: msg.btn.back, id: `action:back_comparison:${route}:${amount}` },
      ];

    // Offchain providers
    case 'offchain': {
      const { providers = [] } = options;
      const buttons = [];

      // Wise
      const wiseProvider = providers.find(p => p.provider === 'Wise');
      if (wiseProvider) {
        const wiseLink = PROVIDER_LINKS['Wise'] || '#';
        buttons.push({ text: `🔗 ${msg.btn.openWise}`, id: `url:${wiseLink}`, url: wiseLink });
      }

      // Remitly
      const remitlyProvider = providers.find(p => p.provider === 'Remitly');
      if (remitlyProvider) {
        const remitlyLink = PROVIDER_LINKS['Remitly'] || '#';
        buttons.push({ text: `🔗 ${msg.btn.openRemitly}`, id: `url:${remitlyLink}`, url: remitlyLink });
      }

      buttons.push({ text: msg.btn.seeOnchain, id: `action:continue_onchain:${route}:${amount}` });
      buttons.push({ text: msg.btn.back, id: `action:back_comparison:${route}:${amount}` });

      return buttons;
    }

    // Onchain intro
    case 'onchain_intro': {
      const buttons = [
        { text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}` },
        { text: msg.btn.faqDoubt, id: 'action:faq_menu' },
      ];

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br' });
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu' });
      } else {
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu' });
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br' });
      }

      buttons.push({ text: msg.btn.back, id: `action:back_comparison:${route}:${amount}` });

      return buttons;
    }

    // FAQ menu
    case 'faq_menu':
      return [
        { text: msg.btn.whatIsUSDC, id: 'action:what_usdc' },
        { text: msg.btn.whatIsExchange, id: 'action:what_exchange' },
        { text: msg.btn.minAmount, id: 'action:faq_min_amount' },
        { text: msg.btn.aboutReferrals, id: 'action:about_referrals' },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain' },
        { text: msg.btn.askQuestion, id: 'action:faq_send_question' },
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` },
      ];

    // FAQ - Why onchain
    case 'faq_why_onchain':
      return [
        { text: msg.btn.back, id: 'action:faq_menu' },
      ];

    // FAQ - Send question
    case 'faq_send_question':
      return [
        { text: msg.btn.back, id: 'action:faq_menu' },
      ];

    // What is USDC
    case 'what_usdc':
      return [
        { text: msg.btn.whatIsExchange, id: 'action:what_exchange' },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain' },
        { text: msg.btn.back, id: 'action:faq_menu' },
      ];

    // What is Exchange
    case 'what_exchange':
      return [
        { text: msg.btn.whatIsUSDC, id: 'action:what_usdc' },
        { text: msg.btn.whyOnchain, id: 'action:faq_why_onchain' },
        { text: msg.btn.back, id: 'action:faq_menu' },
      ];

    // Proof sources
    case 'proof_sources':
      return [
        { text: '🔗 CoinLaw', id: 'url:https://coinlaw.io/cryptocurrency-based-remittance-statistics/', url: 'https://coinlaw.io/cryptocurrency-based-remittance-statistics/' },
        { text: '🔗 World Bank', id: 'url:https://remittanceprices.worldbank.org/', url: 'https://remittanceprices.worldbank.org/' },
        { text: '🔗 CFA Institute', id: 'url:https://blogs.cfainstitute.org/investor/2025/08/27/blockchain-in-fx-and-remittances-from-pilot-to-portfolio-impact/', url: 'https://blogs.cfainstitute.org/investor/2025/08/27/blockchain-in-fx-and-remittances-from-pilot-to-portfolio-impact/' },
        { text: '🔗 McKinsey', id: 'url:https://www.mckinsey.com/industries/financial-services/our-insights/the-stable-door-opens-how-tokenized-cash-enables-next-gen-payments', url: 'https://www.mckinsey.com/industries/financial-services/our-insights/the-stable-door-opens-how-tokenized-cash-enables-next-gen-payments' },
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` },
      ];

    // Exchanges EU
    case 'exchanges_eu': {
      const buttons = [
        { text: `🔗 ${msg.btn.openKraken}`, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN },
        { text: `🔗 ${msg.btn.openBitstamp}`, id: `url:${LINKS.BITSTAMP}`, url: LINKS.BITSTAMP },
      ];

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}` });
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br' });
      } else {
        buttons.push({ text: msg.btn.createBR, id: 'action:exchanges_br' });
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}` });
      }

      buttons.push({ text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` });

      return buttons;
    }

    // Exchanges BR
    case 'exchanges_br': {
      const buttons = [
        { text: `🔗 ${msg.btn.openBinanceBR}`, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR },
        { text: `🔗 ${msg.btn.openBitso}`, id: `url:${LINKS.BITSO}`, url: LINKS.BITSO },
        { text: `🔗 ${msg.btn.openMercadoBitcoin}`, id: `url:${LINKS.MERCADO_BITCOIN}`, url: LINKS.MERCADO_BITCOIN },
        { text: `🔗 ${msg.btn.openFoxbit}`, id: `url:${LINKS.FOXBIT}`, url: LINKS.FOXBIT },
      ];

      if (route === 'brleur') {
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu' });
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}` });
      } else {
        buttons.push({ text: msg.btn.startGuide, id: `action:start_guide:${route}:${amount}` });
        buttons.push({ text: msg.btn.createEU, id: 'action:exchanges_eu' });
      }

      buttons.push({ text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` });

      return buttons;
    }

    // Guide transition
    case 'guide_transition':
      return [
        { text: msg.btn.startStep1(route), id: `guide:step:1.1:${route}:${amount}` },
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` },
      ];

    // Step 1.1
    case 'step_1_1': {
      const exchangeButton = route === 'brleur'
        ? { text: `🔗 ${msg.btn.openBinanceBR}`, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR }
        : { text: `🔗 ${msg.btn.openKraken}`, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN };

      return [
        { text: msg.btn.step1Done(route), id: `guide:step:1.2:${route}:${amount}` },
        exchangeButton,
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `action:start_guide:${route}:${amount}` },
      ];
    }

    // Step 1.2
    case 'step_1_2':
      return [
        { text: msg.btn.step1_2Done(route), id: `guide:step:1.3:${route}:${amount}` },
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:1.1:${route}:${amount}` },
      ];

    // Step 1.3
    case 'step_1_3':
      return [
        { text: msg.btn.step1_3Done, id: `guide:step:1.4:${route}:${amount}` },
        { text: msg.btn.marketVsLimit, id: 'action:market_vs_limit' },
        { text: msg.btn.skipToStep2, id: `guide:step:2.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:1.2:${route}:${amount}` },
      ];

    // Step 1.4
    case 'step_1_4':
      return [
        { text: msg.btn.nextStep2, id: `guide:step:2.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:1.3:${route}:${amount}` },
      ];

    // Step 2.1
    case 'step_2_1': {
      const exchangeButton = route === 'brleur'
        ? { text: `🔗 ${msg.btn.openKraken}`, id: `url:${LINKS.KRAKEN}`, url: LINKS.KRAKEN }
        : { text: `🔗 ${msg.btn.openBinanceBR}`, id: `url:${LINKS.BINANCE_BR}`, url: LINKS.BINANCE_BR };

      return [
        { text: msg.btn.step2Done, id: `guide:step:2.2:${route}:${amount}` },
        exchangeButton,
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:1.4:${route}:${amount}` },
      ];
    }

    // Step 2.2
    case 'step_2_2':
      return [
        { text: msg.btn.step2_2Done, id: `guide:step:2.3:${route}:${amount}` },
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:2.1:${route}:${amount}` },
      ];

    // Step 2.3
    case 'step_2_3':
      return [
        { text: msg.btn.step2_3Done, id: `guide:step:2.4:${route}:${amount}` },
        { text: msg.btn.skipToStep3, id: `guide:step:3.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:2.2:${route}:${amount}` },
      ];

    // Step 2.4
    case 'step_2_4':
      return [
        { text: msg.btn.step3Start(route), id: `guide:step:3.1:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:2.3:${route}:${amount}` },
      ];

    // Step 3.1
    case 'step_3_1':
      return [
        { text: msg.btn.step3_1Done, id: `guide:step:3.2:${route}:${amount}` },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:2.4:${route}:${amount}` },
      ];

    // Step 3.2
    case 'step_3_2':
      return [
        { text: msg.btn.step3_2Done, id: `guide:step:3.3:${route}:${amount}` },
        { text: msg.btn.marketVsLimit, id: 'action:market_vs_limit' },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:3.1:${route}:${amount}` },
      ];

    // Step 3.3
    case 'step_3_3':
      return [
        { text: msg.btn.step3_3Done(route), id: `guide:step:3.4:${route}:${amount}` },
        { text: msg.btn.whyNotExact, id: 'action:why_not_exact' },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:3.2:${route}:${amount}` },
      ];

    // Step 3.4
    case 'step_3_4':
      return [
        { text: msg.btn.setAlert, id: 'alerts:start' },
        { text: msg.btn.premium, id: 'premium:open' },
        { text: msg.btn.giveFeedback, id: 'action:feedback' },
        { text: msg.btn.navigation, id: `action:guide_navigation:${route}:${amount}` },
        { text: msg.btn.back, id: `guide:step:3.3:${route}:${amount}` },
      ];

    // Why not exact
    case 'why_not_exact':
      return [
        { text: msg.btn.back, id: `guide:step:3.3:${route}:${amount}` },
      ];

    // Market vs Limit
    case 'market_vs_limit':
      return [
        { text: msg.btn.back, id: 'action:back_context' },
      ];

    // Guide Navigation
    case 'guide_navigation':
      return [
        { text: msg.btn.backToComparison, id: `action:back_comparison:${route}:${amount}` },
        { text: msg.btn.viewOffchain, id: `action:stay_offchain:${route}:${amount}` },
        { text: msg.btn.toMainMenu, id: 'action:back_main' },
        { text: msg.btn.goToStep11(route), id: `guide:step:1.1:${route}:${amount}` },
        { text: msg.btn.goToStep12, id: `guide:step:1.2:${route}:${amount}` },
        { text: msg.btn.goToStep13, id: `guide:step:1.3:${route}:${amount}` },
        { text: msg.btn.goToStep14, id: `guide:step:1.4:${route}:${amount}` },
        { text: msg.btn.goToStep21(route), id: `guide:step:2.1:${route}:${amount}` },
        { text: msg.btn.goToStep22, id: `guide:step:2.2:${route}:${amount}` },
        { text: msg.btn.goToStep23, id: `guide:step:2.3:${route}:${amount}` },
        { text: msg.btn.goToStep24, id: `guide:step:2.4:${route}:${amount}` },
        { text: msg.btn.goToStep31, id: `guide:step:3.1:${route}:${amount}` },
        { text: msg.btn.goToStep32(route), id: `guide:step:3.2:${route}:${amount}` },
        { text: msg.btn.goToStep33(route), id: `guide:step:3.3:${route}:${amount}` },
        { text: msg.btn.goToStep34, id: `guide:step:3.4:${route}:${amount}` },
      ];

    // Alerts list
    case 'alerts_list': {
      const { alerts = [], isPaused } = options;
      const buttons = [];

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

        buttons.push({ text: label, id: `alert:view:${alert.id}` });
      });

      if (isPaused) {
        buttons.push({ text: msg.btn.resumeSpontaneousAlerts, id: 'spontaneous:resume' });
      }

      buttons.push({ text: msg.btn.createAlert, id: 'alert:choose_pair' });
      buttons.push({ text: msg.btn.back, id: 'action:back_main' });

      return buttons;
    }

    // Alert pair choice
    case 'alert_choose_pair':
      return [
        { text: msg.btn.pairEurBrl, id: 'alert:create:eurbrl' },
        { text: msg.btn.pairBrlEur, id: 'alert:create:brleur' },
        { text: msg.btn.back, id: 'alert:list' },
      ];

    // Alert type choice
    case 'alert_choose_type': {
      const { pair } = options;
      return [
        { text: msg.btn.relativeAlert, id: `alert:type:relative:${pair}` },
        { text: msg.btn.absoluteAlert, id: `alert:type:absolute:${pair}` },
        { text: msg.btn.back, id: 'alert:choose_pair' },
      ];
    }

    // Alert choose reference
    case 'alert_choose_reference': {
      const { pair, currentRate, avg30d, avg90d, avg365d, locale } = options;

      return [
        { text: msg.btn.refCurrent(currentRate, locale), id: `alert:ref:current:${pair}` },
        { text: msg.btn.refAvg30d(avg30d, locale), id: `alert:ref:avg30d:${pair}` },
        { text: msg.btn.refAvg90d(avg90d, locale), id: `alert:ref:avg90d:${pair}` },
        { text: msg.btn.refAvg365d(avg365d, locale), id: `alert:ref:avg365d:${pair}` },
        { text: msg.btn.back, id: `alert:type:relative:${pair}` },
      ];
    }

    // Alert choose percent
    case 'alert_choose_percent': {
      const { pair, refType } = options;
      return [
        { text: msg.btn.conservative, id: `alert:percent:2:${refType}:${pair}` },
        { text: msg.btn.balanced, id: `alert:percent:3:${refType}:${pair}` },
        { text: msg.btn.aggressive, id: `alert:percent:5:${refType}:${pair}` },
        { text: msg.btn.custom, id: `alert:percent:custom:${refType}:${pair}` },
        { text: msg.btn.back, id: `alert:type:relative:${pair}` },
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
        { text: msg.btn.chooseCooldown15, id: `alert:cd2:15:${shortcode}` },
        { text: msg.btn.chooseCooldown1h, id: `alert:cd2:60:${shortcode}` },
        { text: msg.btn.chooseCooldown6h, id: `alert:cd2:360:${shortcode}` },
        { text: msg.btn.chooseCooldown24h, id: `alert:cd2:1440:${shortcode}` },
        { text: msg.btn.chooseCooldown1week, id: `alert:cd2:10080:${shortcode}` },
        { text: msg.btn.back, id: `alert:create:${alertData.pair}` },
      ];
    }

    // Premium pricing (subscriptions)
    case 'premium_pricing':
      return [
        { text: msg.btn.premiumDetails, id: 'premium:details' },
        { text: msg.btn.subMPMonthly, id: 'premium:sub:mp:monthly' },
        { text: msg.btn.subMPQuarterly, id: 'premium:sub:mp:quarterly' },
        { text: msg.btn.subMPSemiannual, id: 'premium:sub:mp:semiannual' },
        { text: msg.btn.subMPAnnual, id: 'premium:sub:mp:annual' },
        { text: msg.btn.seeOneshot, id: 'premium:oneshot_pricing' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Premium one-shot pricing
    case 'premium_oneshot_pricing':
      return [
        { text: msg.btn.oneshot3m, id: 'premium:oneshot:mp:3months' },
        { text: msg.btn.oneshot6m, id: 'premium:oneshot:mp:6months' },
        { text: msg.btn.oneshot12m, id: 'premium:oneshot:mp:12months' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.backToSubscriptions, id: 'premium:pricing' },
      ];

    // Premium details
    case 'premium_details':
      return [
        { text: msg.btn.backToPricing, id: 'premium:pricing' },
        { text: msg.btn.plan3months, id: 'premium:subscribe:quarterly' },
        { text: msg.btn.plan6months, id: 'premium:subscribe:semiannual' },
        { text: msg.btn.plan12months, id: 'premium:subscribe:annual' },
        { text: msg.btn.back, id: 'premium:pricing' },
      ];

    // Premium pricing for renew
    case 'premium_pricing_renew':
      return [
        { text: msg.btn.renewPlan3months, id: 'premium:subscribe:quarterly' },
        { text: msg.btn.renewPlan6months, id: 'premium:subscribe:semiannual' },
        { text: msg.btn.renewPlan12months, id: 'premium:subscribe:annual' },
        { text: msg.btn.createAlert, id: 'alert:choose_pair' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Premium subscription active
    case 'premium_subscription_active':
      return [
        { text: msg.btn.createAlert, id: 'alert:choose_pair' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Premium one-shot renew
    case 'premium_oneshot_renew':
      return [
        { text: msg.btn.addMoreTime, id: 'premium:renew_oneshot' },
        { text: msg.btn.switchToSubscription, id: 'premium:renew_subscription' },
        { text: msg.btn.createAlert, id: 'alert:choose_pair' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Premium one-shot pricing renew
    case 'premium_oneshot_pricing_renew':
      return [
        { text: msg.btn.oneshot3m, id: 'premium:oneshot:mp:3months:renew' },
        { text: msg.btn.oneshot6m, id: 'premium:oneshot:mp:6months:renew' },
        { text: msg.btn.oneshot12m, id: 'premium:oneshot:mp:12months:renew' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.back, id: 'premium:back_to_renew' },
      ];

    // Premium subscription pricing renew
    case 'premium_subscription_pricing_renew':
      return [
        { text: msg.btn.subMPMonthly, id: 'premium:sub:mp:monthly:renew' },
        { text: msg.btn.subMPQuarterly, id: 'premium:sub:mp:quarterly:renew' },
        { text: msg.btn.subMPSemiannual, id: 'premium:sub:mp:semiannual:renew' },
        { text: msg.btn.subMPAnnual, id: 'premium:sub:mp:annual:renew' },
        { text: msg.btn.paymentHelp, id: 'premium:payment_help' },
        { text: msg.btn.back, id: 'premium:back_to_renew' },
      ];

    // Free alert (broadcast)
    case 'free_alert': {
      const freeAlertPair = options.pair || 'eurbrl';
      const freeAlertAmount = options.amount || 1000;
      return [
        { text: msg.btn.compareNow, id: `route:${freeAlertPair}:${freeAlertAmount}` },
        { text: msg.btn.seePremium, id: 'premium:pricing' },
      ];
    }

    // Premium alert (triggered)
    case 'premium_alert': {
      const alertPair = options.pair || 'eurbrl';
      const alertAmount = options.amount || 1000;
      const alertId = options.alertId;
      return [
        { text: msg.btn.compareNow, id: `route:${alertPair}:${alertAmount}` },
        { text: msg.btn.editMyAlert, id: `alert:view:${alertId}` },
        { text: msg.btn.deleteMyAlert, id: `alert:delete:${alertId}` },
        { text: msg.btn.myAlerts, id: 'alert:list' },
      ];
    }

    // Spontaneous premium alert
    case 'spontaneous_premium_alert': {
      const spontPair = options.pair || 'eurbrl';
      const spontAmount = options.amount || 1000;
      return [
        { text: msg.btn.compareNow, id: `route:${spontPair}:${spontAmount}` },
        { text: msg.btn.pauseSpontaneousAlerts, id: 'spontaneous:pause' },
      ];
    }

    // Triggered alert
    case 'triggered_alert': {
      const triggeredPair = options.pair || 'eurbrl';
      const triggeredAmount = options.amount || 1000;
      return [
        { text: msg.btn.compareNow, id: `route:${triggeredPair}:${triggeredAmount}` },
        { text: msg.btn.back, id: 'action:back_main' },
      ];
    }

    // Not premium
    case 'not_premium':
      return [
        { text: msg.btn.seePremium, id: 'premium:pricing' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Error fallback
    case 'error_fallback':
      return [
        { text: msg.btn.help, id: 'action:about' },
        { text: msg.btn.seePremium, id: 'premium:pricing' },
        { text: msg.btn.mainMenu, id: 'action:back_main' },
      ];

    // Premium suggestion
    case 'premium_suggestion':
      return [
        { text: msg.btn.seePremium, id: 'premium:pricing' },
        { text: msg.btn.mainMenu, id: 'action:back_main' },
      ];

    // Status info
    case 'status_info':
      return [
        { text: msg.btn.eurbrl(1000, locale), id: 'route:eurbrl:1000' },
        { text: msg.btn.seePremium, id: 'premium:pricing' },
        { text: msg.btn.mainMenu, id: 'action:back_main' },
      ];

    // Default: back to main
    default:
      return [
        { text: msg.btn.back, id: 'action:back_main' },
      ];
  }
}

export default buildWhatsAppKeyboard;
