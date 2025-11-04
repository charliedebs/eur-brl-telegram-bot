import 'dotenv/config';
import express from 'express';
import { bot } from './bot/index.js';
import { startCronJobs } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';

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
  'TELEGRAM_WEBHOOK_DOMAIN': 'Bot will use polling mode (development)'
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

  // Determine overall status
  const allOk = Object.values(checks.services).every(s => s === 'ok');
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

let server;

app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);

  startCronJobs();

  if (process.env.NODE_ENV === 'production' && WEBHOOK_DOMAIN) {
    const webhookUrl = `${WEBHOOK_DOMAIN}/webhook/telegram`;
    await bot.telegram.setWebhook(webhookUrl);
    logger.info(`Webhook set to: ${webhookUrl}`);
  } else {
    logger.info('Development mode: using polling');
    bot.launch();
  }
}).then(s => { server = s; });

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

  // Stop bot
  try {
    await bot.stop(signal);
    logger.info('✅ Bot stopped');
  } catch (error) {
    logger.error('❌ Error stopping bot:', { error: error.message });
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