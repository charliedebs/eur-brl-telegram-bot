import { Telegraf } from 'telegraf';
import { messages } from './messages.js';
import { buildKeyboards } from './keyboards.js';
import { getRates, calculateOnChain, getLocale } from '../services/rates.js';
import { getWiseComparison } from '../services/wise.js';
import { AlertsService } from '../services/alerts.js';
import { DatabaseService } from '../services/database.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
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

// /start + greetings
const greetings = ['hi', 'hello', 'hey', 'bonjour', 'salut', 'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'];
bot.command('start', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'lang_select');
  await ctx.reply(msg.INTRO_TEXT, { parse_mode: 'HTML', ...kb });
});

bot.hears(greetings, async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'lang_select');
  await ctx.reply(msg.INTRO_TEXT, { parse_mode: 'HTML', ...kb });
});

// /help
bot.command('help', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.ABOUT_TEXT, { parse_mode: 'HTML' });
});

// ==================== CALLBACKS ====================

// Language selection
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

// About
bot.action('action:about', async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'about');
  await ctx.editMessageText(msg.ABOUT_TEXT, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Back to main
bot.action('action:back_main', async (ctx) => {
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  const kb = buildKeyboards(msg, 'main', { locale });
  await ctx.editMessageText(msg.promptAmt, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Route selection
bot.action(/^route:(eurbrl|brleur):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  await showComparison(ctx, route, amount);
  await ctx.answerCbQuery();
});

// Show comparison
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
    
    // Si pas de données Wise, on affiche "indisponible"
    const bestBank = wiseData?.providers?.[0] || null;
    const others = wiseData?.providers?.slice(1) || []; // Tous les autres pour passer à buildComparison
    
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
      bestBank, // peut être null
      others, // buildComparison prendra juste les 2 premiers
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

// Sources
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

// Calc details - nouveau handler
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
  
  // Stay off-chain - modifié pour passer providers
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
    
    // Passer les providers pour les boutons dynamiques
    const displayProviders = wiseData?.providers || [];
    const kb = buildKeyboards(msg, 'offchain', { route, amount, locale, providers: displayProviders });
    
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
    await ctx.answerCbQuery();
  });

// Continue on-chain
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

// Proof sources
bot.action(/^action:proof_sources/, async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'proof_sources');
  await ctx.editMessageText(msg.SOURCES_PROOF, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Exchanges screens
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

// Pedago screens
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

// Start guide
bot.action(/^action:start_guide:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  
  const kb = buildKeyboards(msg, 'guide_transition', { route, amount });
  await ctx.editMessageText(msg.GUIDE_TRANSITION, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

// Guide steps
bot.action(/^guide:step:(.+):(.+):(\d+)$/, async (ctx) => {
  const step = ctx.match[1];
  const route = ctx.match[2];
  const amount = parseFloat(ctx.match[3]);
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  let text = '';
  let kbType = '';
  
  // Fetch rates for calculations
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

// Why not exact
bot.action('action:why_not_exact', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.WHY_NOT_EXACT, { parse_mode: 'HTML' });
  await ctx.answerCbQuery();
});

// Market vs Limit
bot.action('action:market_vs_limit', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.MARKET_VS_LIMIT, { parse_mode: 'HTML' });
  await ctx.answerCbQuery();
});

// Change amount
bot.action(/^action:change_amount:(.+)$/, async (ctx) => {
  const route = ctx.match[1];
  const msg = getMsg(ctx);
  
  ctx.session = { awaitingAmount: route };
  await ctx.reply("✏️ Entre un montant (ex. 1000)");
  await ctx.answerCbQuery();
});

// Text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const msg = getMsg(ctx);
  const locale = getLocale(ctx.state.lang);
  
  // Handle amount input
  if (ctx.session?.awaitingAmount) {
    const amount = parseAmount(text);
    if (amount) {
      await showComparison(ctx, ctx.session.awaitingAmount, amount);
      ctx.session = {};
    } else {
      await ctx.reply("⚠️ Montant invalide.");
    }
    return;
  }
  
  // Auto-detect amount + route
  const amount = parseAmount(text);
  const route = detectRoute(text);
  
  if (amount && route) {
    await showComparison(ctx, route, amount);
  } else if (amount) {
    const kb = buildKeyboards(msg, 'route_choice', { amount, locale });
    await ctx.reply(msg.askRoute(amount, locale), { parse_mode: 'HTML', ...kb });
  } else {
    const kb = buildKeyboards(msg, 'main', { locale });
    await ctx.reply(msg.promptAmt, { parse_mode: 'HTML', ...kb });
  }
});

// Alerts (keeping existing logic)
bot.action(/^alerts:start/, async (ctx) => {
  await ctx.reply("⏰ Créer une alerte\n\nDis-moi en une phrase (ex. 'Alerte EUR→BRL si > 6,20')");
  ctx.session = { awaitingAlert: true };
  await ctx.answerCbQuery();
});

// Premium (keeping existing logic)
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