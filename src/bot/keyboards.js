import { Markup } from 'telegraf';
import { DEFAULTS, LINKS, PROVIDER_LINKS } from '../config/constants.js';

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
    
    // Écran 1 : Choix route/montant
    case 'main':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.eurbrl(DEFAULTS.EUR, locale), `route:eurbrl:${DEFAULTS.EUR}`)],
        [Markup.button.callback(msg.btn.brleur(DEFAULTS.BRL, locale), `route:brleur:${DEFAULTS.BRL}`)],
        [Markup.button.callback(msg.btn.about, 'action:about')],
      ]);
    
    // Écran "À propos"
    case 'about':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.back, 'action:back_main')],
      ]);
    
    // Écran 1bis : Clarification route
    case 'route_choice':
      return Markup.inlineKeyboard([
        [Markup.button.callback('🇪🇺 EUR → 🇧🇷 BRL', `route:eurbrl:${amount}`)],
        [Markup.button.callback('🇧🇷 BRL → 🇪🇺 EUR', `route:brleur:${amount}`)],
      ]);
    
    // Écran 2 : Carte comparaison
    case 'comparison':
        return Markup.inlineKeyboard([
          [Markup.button.callback(msg.btn.contOn, `action:continue_onchain:${route}:${amount}`)],
          [Markup.button.callback('🔍 Détails du calcul', `action:calc_details:${route}:${amount}`)],
          [Markup.button.callback(msg.btn.stayOff, `action:stay_offchain:${route}:${amount}`)],
          [Markup.button.callback(msg.btn.change, `action:change_amount:${route}`)],
          [Markup.button.callback(msg.btn.sources, 'action:sources')],
          [Markup.button.callback('🔔 Créer une alerte', `alert:create:${route}`)],

          // 👇 NOUVEAUX BOUTONS FEEDBACK
          [
            Markup.button.callback('👍', 'feedback:correct'),
            Markup.button.callback('👎 Pas ça', 'feedback:wrong')
          ]
        ]);
    
    // Écran 2bis : Sources
    case 'sources':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)],
      ]);
    
    // Écran 3 : Off-chain
    case 'offchain':
          // Récupérer les providers disponibles depuis les options
  const { providers = [] } = options;
  
  // Créer les boutons pour chaque provider
  const providerButtons = providers.map(provider => {
    const link = PROVIDER_LINKS[provider.provider] || '#';
    const emoji = provider.provider === 'Wise' ? '⭐' : '🔗';
    return [Markup.button.url(`${emoji} Ouvrir ${provider.provider}`, link)];
  });
  return Markup.inlineKeyboard([
    ...providerButtons,
    [Markup.button.callback(msg.btn.seeOnchain, `action:continue_onchain:${route}:${amount}`)],
    [Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)],
  ]);
    
    // Écran 4 : Route on-chain
    case 'onchain_intro':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.createEU, 'action:exchanges_eu')],
        [Markup.button.callback(msg.btn.createBR, 'action:exchanges_br')],
        [Markup.button.callback(msg.btn.startGuide, `action:start_guide:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.whatIsUSDC, 'action:what_usdc')],
        [Markup.button.callback(msg.btn.whatIsExchange, 'action:what_exchange')],
        [Markup.button.callback(msg.btn.proofSources, 'action:proof_sources')],
        [Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)],
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
        [Markup.button.url(msg.btn.openBinanceEU, LINKS.BINANCE_EU)],
        [Markup.button.url(msg.btn.openBitvavo, LINKS.BITVAVO)],
        [Markup.button.url(msg.btn.openBitstamp, LINKS.BITSTAMP)],
        [Markup.button.url(msg.btn.openCoinbase, LINKS.COINBASE)],
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
    
    // Écrans pédagogiques
    case 'what_usdc':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.whatIsExchange, 'action:what_exchange')],
        [Markup.button.callback(msg.btn.back, `action:onchain_intro:${route}:${amount}`)],
      ]);
    
    case 'what_exchange':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.whatIsUSDC, 'action:what_usdc')],
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
        [Markup.button.url('🔗 Ouvrir Kraken', LINKS.KRAKEN)],
        [Markup.button.callback('⏭️ Passer à l\'étape 2', `guide:step:2.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `action:start_guide:${route}:${amount}`)],
      ]);
    
    case 'step_1_2':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step1_2Done, `guide:step:1.3:${route}:${amount}`)],
        [Markup.button.callback('⏭️ Passer à l\'étape 2', `guide:step:2.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `guide:step:1.1:${route}:${amount}`)],
      ]);
    
    case 'step_1_3':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step1_3Done, `guide:step:1.4:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.marketVsLimit, 'action:market_vs_limit')],
        [Markup.button.callback('⏭️ Passer à l\'étape 2', `guide:step:2.1:${route}:${amount}`)],
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
        [Markup.button.url('🔗 Ouvrir Binance BR', LINKS.BINANCE_BR)],
        [Markup.button.callback('⏭️ Passer à l\'étape 3', `guide:step:3.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `guide:step:1.4:${route}:${amount}`)],
      ]);
    
    case 'step_2_2':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step2_2Done, `guide:step:2.3:${route}:${amount}`)],
        [Markup.button.callback('⏭️ Passer à l\'étape 3', `guide:step:3.1:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.back, `guide:step:2.1:${route}:${amount}`)],
      ]);
    
    case 'step_2_3':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.step2_3Done, `guide:step:2.4:${route}:${amount}`)],
        [Markup.button.callback('⏭️ Passer à l\'étape 3', `guide:step:3.1:${route}:${amount}`)],
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
    
 // Écran Premium Pricing
 case 'premium_pricing':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.premiumDetails, 'premium:details')],
      [Markup.button.callback(msg.btn.subscribe3m, 'premium:subscribe:3')],
      [Markup.button.callback(msg.btn.subscribe6m, 'premium:subscribe:6')],
      [Markup.button.callback(msg.btn.subscribe12m, 'premium:subscribe:12')],
      [Markup.button.callback(msg.btn.back, 'action:back_main')],
    ]);

  // Écran Premium Details
  case 'premium_details':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.backToPricing, 'premium:pricing')],
      [Markup.button.callback(msg.btn.subscribe3m, 'premium:subscribe:3')],
      [Markup.button.callback(msg.btn.subscribe6m, 'premium:subscribe:6')],
      [Markup.button.callback(msg.btn.subscribe12m, 'premium:subscribe:12')],
    ]);

  // Écran Création Alerte (choix preset)
  case 'alert_create':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.conservative, 'alert:preset:conservative:' + (options.pair || 'eurbrl'))],
      [Markup.button.callback(msg.btn.balanced, 'alert:preset:balanced:' + (options.pair || 'eurbrl'))],
      [Markup.button.callback(msg.btn.aggressive, 'alert:preset:aggressive:' + (options.pair || 'eurbrl'))],
      [Markup.button.callback(msg.btn.custom, 'alert:preset:custom:' + (options.pair || 'eurbrl'))],
      [Markup.button.callback(msg.btn.back, 'premium:pricing')],
    ]);

  // Écran Liste Alertes
  case 'alerts_list':
    const alertButtons = options.alerts?.map(alert => [
      Markup.button.callback(
        `${alert.pair === 'eurbrl' ? '🇪🇺→🇧🇷' : '🇧🇷→🇪🇺'} +${alert.threshold_percent}%`,
        `alert:view:${alert.id}`
      )
    ]) || [];
    
    return Markup.inlineKeyboard([
      ...alertButtons,
      [Markup.button.callback(msg.btn.createAlert, 'alert:create:eurbrl')],
      [Markup.button.callback(msg.btn.back, 'premium:pricing')],
    ]);

  // Écran Détails d'une Alerte
  case 'alert_view':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.editAlert, `alert:edit:${options.alertId}`)],
      [Markup.button.callback(msg.btn.disableAlert, `alert:disable:${options.alertId}`)],
      [Markup.button.callback(msg.btn.back, 'alert:list')],
    ]);

  // Not Premium (message bloquant)
  case 'not_premium':
    return Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.seePremium, 'premium:pricing')],
      [Markup.button.callback(msg.btn.back, 'action:back_main')],
    ]);

    default:
      return Markup.inlineKeyboard([[Markup.button.callback(msg.btn.back, 'action:back_main')]]);
  }
}