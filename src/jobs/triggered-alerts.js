// src/jobs/triggered-alerts.js
// Alertes DÉCLENCHÉES MANUELLEMENT (Admin)
// Envoie taux actuel + stats complètes à tous/free/premium

import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages/messages-loader.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const db = new DatabaseService();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN missing in environment');
}
const bot = new Telegraf(botToken);

// ==========================================
// CALCULER STATS COMPLÈTES
// ==========================================

async function getCompleteStats(pair) {
  try {
    const [history30d, history90d, history365d] = await Promise.all([
      db.getRateHistory(pair, 30),
      db.getRateHistory(pair, 90),
      db.getRateHistory(pair, 365)
    ]);
    
    const calc = (hist) => {
      if (hist.length === 0) return null;
      const rates = hist.map(h => parseFloat(h.rate));
      return {
        avg: rates.reduce((a, b) => a + b, 0) / rates.length,
        min: Math.min(...rates),
        max: Math.max(...rates)
      };
    };
    
    return {
      avg30d: calc(history30d),
      stats30d: calc(history30d),
      stats90d: calc(history90d),
      stats365d: calc(history365d)
    };
    
  } catch (error) {
    console.error(`[TRIGGERED] Error getting stats for ${pair}:`, error);
    return null;
  }
}

// ==========================================
// BROADCAST SELON AUDIENCE
// ==========================================

async function broadcastTriggered(pair, currentRate, stats, audience = 'all') {
  console.log(`[TRIGGERED] 📢 Broadcasting ${pair} to ${audience}...`);
  
  try {
    let users;
    if (audience === 'all') {
      users = await db.getAllActiveUsers();
    } else if (audience === 'premium') {
      users = await db.getPremiumUsers();
    } else if (audience === 'free') {
      const allUsers = await db.getAllActiveUsers();
      const premiumUsers = await db.getPremiumUsers();
      const premiumIds = new Set(premiumUsers.map(u => u.telegram_id));
      users = allUsers.filter(u => !premiumIds.has(u.telegram_id));
    }
    
    console.log(`[TRIGGERED] Target: ${users.length} users (${audience})`);
    
    if (users.length === 0) {
      console.log('[TRIGGERED] ⚠️ No users found for this audience');
      return 0;
    }
    
    let successCount = 0;
    const amountExample = pair === 'eurbrl' ? 1000 : 5000;
    
    for (const user of users) {
      try {
        const locale = getLocale(user.language);
        const msg = messages[user.language];
        
        const text = buildTriggeredMessage(pair, currentRate, stats, amountExample, locale, msg);
        const kb = buildKeyboards(msg, 'triggered_alert', { pair, amount: amountExample });
        
        await bot.telegram.sendMessage(user.telegram_id, text, {
          parse_mode: 'HTML',
          ...kb
        });
        
        successCount++;
        console.log(`[TRIGGERED] ✅ Sent ${successCount}/${users.length}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`[TRIGGERED] ❌ Failed for user ${user.telegram_id}:`, error.message);
      }
    }
    
    console.log(`[TRIGGERED] ✅ Sent to ${successCount}/${users.length} users`);
    return successCount;
    
  } catch (error) {
    console.error('[TRIGGERED] Broadcast error:', error);
    return 0;
  }
}

// ==========================================
// CONSTRUIRE MESSAGE
// ==========================================

function buildTriggeredMessage(pair, currentRate, stats, amountExample, locale, msg) {
  // Use the TRIGGERED_ALERT message function (supports all languages + context-aware)
  return msg.TRIGGERED_ALERT
    ? msg.TRIGGERED_ALERT(pair, currentRate, stats, amountExample, locale)
    : `📢 ALERTA DO ADMIN\n\n${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}\n\n📊 Taxa atual vs médias históricas`;
}

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

export async function triggerManualAlert(options = {}) {
  const {
    pairs = ['eurbrl', 'brleur'],
    audience = 'all'
  } = options;
  
  console.log('\n📢 [TRIGGERED] Manual alert triggered');
  console.log(`   Pairs: ${pairs.join(', ')}`);
  console.log(`   Audience: ${audience}`);
  
  try {
    console.log('[TRIGGERED] Fetching rates...');
    const rates = await getRates();
    if (!rates) {
      console.error('[TRIGGERED] ❌ Failed to fetch rates');
      return { success: false, error: 'Failed to fetch rates' };
    }
    
    console.log(`[TRIGGERED] Rates: EURBRL=${rates.cross.toFixed(4)}`);
    
    const results = [];
    
    for (const pair of pairs) {
      const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
      console.log(`\n[TRIGGERED] Processing ${pair.toUpperCase()}: ${currentRate.toFixed(4)}`);
      
      console.log('[TRIGGERED] Fetching historical stats...');
      const stats = await getCompleteStats(pair);
      if (!stats) {
        console.error(`[TRIGGERED] ❌ Failed to get stats for ${pair}`);
        continue;
      }
      
      console.log('[TRIGGERED] Stats retrieved:');
      console.log(`  30d avg: ${stats.stats30d?.avg.toFixed(4)}`);
      console.log(`  90d avg: ${stats.stats90d?.avg.toFixed(4)}`);
      
      const sent = await broadcastTriggered(pair, currentRate, stats, audience);
      results.push({ pair, sent });
    }
    
    console.log('\n[TRIGGERED] ✅ Manual alert complete');
    console.log('Results:', results);
    
    return { success: true, results };
    
  } catch (error) {
    console.error('[TRIGGERED] ❌ Error:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// CLI - FIX WINDOWS/UNIX
// ==========================================

// Normaliser les paths pour comparaison
const currentFile = fileURLToPath(import.meta.url);
const argFile = resolve(process.argv[1]);
const isDirectExecution = currentFile === argFile;

if (isDirectExecution) {
  console.log('🚀 Triggered Alerts CLI\n');
  
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key === 'pairs') {
        options.pairs = value.split(',');
      } else {
        options[key] = value;
      }
    }
  });
  
  console.log('Options:', options, '\n');
  
  triggerManualAlert(options)
    .then(result => {
      console.log('\n✅ DONE:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 ERROR:', error);
      process.exit(1);
    });
}