// src/jobs/alerts.js
import 'dotenv/config';
import { bot } from '../bot/index.js';
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';

const db = new DatabaseService();


// ==========================================
// HELPER : Vérifier si alerte gratuite doit être envoyée
// ==========================================

async function shouldSendFreeAlert(currentRate, pair) {
  try {
    // 1. Record 90 jours ?
    const history = await db.getRateHistory(pair, 90);
    if (history.length === 0) return false;
    
    const rates90d = history.map(h => parseFloat(h.rate));
    const max90d = Math.max(...rates90d);
    const is90dayHigh = currentRate >= max90d * 0.995; // 99.5% du max (marge)
    
    if (!is90dayHigh) return false;
    
    // 2. Grosse variation ?
    const avg7d = rates90d.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const weeklyChange = Math.abs((currentRate - avg7d) / avg7d);
    const isSignificantChange = weeklyChange > 0.05; // >5%
    
    if (!isSignificantChange) return false;
    
    // 3. Cooldown 14 jours
    const lastAlert = await db.getLastFreeAlert(pair);
    if (lastAlert) {
      const daysSince = (Date.now() - new Date(lastAlert.sent_at)) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('[shouldSendFreeAlert] Error:', error);
    return false;
  }
}

// ==========================================
// HELPER : Broadcast alerte gratuite
// ==========================================

async function broadcastFreeAlert(pair, currentRate) {
  try {
    const users = await db.getAllActiveUsers();
    console.log(`[FREE-ALERT] Broadcasting to ${users.length} users...`);
    
    // Calculer données
    const avg30d = await db.getAverage30Days(pair);
    const history = await db.getRateHistory(pair, 90);
    const rates90d = history.map(h => parseFloat(h.rate));
    const max90d = Math.max(...rates90d);
    
    // Nombre de jours depuis dernier pic
    const recordDays = history.findIndex(h => parseFloat(h.rate) >= max90d * 0.99);
    
    const amountExample = pair === 'eurbrl' ? 1000 : 5000;
    const savings = (currentRate - avg30d) * amountExample;
    
    let successCount = 0;
    
    for (const user of users) {
      try {
        const locale = getLocale(user.language);
        const msg = messages[user.language];
        
        const text = msg.FREE_ALERT 
          ? msg.FREE_ALERT(pair, currentRate, recordDays, amountExample, savings, locale)
          : `🔔 ALERTE SPÉCIALE\n\n${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}\n\n📊 Meilleur taux depuis ${recordDays} jours !`;
        
        const kb = buildKeyboards(msg, 'free_alert', { pair, amount: amountExample });
        
        await bot.telegram.sendMessage(user.telegram_id, text, {
          parse_mode: 'HTML',
          ...kb
        });
        
        successCount++;
        
        // Délai anti-spam Telegram
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`[FREE-ALERT] Failed for user ${user.telegram_id}:`, error.message);
      }
    }
    
    // Logger
    await db.logFreeAlert(pair, currentRate, successCount);
    
    console.log(`[FREE-ALERT] ✅ Sent to ${successCount}/${users.length} users`);
    
  } catch (error) {
    console.error('[FREE-ALERT] Error:', error);
  }
}

// ==========================================
// HELPER : Broadcast alerte premium
// ==========================================

async function broadcastPremiumAlert(alert, currentRate, avg30d) {
  try {
    const user = await db.getUser(alert.users.telegram_id);
    if (!user) return;
    
    const locale = getLocale(user.language);
    const msg = messages[user.language];
    
    const threshold = alert.threshold_percent;
    const delta = ((currentRate - avg30d) / avg30d) * 100;
    
    const amountExample = alert.pair === 'eurbrl' ? 1000 : 5000;
    const savings = alert.pair === 'eurbrl'
      ? (currentRate - avg30d) * amountExample
      : (1/avg30d - 1/currentRate) * amountExample;
    
    const text = msg.ALERT_TRIGGERED
      ? msg.ALERT_TRIGGERED(alert.pair, currentRate, avg30d, threshold, delta, amountExample, savings, locale)
      : `🔔 ALERTE PREMIUM\n\n${alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}\n\nTon seuil est atteint !`;
    
    const kb = buildKeyboards(msg, 'premium_alert', {
      pair: alert.pair,
      amount: amountExample,
      alertId: alert.id
    });
    
    await bot.telegram.sendMessage(user.telegram_id, text, {
      parse_mode: 'HTML',
      ...kb
    });
    
    console.log(`[PREMIUM-ALERT] ✅ Sent to user ${user.telegram_id}`);
    
  } catch (error) {
    console.error(`[PREMIUM-ALERT] Failed:`, error.message);
  }
}