import { Telegraf, Markup } from 'telegraf';
import { messages } from './messages.js';
import { buildKeyboards } from './keyboards.js';
import { getRates, calculateOnChain } from '../services/rates.js';
import { getWiseComparison, getWiseFallback } from '../services/wise.js';
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

// Commands
bot.command('start', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.INTRO_TEXT, Markup.inlineKeyboard([
    [Markup.button.callback('🇫🇷 Français', 'lang:fr'), Markup.button.callback('🇧🇷 Português', 'lang:pt'), Markup.button.callback('🇬🇧 English', 'lang:en')],
  ]));
});

bot.command('help', async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.HELP_FAQ, Markup.inlineKeyboard([[Markup.button.callback(msg.btn.back, 'action:back_main')]]));
});

// Callbacks
bot.action(/^lang:(.+)$/, async (ctx) => {
  const lang = ctx.match[1];
  await db.updateUser(ctx.from.id, { language: lang });
  ctx.state.lang = lang;
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'main');
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
  const [rates, wiseData] = await Promise.all([getRates(), getWiseComparison(route, amount)]);
  
  if (!rates) {
    await ctx.reply(msg.errorRates);
    return;
  }
  
  const onchain = calculateOnChain(route, amount, rates);
  const bestBank = wiseData?.providers?.[0] || getWiseFallback(route, amount, rates.cross).providers[0];
  const delta = ((onchain.out - bestBank.out) / bestBank.out) * 100;
  const winner = delta >= 0 ? 'on-chain' : bestBank.provider;
  
  const text = msg.buildComparison({ route, amount, rates, onchain, bestBank, others: wiseData?.providers?.slice(1, 3) || [], delta, winner });
  const kb = buildKeyboards(msg, 'comparison', { route, amount });
  
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', ...kb });
  }
}

bot.action(/^mode:onchain:(.+):(\d+)$/, async (ctx) => {
  const route = ctx.match[1];
  const amount = parseFloat(ctx.match[2]);
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'onchain', { route, amount });
  await ctx.editMessageText(msg.onchainIntro, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^alerts:start/, async (ctx) => {
  const msg = getMsg(ctx);
  await ctx.reply(msg.alertsPrompt);
  ctx.session = { awaitingAlert: true };
  await ctx.answerCbQuery();
});

bot.action(/^alerts:list/, async (ctx) => {
  const msg = getMsg(ctx);
  const userAlerts = await alerts.getUserAlerts(ctx.from.id);
  const text = userAlerts.length > 0 ? msg.alertsList(userAlerts) : msg.alertsEmpty;
  const kb = buildKeyboards(msg, 'alerts_list', { alerts: userAlerts });
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^alerts:disable:(.+)$/, async (ctx) => {
  await alerts.disableAlert(ctx.match[1]);
  const msg = getMsg(ctx);
  await ctx.reply(msg.alertDisabled);
  await ctx.answerCbQuery();
});

bot.action(/^premium:open/, async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'premium');
  await ctx.editMessageText(msg.premiumInfo, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^premium:interest/, async (ctx) => {
  await db.updateUser(ctx.from.id, { premium_interest: true });
  const msg = getMsg(ctx);
  await ctx.reply(msg.premiumThanks);
  await ctx.answerCbQuery();
});

bot.action(/^action:back_main/, async (ctx) => {
  const msg = getMsg(ctx);
  const kb = buildKeyboards(msg, 'main');
  await ctx.editMessageText(msg.promptAmt, { parse_mode: 'HTML', ...kb });
  await ctx.answerCbQuery();
});

bot.action(/^action:change_amount:(.+)$/, async (ctx) => {
  const msg = getMsg(ctx);
  ctx.session = { awaitingAmount: ctx.match[1] };
  await ctx.reply(msg.askAmount);
  await ctx.answerCbQuery();
});

// Text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const msg = getMsg(ctx);
  
  if (ctx.session?.awaitingAlert) {
    const parsed = alerts.parseAlertText(text);
    if (parsed) {
      await alerts.createAlert(ctx.from.id, parsed);
      await ctx.reply(msg.alertCreated(parsed));
      ctx.session = {};
    } else {
      await ctx.reply(msg.alertParseError);
    }
    return;
  }
  
  if (ctx.session?.awaitingAmount) {
    const amount = parseAmount(text);
    if (amount) {
      await showComparison(ctx, ctx.session.awaitingAmount, amount);
      ctx.session = {};
    } else {
      await ctx.reply(msg.invalidAmount);
    }
    return;
  }
  
  const amount = parseAmount(text);
  const route = detectRoute(text);
  
  if (amount && route) {
    await showComparison(ctx, route, amount);
  } else if (amount) {
    const kb = buildKeyboards(msg, 'route_choice', { amount });
    await ctx.reply(msg.askRoute(amount), kb);
  } else {
    const kb = buildKeyboards(msg, 'main');
    await ctx.reply(msg.promptAmt, { parse_mode: 'HTML', ...kb });
  }
});

// Alerts background job (every 5 minutes)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    const rates = await getRates();
    if (!rates) return;
    const triggered = await alerts.checkAlerts(rates);
    for (const alert of triggered) {
      const user = await db.getUser(alert.user_id);
      const lang = user?.language || 'fr';
      const msg = messages[lang];
      try {
        await bot.telegram.sendMessage(alert.telegram_id, msg.alertTriggered(alert, rates));
      } catch (err) {
        console.error('Failed to send alert:', err);
      }
    }
  }, 5 * 60 * 1000);
}

bot.catch((err) => {
  console.error('Bot error:', err);
});

export { bot };