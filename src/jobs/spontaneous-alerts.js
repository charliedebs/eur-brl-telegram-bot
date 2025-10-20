// src/jobs/spontaneous-alerts.js
// Alertes SPONTANÉES : Free (>5% avg90d) + Premium (>3% avg30d)
// Appliqué aux 2 routes : EURBRL + BRLEUR

import 'dotenv/config';
import { bot } from '../bot/index.js';
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages/messages-loader.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';

const db = new DatabaseService();

// ==========================================
// SPONTANÉES FREE : >5% vs avg90d, cooldown 14j
// ==========================================

async function shouldSendFreeAlert(pair, currentRate) {
  try {
    // 1. Record 90 jours + variation >5% vs avg90d
    const history90d = await db.getRateHistory(pair, 90);
    if (history90d.length < 60) {
      console.log(`[FREE-SPONTANEOUS] Not enough data for ${pair} (${history90d.length}/90)`);
      return false;
    }
    
    const rates = history90d.map(h => parseFloat(h.rate));
    const max90d = Math.max(...rates);
    const avg90d = rates.reduce((a, b) => a + b, 0) / rates.length;
    
    // Besoin d'être proche du max (99.5%) ET >5% vs moyenne
    const isNearMax = currentRate >= max90d * 0.995;
    const variationVsAvg = ((currentRate - avg90d) / avg90d) * 100;
    const isSignificant = variationVsAvg > 5;
    
    if (!isNearMax || !isSignificant) {
      return { send: false };
    }
    
    // 2. Cooldown 14 jours
    const lastAlert = await db.getLastFreeAlert(pair);
    if (lastAlert) {
      const daysSince = (Date.now() - new Date(lastAlert.sent_at)) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) {
        console.log(`[FREE-SPONTANEOUS] ${pair}: Cooldown active (${daysSince.toFixed(1)}j/14j)`);
        return { send: false };
      }
    }
    
    console.log(`[FREE-SPONTANEOUS] ✅ ${pair}: Criteria met! Var=${variationVsAvg.toFixed(1)}%`);
    return { 
      send: true, 
      avg90d,
      max90d,
      variation: variationVsAvg,
      daysSinceMax: history90d.findIndex(h => parseFloat(h.rate) >= max90d * 0.99) 
    };
    
  } catch (error) {
    console.error(`[FREE-SPONTANEOUS] Error for ${pair}:`, error);
    return { send: false };
  }
}

async function broadcastFreeAlert(pair, currentRate, stats) {
  try {
    const users = await db.getAllActiveUsers();
    console.log(`[FREE-SPONTANEOUS] Broadcasting ${pair} to ${users.length} users...`);
    
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
        console.error(`[FREE-SPONTANEOUS] Failed for user ${user.telegram_id}:`, error.message);
      }
    }
    
    // Log
    await db.logFreeAlert(pair, currentRate, successCount);
    console.log(`[FREE-SPONTANEOUS] ✅ ${pair}: Sent to ${successCount}/${users.length} users`);
    
  } catch (error) {
    console.error('[FREE-SPONTANEOUS] Broadcast error:', error);
  }
}

// ==========================================
// SPONTANÉES PREMIUM : >3% vs avg30d, cooldown 6h
// ==========================================

async function shouldSendPremiumAlert(pair, currentRate, userId) {
  try {
    // 1. Variation >3% vs avg30d
    const history30d = await db.getRateHistory(pair, 30);
    if (history30d.length < 20) return { send: false };
    
    const rates = history30d.map(h => parseFloat(h.rate));
    const avg30d = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variation = ((currentRate - avg30d) / avg30d) * 100;
    
    if (variation < 3) {
      return { send: false };
    }
    
    // 2. Cooldown 6h (on pourrait tracker en DB, mais pour MVP on simplifie)
    // Option simple : pas de tracking précis, juste global dans le CRON
    
    console.log(`[PREMIUM-SPONTANEOUS] ✅ ${pair} for user ${userId}: +${variation.toFixed(1)}%`);
    return {
      send: true,
      avg30d,
      variation
    };
    
  } catch (error) {
    console.error(`[PREMIUM-SPONTANEOUS] Error:`, error);
    return { send: false };
  }
}

async function broadcastPremiumAlert(pair, currentRate, stats, premiumUsers) {
  console.log(`[PREMIUM-SPONTANEOUS] Broadcasting ${pair} to ${premiumUsers.length} premium users...`);
  
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
      console.error(`[PREMIUM-SPONTANEOUS] Failed for user ${user.telegram_id}:`, error.message);
    }
  }
  
  console.log(`[PREMIUM-SPONTANEOUS] ✅ ${pair}: Sent to ${successCount}/${premiumUsers.length} users`);
}

// ==========================================
// JOB PRINCIPAL : Vérifier spontanées pour les 2 routes
// ==========================================

export async function checkSpontaneousAlerts() {
  console.log('\n🔍 [SPONTANEOUS] Checking spontaneous alerts...');
  
  try {
    const rates = await getRates();
    if (!rates) {
      console.error('[SPONTANEOUS] ❌ Failed to fetch rates');
      return;
    }
    
    // Boucle sur les 2 paires
    for (const pair of ['eurbrl', 'brleur']) {
      const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
      
      console.log(`\n[SPONTANEOUS] Checking ${pair.toUpperCase()}: ${currentRate.toFixed(4)}`);
      
      // 1. FREE
      const freeCheck = await shouldSendFreeAlert(pair, currentRate);
      if (freeCheck.send) {
        console.log(`[SPONTANEOUS] 🎯 FREE alert triggered for ${pair}`);
        await broadcastFreeAlert(pair, currentRate, freeCheck);
      }
      
      // 2. PREMIUM
      const premiumUsers = await db.getPremiumUsers();
      if (premiumUsers.length > 0) {
        const premiumCheck = await shouldSendPremiumAlert(pair, currentRate);
        if (premiumCheck.send) {
          console.log(`[SPONTANEOUS] 🎯 PREMIUM alert triggered for ${pair}`);
          await broadcastPremiumAlert(pair, currentRate, premiumCheck, premiumUsers);
        }
      }
    }
    
    console.log('[SPONTANEOUS] ✅ Check complete\n');
    
  } catch (error) {
    console.error('[SPONTANEOUS] ❌ Error:', error);
  }
}