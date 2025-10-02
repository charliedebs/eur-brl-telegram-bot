import { Telegraf, Markup, session } from 'telegraf';
import { messages } from './messages.js';
import { buildKeyboards } from './keyboards.js';
import { updateNLUFeedback } from '../services/nlu-logger.js';
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
// ==================== TEXT HANDLER WITH NLU + CONFIRMATION + FEEDBACK ====================

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
      
      // Initialise la session si nécessaire
      if (!ctx.session) {
        ctx.session = {};
      }
      if (!ctx.session.messageHistory) {
        ctx.session.messageHistory = [];
      }
      
      // Context pour l'IA (avec userId pour logging)
      const context = {
        userId: ctx.state.user?.id,
        language: ctx.state.lang,
        history: ctx.session.messageHistory.slice(-3)
      };
      
      console.log('[BOT] 🤖 Analyzing:', text);
      
      // ✅ PRIORITÉ 2: Parse avec NLU (patterns + IA)
      let intent;
      let aiSuccess = false;
      
      try {
        const aiPromise = parseUserIntent(text, context);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI timeout')), 5000)
        );
        
        intent = await Promise.race([aiPromise, timeoutPromise]);
        aiSuccess = !intent.error;
        
        console.log('[BOT] ✅ Result:', intent);
      } catch (error) {
        console.warn('[BOT] ⚠️ NLU failed, using manual parsing:', error.message);
        
        const amount = parseAmount(text);
        const route = detectRoute(text);
        
        intent = {
          intent: amount || route ? 'compare' : 'unknown',
          entities: {
            amount,
            route,
            language: ctx.state.lang
          },
          confidence: amount ? 0.7 : 0.3,
          fallback: true
        };
      }
      
      // Sauvegarde message dans historique
      ctx.session.messageHistory.push(text);
      if (ctx.session.messageHistory.length > 5) {
        ctx.session.messageHistory.shift();
      }
      
      // Sauvegarde pour feedback
      ctx.session.lastMessage = text;
      ctx.session.lastIntent = intent.intent;
      
      // 🎯 Traite selon l'intention
      switch (intent.intent) {
        case 'greeting':
          // Changement de langue si détecté
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
          // 🌐 Changement de langue avec inertie
          let shouldSwitchLanguage = false;
          
          if (intent.entities.language && intent.entities.language !== ctx.state.lang) {
            const isFirstMessage = ctx.session.messageHistory.length <= 1;
            const isHighConfidence = intent.confidence >= 0.85;
            
            shouldSwitchLanguage = isFirstMessage || isHighConfidence;
            
            if (shouldSwitchLanguage) {
              console.log(`[BOT] 🌍 Language switch: ${ctx.state.lang} → ${intent.entities.language}`);
              await db.updateUser(ctx.from.id, { language: intent.entities.language });
              ctx.state.lang = intent.entities.language;
            } else {
              console.log(`[BOT] 🔒 Language switch blocked (low confidence: ${intent.confidence})`);
            }
          }
          
          const currentMsg = getMsg(ctx);
          const currentLocale = getLocale(ctx.state.lang);
          
          // 🔍 SI CONFIDENCE BASSE OU ROUTE MANQUANTE → CONFIRMATION
          if ((intent.confidence < 0.8 || !intent.entities.route) && intent.entities.amount) {
            const amount = intent.entities.amount;
            const kb = buildKeyboards(currentMsg, 'route_choice', { amount, locale: currentLocale });
            
            const confirmMessages = {
              fr: `Je veux être sûr de bien comprendre :\n\nTu veux faire quoi avec ${formatAmount(amount, 0, currentLocale)} ?`,
              pt: `Quero ter certeza de que entendi:\n\nO que você quer fazer com ${formatAmount(amount, 0, currentLocale)}?`,
              en: `I want to make sure I understand:\n\nWhat do you want to do with ${formatAmount(amount, 0, currentLocale)}?`
            };
            
            return ctx.reply(
              confirmMessages[ctx.state.lang] || confirmMessages.fr,
              { parse_mode: 'HTML', ...kb }
            );
          }
          
          // Cas 1: montant + route → affiche direct
          if (intent.entities.amount && intent.entities.route) {
            return showComparison(ctx, intent.entities.route, intent.entities.amount);
          }
          
          // Cas 2: juste montant → demande route
          if (intent.entities.amount) {
            const kb = buildKeyboards(currentMsg, 'route_choice', { amount: intent.entities.amount, locale: currentLocale });
            return ctx.reply(currentMsg.askRoute(intent.entities.amount, currentLocale), { parse_mode: 'HTML', ...kb });
          }
          
          // Cas 3: juste route → demande montant
          if (intent.entities.route) {
            ctx.session.awaitingAmount = intent.entities.route;
            const routeText = intent.entities.route === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
            return ctx.reply(`✏️ ${routeText}\n\n${currentMsg.askAmount || 'Enter amount (e.g. 1000)'}`, { parse_mode: 'HTML' });
          }
          
          // Cas 4: rien de clair → menu principal
          const kb = buildKeyboards(currentMsg, 'main', { locale: currentLocale });
          
          const fallbackMessages = {
            fr: `😊 Je n'ai pas bien compris, mais pas de souci !\n\n${currentMsg.promptAmt}`,
            pt: `😊 Não entendi bem, mas tudo bem!\n\n${currentMsg.promptAmt}`,
            en: `😊 I didn't quite understand, but no worries!\n\n${currentMsg.promptAmt}`
          };
          
          return ctx.reply(
            intent.fallback ? fallbackMessages[ctx.state.lang] : currentMsg.promptAmt,
            { parse_mode: 'HTML', ...kb }
          );
          
        case 'help':
          return ctx.reply(currentMsg.ABOUT_TEXT, { parse_mode: 'HTML' });
          
        case 'about':
          const aboutKb = buildKeyboards(currentMsg, 'about');
          return ctx.reply(currentMsg.ABOUT_TEXT, { parse_mode: 'HTML', ...aboutKb });
          
        case 'unknown':
        default:
          // Dernier fallback : parsing manuel
          const amount = parseAmount(text);
          const route = detectRoute(text);
          
          if (amount && route) {
            return showComparison(ctx, route, amount);
          } else if (amount) {
            const kb = buildKeyboards(msg, 'route_choice', { amount, locale });
            return ctx.reply(msg.askRoute(amount, locale), { parse_mode: 'HTML', ...kb });
          } else {
            const kb = buildKeyboards(msg, 'main', { locale });
            
            const unknownMessages = {
              fr: `😊 Je n'ai pas compris ton message, mais ce n'est pas grave !\n\nUtilise les boutons ci-dessous, c'est plus simple 👇`,
              pt: `😊 Não entendi sua mensagem, mas tudo bem!\n\nUse os botões abaixo, é mais fácil 👇`,
              en: `😊 I didn't understand your message, but that's okay!\n\nUse the buttons below, it's easier 👇`
            };
            
            return ctx.reply(
              unknownMessages[ctx.state.lang] || unknownMessages.fr,
              { parse_mode: 'HTML', ...kb }
            );
          }
      }
    } catch (error) {
      console.error('[BOT] 💥 Critical error:', error);
      
      const emergencyMessages = {
        fr: `😅 Oups, un petit bug ! Mais tout va bien.\n\nUtilise /start pour recommencer proprement.`,
        pt: `😅 Ops, um pequeno erro! Mas está tudo bem.\n\nUse /start para recomeçar corretamente.`,
        en: `😅 Oops, a small bug! But everything's fine.\n\nUse /start to restart properly.`
      };
      
      const lang = ctx.state?.lang || 'fr';
      await ctx.reply(emergencyMessages[lang]);
    }
  });
  
  // ==================== FEEDBACK BUTTONS ====================
  
  // Ajoute ces handlers pour les boutons de feedback
  bot.action('feedback:correct', async (ctx) => {
    await ctx.answerCbQuery('👍 Merci !');
    
    // Log feedback positif
    if (ctx.session?.lastMessage && ctx.state.user) {
      await updateNLUFeedback(
        ctx.state.user.id,
        ctx.session.lastMessage,
        'correct'
      );
    }
  });
  
  bot.action('feedback:wrong', async (ctx) => {
    await ctx.answerCbQuery();
    
    const msg = getMsg(ctx);
    const locale = getLocale(ctx.state.lang);
    
    // Log feedback négatif
    if (ctx.session?.lastMessage && ctx.state.user) {
      await updateNLUFeedback(
        ctx.state.user.id,
        ctx.session.lastMessage,
        'wrong'
      );
    }
    
    // Propose les bonnes options
    const wrongMessages = {
      fr: `Désolé ! Qu'est-ce que tu voulais faire ?`,
      pt: `Desculpe! O que você queria fazer?`,
      en: `Sorry! What did you want to do?`
    };
    
    const kb = buildKeyboards(msg, 'main', { locale });
    return ctx.editMessageText(
      wrongMessages[ctx.state.lang] || wrongMessages.fr,
      { parse_mode: 'HTML', ...kb }
    );
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