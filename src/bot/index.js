import { Telegraf, Markup, session } from 'telegraf';
import { buildKeyboards } from './keyboards.js';
import { updateNLUFeedback } from '../services/nlu-logger.js';
import { getRates, calculateOnChain, getLocale, formatAmount, formatRate, calculateOnChainReverse } from '../services/rates.js';
import { getWiseComparison, getWiseComparisonReverse } from '../services/wise.js';
import { AlertsService } from '../services/alerts.js';
import { DatabaseService } from '../services/database.js';
import { parseUserIntent } from '../core/nlu.js';
import { messages } from './messages/messages-loader.js';

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

// Commande /lang (et alias /language)
bot.command(['lang', 'language'], async (ctx) => {
  const msg = messages.en; // On utilise EN par défaut pour le message de choix
  
  const text = `🌐 <b>Choose your language</b>
Escolha o idioma
Choisis ta langue`;
  
  const kb = buildKeyboards(msg, 'lang_select');
  
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
});




// ==================== /rate [amount] ====================
bot.command('rate', async (ctx) => {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  // Parse amount (default 1000)
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  const amount = args ? parseFloat(args.replace(/[^\d.]/g, '')) : 1000;
  
  if (!amount || !isFinite(amount)) {
    return ctx.reply(msg.ERROR_INVALID_AMOUNT);
  }
  
  const [rates, wiseData] = await Promise.all([
    getRates(),
    getWiseComparison('eurbrl', amount)
  ]);
  
  if (!rates) {
    return ctx.reply(msg.ERROR_RATES_UNAVAILABLE);
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
  
  const kb = Markup.inlineKeyboard([
    [
      Markup.button.callback(msg.btn.change, `action:change_amount:eurbrl`),
      Markup.button.callback(msg.btn.createAlert, 'alert:choose_pair')
    ]
  ]);
  
  await ctx.reply(text, { parse_mode: 'HTML', ...kb });
});


// ==================== /convert [amount] [currency?] ====================

bot.command('convert', async (ctx) => {
  // Parse arguments avec langue optionnelle
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim().toLowerCase();
  
  if (!args) {
    const msg = getMsg(ctx);
    ctx.session.awaitingConvertAmount = true;
    return ctx.reply(msg.CONVERT_ASK_AMOUNT || "💱 Quel montant veux-tu convertir?\n\nExemple: 253");
  }
  
  // Pattern: "253" ou "253 eur" ou "253 fr" ou "253 brl pt"
  const match = args.match(/^(\d+(?:[.,]\d+)?)\s*(eur|brl)?\s*(fr|pt|en)?$/);
  
  if (!match) {
    const msg = getMsg(ctx);
    return ctx.reply(msg.ERROR_INVALID_AMOUNT);
  }
  
  const amount = parseFloat(match[1].replace(',', '.'));
  const currency = match[2]; // peut être null
  const forcedLang = match[3]; // peut être null
  
  if (!amount || !isFinite(amount)) {
    const msg = getMsg(ctx);
    return ctx.reply(msg.ERROR_INVALID_AMOUNT);
  }
  
  // Appliquer langue forcée si présente
  if (forcedLang && ['fr', 'pt', 'en'].includes(forcedLang)) {
    if (forcedLang !== ctx.state.lang) {
      await db.updateUser(ctx.from.id, { language: forcedLang });
      ctx.state.lang = forcedLang;
    }
  }
  
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  // Déterminer route
  let route = null;
  if (currency === 'eur') {
    route = 'eurbrl';
  } else if (currency === 'brl') {
    route = 'brleur';
  }
  
  // Si pas de route détectée → demande
  if (!route) {
    ctx.session.awaitingConvertRoute = amount;
    const kb = buildKeyboards(msg, 'route_choice', { amount, locale });
    return ctx.reply(
      msg.askRoute(amount, locale),
      { parse_mode: 'HTML', ...kb }
    );
  }
  
  // Route détectée → affiche conversion
  ctx.session.lastRoute = route;
  ctx.session.lastAmount = amount;
  await showComparison(ctx, route, amount, false);
});


// ==================== /alert [params] ====================

// Helper function: Parse alert parameters
function parseAlertParams(args) {
  if (!args) return null;
  
  // Pattern 1: "6.30" → Absolu EUR→BRL
  const absoluteMatch = args.match(/^(\d+(?:[.,]\d+)?)$/);
  if (absoluteMatch) {
    return { 
      pair: 'eurbrl', 
      type: 'absolute', 
      value: parseFloat(absoluteMatch[1].replace(',', '.'))
    };
  }
  
  // Pattern 2: "+3%" ou "3%" → Relatif EUR→BRL
  const relativeMatch = args.match(/^\+?(\d+(?:[.,]\d+)?)%?$/);
  if (relativeMatch) {
    return { 
      pair: 'eurbrl', 
      type: 'relative', 
      value: parseFloat(relativeMatch[1].replace(',', '.')),
      refType: 'avg30d'
    };
  }
  
  // Pattern 3: "brl 0.165" → Absolu BRL→EUR
  const brlAbsoluteMatch = args.match(/^brl\s+(\d+(?:[.,]\d+)?)$/i);
  if (brlAbsoluteMatch) {
    return { 
      pair: 'brleur', 
      type: 'absolute', 
      value: parseFloat(brlAbsoluteMatch[1].replace(',', '.'))
    };
  }
  
  // Pattern 4: "brl +5%" → Relatif BRL→EUR
  const brlRelativeMatch = args.match(/^brl\s+\+?(\d+(?:[.,]\d+)?)%?$/i);
  if (brlRelativeMatch) {
    return { 
      pair: 'brleur', 
      type: 'relative', 
      value: parseFloat(brlRelativeMatch[1].replace(',', '.')),
      refType: 'avg30d'
    };
  }
  
  return null;
}

bot.command('alert', async (ctx) => {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const isPremium = await db.isPremium(ctx.from.id);
  
  if (!isPremium) {
    const kb = buildKeyboards(msg, 'not_premium');
    return ctx.reply(msg.NOT_PREMIUM, { parse_mode: 'HTML', ...kb });
  }
  
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  
  // Pas de paramètre → redirige vers flow complet
  if (!args) {
    if (ctx.chat.type === 'private') {
      // Lance flow création
      const kb = buildKeyboards(msg, 'alert_choose_pair');
      return ctx.reply(msg.ALERT_CHOOSE_PAIR, { parse_mode: 'HTML', ...kb });
    } else {
      // Dans groupe → deep link vers privé
      const deepLinkUrl = `https://t.me/${ctx.botInfo.username}?start=alert`;
      const kb = Markup.inlineKeyboard([
        [Markup.button.url(msg.btn.createAlert, deepLinkUrl)]
      ]);
      
      return ctx.reply(
        msg.ALERT_DEEPLINK_GROUP,
        { parse_mode: 'HTML', ...kb }
      );
    }
  }
  
  // Avec paramètre → parse et crée
  const parsed = parseAlertParams(args);
  
  if (!parsed) {
    return ctx.reply(msg.ALERT_INVALID_SYNTAX);
  }
  
  // Créer l'alerte
  const user = await db.getUser(ctx.from.id);
  
  const alertData = {
    pair: parsed.pair,
    threshold_type: parsed.type,
    threshold_value: parsed.value,
    reference_type: parsed.refType || null,
    cooldown_minutes: 60 // Default 1h
  };
  
  const alert = await db.createAlert(user.id, alertData);
  
  if (!alert) {
    return ctx.reply(msg.ERROR_UPDATE_FAILED);
  }
  
  // Calculer infos pour affichage
  const rates = await getRates();
  const currentRate = parsed.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
  
  let refValue = null;
  let calculatedThreshold;
  
  if (parsed.type === 'absolute') {
    calculatedThreshold = parsed.value;
  } else {
    refValue = await db.getAverage30Days(parsed.pair);
    calculatedThreshold = refValue * (1 + parsed.value / 100);
  }
  
  // Message de confirmation
  const confirmMsg = msg.ALERT_CREATED_QUICK(alert, currentRate, refValue, calculatedThreshold, locale);
  
  // En privé
  if (ctx.chat.type === 'private') {
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback(msg.btn.myAlerts, 'alert:list')],
      [Markup.button.callback('➕ ' + msg.btn.createAlert, 'alert:choose_pair')]
    ]);
    
    return ctx.reply(confirmMsg, { parse_mode: 'HTML', ...kb });
  }
  
  // Dans groupe : message public + privé
  const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
  await ctx.reply(`✅ ${username} alert created (check private chat)`);
  
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(msg.btn.myAlerts, 'alert:list')],
    [Markup.button.callback('➕ ' + msg.btn.createAlert, 'alert:choose_pair')]
  ]);
  
  try {
    await ctx.telegram.sendMessage(ctx.from.id, confirmMsg, { parse_mode: 'HTML', ...kb });
  } catch (error) {
    console.error('[ALERT] Cannot send private message:', error);
    // User n'a pas démarré le bot en privé
    await ctx.reply(
      `⚠️ ${username} I couldn't send you a private message. Please start a chat with me first: https://t.me/${ctx.botInfo.username}`
    );
  }
});

// ==================== /alerts (liste) ====================
// Note: Remplace la commande /alerts existante dans ton code
bot.command('alerts', async (ctx) => {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  const isPremium = await db.isPremium(ctx.from.id);
  
  if (!isPremium) {
    const kb = buildKeyboards(msg, 'not_premium');
    return ctx.reply(msg.NOT_PREMIUM_ALERTS, { parse_mode: 'HTML', ...kb });
  }
  
  const userAlerts = await db.getUserAlerts(ctx.from.id);
  
  // Dans groupe : affichage public simplifié
  if (ctx.chat.type !== 'private') {
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    
    if (userAlerts.length === 0) {
      return ctx.reply(`🔔 ${username} has no active alerts\n\n💡 Use /alert to create one!`);
    }
    
    let text = `🔔 <b>${username}'s alerts</b>\n\n`;
    
    userAlerts.forEach((alert, index) => {
      const pairText = alert.pair === 'eurbrl' ? 'EUR→BRL' : 'BRL→EUR';
      
      let threshold;
      if (alert.threshold_type === 'absolute') {
        threshold = `≥ ${formatRate(alert.threshold_value, locale)}`;
      } else {
        threshold = `+${formatAmount(alert.threshold_value, 1, locale)}%`;
      }
      
      text += `${index + 1}. ${pairText} ${threshold}\n`;
    });
    
    text += `\n💡 Use /alert to create yours!`;
    
    return ctx.reply(text, { parse_mode: 'HTML' });
  }
  
  // En privé : affichage complet avec gestion
  const kb = buildKeyboards(msg, 'alerts_list', { alerts: userAlerts });
  await ctx.reply(msg.ALERTS_LIST(userAlerts, locale), { parse_mode: 'HTML', ...kb });
});

// ==================== /sources ====================
bot.command('sources', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'sources');
  await ctx.reply(msg.SOURCES_TEXT, { parse_mode: 'HTML', ...kb });
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

  // Par défaut : mode "send" (classique)
  await showComparison(ctx, route, amount, false);
  await ctx.answerCbQuery();
});

async function showComparison(ctx, route, amount, isTargetMode = false) {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  // Sauvegarder dans session
  ctx.session.lastRoute = route;
  ctx.session.lastAmount = amount;
  ctx.session.lastIsTargetMode = isTargetMode;
  
  const [rates, wiseData] = await Promise.all([
    getRates(),
    getWiseComparison(route, amount)
  ]);
  
  if (!rates) {
    await ctx.reply("⚠️ Taux crypto indisponibles. Réessaie dans un instant.");
    return;
  }
  
  let onchain, bestBank, others;
  
  if (isTargetMode) {
    // Mode inversé : calculer montant source nécessaire
    onchain = calculateOnChainReverse(route, amount, rates);
    // Pour Wise : on passe amountToReceive en target
    const wiseDataReverse = await getWiseComparisonReverse(route, amount);
    bestBank = wiseDataReverse?.providers?.[0] || null;
    others = wiseDataReverse?.providers?.slice(1) || [];
  } else {
    // Mode classique
    onchain = calculateOnChain(route, amount, rates);
    bestBank = wiseData?.providers?.[0] || null;
    others = wiseData?.providers?.slice(1) || [];
  }
  
  let delta = null;
  let winner = 'on-chain';
  
  if (bestBank) {
    if (isTargetMode) {
      // Comparer montants source (celui qui demande le moins de source = meilleur)
      delta = ((bestBank.in - onchain.in) / bestBank.in) * 100;
      winner = delta <= 0 ? 'on-chain' : bestBank.provider;
    } else {
      // Mode classique
      delta = ((onchain.out - bestBank.out) / bestBank.out) * 100;
      winner = delta >= 0 ? 'on-chain' : bestBank.provider;
    }
  }

  ctx.session.lastComparison = {
    route,
    amount,
    isTargetMode,
    onchain: isTargetMode ? onchain.in : onchain.out,
    bestBank: bestBank ? (isTargetMode ? bestBank.in : bestBank.out) : null,
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
    locale,
    isTargetMode
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
  
  // ⚠️ NOUVEAU : Calculer montant on-chain pour comparaison
  const onchain = calculateOnChain(route, amount, rates);
  
  const text = msg.buildOffChain({
    route,
    amount,
    bestBank,
    others,
    locale,
    onchainAmount: onchain.out // ← NOUVEAU paramètre
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


// ==========================================
// HANDLERS FAQ (Section 4)
// ==========================================

// Handler : Menu FAQ
bot.action('action:faq_menu', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'faq_menu', { 
    route: ctx.session?.lastRoute || 'eurbrl', 
    amount: ctx.session?.lastAmount || 1000 
  });
  
  await ctx.editMessageText(msg.FAQ_MENU, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Handler : Pourquoi on-chain
bot.action('action:faq_why_onchain', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'faq_why_onchain');
  
  await ctx.editMessageText(msg.FAQ_WHY_ONCHAIN, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Handler : Formulaire question
bot.action('action:faq_send_question', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'faq_send_question');
  
  ctx.session.awaitingFaqQuestion = true;
  
  await ctx.editMessageText(msg.FAQ_SEND_QUESTION, { parse_mode: 'HTML', ...kb });
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

bot.action(/^action:swap_mode:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  
  // Inverser le mode : si on était en mode "send", passer en "target" et vice-versa
  const currentMode = ctx.session.lastIsTargetMode || false;
  await showComparison(ctx, route, amount, !currentMode);
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
  
  const rates = await getRates();
  const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
  
  let refValue;
  
  // 🔥 TÂCHE 5.1 : Si "current", figer comme absolu
  if (refType === 'current') {
    // On fige le taux actuel → devient un seuil absolu déguisé
    ctx.session.alertDraft = { 
      pair, 
      refType: 'current',
      refValue: currentRate,
      isFrozenCurrent: true  // Flag pour savoir qu'on convertit en absolu
    };
    
    const kb = buildKeyboards(msg, 'alert_choose_percent', { pair, refType });
    
    await ctx.editMessageText(
      msg.ALERT_CHOOSE_PERCENT(pair, refType, currentRate, locale),
      { parse_mode: 'HTML', ...kb }
    );
    await ctx.answerCbQuery();
    return;
  }
  
  // Autres références : comportement normal
  if (refType === 'avg7d') {
    refValue = await db.getAverage(pair, 7) || currentRate;
  } else if (refType === 'avg30d') {
    refValue = await db.getAverage30Days(pair) || currentRate;
  } else if (refType === 'avg90d') {
    refValue = await db.getAverage(pair, 90) || currentRate;
  }
  
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
  
  const parts = shortcode.split('-');
  
  if (parts.length < 4) {
    console.error('[ALERT] Invalid shortcode:', shortcode);
    await ctx.answerCbQuery('❌ Erreur');
    return ctx.reply('❌ Erreur de décodage. Réessaie.');
  }
  
  let alertData = {
    threshold_type: parts[0] === 'rel' ? 'relative' : 'absolute',
    threshold_value: parseFloat(parts[1]),
    reference_type: parts[2] === 'null' ? null : parts[2],
    pair: parts[3],
    cooldown_minutes: cooldown
  };
  
  // 🔥 TÂCHE 5.1 : Si reference_type = 'current' ET relatif, convertir en absolu
  if (alertData.threshold_type === 'relative' && alertData.reference_type === 'current') {
    const rates = await getRates();
    const currentRate = alertData.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
    const absoluteThreshold = currentRate * (1 + alertData.threshold_value / 100);
    
    // Convertir en absolu
    alertData = {
      threshold_type: 'absolute',
      threshold_value: absoluteThreshold,
      reference_type: null,
      pair: alertData.pair,
      cooldown_minutes: cooldown
    };
    
    console.log(`[ALERT] Converted 'current' relative to absolute: ${absoluteThreshold.toFixed(4)}`);
  }
  
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
    if (alertData.reference_type === 'avg7d') {
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
  
  // 🔥 TÂCHE 5.3 : Nouveau keyboard avec [Mes alertes]
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Mes alertes', 'alert:list')],
    [Markup.button.callback('➕ Créer une autre alerte', 'alert:choose_pair')],
    [Markup.button.callback(msg.btn.back, 'action:back_main')]
  ]);
  
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
    
    // Récupérer taux et calculer seuil
    const rates = await getRates();
    const currentRate = alert.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
    
    let refValue;
    let calculatedThreshold;
    
    if (alert.threshold_type === 'absolute') {
      calculatedThreshold = alert.threshold_value;
      refValue = null;
    } else {
      if (alert.reference_type === 'current') {
        refValue = currentRate;
      } else if (alert.reference_type === 'avg7d') {
        refValue = await db.getAverage(alert.pair, 7);
      } else if (alert.reference_type === 'avg30d') {
        refValue = await db.getAverage30Days(alert.pair);
      } else if (alert.reference_type === 'avg90d') {
        refValue = await db.getAverage(alert.pair, 90);
      }
      calculatedThreshold = refValue * (1 + alert.threshold_value / 100);
    }
    
    const text = msg.ALERT_VIEW_DETAILS(alert, currentRate, refValue, calculatedThreshold, locale);
    
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('✏️ Nommer', `alert:rename:${alertId}`)],
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

// NOUVEAU: Handler pour déclencher le nommage
bot.action(/^alert:rename:(.+)$/, async (ctx) => {
  const alertId = ctx.match[1];
  const msg = getMsg(ctx);
  
  ctx.session.awaitingAlertName = { alertId };
  
  await ctx.answerCbQuery();
  await ctx.editMessageText(msg.ALERT_NAME_PROMPT, { parse_mode: 'HTML' });
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


// ==================== INLINE MODE ====================
// Ajouter avant bot.on('text', ...)

bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim().toLowerCase();
  
  if (!query) {
    // Query vide → placeholder uniquement
    return ctx.answerInlineQuery([], {
      switch_pm_text: "💱 Convertir EUR ↔ BRL",
      switch_pm_parameter: "inline_help",
      cache_time: 1
    });
  }
  
  // Parse query avec langue optionnelle: "253" ou "253 eur" ou "1500 brl pt" ou "253 fr"
  const match = query.match(/^(\d+(?:[.,]\d+)?)\s*(eur|brl)?\s*(fr|pt|en)?$/);
  
  if (!match) {
    return ctx.answerInlineQuery([], {
      switch_pm_text: "💱 Format: montant [eur/brl] [fr/pt/en]",
      switch_pm_parameter: "inline_help",
      cache_time: 1
    });
  }
  
  const amount = parseFloat(match[1].replace(',', '.'));
  const currency = match[2]; // peut être null
  const forcedLang = match[3]; // peut être null
  
  if (!amount || !isFinite(amount) || amount <= 0) {
    return ctx.answerInlineQuery([], {
      switch_pm_text: "💱 Entre un montant valide (ex: 253)",
      switch_pm_parameter: "inline_help",
      cache_time: 1
    });
  }
  
  // Déterminer route
  let route = 'eurbrl'; // Défaut EUR→BRL
  if (currency === 'brl') {
    route = 'brleur';
  }
  
  // Déterminer langue (hybrid)
  let lang = forcedLang; // Priorité à la langue forcée
  
  if (!lang) {
    // Tenter DB
    try {
      const user = await db.getUser(ctx.from.id);
      if (user) {
        lang = user.language;
      }
    } catch (error) {
      console.log('[INLINE] User not in DB');
    }
  }
  
  if (!lang && ctx.from?.language_code) {
    // Détection auto
    const code = ctx.from.language_code;
    lang = code.startsWith('fr') ? 'fr' : 
           code.startsWith('pt') ? 'pt' : 'en';
  }
  
  lang = lang || 'en'; // Fallback anglais
  
  try {
    // Récupérer les taux
    const [rates, wiseData] = await Promise.all([
      getRates(),
      getWiseComparison(route, amount)
    ]);
    
    if (!rates) {
      return ctx.answerInlineQuery([], {
        switch_pm_text: "⚠️ Taux indisponibles",
        switch_pm_parameter: "inline_error",
        cache_time: 1
      });
    }
    
    const onchain = calculateOnChain(route, amount, rates);
    const bestBank = wiseData?.providers?.[0] || null;
    
    const locale = getLocale(lang);
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
    const tzAbbr = new Date().toLocaleTimeString('en-US', {timeZoneName: 'short'}).split(' ')[2];
    
    const crossRate = route === 'eurbrl' ? rates.cross : 1 / rates.cross;
    const pairDisplay = route === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    
    // Messages multilingues pour inline
    const msgs = messages[lang];
    
    // Formater le résultat
    let resultText = `💱 <b>${pairDisplay}</b>\n\n`;
    resultText += `📊 ${msgs.RATE_LABEL || 'Taux'}: ${formatRate(crossRate, locale)}\n\n`;
    
    if (route === 'eurbrl') {
      resultText += `🌍 <b>On-chain</b>\n€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(onchain.out, 0, locale)}\n\n`;
      
      if (bestBank) {
        resultText += `🏦 <b>Wise</b>\n€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(bestBank.out, 0, locale)}\n\n`;
        
        const delta = ((onchain.out - bestBank.out) / bestBank.out) * 100;
        const deltaLabel = msgs.BETTER_BY || 'meilleur de';
        if (delta >= 0) {
          resultText += `💰 On-chain ${deltaLabel} ${formatAmount(Math.abs(delta), 1, locale)}%\n\n`;
        } else {
          resultText += `🏦 Wise ${deltaLabel} ${formatAmount(Math.abs(delta), 1, locale)}%\n\n`;
        }
      }
    } else {
      resultText += `🌍 <b>On-chain</b>\nR$ ${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 0, locale)}\n\n`;
      
      if (bestBank) {
        resultText += `🏦 <b>Wise</b>\nR$ ${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 0, locale)}\n\n`;
        
        const delta = ((onchain.out - bestBank.out) / bestBank.out) * 100;
        const deltaLabel = msgs.BETTER_BY || 'meilleur de';
        if (delta >= 0) {
          resultText += `💰 On-chain ${deltaLabel} ${formatAmount(Math.abs(delta), 1, locale)}%\n\n`;
        } else {
          resultText += `🏦 Wise ${deltaLabel} ${formatAmount(Math.abs(delta), 1, locale)}%\n\n`;
        }
      }
    }
    
    resultText += `⏰ ${timeStr} ${tzAbbr}`;
    
    // Créer le résultat inline
    const result = {
      type: 'article',
      id: `convert_${route}_${amount}_${Date.now()}`,
      title: `${route === 'eurbrl' ? '€' : 'R$'}${formatAmount(amount, 0, locale)} → ${route === 'eurbrl' ? 'BRL' : 'EUR'}`,
      description: `On-chain: ${route === 'eurbrl' ? 'R$' : '€'}${formatAmount(onchain.out, 0, locale)}${bestBank ? ` • Wise: ${route === 'eurbrl' ? 'R$' : '€'}${formatAmount(bestBank.out, 0, locale)}` : ''}`,
      input_message_content: {
        message_text: resultText,
        parse_mode: 'HTML'
      }
    };
    
    await ctx.answerInlineQuery([result], {
      cache_time: 60, // Cache 1min (taux changent)
      is_personal: false
    });
    
  } catch (error) {
    console.error('[INLINE] Error:', error);
    return ctx.answerInlineQuery([], {
      switch_pm_text: "❌ Erreur temporaire",
      switch_pm_parameter: "inline_error",
      cache_time: 1
    });
  }
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
        const isTargetMode = ctx.session.targetMode || false;
        await showComparison(ctx, ctx.session.awaitingAmount, amount, isTargetMode);
        delete ctx.session.awaitingAmount;
        delete ctx.session.targetMode;
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
    
// Nommer une alerte
if (ctx.session?.awaitingAlertName) {
  const { alertId } = ctx.session.awaitingAlertName;
  const msg = getMsg(ctx);
  const text = ctx.message.text.trim();
  
  // Annuler
  if (text.toLowerCase() === 'annuler' || text.toLowerCase() === 'cancelar' || text.toLowerCase() === 'cancel') {
    delete ctx.session.awaitingAlertName;
    return ctx.reply(msg.ALERT_NAME_CANCELLED, { parse_mode: 'HTML' });
  }
  
  // Validation longueur
  if (text.length > 50) {
    return ctx.reply(msg.ALERT_NAME_TOO_LONG, { parse_mode: 'HTML' });
  }
  
  // Mettre à jour le nom
  const { error } = await db.supabase
    .from('user_alerts')
    .update({ name: text })
    .eq('id', alertId);
  
  if (error) {
    console.error('[ALERT-RENAME] Error:', error);
    return ctx.reply('❌ Erreur lors de la mise à jour.');
  }
  
  delete ctx.session.awaitingAlertName;
  
  await ctx.reply(msg.ALERT_NAME_SET(text), { parse_mode: 'HTML' });
  
  // Retour à la liste
  const userAlerts = await db.getUserAlerts(ctx.from.id);
  const locale = getLocale(ctx.state.lang);
  const kb = buildKeyboards(msg, 'alerts_list', { alerts: userAlerts });
  
  return ctx.reply(msg.ALERTS_LIST(userAlerts, locale), { parse_mode: 'HTML', ...kb });
}

// PRIORITÉ 3: Question FAQ
if (ctx.session?.awaitingFaqQuestion) {
  const question = ctx.message.text.trim();
  const userId = ctx.from.id;
  const username = ctx.from.username || 'unknown';
  const userLang = ctx.state.lang;
  
  // Log la question dans la console (ou DB si tu veux)
  console.log('[FAQ-QUESTION] User:', userId, username);
  console.log('[FAQ-QUESTION] Lang:', userLang);
  console.log('[FAQ-QUESTION] Question:', question);
  
  // TODO: Envoyer notification à toi (admin)
  // Exemple: await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, `❓ Question de @${username}:\n\n${question}`);
  
  delete ctx.session.awaitingFaqQuestion;
  
  const msg = getMsg(ctx);
  return ctx.reply(msg.FAQ_QUESTION_RECEIVED, { parse_mode: 'HTML' });
}


// NOUVEAU: Montant pour /convert
if (ctx.session?.awaitingConvertAmount) {
  const amount = parseFloat(text.replace(/[^\d.]/g, ''));
  if (amount && isFinite(amount)) {
    delete ctx.session.awaitingConvertAmount;
    ctx.session.awaitingConvertRoute = amount;
    const kb = buildKeyboards(msg, 'route_choice', { amount, locale });
    return ctx.reply(msg.askRoute(amount, locale), { parse_mode: 'HTML', ...kb });
  } else {
    return ctx.reply("⚠️ Montant invalide. Entre un nombre (ex. 1000)");
  }
}

// NOUVEAU: Route pour /convert
if (ctx.session?.awaitingConvertRoute) {
  const amount = ctx.session.awaitingConvertRoute;
  const routeDetected = text.toLowerCase().includes('brl') ? 'brleur' : 'eurbrl';
  delete ctx.session.awaitingConvertRoute;
  ctx.session.lastRoute = routeDetected;
  ctx.session.lastAmount = amount;
  return showComparison(ctx, routeDetected, amount, false);
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
          
          // Détecter si c'est un mode "target" (recevoir plutôt qu'envoyer)
          const textLower = text.toLowerCase();
          const targetKeywords = ['recevoir', 'receber', 'receive', 'receiving', 'obter', 'obtenir', 'get'];
          const isTargetMode = targetKeywords.some(keyword => textLower.includes(keyword));
          
          if (intent.entities.amount && intent.entities.route) {
            ctx.session.lastRoute = intent.entities.route;
            ctx.session.lastAmount = intent.entities.amount;
            return showComparison(ctx, intent.entities.route, intent.entities.amount, isTargetMode);
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