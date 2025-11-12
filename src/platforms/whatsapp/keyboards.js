// src/platforms/whatsapp/keyboards.js
// Convert abstract keyboard objects to simple button arrays for WhatsApp

import { DEFAULTS, PROVIDER_LINKS } from '../../config/constants.js';

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

    // Exchanges BR
    case 'exchanges_br':
      return [
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` },
      ];

    // Exchanges EU
    case 'exchanges_eu':
      return [
        { text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` },
      ];

    // Alerts list
    case 'alerts_list':
      return [
        { text: msg.btn.createAlert, id: 'alert:create' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Alert pair choice
    case 'alert_choose_pair':
      return [
        { text: msg.btn.pairEurBrl, id: 'alert:choose_pair:eurbrl' },
        { text: msg.btn.pairBrlEur, id: 'alert:choose_pair:brleur' },
        { text: msg.btn.back, id: 'alert:list' },
      ];

    // Alert type choice
    case 'alert_choose_type':
      return [
        { text: msg.btn.alertAbsolute, id: `alert:choose_type:${options.pair}:absolute` },
        { text: msg.btn.alertRelative, id: `alert:choose_type:${options.pair}:relative` },
        { text: msg.btn.back, id: 'alert:list' },
      ];

    // Premium pricing
    case 'premium_pricing':
      return [
        { text: msg.btn.subscribe1Month, id: 'premium:subscribe:1' },
        { text: msg.btn.subscribe3Months, id: 'premium:subscribe:3' },
        { text: msg.btn.subscribe12Months, id: 'premium:subscribe:12' },
        { text: msg.btn.back, id: 'action:back_main' },
      ];

    // Premium payment methods
    case 'premium_payment':
      return [
        { text: msg.btn.payPix, id: `premium:pay:pix:${options.months}` },
        { text: msg.btn.payCard, id: `premium:pay:card:${options.months}` },
        { text: msg.btn.back, id: 'premium:pricing' },
      ];

    // Guide steps
    case 'guide_step': {
      const { step, totalSteps } = options;
      const buttons = [];

      if (step > 1) {
        buttons.push({ text: msg.btn.prevStep, id: `guide:step:${step - 1}:${route}:${amount}` });
      }

      if (step < totalSteps) {
        buttons.push({ text: msg.btn.nextStep, id: `guide:step:${step + 1}:${route}:${amount}` });
      } else {
        buttons.push({ text: msg.btn.finishGuide, id: `action:back_comparison:${route}:${amount}` });
      }

      buttons.push({ text: msg.btn.back, id: `action:onchain_intro:${route}:${amount}` });

      return buttons;
    }

    // Default: empty keyboard
    default:
      return [];
  }
}

export default buildWhatsAppKeyboard;
