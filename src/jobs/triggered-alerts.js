// src/jobs/triggered-alerts.js
// Alertes DÉCLENCHÉES MANUELLEMENT (Admin)
// Envoie taux actuel + stats complètes à tous/free/premium

import 'dotenv/config';
import { Telegraf } from 'telegraf'; // ✅ Import direct
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';

const db = new DatabaseService();

// ✅ Créer une instance bot locale pour CLI
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
    // Récupérer historiques
    const [history30d, history90d, history365d] = await Promise.all([
      db.getRateHistory(pair, 30),
      db.getRateHistory(pair, 90),
      db.getRateHistory(pair, 365)
    ]);
    
    // Calculs
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
    // Récupérer users selon audience
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
        
        // Construire message riche
        const text = buildTriggeredMessage(pair, currentRate, stats, amountExample, locale, msg);
        
        const kb = buildKeyboards(msg, 'triggered_alert', { pair, amount: amountExample });
        
        console.log(`[TRIGGERED] Sending to ${user.telegram_id}...`);
        
        await bot.telegram.sendMessage(user.telegram_id, text, {
          parse_mode: 'HTML',
          ...kb
        });
        
        successCount++;
        console.log(`[TRIGGERED] ✅ Sent ${successCount}/${users.length}`);
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Anti-spam
        
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
  const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
  const currency = pair === 'eurbrl' ? '€' : ' R$';
  
  // Calcul variations vs moyennes
  const var30d = stats.avg30d ? ((currentRate - stats.avg30d.avg) / stats.avg30d.avg * 100) : null;
  const var90d = stats.stats90d ? ((currentRate - stats.stats90d.avg) / stats.stats90d.avg * 100) : null;
  const var365d = stats.stats365d ? ((currentRate - stats.stats365d.avg) / stats.stats365d.avg * 100) : null;
  
  // Gains/pertes exemples
  const gain30d = stats.avg30d ? (currentRate - stats.avg30d.avg) * amountExample : null;
  
  let text = `📢 ALERTE ADMIN

${pairText} : ${formatRate(currentRate, locale)}

📊 <b>Position actuelle :</b>

`;
  
  // Stats 30j
  if (stats.stats30d) {
    text += `<b>30 derniers jours :</b>
• Moyenne : ${formatRate(stats.stats30d.avg, locale)}
• Min : ${formatRate(stats.stats30d.min, locale)}
• Max : ${formatRate(stats.stats30d.max, locale)}
• Écart vs moyenne : ${var30d > 0 ? '+' : ''}${formatAmount(var30d, 1, locale)}%\n\n`;
  }
  
  // Stats 90j
  if (stats.stats90d) {
    text += `<b>90 derniers jours :</b>
• Moyenne : ${formatRate(stats.stats90d.avg, locale)}
• Min : ${formatRate(stats.stats90d.min, locale)}
• Max : ${formatRate(stats.stats90d.max, locale)}
• Écart vs moyenne : ${var90d > 0 ? '+' : ''}${formatAmount(var90d, 1, locale)}%\n\n`;
  }
  
  // Stats 365j
  if (stats.stats365d) {
    text += `<b>12 derniers mois :</b>
• Moyenne : ${formatRate(stats.stats365d.avg, locale)}
• Min : ${formatRate(stats.stats365d.min, locale)}
• Max : ${formatRate(stats.stats365d.max, locale)}
• Écart vs moyenne : ${var365d > 0 ? '+' : ''}${formatAmount(var365d, 1, locale)}%\n\n`;
  }
  
  // Exemple gain/perte
  if (gain30d) {
    text += `💰 <b>Exemple sur ${formatAmount(amountExample, 0, locale)}${currency} :</b>
${gain30d > 0 ? 'Tu gagnes' : 'Tu perds'} ~${formatAmount(Math.abs(gain30d), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs moyenne 30j\n\n`;
  }
  
  text += `💡 C'est le bon moment pour transférer !`;
  
  return text;
}

// ==========================================
// FONCTION PRINCIPALE (appelée manuellement)
// ==========================================

export async function triggerManualAlert(options = {}) {
  const {
    pairs = ['eurbrl', 'brleur'], // Par défaut les 2
    audience = 'all' // 'all', 'premium', 'free'
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
      
      // Récupérer stats
      console.log('[TRIGGERED] Fetching historical stats...');
      const stats = await getCompleteStats(pair);
      if (!stats) {
        console.error(`[TRIGGERED] ❌ Failed to get stats for ${pair}`);
        continue;
      }
      
      console.log('[TRIGGERED] Stats retrieved:');
      console.log(`  30d avg: ${stats.stats30d?.avg.toFixed(4)}`);
      console.log(`  90d avg: ${stats.stats90d?.avg.toFixed(4)}`);
      
      // Broadcast
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
// SCRIPT CLI (pour toi)
// ==========================================

// Usage en ligne de commande :
// node src/jobs/triggered-alerts.js --audience=all
// node src/jobs/triggered-alerts.js --audience=premium --pairs=eurbrl
// node src/jobs/triggered-alerts.js --audience=free --pairs=brleur

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Triggered Alerts CLI');
  console.log('============================\n');
  
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
  
  console.log('Options:', options);
  console.log('');
  
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