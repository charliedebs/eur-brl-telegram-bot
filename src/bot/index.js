import { Telegraf, Markup, session } from 'telegraf';
import { messages } from './messages.js';
import { buildKeyboards } from './keyboards.js';
import { updateNLUFeedback } from '../services/nlu-logger.js';
import { getRates, calculateOnChain, getLocale, formatAmount, formatRate } from '../services/rates.js';
import { getWiseComparison } from '../services/wise.js';
import { AlertsService } from '../services/alerts.js';
import { DatabaseService } from '../services/database.js';
import { parseUserIntent } from '../core/nlu.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Activer les sessions
bot.use(session());

const db = new DatabaseService();
const alerts = new AlertsService(db);

// Middleware: user language
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (userId) {
    let user = await db.getUser(userId);
    if (!user) {
      const langCode = ctx.from.language_code || 'en';
      const lang = langCode.startsWith('fr') ? 'fr' : langCode.startsWith('pt') ? 'pt' : 'en';
      user = await db.createUser(userId, lang);
    }
    ctx.state.user = user;
    ctx.state.lang = user.language;
  }

  if (!ctx.session) {
    ctx.session = {};
  }
  if (!ctx.session.messageHistory) {
    ctx.session.messageHistory = [];
  }

  await next();
});

const getMsg = (ctx) => messages[ctx.state.lang || 'fr'];

// ==================== COMMANDS ====================

bot.command('start', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'lang_select');
  await ctx.reply(msg.INTRO_TEXT, { parse_mode: 'HTML', ...kb });
});

bot.command('help', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.ABOUT_TEXT, { parse_mode: 'HTML' });
});

bot.command('premium', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'premium_pricing');
  await ctx.reply(msg.PREMIUM_PRICING, { parse_mode: 'HTML', ...kb });
});

bot.command('alerts', async (ctx) => {
  const msg = getMsg(ctx);
  
  const isPremium = await db.isPremium(ctx.from.id);
  if (!isPremium) {
    const kb = buildKeyboards(msg, 'not_premium');
    return ctx.reply(msg.NOT_PREMIUM, { parse_mode: 'HTML', ...kb });
  }
  
  const userAlerts = await db.getUserAlerts(ctx.from.id);
  const locale = getLocale(ctx.state.lang);
  
  const kb = buildKeyboards(msg, 'alerts_list', { alerts: userAlerts });
  await ctx.reply(msg.ALERTS_LIST(userAlerts, locale), { parse_mode: 'HTML', ...kb });
});

// ==================== BASIC CALLBACKS ====================

bot.action(/^lang:(.+)$/, async (ctx) => {
  const lang = ctx.match[1];
  await db.updateUser(ctx.from.id, { language: lang });
  ctx.state.lang = lang;
  
  const msg = getMsg(ctx);
  const locale = getLocale(lang);
  const kb = buildKeyboards(msg, 'main', { locale });
  
  await ctx.editMessageText(msg.promptAmt, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:about', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'about');
  await ctx.editMessageText(msg.ABOUT_TEXT, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:back_main', async (ctx) => {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  const kb = buildKeyboards(msg, 'main', { locale });
  await ctx.editMessageText(msg.promptAmt, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^route:(eurbrl|brleur):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);

  ctx.session.lastRoute = route;
  ctx.session.lastAmount = amount;

  await showComparison(ctx, route, amount);
  await ctx.answerCbQuery();
});

async function showComparison(ctx, route, amount) {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const [rates, wiseData] = await Promise.all([
    getRates(),
    getWiseComparison(route, amount)
  ]);
  
  if (!rates) {
    await ctx.reply("⚠️ Taux crypto indisponibles. Réessaie dans un instant.");
    return;
  }
  
  const onchain = calculateOnChain(route, amount, rates);
  
  const bestBank = wiseData?.providers?.[0] || null;
  const others = wiseData?.providers?.slice(1) || [];
  
  let delta = null;
  let winner = 'on-chain';
  
  if (bestBank) {
    delta = ((onchain.out - bestBank.out) / bestBank.out) * 100;
    winner = delta >= 0 ? 'on-chain' : bestBank.provider;
  }

  ctx.session.lastComparison = {
    route,
    amount,
    onchain: onchain.out,
    bestBank: bestBank ? bestBank.out : null,
    winner
  };

  const text = msg.buildComparison({
    route,
    amount,
    rates,
    onchain,
    bestBank,
    others,
    delta,
    winner,
    locale
  });
  
  const kb = buildKeyboards(msg, 'comparison', { route, amount, locale });
  
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

bot.action('action:sources', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'sources');
  await ctx.editMessageText(msg.SOURCES_TEXT, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:back_comparison:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  await showComparison(ctx, route, amount);
  await ctx.answerCbQuery();
});

bot.action(/^action:calc_details:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const rates = await getRates();
  if (!rates) {
    await ctx.reply("⚠️ Taux indisponibles.");
    await ctx.answerCbQuery();
    return;
  }
  
  const onchain = calculateOnChain(route, amount, rates);
  const text = msg.buildCalcDetails({ route, amount, rates, onchain, locale });
  
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.back, `action:back_comparison:${route}:${amount}`)]
  ]);
  
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:stay_offchain:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const [rates, wiseData] = await Promise.all([
    getRates(),
    getWiseComparison(route, amount)
  ]);
  
  if (!rates) {
    await ctx.reply("⚠️ Taux indisponibles.");
    await ctx.answerCbQuery();
    return;
  }
  
  const bestBank = wiseData?.providers?.[0] || null;
  const others = wiseData?.providers?.slice(1) || [];
  
  const text = msg.buildOffChain({
    route,
    amount,
    bestBank,
    others,
    locale
  });
  
  const displayProviders = wiseData?.providers || [];
  const kb = buildKeyboards(msg, 'offchain', { route, amount, locale, providers: displayProviders });
  
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:continue_onchain:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const kb = buildKeyboards(msg, 'onchain_intro', { route, amount, locale });
  await ctx.editMessageText(msg.ONCHAIN_INTRO, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:onchain_intro:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const kb = buildKeyboards(msg, 'onchain_intro', { route, amount, locale });
  await ctx.editMessageText(msg.ONCHAIN_INTRO, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:proof_sources/, async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'proof_sources');
  await ctx.editMessageText(msg.SOURCES_PROOF, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:exchanges_eu', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'exchanges_eu');
  await ctx.editMessageText(msg.EXCHANGES_EU, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:exchanges_br', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'exchanges_br');
  await ctx.editMessageText(msg.EXCHANGES_BR, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:what_usdc', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'what_usdc');
  await ctx.editMessageText(msg.WHAT_IS_USDC, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:what_exchange', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'what_exchange');
  await ctx.editMessageText(msg.WHAT_IS_EXCHANGE, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:start_guide:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  
  const kb = buildKeyboards(msg, 'guide_transition', { route, amount });
  await ctx.editMessageText(msg.GUIDE_TRANSITION, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^guide:step:(.+):(.+):(\d+)$/, async (ctx) => {
  const step = ctx.match[1];
  const route = ctx.match[2];
  const amount = parseFloat(ctx.match[3]);
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  let text = '';
  let kbType = '';
  
  const rates = await getRates();
  
  switch (step) {
    case '1.1':
      text = msg.STEP_1_1(amount, locale);
      kbType = 'step_1_1';
      break;
    case '1.2':
      text = msg.STEP_1_2(amount, locale);
      kbType = 'step_1_2';
      break;
    case '1.3':
      const usdcAfterBuy = rates ? amount * (1 / rates.usdcEUR) * 0.999 : amount;
      text = msg.STEP_1_3(usdcAfterBuy, locale);
      kbType = 'step_1_3';
      break;
    case '1.4':
      text = msg.STEP_1_4;
      kbType = 'step_1_4';
      break;
    case '2.1':
      text = msg.STEP_2_1;
      kbType = 'step_2_1';
      break;
    case '2.2':
      const usdcAmount = rates ? amount * (1 / rates.usdcEUR) * 0.999 : amount;
      text = msg.STEP_2_2(usdcAmount, locale);
      kbType = 'step_2_2';
      break;
    case '2.3':
      text = msg.STEP_2_3;
      kbType = 'step_2_3';
      break;
    case '2.4':
      text = msg.STEP_2_4;
      kbType = 'step_2_4';
      break;
    case '3.1':
      text = msg.STEP_3_1;
      kbType = 'step_3_1';
      break;
    case '3.2':
      const onchain = rates ? calculateOnChain(route, amount, rates) : { out: amount * 6 };
      text = msg.STEP_3_2(onchain.out, locale);
      kbType = 'step_3_2';
      break;
    case '3.3':
      const onchainCalc = rates ? calculateOnChain(route, amount, rates) : { out: amount * 6 };
      const brlNet = onchainCalc.out - 3.5;
      text = msg.STEP_3_3(brlNet, locale);
      kbType = 'step_3_3';
      break;
    case '3.4':
      text = msg.STEP_3_4;
      kbType = 'step_3_4';
      break;
  }
  
  const kb = buildKeyboards(msg, kbType, { route, amount, locale });
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('action:why_not_exact', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.WHY_NOT_EXACT, { parse_mode: 'HTML' });
  await ctx.answerCbQuery();
});

bot.action('action:market_vs_limit', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.MARKET_VS_LIMIT, { parse_mode: 'HTML' });
  await ctx.answerCbQuery();
});

bot.action(/^action:change_amount:(.+)$/, async (ctx) => {
  const route = ctx.match[1];
  
  ctx.session.awaitingAmount = route;
  await ctx.reply("✏️ Entre un montant (ex. 1000)");
  await ctx.answerCbQuery();
});

// ==================== PREMIUM CALLBACKS ====================

bot.action('premium:pricing', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'premium_pricing');
  await ctx.editMessageText(msg.PREMIUM_PRICING, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action('premium:details', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'premium_details');
  await ctx.editMessageText(msg.PREMIUM_DETAILS, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^premium:subscribe:(\d+)$/, async (ctx) => {
  const months = parseInt(ctx.match[1]);
  const prices = { 3: 15, 6: 27, 12: 50 };
  const price = prices[months];
  
  await ctx.answerCbQuery('🚧 Paiement Pix bientôt disponible !');
  
  await ctx.reply(
    `💳 Souscription ${months} mois (${price} R$)\n\n` +
    `🚧 Le paiement par Pix sera disponible très bientôt !\n\n` +
    `En attendant, contacte-nous pour activer ton Premium manuellement.`
  );
});

// ==================== ALERTS CALLBACKS ====================
// Handler: Choix de la paire (déjà existant, garder tel quel)
bot.action('alert:choose_pair', async (ctx) => {
  const msg = getMsg(ctx);
  
  const isPremium = await db.isPremium(ctx.from.id);
  if (!isPremium) {
    await ctx.answerCbQuery('🔒 Fonctionnalité Premium');
    const kb = buildKeyboards(msg, 'not_premium');
    return ctx.reply(msg.NOT_PREMIUM, { parse_mode: 'HTML', ...kb });
  }
  
  const kb = buildKeyboards(msg, 'alert_choose_pair');
  await ctx.editMessageText(msg.ALERT_CHOOSE_PAIR, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Handler: Paire choisie → Choix type de seuil
bot.action(/^alert:create:(eurbrl|brleur)$/, async (ctx) => {
  const pair = ctx.match[1];
  const msg = getMsg(ctx);
  
  const isPremium = await db.isPremium(ctx.from.id);
  if (!isPremium) {
    await ctx.answerCbQuery('🔒 Fonctionnalité Premium');
    return;
  }
  
  const kb = buildKeyboards(msg, 'alert_choose_type', { pair });
  await ctx.editMessageText(msg.ALERT_CHOOSE_TYPE(pair), { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Handler: Type choisi - RELATIF → Choix référence
bot.action(/^alert:type:relative:(eurbrl|brleur)$/, async (ctx) => {
  const pair = ctx.match[1];
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const isPremium = await db.isPremium(ctx.from.id);
  if (!isPremium) {
    await ctx.answerCbQuery('🔒 Fonctionnalité Premium');
    return;
  }
  
  // Récupérer taux et moyennes
  const rates = await getRates();
  const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
  
  const [avg7d, avg30d, avg90d] = await Promise.all([
    db.getAverage(pair, 7),
    db.getAverage30Days(pair),
    db.getAverage(pair, 90)
  ]);
  
  const kb = buildKeyboards(msg, 'alert_choose_reference', {
    pair,
    currentRate,
    avg7d: avg7d || currentRate,
    avg30d: avg30d || currentRate,
    avg90d: avg90d || currentRate,
    locale
  });
  
  await ctx.editMessageText(
    msg.ALERT_CHOOSE_REFERENCE(pair, currentRate, avg7d, avg30d, avg90d, locale),
    { parse_mode: 'HTML', ...kb }
  );
  await ctx.answerCbQuery();
});

// Handler: Référence choisie → Choix pourcentage
bot.action(/^alert:ref:(current|avg7d|avg30d|avg90d):(eurbrl|brleur)$/, async (ctx) => {
  const refType = ctx.match[1];
  const pair = ctx.match[2];
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  // Récupérer valeur de référence
  const rates = await getRates();
  const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
  
  let refValue;
  if (refType === 'current') {
    refValue = currentRate;
  } else if (refType === 'avg7d') {
    refValue = await db.getAverage(pair, 7) || currentRate;
  } else if (refType === 'avg30d') {
    refValue = await db.getAverage30Days(pair) || currentRate;
  } else if (refType === 'avg90d') {
    refValue = await db.getAverage(pair, 90) || currentRate;
  }
  
  // Stocker dans session pour après
  ctx.session.alertDraft = { pair, refType, refValue };
  
  const kb = buildKeyboards(msg, 'alert_choose_percent', { pair, refType });
  
  await ctx.editMessageText(
    msg.ALERT_CHOOSE_PERCENT(pair, refType, refValue, locale),
    { parse_mode: 'HTML', ...kb }
  );
  await ctx.answerCbQuery();
});

// Handler: Pourcentage choisi (preset ou custom)
bot.action(/^alert:percent:(2|3|5|custom):(current|avg7d|avg30d|avg90d):(eurbrl|brleur)$/, async (ctx) => {
  const percent = ctx.match[1];
  const refType = ctx.match[2];
  const pair = ctx.match[3];
  const msg = getMsg(ctx);
  
  if (percent === 'custom') {
    ctx.session.awaitingCustomPercent = { pair, refType };
    await ctx.answerCbQuery();
    return ctx.editMessageText(
      `✏️ Entre le pourcentage d'augmentation (1-10)\n\nExemple : 3.5`,
      { parse_mode: 'HTML' }
    );
  }
  
  // Pourcentage preset choisi → Choix cooldown
  const alertData = {
    pair,
    threshold_type: 'relative',
    threshold_value: parseFloat(percent),
    reference_type: refType
  };
  
  const kb = buildKeyboards(msg, 'alert_choose_cooldown_v2', { alertData });
  await ctx.editMessageText(msg.ALERT_CHOOSE_COOLDOWN, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Handler: Type choisi - ABSOLU → Demande valeur
bot.action(/^alert:type:absolute:(eurbrl|brleur)$/, async (ctx) => {
  const pair = ctx.match[1];
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const isPremium = await db.isPremium(ctx.from.id);
  if (!isPremium) {
    await ctx.answerCbQuery('🔒 Fonctionnalité Premium');
    return;
  }
  
  const rates = await getRates();
  const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
  
  ctx.session.awaitingAbsoluteThreshold = { pair };
  
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    msg.ALERT_ENTER_ABSOLUTE(pair, currentRate, locale),
    { parse_mode: 'HTML' }
  );
});

// Handler: Cooldown choisi V2 → Créer alerte (FIX: decode shortcode)
bot.action(/^alert:cd2:(\d+):(.+)$/, async (ctx) => {
  const cooldown = parseInt(ctx.match[1]);
  const shortcode = ctx.match[2];
  
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  // Decoder shortcode : type-value-ref-pair
  // Ex: "rel-3-avg30d-eurbrl" ou "abs-6.3-null-brleur"
  const parts = shortcode.split('-');
  
  if (parts.length < 4) {
    console.error('[ALERT] Invalid shortcode:', shortcode);
    await ctx.answerCbQuery('❌ Erreur');
    return ctx.reply('❌ Erreur de décodage. Réessaie.');
  }
  
  const alertData = {
    threshold_type: parts[0] === 'rel' ? 'relative' : 'absolute',
    threshold_value: parseFloat(parts[1]),
    reference_type: parts[2] === 'null' ? null : parts[2],
    pair: parts[3],
    cooldown_minutes: cooldown
  };
  
  // Créer l'alerte
  const user = await db.getUser(ctx.from.id);
  const alert = await db.createAlert(user.id, alertData);
  
  if (!alert) {
    await ctx.answerCbQuery('❌ Erreur');
    return ctx.reply('❌ Erreur lors de la création.');
  }
  
  // Calculer seuil pour affichage
  const rates = await getRates();
  const currentRate = alertData.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
  
  let refValue;
  let calculatedThreshold;
  
  if (alertData.threshold_type === 'absolute') {
    calculatedThreshold = alertData.threshold_value;
    refValue = null;
  } else {
    // Relative
    if (alertData.reference_type === 'current') {
      refValue = currentRate;
    } else if (alertData.reference_type === 'avg7d') {
      refValue = await db.getAverage(alertData.pair, 7);
    } else if (alertData.reference_type === 'avg30d') {
      refValue = await db.getAverage30Days(alertData.pair);
    } else if (alertData.reference_type === 'avg90d') {
      refValue = await db.getAverage(alertData.pair, 90);
    }
    
    calculatedThreshold = refValue * (1 + alertData.threshold_value / 100);
  }
  
  await ctx.answerCbQuery('✅ Alerte créée !');
  
  const text = msg.ALERT_CREATED_FULL_V2(alert, currentRate, refValue, calculatedThreshold, locale);
  const kb = buildKeyboards(msg, 'alerts_list', { alerts: [alert] });
  
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
});

bot.action(/^alert:view:(.+)$/, async (ctx) => {
  const alertId = ctx.match[1];
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  try {
    const { data: alert } = await db.supabase
      .from('user_alerts')
      .select('*')
      .eq('id', alertId)
      .single();
    
    if (!alert) {
      await ctx.answerCbQuery('❌ Alerte introuvable');
      return;
    }
    
    const rates = await getRates();
    const currentRate = alert.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
    const avg30d = await db.getAverage30Days(alert.pair);
    const alertThreshold = avg30d ? avg30d * (1 + alert.threshold_value / 100) : null;
    
    const text = msg.ALERT_VIEW_DETAILS(alert, currentRate, avg30d, alertThreshold, locale);
    
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('🗑️ Supprimer', `alert:delete:${alertId}`)],
      [Markup.button.callback(msg.btn.back, 'alert:list')]
    ]);
    
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
    await ctx.answerCbQuery();
    
  } catch (error) {
    console.error('[ALERT-VIEW] Error:', error);
    await ctx.answerCbQuery('❌ Erreur');
  }
});

bot.action(/^alert:delete:(.+)$/, async (ctx) => {
  const alertId = ctx.match[1];
  const msg = getMsg(ctx);
  
  try {
    await db.disableAlert(alertId);
    
    await ctx.answerCbQuery('✅ Alerte supprimée');
    
    const userAlerts = await db.getUserAlerts(ctx.from.id);
    const locale = getLocale(ctx.state.lang);
    const kb = buildKeyboards(msg, 'alerts_list', { alerts: userAlerts });
    
    await ctx.editMessageText(
      msg.ALERTS_LIST(userAlerts, locale), 
      { parse_mode: 'HTML', ...kb }
    );
  } catch (error) {
    console.error('[ALERT-DELETE] Error:', error);
    await ctx.answerCbQuery('❌ Erreur lors de la suppression');
  }
});

bot.action('alert:list', async (ctx) => {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const isPremium = await db.isPremium(ctx.from.id);
  if (!isPremium) {
    await ctx.answerCbQuery('🔒 Fonctionnalité Premium');
    const kb = buildKeyboards(msg, 'not_premium');
    return ctx.reply(msg.NOT_PREMIUM, { parse_mode: 'HTML', ...kb });
  }
  
  const userAlerts = await db.getUserAlerts(ctx.from.id);
  const kb = buildKeyboards(msg, 'alerts_list', { alerts: userAlerts });
  
  await ctx.editMessageText(msg.ALERTS_LIST(userAlerts, locale), { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// ==================== TEXT HANDLER WITH NLU ====================

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const msg = getMsg(ctx);
    const locale = getLocale(ctx.state.lang);
    
    if (text.startsWith('/')) return;
    
    // PRIORITÉ 1: Montant attendu
    if (ctx.session?.awaitingAmount) {
      const amount = parseFloat(text.replace(/[^\d.]/g, ''));
      if (amount && isFinite(amount)) {
        await showComparison(ctx, ctx.session.awaitingAmount, amount);
        delete ctx.session.awaitingAmount;
      } else {
        await ctx.reply("⚠️ Montant invalide. Entre un nombre (ex. 1000)");
      }
      return;
    }
    
    // PRIORITÉ 2: Custom alert threshold
    if (ctx.session?.awaitingCustomPercent) {
      const { pair, refType } = ctx.session.awaitingCustomPercent;
      const msg = getMsg(ctx);
      
      const match = ctx.message.text.trim().match(/^\+?(\d+(?:[.,]\d+)?)$/);
      if (!match) {
        return ctx.reply('⚠️ Format invalide. Entre un nombre (ex: 3.5)');
      }
      
      const percent = parseFloat(match[1].replace(',', '.'));
      
      // ✅ SUPPRIMÉ : Validation min/max
      // Laisse l'utilisateur libre
      
      delete ctx.session.awaitingCustomPercent;
      
      const alertData = {
        pair,
        threshold_type: 'relative',
        threshold_value: percent,
        reference_type: refType
      };
      
      const kb = buildKeyboards(msg, 'alert_choose_cooldown_v2', { alertData });
      return ctx.reply(msg.ALERT_CHOOSE_COOLDOWN, { parse_mode: 'HTML', ...kb });
    }
    
    // Custom threshold absolu
    if (ctx.session?.awaitingAbsoluteThreshold) {
      const { pair } = ctx.session.awaitingAbsoluteThreshold;
      const msg = getMsg(ctx);
      
      const match = ctx.message.text.trim().match(/^(\d+(?:[.,]\d+)?)$/);
      if (!match) {
        return ctx.reply('⚠️ Format invalide. Entre un nombre décimal (ex: 6.30)');
      }
      
      const threshold = parseFloat(match[1].replace(',', '.'));
      
      // ✅ SUPPRIMÉ : Validation min/max
      // Laisse l'utilisateur libre
      
      delete ctx.session.awaitingAbsoluteThreshold;
      
      const alertData = {
        pair,
        threshold_type: 'absolute',
        threshold_value: threshold,
        reference_type: null
      };
      
      const kb = buildKeyboards(msg, 'alert_choose_cooldown_v2', { alertData });
      return ctx.reply(msg.ALERT_CHOOSE_COOLDOWN, { parse_mode: 'HTML', ...kb });
    }
    
    // PRIORITÉ 3: NLU
    const context = {
      userId: ctx.state.user?.id,
      language: ctx.state.lang,
      history: ctx.session.messageHistory.slice(-3),
      lastAmount: ctx.session.lastAmount,
      lastRoute: ctx.session.lastRoute,
      lastComparison: ctx.session.lastComparison
    };
    
    const intent = await parseUserIntent(text, context);
    
    ctx.session.messageHistory.push(text);
    if (ctx.session.messageHistory.length > 5) {
      ctx.session.messageHistory.shift();
    }
    
    ctx.session.lastNLUIntent = intent;
    
    if (!intent.entities.language && context.language) {
      intent.entities.language = context.language;
    }
    
    switch (intent.intent) {
      case 'greeting':
        if (intent.entities.language && intent.entities.language !== ctx.state.lang) {
          if (intent.confidence >= 0.85) {
            await db.updateUser(ctx.from.id, { language: intent.entities.language });
            ctx.state.lang = intent.entities.language;
          }
        }
        
        const greetingMsg = getMsg(ctx);
        const greetingKb = buildKeyboards(greetingMsg, 'lang_select');
        return ctx.reply(greetingMsg.INTRO_TEXT, { parse_mode: 'HTML', ...greetingKb });
        
      case 'compare':
        if (intent.entities.language && intent.entities.language !== ctx.state.lang) {
          const isFirstMessage = ctx.session.messageHistory.length <= 1;
          const isHighConfidence = intent.confidence >= 0.85;
          
          if (isFirstMessage || isHighConfidence) {
            await db.updateUser(ctx.from.id, { language: intent.entities.language });
            ctx.state.lang = intent.entities.language;
          }
        }
        
        const currentMsg = getMsg(ctx);
        const currentLocale = getLocale(ctx.state.lang);
        
        if (intent.entities.amount && intent.entities.route) {
          ctx.session.lastRoute = intent.entities.route;
          ctx.session.lastAmount = intent.entities.amount;
          return showComparison(ctx, intent.entities.route, intent.entities.amount);
        }
        
        if (intent.entities.amount && !intent.entities.route) {
          if (intent.confidence < 0.7) {
            const kb = buildKeyboards(currentMsg, 'route_choice', { 
              amount: intent.entities.amount, 
              locale: currentLocale 
            });
            
            const clarificationMsg = {
              fr: `Je veux être sûr de bien comprendre :\n\nTu veux faire quoi avec ${formatAmount(intent.entities.amount, 0, currentLocale)} ?`,
              pt: `Quero ter certeza de que entendi:\n\nO que você quer fazer com ${formatAmount(intent.entities.amount, 0, currentLocale)}?`,
              en: `I want to make sure I understand:\n\nWhat do you want to do with ${formatAmount(intent.entities.amount, 0, currentLocale)}?`
            };
            
            return ctx.reply(
              clarificationMsg[ctx.state.lang] || clarificationMsg.pt,
              { parse_mode: 'HTML', ...kb }
            );
          }
          
          const kb = buildKeyboards(currentMsg, 'route_choice', { 
            amount: intent.entities.amount, 
            locale: currentLocale 
          });
          return ctx.reply(
            currentMsg.askRoute(intent.entities.amount, currentLocale), 
            { parse_mode: 'HTML', ...kb }
          );
        }
        
        if (intent.entities.route && !intent.entities.amount) {
          ctx.session.awaitingAmount = intent.entities.route;
          const routeText = intent.entities.route === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
          return ctx.reply(
            `✏️ ${routeText}\n\n${currentMsg.askAmount || 'Entre un montant (ex. 1000)'}`,
            { parse_mode: 'HTML' }
          );
        }
        
        const kb = buildKeyboards(currentMsg, 'main', { locale: currentLocale });
        
        const fallbackMsg = {
          fr: `😊 Je n'ai pas bien compris, mais pas de souci !\n\nUtilise les boutons ci-dessous 👇`,
          pt: `😊 Não entendi bem, mas tudo bem!\n\nUse os botões abaixo 👇`,
          en: `😊 I didn't quite understand, but no worries!\n\nUse the buttons below 👇`
        };
        
        return ctx.reply(
          fallbackMsg[ctx.state.lang] || fallbackMsg.pt,
          { parse_mode: 'HTML', ...kb }
        );
        
      case 'help':
        const helpMsg = getMsg(ctx);
        return ctx.reply(helpMsg.ABOUT_TEXT, { parse_mode: 'HTML' });
        
      case 'about':
        const aboutMsg = getMsg(ctx);
        const aboutKb = buildKeyboards(aboutMsg, 'about');
        return ctx.reply(aboutMsg.ABOUT_TEXT, { parse_mode: 'HTML', ...aboutKb });
        
      case 'clarification':
        const clarMsg = getMsg(ctx);
        const clarKb = buildKeyboards(clarMsg, 'main', { locale: getLocale(ctx.state.lang) });
        
        const clarificationResponse = {
          fr: `🤔 Je vois que tu fais référence à quelque chose.\n\nUtilise les boutons pour continuer 👇`,
          pt: `🤔 Vejo que você está fazendo referência a algo.\n\nUse os botões para continuar 👇`,
          en: `🤔 I see you're referring to something.\n\nUse the buttons to continue 👇`
        };
        
        return ctx.reply(
          clarificationResponse[ctx.state.lang] || clarificationResponse.pt,
          { parse_mode: 'HTML', ...clarKb }
        );
        
      case 'unknown':
      default:
        const unknownMsg = getMsg(ctx);
        const unknownKb = buildKeyboards(unknownMsg, 'main', { locale: getLocale(ctx.state.lang) });
        
        const unknownResponse = {
          fr: `😊 Je n'ai pas compris ton message, mais ce n'est pas grave !\n\nUtilise les boutons ci-dessous, c'est plus simple 👇`,
          pt: `😊 Não entendi sua mensagem, mas tudo bem!\n\nUse os botões abaixo, é mais fácil 👇`,
          en: `😊 I didn't understand your message, but that's okay!\n\nUse the buttons below, it's easier 👇`
        };
        
        return ctx.reply(
          unknownResponse[ctx.state.lang] || unknownResponse.pt,
          { parse_mode: 'HTML', ...unknownKb }
        );
    }
  } catch (error) {
    console.error('[BOT] Critical error:', error);
    
    const emergencyMsg = {
      fr: `😅 Oups, un petit bug ! Mais tout va bien.\n\nUtilise /start pour recommencer.`,
      pt: `😅 Ops, um pequeno erro! Mas está tudo bem.\n\nUse /start para recomeçar.`,
      en: `😅 Oops, a small bug! But everything's fine.\n\nUse /start to restart.`
    };
    
    const lang = ctx.state?.lang || 'pt';
    await ctx.reply(emergencyMsg[lang]);
  }
});

// ==================== FEEDBACK BUTTONS ====================

bot.action('feedback:correct', async (ctx) => {
  await ctx.answerCbQuery('👍 Merci !');
  
  if (ctx.session?.lastNLUIntent && ctx.state.user) {
    console.log('[FEEDBACK] 👍 Correct');
  }
});

bot.action('feedback:wrong', async (ctx) => {
  await ctx.answerCbQuery();
  
  if (ctx.session?.lastNLUIntent && ctx.state.user) {
    console.log('[FEEDBACK] 👎 Wrong');
  }
  
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  const kb = buildKeyboards(msg, 'main', { locale });
  
  const wrongMsg = {
    fr: `Désolé ! Qu'est-ce que tu voulais faire ?`,
    pt: `Desculpe! O que você queria fazer?`,
    en: `Sorry! What did you want to do?`
  };
  
  return ctx.reply(
    wrongMsg[ctx.state.lang] || wrongMsg.pt,
    { parse_mode: 'HTML', ...kb }
  );
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  console.error('[BOT] Error:', err);
  ctx.reply("❌ Une erreur est survenue.").catch(() => {});
});

// ==================== EXPORTS ====================

export { bot };