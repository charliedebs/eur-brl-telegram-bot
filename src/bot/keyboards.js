import { Markup } from 'telegraf';
import { DEFAULTS, LINKS, PROVIDER_LINKS } from '../config/constants.js';
import { formatRate } from '../services/rates.js';

export function buildKeyboards(msg, type, options = {}) {
  const { route = 'eurbrl', amount = DEFAULTS.EUR, alerts = [] } = options;
  const locale = options.locale || 'fr-FR';
  
  switch (type) {
    // Écran 0 : Sélection langue
    case 'lang_select':
      return Markup.inlineKeyboard([
        [
          Markup.button.callback(msg.btn.langFR, 'lang:fr'),
          Markup.button.callback(msg.btn.langPT, 'lang:pt'),
          Markup.button.callback(msg.btn.langEN, 'lang:en'),
        ],
      ]);
    
    // Écran 1 : Menu Principal
    case 'main': {
      const isPremium = options.isPremium || false;
      const buttons = [
        [Markup.button.callback(msg.btn.eurbrl(DEFAULTS.EUR, locale), `route:eurbrl:${DEFAULTS.EUR}`)],
        [Markup.button.callback(msg.btn.brleur(DEFAULTS.BRL, locale), `route:brleur:${DEFAULTS.BRL}`)],
      ];

      // Add alerts button for premium users
      if (isPremium) {
        buttons.push([Markup.button.callback(msg.btn.myAlerts, 'alert:list')]);
      } else {
        buttons.push([Markup.button.callback(msg.btn.seePremium, 'premium:pricing')]);
      }

      buttons.push([Markup.button.callback(msg.btn.about, 'action:about')]);

      return Markup.inlineKeyboard(buttons);
    }
    
    // Écran "À propos"
    case 'about':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.back, 'action:back_main')],
      ]);
    
    // Écran 1bis : Clarification route
    case 'route_choice':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.pairEurBrl, `route:eurbrl:${amount}`)],
        [Markup.button.callback(msg.btn.pairBrlEur, `route:brleur:${amount}`)],
      ]);
  
    // Écran 2 : Carte comparaison
    case 'comparison':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.contOn, `action:continue_onchain:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.calcdetails, `action:calc_details:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.stayOff, `action:stay_offchain:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.swapMode, `action:swap_mode:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.change, `action:change_amount:${route}`)],
        [Markup.button.callback(msg.btn.sources, 'action:sources')],
        [Markup.button.callback(msg.btn.myAlerts, 'alert:list')],
      ]);
    
    // Écran 2bis : Sources
    case 'sources':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)],
      ]);
    
    // Écran 3 : Off-chain
    case 'offchain': {
      const { providers = [] } = options;
      
      // ⚠️ MODIFICATION : Filtrer pour ne garder que Wise et Remitly
      const wiseProvider = providers.find(p => p.provider === 'Wise');
      const remitlyProvider = providers.find(p => p.provider === 'Remitly');
      
      const buttons = [];
      
      // Ajouter Wise si disponible
      if (wiseProvider) {
        const wiseLink = PROVIDER_LINKS['Wise'] || '#';
        buttons.push([Markup.button.url(msg.btn.openWise, wiseLink)]);
      }
      
      // Ajouter Remitly si disponible
      if (remitlyProvider) {
        const remitlyLink = PROVIDER_LINKS['Remitly'] || '#';
        buttons.push([Markup.button.url(msg.btn.openRemitly, remitlyLink)]);
      }
      
      // Boutons navigation
      buttons.push([Markup.button.callback(msg.btn.seeOnchain, `action:continue_onchain:${route}:${amount}`)]);
      buttons.push([Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)]);
      
      return Markup.inlineKeyboard(buttons);
    }
    
    // Écran 4 : Route on-chain
// ⚠️ CASE MODIFIÉ : onchain_intro
case 'onchain_intro':
  return Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.startGuide, `action:start_guide:${route}:${amount}`)],
    [Markup.button.callback(msg.btn.faqDoubt, 'action:faq_menu')],
    [Markup.button.callback(msg.btn.createEU, 'action:exchanges_eu')],
    [Markup.button.callback(msg.btn.createBR, 'action:exchanges_br')],
    [Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)],
  ]);

// ⚠️ NOUVEAU CASE : faq_menu
case 'faq_menu':
  return Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.whatIsUSDC, 'action:what_usdc')],
    [Markup.button.callback(msg.btn.whatIsExchange, 'action:what_exchange')],
    [Markup.button.callback(msg.btn.whyOnchain, 'action:faq_why_onchain')],
    [Markup.button.callback(msg.btn.askQuestion, 'action:faq_send_question')],
    [Markup.button.callback(msg.btn.back, `action:onchain_intro:${route}:${amount}`)],
  ]);

// ⚠️ NOUVEAU CASE : faq_why_onchain
case 'faq_why_onchain':
  return Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.back, 'action:faq_menu')],
  ]);

// ⚠️ NOUVEAU CASE : faq_send_question
case 'faq_send_question':
  return Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.back, 'action:faq_menu')],
  ]);

// ⚠️ CASE MODIFIÉ : what_usdc
case 'what_usdc':
  return Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.whatIsExchange, 'action:what_exchange')],
    [Markup.button.callback(msg.btn.whyOnchain, 'action:faq_why_onchain')],
    [Markup.button.callback(msg.btn.back, 'action:faq_menu')],
  ]);

// ⚠️ CASE MODIFIÉ : what_exchange
case 'what_exchange':
  return Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.whatIsUSDC, 'action:what_usdc')],
    [Markup.button.callback(msg.btn.whyOnchain, 'action:faq_why_onchain')],
    [Markup.button.callback(msg.btn.back, 'action:faq_menu')],
  ]);
    
    // Écran 4bis : Preuves & sources
    case 'proof_sources':
      return Markup.inlineKeyboard([
        [Markup.button.url('🔗 CoinLaw', 'https://coinlaw.io/cryptocurrency-based-remittance-statistics/')],
        [Markup.button.url('🔗 World Bank', 'https://remittanceprices.worldbank.org/')],
        [Markup.button.url('🔗 CFA Institute', 'https://blogs.cfainstitute.org/investor/2025/08/27/blockchain-in-fx-and-remittances-from-pilot-to-portfolio-impact/')],
        [Markup.button.url('🔗 McKinsey', 'https://www.mckinsey.com/industries/financial-services/our-insights/the-stable-door-opens-how-tokenized-cash-enables-next-gen-payments')],
        [Markup.button.callback(msg.btn.back, 'action:onchain_intro:' + route + ':' + amount)],
      ]);
    
    // Écran 5 : Exchanges Europe
    case 'exchanges_eu':
      return Markup.inlineKeyboard([
        [Markup.button.url(msg.btn.openKraken, LINKS.KRAKEN)],
        [Markup.button.url(msg.btn.openBitstamp, LINKS.BITSTAMP)],
        [Markup.button.callback(msg.btn.createBR, 'action:exchanges_br')],
        [Markup.button.callback(msg.btn.startGuide, `action:start_guide:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `action:onchain_intro:${route}:${amount}`)],
      ]);
    
    // Écran 6 : Exchanges Brésil
    case 'exchanges_br':
      return Markup.inlineKeyboard([
        [Markup.button.url(msg.btn.openBinanceBR, LINKS.BINANCE_BR)],
        [Markup.button.url(msg.btn.openBitso, LINKS.BITSO)],
        [Markup.button.url(msg.btn.openMercadoBitcoin, LINKS.MERCADO_BITCOIN)],
        [Markup.button.url(msg.btn.openFoxbit, LINKS.FOXBIT)],
        [Markup.button.callback(msg.btn.createEU, 'action:exchanges_eu')],
        [Markup.button.callback(msg.btn.startGuide, `action:start_guide:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `action:onchain_intro:${route}:${amount}`)],
      ]);
  
    
    // Écran 7 : Transition
    case 'guide_transition':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.startStep1, `guide:step:1.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `action:onchain_intro:${route}:${amount}`)],
      ]);
    
    // Étapes du guide
    case 'step_1_1':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step1Done, `guide:step:1.2:${route}:${amount}`)],
        [Markup.button.url(msg.btn.openKraken, LINKS.KRAKEN)],
        [Markup.button.callback(msg.btn.skipToStep2, `guide:step:2.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `action:start_guide:${route}:${amount}`)],
      ]);
    
      case 'step_1_2':
        return Markup.inlineKeyboard([
          [Markup.button.callback(msg.btn.step1_2Done, `guide:step:1.3:${route}:${amount}`)],
          [Markup.button.callback(msg.btn.skipToStep2, `guide:step:2.1:${route}:${amount}`)],
          [Markup.button.callback(msg.btn.back, `guide:step:1.1:${route}:${amount}`)],
        ]);
    
        case 'step_1_3':
          return Markup.inlineKeyboard([
            [Markup.button.callback(msg.btn.step1_3Done, `guide:step:1.4:${route}:${amount}`)],
            [Markup.button.callback(msg.btn.marketVsLimit, 'action:market_vs_limit')],
            [Markup.button.callback(msg.btn.skipToStep2, `guide:step:2.1:${route}:${amount}`)],
            [Markup.button.callback(msg.btn.back, `guide:step:1.2:${route}:${amount}`)],
          ]);
    
    case 'step_1_4':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.nextStep2, `guide:step:2.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `guide:step:1.3:${route}:${amount}`)],
      ]);
    
      case 'step_2_1':
        return Markup.inlineKeyboard([
          [Markup.button.callback(msg.btn.step2Done, `guide:step:2.2:${route}:${amount}`)],
          [Markup.button.url(msg.btn.openBinanceBR, LINKS.BINANCE_BR)],
          [Markup.button.callback(msg.btn.skipToStep3, `guide:step:3.1:${route}:${amount}`)],
          [Markup.button.callback(msg.btn.back, `guide:step:1.4:${route}:${amount}`)],
        ]);
    
        case 'step_2_2':
          return Markup.inlineKeyboard([
            [Markup.button.callback(msg.btn.step2_2Done, `guide:step:2.3:${route}:${amount}`)],
            [Markup.button.callback(msg.btn.skipToStep3, `guide:step:3.1:${route}:${amount}`)],
            [Markup.button.callback(msg.btn.back, `guide:step:2.1:${route}:${amount}`)],
          ]);
    
          case 'step_2_3':
            return Markup.inlineKeyboard([
              [Markup.button.callback(msg.btn.step2_3Done, `guide:step:2.4:${route}:${amount}`)],
              [Markup.button.callback(msg.btn.skipToStep3, `guide:step:3.1:${route}:${amount}`)],
              [Markup.button.callback(msg.btn.back, `guide:step:2.2:${route}:${amount}`)],
            ]);
    
    case 'step_2_4':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step3Start, `guide:step:3.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `guide:step:2.3:${route}:${amount}`)],
      ]);
    
    case 'step_3_1':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step3_1Done, `guide:step:3.2:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `guide:step:2.4:${route}:${amount}`)],
      ]);
    
    case 'step_3_2':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step3_2Done, `guide:step:3.3:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.marketVsLimit, 'action:market_vs_limit')],
        [Markup.button.callback(msg.btn.back, `guide:step:3.1:${route}:${amount}`)],
      ]);
    
    case 'step_3_3':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step3_3Done, `guide:step:3.4:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.whyNotExact, 'action:why_not_exact')],
        [Markup.button.callback(msg.btn.back, `guide:step:3.2:${route}:${amount}`)],
      ]);
    
    case 'step_3_4':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.setAlert, 'alerts:start')],
        [Markup.button.callback(msg.btn.premium, 'premium:open')],
        [Markup.button.callback(msg.btn.giveFeedback, 'action:feedback')],
        [Markup.button.callback(msg.btn.back, `guide:step:3.3:${route}:${amount}`)],
      ]);
    
    // Écrans info supplémentaires
    case 'why_not_exact':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.back, `guide:step:3.3:${route}:${amount}`)],
      ]);
    
    case 'market_vs_limit':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.back, 'action:back_context')],
      ]);
    
 // Écran Premium Pricing (Subscriptions - recurring)
 case 'premium_pricing':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.premiumDetails, 'premium:details')],
      // Mercado Pago subscriptions (BRL) - only BRL now, PayPal disabled
      [Markup.button.callback(msg.btn.subMPMonthly, 'premium:sub:mp:monthly')],
      [Markup.button.callback(msg.btn.subMPQuarterly, 'premium:sub:mp:quarterly')],
      [Markup.button.callback(msg.btn.subMPSemiannual, 'premium:sub:mp:semiannual')],
      [Markup.button.callback(msg.btn.subMPAnnual, 'premium:sub:mp:annual')],
      // One-shot option
      [Markup.button.callback(msg.btn.seeOneshot, 'premium:oneshot_pricing')],
      // Help button for payment issues
      [Markup.button.callback(msg.btn.paymentHelp, 'premium:payment_help')],
      [Markup.button.callback(msg.btn.back, 'action:back_main')],
    ]);

  // Écran Premium One-Shot Pricing (one-time payments)
  case 'premium_oneshot_pricing':
    return Markup.inlineKeyboard([
      // Mercado Pago one-shot (BRL) - only BRL now
      [Markup.button.callback(msg.btn.oneshot3m, 'premium:oneshot:mp:3months')],
      [Markup.button.callback(msg.btn.oneshot6m, 'premium:oneshot:mp:6months')],
      [Markup.button.callback(msg.btn.oneshot12m, 'premium:oneshot:mp:12months')],
      // Help button for payment issues
      [Markup.button.callback(msg.btn.paymentHelp, 'premium:payment_help')],
      // Back to subscriptions
      [Markup.button.callback(msg.btn.backToSubscriptions, 'premium:pricing')],
    ]);

  // Écran Premium Details
  case 'premium_details':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.backToPricing, 'premium:pricing')],
      [Markup.button.callback(msg.btn.plan3months, 'premium:subscribe:quarterly')],
      [Markup.button.callback(msg.btn.plan6months, 'premium:subscribe:semiannual')],
      [Markup.button.callback(msg.btn.plan12months, 'premium:subscribe:annual')],
      [Markup.button.callback(msg.btn.back, 'premium:pricing')]
    ]);

  // Écran Premium Pricing pour utilisateurs déjà premium (renew)
  case 'premium_pricing_renew':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.renewPlan3months, 'premium:subscribe:quarterly')],
      [Markup.button.callback(msg.btn.renewPlan6months, 'premium:subscribe:semiannual')],
      [Markup.button.callback(msg.btn.renewPlan12months, 'premium:subscribe:annual')],
      [Markup.button.callback(msg.btn.createAlert, 'alert:choose_pair')],
      [Markup.button.callback(msg.btn.paymentHelp, 'premium:payment_help')],
      [Markup.button.callback(msg.btn.back, 'action:back_main')]
    ]);

  // NEW: Écran pour utilisateurs avec abonnement actif
  case 'premium_subscription_active':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.createAlert, 'alert:choose_pair')],
      [Markup.button.callback(msg.btn.paymentHelp, 'premium:payment_help')],
      [Markup.button.callback(msg.btn.back, 'action:back_main')]
    ]);

  // NEW: Écran pour utilisateurs avec one-shot premium qui veulent renouveler
  case 'premium_oneshot_renew':
    const lang = options?.lang || 'pt';

    // Section: Ajouter plus de temps (one-shot)
    const addTimeLabel = {
      pt: '💰 ADICIONAR MAIS TEMPO (pagamento único)',
      fr: '💰 AJOUTER PLUS DE TEMPS (paiement unique)',
      en: '💰 ADD MORE TIME (one-time payment)'
    };

    const subscriptionLabel = {
      pt: '🔄 OU PASSAR PARA ASSINATURA RECORRENTE',
      fr: '🔄 OU PASSER EN ABONNEMENT RÉCURRENT',
      en: '🔄 OR SWITCH TO RECURRING SUBSCRIPTION'
    };

    return Markup.inlineKeyboard([
      // Label: Add more time
      [Markup.button.callback(addTimeLabel[lang], 'noop')],
      // One-shot options
      [Markup.button.callback(msg.btn.oneshot3m, 'premium:oneshot:mp:3months')],
      [Markup.button.callback(msg.btn.oneshot6m, 'premium:oneshot:mp:6months')],
      [Markup.button.callback(msg.btn.oneshot12m, 'premium:oneshot:mp:12months')],
      // Label: Switch to subscription
      [Markup.button.callback(subscriptionLabel[lang], 'noop')],
      // Subscription options
      [Markup.button.callback(msg.btn.subMPMonthly, 'premium:sub:mp:monthly')],
      [Markup.button.callback(msg.btn.subMPQuarterly, 'premium:sub:mp:quarterly')],
      [Markup.button.callback(msg.btn.subMPSemiannual, 'premium:sub:mp:semiannual')],
      [Markup.button.callback(msg.btn.subMPAnnual, 'premium:sub:mp:annual')],
      // Help & Back
      [Markup.button.callback(msg.btn.paymentHelp, 'premium:payment_help')],
      [Markup.button.callback(msg.btn.back, 'action:back_main')]
    ]);

   // 👇 NOUVEAUX CASES ALERTES
    
    // Choix de la paire pour créer alerte
    case 'alert_choose_pair':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.pairEurBrl, 'alert:create:eurbrl')],
        [Markup.button.callback(msg.btn.pairBrlEur, 'alert:create:brleur')],
        [Markup.button.callback(msg.btn.back, 'alert:list')]
      ]);
    
    // Choix du preset après sélection pair
    case 'alert_create':
      const pair = options.pair || 'eurbrl';
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.conservative, `alert:preset:conservative:${pair}`)],
        [Markup.button.callback(msg.btn.balanced, `alert:preset:balanced:${pair}`)],
        [Markup.button.callback(msg.btn.aggressive, `alert:preset:aggressive:${pair}`)],
        [Markup.button.callback(msg.btn.custom, `alert:preset:custom:${pair}`)],
        [Markup.button.callback(msg.btn.back, 'alert:choose_pair')]
      ]);
    
    // Choix du cooldown (pour custom uniquement)
    case 'alert_choose_cooldown':
      const alertData = options.alertData || {};
      const { pair: p, threshold } = alertData;
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.chooseCooldown15, `alert:cooldown:15:${p}:${threshold}`)],
        [Markup.button.callback(msg.btn.chooseCooldown1h, `alert:cooldown:60:${p}:${threshold}`)],
        [Markup.button.callback(msg.btn.chooseCooldown6h, `alert:cooldown:360:${p}:${threshold}`)],
        [Markup.button.callback(msg.btn.chooseCooldown24h, `alert:cooldown:1440:${p}:${threshold}`)],
        [Markup.button.callback(msg.btn.chooseCooldown1week, `alert:cooldown:10080:${p}:${threshold}`)],
        [Markup.button.callback(msg.btn.back, `alert:create:${p}`)]
      ]);
    

      case 'alert_choose_type': {
        const { pair } = options;
        return Markup.inlineKeyboard([
          [Markup.button.callback(msg.btn.relativeAlert, `alert:type:relative:${pair}`)],
          [Markup.button.callback(msg.btn.absoluteAlert, `alert:type:absolute:${pair}`)],
          [Markup.button.callback(msg.btn.back, 'alert:choose_pair')]
        ]);
      }
      
      case 'alert_choose_reference': {
        const { pair, currentRate, avg7d, avg30d, avg90d, locale, msg } = options;
        // NOTE: si 'msg' n'est pas passé dans options, récupère-le comme d'habitude:
        // const msg = getMsg(locale) ou messages[locale]
      
        return Markup.inlineKeyboard([
          [Markup.button.callback(
            msg.btn.refCurrent(currentRate, locale),
            `alert:ref:current:${pair}`
          )],
          [Markup.button.callback(
            msg.btn.refAvg7d(avg7d, locale),
            `alert:ref:avg7d:${pair}`
          )],
          [Markup.button.callback(
            msg.btn.refAvg30d(avg30d, locale),
            `alert:ref:avg30d:${pair}`
          )],
          [Markup.button.callback(
            msg.btn.refAvg90d(avg90d, locale),
            `alert:ref:avg90d:${pair}`
          )],
          [Markup.button.callback(
            msg.btn.back,
            `alert:type:relative:${pair}`
          )],
        ]);
      }
      
      
      case 'alert_choose_percent': {
        const { pair, refType } = options;
        return Markup.inlineKeyboard([
          [Markup.button.callback(msg.btn.conservative, `alert:percent:2:${refType}:${pair}`)],
          [Markup.button.callback(msg.btn.balanced, `alert:percent:3:${refType}:${pair}`)],
          [Markup.button.callback(msg.btn.aggressive, `alert:percent:5:${refType}:${pair}`)],
          [Markup.button.callback(msg.btn.custom, `alert:percent:custom:${refType}:${pair}`)],
          [Markup.button.callback(msg.btn.back, `alert:type:relative:${pair}`)]
        ]);
      }
      
      case 'alert_choose_cooldown_v2': {
        const { alertData } = options;
        // Créer un shortcode : type-value-ref-pair
        // Ex: "rel-3-avg30d-eurbrl" ou "abs-6.3-null-eurbrl"
        const shortcode = [
          alertData.threshold_type.slice(0, 3), // 'rel' ou 'abs'
          alertData.threshold_value,
          alertData.reference_type || 'null',
          alertData.pair
        ].join('-');
        
        return Markup.inlineKeyboard([
          [Markup.button.callback(msg.btn.chooseCooldown15, `alert:cd2:15:${shortcode}`)],
          [Markup.button.callback(msg.btn.chooseCooldown1h, `alert:cd2:60:${shortcode}`)],
          [Markup.button.callback(msg.btn.chooseCooldown6h, `alert:cd2:360:${shortcode}`)],
          [Markup.button.callback(msg.btn.chooseCooldown24h, `alert:cd2:1440:${shortcode}`)],
          [Markup.button.callback(msg.btn.chooseCooldown1week, `alert:cd2:10080:${shortcode}`)],
          [Markup.button.callback(msg.btn.back, `alert:create:${alertData.pair}`)]
        ]);
      }
    // Liste des alertes (mise à jour)
    case 'alerts_list': {
      const { alerts } = options;
      
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
              avg7d: '7j',
              avg30d: '30j',
              avg90d: '90j'
            };
            criteria = `+${alert.threshold_value}% vs ${refShort[alert.reference_type] || alert.reference_type}`;
          }
          
          label = `${pairText}: ${criteria}`;
        }
        
        if (label.length > 60) {
          label = label.substring(0, 57) + '...';
        }
        
        buttons.push([Markup.button.callback(label, `alert:view:${alert.id}`)]);
      });
      
      buttons.push([Markup.button.callback(msg.btn.createAlert, 'alert:choose_pair')]);
      buttons.push([Markup.button.callback(msg.btn.back, 'action:back_main')]);
      
      return Markup.inlineKeyboard(buttons);
    }
    
    // Alerte gratuite (depuis broadcast)
    case 'free_alert':
      const freeAlertPair = options.pair || 'eurbrl';
      const freeAlertAmount = options.amount || 1000;
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.compareNow, `route:${freeAlertPair}:${freeAlertAmount}`)],
        [Markup.button.callback(msg.btn.seePremium, 'premium:pricing')]
      ]);
    
    // Alerte premium déclenchée (depuis broadcast)
    case 'premium_alert':
      const alertPair = options.pair || 'eurbrl';
      const alertAmount = options.amount || 1000;
      const alertId = options.alertId;
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.compareNow, `route:${alertPair}:${alertAmount}`)],
        [Markup.button.callback(msg.btn.editMyAlert, `alert:view:${alertId}`)],
        [Markup.button.callback(msg.btn.deleteMyAlert, `alert:delete:${alertId}`)],
        [Markup.button.callback(msg.btn.myAlerts, 'alert:list')]
      ]);

    // Alerte déclenchée manuellement (admin)
    case 'triggered_alert':
      const triggeredPair = options.pair || 'eurbrl';
      const triggeredAmount = options.amount || 1000;
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.compareNow, `route:${triggeredPair}:${triggeredAmount}`)],
        [Markup.button.callback(msg.btn.back, 'action:back_main')]
      ]);

    // User n'est pas premium
    case 'not_premium':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.seePremium, 'premium:pricing')],
        [Markup.button.callback(msg.btn.back, 'action:back_main')]
      ]);

    // Error fallback - for error messages
    case 'error_fallback':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.help, 'action:about')],
        [Markup.button.callback(msg.btn.seePremium, 'premium:pricing')],
        [Markup.button.callback(msg.btn.mainMenu, 'action:back_main')]
      ]);

    // Premium suggestion - for free users
    case 'premium_suggestion':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.seePremium, 'premium:pricing')],
        [Markup.button.callback(msg.btn.mainMenu, 'action:back_main')]
      ]);

    // Status info - for status/info messages
    case 'status_info':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.eurbrl(1000, locale), 'route:eurbrl:1000')],
        [Markup.button.callback(msg.btn.seePremium, 'premium:pricing')],
        [Markup.button.callback(msg.btn.mainMenu, 'action:back_main')]
      ]);

    default:
      return Markup.inlineKeyboard([[Markup.button.callback(msg.btn.back, 'action:back_main')]]);
  }
}