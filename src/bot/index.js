import { Telegraf, Markup, session } from 'telegraf';
import { messages } from './messages.js';
import { buildKeyboards } from './keyboards.js';
import { getRates, calculateOnChain, getLocale, formatAmount } from '../services/rates.js';
import { getWiseComparison } from '../services/wise.js';
import { AlertsService } from '../services/alerts.js';
import { DatabaseService } from '../services/database.js';
import { parseUserIntent } from '../services/nlu.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ✅ Activer les sessions AVANT tout le reste
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
  await next();
});

const getMsg = (ctx) => messages[ctx.state.lang || 'fr'];

function parseAmount(text) {
  if (!text) return null;
  const match = text.match(/[\d][\d.,]*/);
  if (!match) return null;
  const cleaned = match[0].replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return (isFinite(num) && num > 0) ? num : null;
}

function detectRoute(text) {
  const t = text.toLowerCase();
  const hasEUR = /eur|€|euro/.test(t);
  const hasBRL = /brl|r\$|real|reais/.test(t);
  if (hasEUR && hasBRL) {
    if (/(to|vers|para)\s*(brl|r\$)/.test(t)) return 'eurbrl';
    if (/(to|vers|para)\s*(eur|€)/.test(t)) return 'brleur';
  }
  return null;
}

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

// ==================== CALLBACKS ====================

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

// ==================== TEXT HANDLER WITH NLU ====================

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    const msg = getMsg(ctx);
    const locale = getLocale(ctx.state.lang);
    
    // Skip si commande
    if (text.startsWith('/')) return;
    
    // ✅ PRIORITÉ 1: Si on attend un montant spécifique
    if (ctx.session?.awaitingAmount) {
      const amount = parseAmount(text);
      if (amount) {
        await showComparison(ctx, ctx.session.awaitingAmount, amount);
        delete ctx.session.awaitingAmount;
      } else {
        await ctx.reply("⚠️ Montant invalide. Entre un nombre (ex. 1000)");
      }
      return;
    }
    
    // ✅ PRIORITÉ 2: Utiliser l'IA avec contexte
    console.log('[BOT] Analyzing with NLU:', text);
    
    // Initialise la session si nécessaire
    if (!ctx.session) {
      ctx.session = {};
    }
    if (!ctx.session.messageHistory) {
      ctx.session.messageHistory = [];
    }
    
    const context = {
      language: ctx.state.lang,
      history: ctx.session.messageHistory.slice(-3)
    };
    
    const intent = await parseUserIntent(text, context);
    console.log('[BOT] NLU result:', intent);
    
    // Sauvegarde dans l'historique
    ctx.session.messageHistory.push(text);
    if (ctx.session.messageHistory.length > 5) {
      ctx.session.messageHistory.shift();
    }
    
    // Traite selon l'intention
    switch (intent.intent) {
      case 'greeting':
        // Détecte et met à jour la langue si différente
        // Mais si c'est "hello/hi/hey" (universel), on garde la langue du profil
        const universalGreetings = ['hello', 'hi', 'hey'];
        const shouldUpdateLang = intent.entities.language 
          && intent.entities.language !== ctx.state.lang
          && !universalGreetings.includes(text.toLowerCase().trim());
        
        if (shouldUpdateLang) {
          await db.updateUser(ctx.from.id, { language: intent.entities.language });
          ctx.state.lang = intent.entities.language;
        }
        
        const greetingKb = buildKeyboards(messages[ctx.state.lang], 'lang_select');
        return ctx.reply(messages[ctx.state.lang].INTRO_TEXT, { parse_mode: 'HTML', ...greetingKb });
        
      case 'compare':
        // Cas 1: montant + route → affiche direct
        if (intent.entities.amount && intent.entities.route) {
          return showComparison(ctx, intent.entities.route, intent.entities.amount);
        }
        
        // Cas 2: juste montant → demande route
        if (intent.entities.amount) {
          const kb = buildKeyboards(msg, 'route_choice', { amount: intent.entities.amount, locale });
          return ctx.reply(msg.askRoute(intent.entities.amount, locale), { parse_mode: 'HTML', ...kb });
        }
        
        // Cas 3: juste route → demande montant en mode attente
        if (intent.entities.route) {
          ctx.session.awaitingAmount = intent.entities.route;
          const routeText = intent.entities.route === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
          return ctx.reply(`✏️ ${routeText}\n\nEntre un montant (ex. 1000)`);
        }
        
        // Cas 4: rien → menu principal
        const kb = buildKeyboards(msg, 'main', { locale });
        return ctx.reply(msg.promptAmt, { parse_mode: 'HTML', ...kb });
        
      case 'help':
        return ctx.reply(msg.ABOUT_TEXT, { parse_mode: 'HTML' });
        
      case 'about':
        const aboutKb = buildKeyboards(msg, 'about');
        return ctx.reply(msg.ABOUT_TEXT, { parse_mode: 'HTML', ...aboutKb });
        
      case 'unknown':
      default:
        // Fallback: essaie parsing manuel
        const amount = parseAmount(text);
        const route = detectRoute(text);
        
        if (amount && route) {
          return showComparison(ctx, route, amount);
        } else if (amount) {
          const kb = buildKeyboards(msg, 'route_choice', { amount, locale });
          return ctx.reply(msg.askRoute(amount, locale), { parse_mode: 'HTML', ...kb });
        } else {
          const kb = buildKeyboards(msg, 'main', { locale });
          return ctx.reply(msg.promptAmt, { parse_mode: 'HTML', ...kb });
        }
    }
  } catch (error) {
    console.error('[BOT] Error in text handler:', error);
    await ctx.reply("❌ Une erreur est survenue. Réessaie ou utilise /start");
  }
});

// Alerts
bot.action(/^alerts:start/, async (ctx) => {
  await ctx.reply("⏰ Créer une alerte\n\nDis-moi en une phrase (ex. 'Alerte EUR→BRL si > 6,20')");
  ctx.session.awaitingAlert = true;
  await ctx.answerCbQuery();
});

// Premium
bot.action(/^premium:open/, async (ctx) => {
  await ctx.reply("🚀 Premium\n\nPour aller plus loin...");
  await ctx.answerCbQuery();
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply("❌ Une erreur est survenue.").catch(() => {});
});

export { bot };