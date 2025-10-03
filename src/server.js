import 'dotenv/config';
import express from 'express';
import { bot } from './bot/index.js';
import { startCronJobs } from './jobs/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.TELEGRAM_WEBHOOK_DOMAIN;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', bot: 'EUR/BRL Bot running' });
});

app.post('/webhook/telegram', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  startCronJobs();

  if (process.env.NODE_ENV === 'production' && WEBHOOK_DOMAIN) {
    const webhookUrl = `${WEBHOOK_DOMAIN}/webhook/telegram`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`Webhook set to: ${webhookUrl}`);
  } else {
    console.log('Development mode: using polling');
    bot.launch();
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));