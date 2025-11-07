import 'dotenv/config';
import express from 'express';
import { bot } from './bot/index.js';
import { startCronJobs } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';

// Import WhatsApp bot (optional)
let whatsappBot = null;
let whatsappClient = null;

// ==========================================
// VALIDATE REQUIRED ENVIRONMENT VARIABLES
// ==========================================
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'OPENAI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => logger.error(`   - ${varName}`));
  logger.error('\n💡 Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

logger.info('✅ Environment variables validated');

// Optional variables (log warnings but don't exit)
const optionalVars = {
  'COINGECKO_API_KEY': 'CoinGecko will be used as fallback only',
  'WISE_API_TOKEN': 'Not needed - Wise API is public',
  'TELEGRAM_WEBHOOK_DOMAIN': 'Bot will use polling mode (development)',
  'WHATSAPP_ENABLED': 'WhatsApp bot will not start (Telegram only)'
};

Object.entries(optionalVars).forEach(([varName, note]) => {
  if (!process.env[varName]) {
    logger.info(`ℹ️  ${varName} not set - ${note}`);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.TELEGRAM_WEBHOOK_DOMAIN;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', bot: 'EUR/BRL Bot running' });
});

// Health check endpoint with detailed status
app.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      telegram: 'unknown',
      whatsapp: whatsappClient ? 'unknown' : 'disabled',
      server: 'ok'
    }
  };

  try {
    // Test database connection
    const { DatabaseService } = await import('./services/database.js');
    const db = new DatabaseService();
    await db.supabase.from('users').select('id').limit(1);
    checks.services.database = 'ok';
  } catch (error) {
    logger.error('[HEALTH] Database check failed:', { error: error.message });
    checks.services.database = 'error';
    checks.status = 'degraded';
  }

  try {
    // Test Telegram connection
    await bot.telegram.getMe();
    checks.services.telegram = 'ok';
  } catch (error) {
    logger.error('[HEALTH] Telegram check failed:', { error: error.message });
    checks.services.telegram = 'error';
    checks.status = 'degraded';
  }

  // Check WhatsApp if enabled
  if (whatsappClient) {
    try {
      const state = await whatsappClient.getState();
      checks.services.whatsapp = state === 'CONNECTED' ? 'ok' : state;
    } catch (error) {
      logger.error('[HEALTH] WhatsApp check failed:', { error: error.message });
      checks.services.whatsapp = 'error';
      checks.status = 'degraded';
    }
  }

  // Determine overall status (excluding disabled services)
  const allOk = Object.entries(checks.services)
    .filter(([_, status]) => status !== 'disabled')
    .every(([_, status]) => status === 'ok');
  if (!allOk) {
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(checks);
});

app.post('/webhook/telegram', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// ==========================================
// PAYMENT WEBHOOKS
// ==========================================

// Mercado Pago webhook
app.post('/webhook/mercadopago', async (req, res) => {
  try {
    // Import the whole module and access MercadoPago from default export
    const paymentsModule = await import('./services/payments/index.js');
    const MercadoPago = paymentsModule.default.MercadoPago;

    logger.info('[WEBHOOK] Mercado Pago notification received');

    const paymentInfo = await MercadoPago.processWebhook(req.body);

    if (paymentInfo && paymentInfo.approved) {
      // Activate premium for user with amount and payment_id
      const { activatePremium } = paymentsModule.default;
      await activatePremium(
        paymentInfo.telegram_id,
        paymentInfo.plan,
        paymentInfo.amount,
        paymentInfo.payment_id
      );

      // Notify user via bot (only if they've started the bot)
      try {
        // Get user's language preference
        const { DatabaseService } = await import('./services/database.js');
        const db = new DatabaseService();
        const user = await db.getUser(paymentInfo.telegram_id);
        const lang = user?.language || 'pt'; // Default to Portuguese for Brazilian payments

        // Multi-language confirmation messages
        const confirmationMessage = {
          pt: `🎉 <b>Pagamento aprovado!</b>\n\n` +
              `✅ Seu plano Premium foi ativado por ${paymentInfo.duration_days} dias.\n` +
              `💰 Valor: R$ ${paymentInfo.amount}\n\n` +
              `Agora você pode aproveitar todas as funcionalidades Premium! 🚀`,
          fr: `🎉 <b>Paiement approuvé!</b>\n\n` +
              `✅ Votre plan Premium a été activé pour ${paymentInfo.duration_days} jours.\n` +
              `💰 Montant: R$ ${paymentInfo.amount}\n\n` +
              `Vous pouvez maintenant profiter de toutes les fonctionnalités Premium! 🚀`,
          en: `🎉 <b>Payment approved!</b>\n\n` +
              `✅ Your Premium plan has been activated for ${paymentInfo.duration_days} days.\n` +
              `💰 Amount: R$ ${paymentInfo.amount}\n\n` +
              `You can now enjoy all Premium features! 🚀`
        };

        // Action buttons in user's language
        const actionButtons = {
          pt: {
            inline_keyboard: [[
              { text: '🔔 Criar Alerta', callback_data: 'alert:choose_pair' },
              { text: '💱 Conversão', callback_data: 'action:convert' }
            ], [
              { text: '📊 Ver Status Premium', callback_data: 'action:premium_status' }
            ]]
          },
          fr: {
            inline_keyboard: [[
              { text: '🔔 Créer Alerte', callback_data: 'alert:choose_pair' },
              { text: '💱 Conversion', callback_data: 'action:convert' }
            ], [
              { text: '📊 Voir Statut Premium', callback_data: 'action:premium_status' }
            ]]
          },
          en: {
            inline_keyboard: [[
              { text: '🔔 Create Alert', callback_data: 'alert:choose_pair' },
              { text: '💱 Conversion', callback_data: 'action:convert' }
            ], [
              { text: '📊 View Premium Status', callback_data: 'action:premium_status' }
            ]]
          }
        };

        await bot.telegram.sendMessage(
          paymentInfo.telegram_id,
          confirmationMessage[lang] || confirmationMessage.pt,
          {
            parse_mode: 'HTML',
            reply_markup: actionButtons[lang] || actionButtons.pt
          }
        );
      } catch (sendError) {
        // User hasn't started the bot yet - this is OK, they'll see Premium when they do
        logger.warn('[WEBHOOK] Could not send message to user (not started bot yet):', {
          telegram_id: paymentInfo.telegram_id
        });
      }

      logger.info('[WEBHOOK] Premium activated via Mercado Pago:', {
        telegram_id: paymentInfo.telegram_id,
        plan: paymentInfo.plan,
        amount: paymentInfo.amount
      });
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('[WEBHOOK] Mercado Pago error:', { error: error.message });
    res.sendStatus(500);
  }
});

// PayPal webhook
app.post('/webhook/paypal', async (req, res) => {
  try {
    const { PayPal } = await import('./services/payments/index.js');

    logger.info('[WEBHOOK] PayPal notification received');

    // Verify webhook signature for security
    const isValid = await PayPal.verifyWebhookSignature(req.headers, req.body);

    if (!isValid) {
      logger.warn('[WEBHOOK] Invalid PayPal webhook signature');
      return res.sendStatus(401);
    }

    const paymentInfo = await PayPal.processWebhook(req.body);

    if (paymentInfo && paymentInfo.approved) {
      // Activate premium for user
      const { activatePremium } = await import('./services/payments/index.js');
      const result = await activatePremium(paymentInfo.telegram_id, 'monthly'); // Extract plan from order

      // Notify user via bot
      await bot.telegram.sendMessage(
        paymentInfo.telegram_id,
        `🎉 Payment approved! Your Premium plan has been activated.`
      );

      logger.info('[WEBHOOK] Premium activated via PayPal:', {
        telegram_id: paymentInfo.telegram_id,
        order_id: paymentInfo.order_id
      });
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('[WEBHOOK] PayPal error:', { error: error.message });
    res.sendStatus(500);
  }
});

const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);

  startCronJobs();

  // Start Telegram bot
  if (process.env.NODE_ENV === 'production' && WEBHOOK_DOMAIN) {
    const webhookUrl = `${WEBHOOK_DOMAIN}/webhook/telegram`;
    await bot.telegram.setWebhook(webhookUrl);
    logger.info(`Webhook set to: ${webhookUrl}`);
  } else {
    logger.info('Development mode: using polling');
    bot.launch();
  }

  // Start WhatsApp bot if enabled
  if (process.env.WHATSAPP_ENABLED === 'true') {
    try {
      logger.info('[WHATSAPP] Starting WhatsApp bot...');
      const { createWhatsAppBot } = await import('./platforms/whatsapp/index.js');
      const whatsapp = await createWhatsAppBot();
      whatsappClient = whatsapp.client;
      whatsappBot = whatsapp.engine;
      logger.info('✅ WhatsApp bot initialized');
    } catch (error) {
      logger.error('[WHATSAPP] Failed to start WhatsApp bot:', {
        error: error.message,
        stack: error.stack
      });
      logger.info('ℹ️  Telegram bot will continue running');
    }
  } else {
    logger.info('ℹ️  WhatsApp bot disabled. Set WHATSAPP_ENABLED=true to enable.');
  }
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info(`\n${signal} received - starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });
  }

  // Stop Telegram bot
  try {
    await bot.stop(signal);
    logger.info('✅ Telegram bot stopped');
  } catch (error) {
    logger.error('❌ Error stopping Telegram bot:', { error: error.message });
  }

  // Stop WhatsApp bot if running
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
      logger.info('✅ WhatsApp bot stopped');
    } catch (error) {
      logger.error('❌ Error stopping WhatsApp bot:', { error: error.message });
    }
  }

  // Give pending operations time to complete
  logger.info('⏳ Waiting for pending operations (max 5s)...');
  setTimeout(() => {
    logger.info('👋 Shutdown complete');
    process.exit(0);
  }, 5000);
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));