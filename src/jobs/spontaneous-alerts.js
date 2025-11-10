// src/jobs/spontaneous-alerts.js
// Alertes SPONTANÉES : Free (>3% avg90d, cooldown 14j) + Premium (>2% avg30d, cooldown 6h)
// Appliqué aux 2 routes : EURBRL + BRLEUR

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { bot } from '../bot/index.js';
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages/messages-loader.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new DatabaseService();

// Load alert parameters from config file
async function loadAlertParams() {
  try {
    const paramsPath = join(__dirname, '..', 'config', 'alert-params.json');
    const data = await readFile(paramsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.warn('[SPONTANEOUS] Could not load params, using defaults:', { error: error.message });
    return {
      freeThreshold: 3,
      premiumThreshold: 2,
      freeCooldown: 14,
      premiumCooldown: 6
    };
  }
}

// ==========================================
// SPONTANÉES FREE : >3% vs avg90d, cooldown 14j
// ==========================================

async function shouldSendFreeAlert(pair, currentRate, params) {
  try {
    // 1. Record 90 jours + variation >X% vs avg90d
    const history90d = await db.getRateHistory(pair, 90);
    if (history90d.length < 60) {
      logger.warn(`[FREE-SPONTANEOUS] Not enough data for ${pair} (${history90d.length}/90)`);
      return false;
    }

    const rates = history90d.map(h => parseFloat(h.rate));
    const max90d = Math.max(...rates);
    const avg90d = rates.reduce((a, b) => a + b, 0) / rates.length;

    // Variation >X% vs moyenne 90d (removed "near max" requirement)
    const variationVsAvg = ((currentRate - avg90d) / avg90d) * 100;
    const isSignificant = variationVsAvg > params.freeThreshold;

    if (!isSignificant) {
      return { send: false };
    }

    // 2. Cooldown (configurable days)
    const lastAlert = await db.getLastFreeAlert(pair);
    if (lastAlert) {
      const daysSince = (Date.now() - new Date(lastAlert.sent_at)) / (1000 * 60 * 60 * 24);
      if (daysSince < params.freeCooldown) {
        logger.info(`[FREE-SPONTANEOUS] ${pair}: Cooldown active (${daysSince.toFixed(1)}d/${params.freeCooldown}d)`);
        return { send: false };
      }
    }
    
    logger.info(`[FREE-SPONTANEOUS] ✅ ${pair}: Criteria met! Var=${variationVsAvg.toFixed(1)}%`);
    return { 
      send: true, 
      avg90d,
      max90d,
      variation: variationVsAvg,
      daysSinceMax: history90d.findIndex(h => parseFloat(h.rate) >= max90d * 0.99) 
    };
    
  } catch (error) {
    logger.error(`[FREE-SPONTANEOUS] Error for ${pair}:`, { error: error.message });
    return { send: false };
  }
}

async function broadcastFreeAlert(pair, currentRate, stats) {
  try {
    // ⚠️ IMPORTANT: Only send to FREE users (exclude premium)
    const allUsers = await db.getAllActiveUsers();
    const premiumUsers = await db.getPremiumUsers();
    const premiumIds = new Set(premiumUsers.map(u => u.telegram_id));
    const users = allUsers.filter(u => !premiumIds.has(u.telegram_id));

    logger.info(`[FREE-SPONTANEOUS] Broadcasting ${pair} to ${users.length} free users (excluded ${premiumIds.size} premium)...`);
    
    const amountExample = pair === 'eurbrl' ? 1000 : 5000;
    const savings = (currentRate - stats.avg90d) * amountExample;
    
    let successCount = 0;
    
    for (const user of users) {
      try {
        const locale = getLocale(user.language);
        const msg = messages[user.language];
        
        const text = msg.FREE_ALERT
          ? msg.FREE_ALERT(pair, currentRate, stats.daysSinceMax, amountExample, savings, locale)
          : `🔔 ALERTE SPÉCIALE\n\n${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}\n\n📊 Meilleur taux depuis ${stats.daysSinceMax} jours !`;
        
        const kb = buildKeyboards(msg, 'free_alert', { pair, amount: amountExample });
        
        await bot.telegram.sendMessage(user.telegram_id, text, {
          parse_mode: 'HTML',
          ...kb
        });
        
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 50)); // Anti-spam
        
      } catch (error) {
        logger.error(`[FREE-SPONTANEOUS] Failed for user ${user.telegram_id}:`, { error: error.message });
      }
    }

    // Log
    await db.logFreeAlert(pair, currentRate, successCount);
    logger.info(`[FREE-SPONTANEOUS] ✅ ${pair}: Sent to ${successCount}/${users.length} users`);

  } catch (error) {
    logger.error('[FREE-SPONTANEOUS] Broadcast error:', { error: error.message });
  }
}

// ==========================================
// SPONTANÉES PREMIUM : >2% vs avg30d, cooldown 6h
// ==========================================

async function shouldSendPremiumAlert(pair, currentRate, userId, params) {
  try {
    // 1. Variation >X% vs avg30d
    const history30d = await db.getRateHistory(pair, 30);
    if (history30d.length < 20) return { send: false };

    const rates = history30d.map(h => parseFloat(h.rate));
    const avg30d = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variation = ((currentRate - avg30d) / avg30d) * 100;

    if (variation < params.premiumThreshold) {
      return { send: false };
    }

    // 2. Cooldown (configurable hours - global dans le CRON)
    // Option simple : pas de tracking précis par utilisateur, juste global dans le CRON

    logger.info(`[PREMIUM-SPONTANEOUS] ✅ ${pair} for user ${userId}: +${variation.toFixed(1)}%`);
    return {
      send: true,
      avg30d,
      variation
    };

  } catch (error) {
    logger.error(`[PREMIUM-SPONTANEOUS] Error:`, { error: error.message });
    return { send: false };
  }
}

async function broadcastPremiumAlert(pair, currentRate, stats, premiumUsers) {
  logger.info(`[PREMIUM-SPONTANEOUS] Broadcasting ${pair} to ${premiumUsers.length} premium users...`);
  
  let successCount = 0;
  
  for (const user of premiumUsers) {
    try {
      const locale = getLocale(user.language);
      const msg = messages[user.language];
      
      const amountExample = pair === 'eurbrl' ? 1000 : 5000;
      const savings = (currentRate - stats.avg30d) * amountExample;
      
      const text = `🔔 ALERTE SPONTANÉE PREMIUM

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}

💡 Bon moment pour transférer !

📊 Analyse :
• Taux actuel : ${formatRate(currentRate, locale)}
• Moyenne 30j : ${formatRate(stats.avg30d, locale)}
• Écart : +${formatAmount(stats.variation, 1, locale)}% 🎯

💰 Sur ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, tu gagnes ~${formatAmount(Math.abs(savings), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs la moyenne

⏰ Prochaine alerte possible dans 6h (spontanées)`;
      
      const kb = buildKeyboards(msg, 'premium_alert', {
        pair,
        amount: amountExample
      });
      
      await bot.telegram.sendMessage(user.telegram_id, text, {
        parse_mode: 'HTML',
        ...kb
      });
      
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      logger.error(`[PREMIUM-SPONTANEOUS] Failed for user ${user.telegram_id}:`, { error: error.message });
    }
  }

  logger.info(`[PREMIUM-SPONTANEOUS] ✅ ${pair}: Sent to ${successCount}/${premiumUsers.length} users`);
}

// ==========================================
// JOB PRINCIPAL : Vérifier spontanées pour les 2 routes
// ==========================================

export async function checkSpontaneousAlerts() {
  logger.info('\n🔍 [SPONTANEOUS] Checking spontaneous alerts...');

  try {
    // Load alert parameters from config
    const params = await loadAlertParams();
    logger.info(`[SPONTANEOUS] Using parameters: Free=${params.freeThreshold}% (${params.freeCooldown}d), Premium=${params.premiumThreshold}% (${params.premiumCooldown}h)`);

    const rates = await getRates();
    if (!rates) {
      logger.error('[SPONTANEOUS] ❌ Failed to fetch rates');
      return;
    }

    // Boucle sur les 2 paires
    for (const pair of ['eurbrl', 'brleur']) {
      const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

      logger.info(`\n[SPONTANEOUS] Checking ${pair.toUpperCase()}: ${currentRate.toFixed(4)}`);

      // 1. FREE
      const freeCheck = await shouldSendFreeAlert(pair, currentRate, params);
      if (freeCheck.send) {
        logger.info(`[SPONTANEOUS] 🎯 FREE alert triggered for ${pair}`);
        await broadcastFreeAlert(pair, currentRate, freeCheck);
      }

      // 2. PREMIUM
      const premiumUsers = await db.getPremiumUsers();
      if (premiumUsers.length > 0) {
        const premiumCheck = await shouldSendPremiumAlert(pair, currentRate, null, params);
        if (premiumCheck.send) {
          logger.info(`[SPONTANEOUS] 🎯 PREMIUM alert triggered for ${pair}`);
          await broadcastPremiumAlert(pair, currentRate, premiumCheck, premiumUsers);
        }
      }
    }

    logger.info('[SPONTANEOUS] ✅ Check complete\n');

  } catch (error) {
    logger.error('[SPONTANEOUS] ❌ Error:', { error: error.message, stack: error.stack });
  }
}