// src/jobs/programmed-alerts.js - NOUVEAU FICHIER
// Remplace la logique dans alerts.js si tu veux séparer

import 'dotenv/config';
import { bot } from '../bot/index.js';
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages/messages-loader.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';

const db = new DatabaseService();

// ==========================================
// CRON : Vérifier alertes programmées
// Fréquence : Toutes les 15 minutes
// ==========================================

export async function checkProgrammedAlerts() {
  console.log('[CRON-PROGRAMMED] 🔔 Checking programmed alerts...');
  
  try {
    const rates = await getRates();
    if (!rates) {
      console.error('[CRON-PROGRAMMED] ❌ Failed to fetch rates');
      return;
    }
    
    const alerts = await db.getActiveAlerts();
    console.log(`[CRON-PROGRAMMED] Found ${alerts.length} active alerts`);
    
    for (const alert of alerts) {
      // Vérifier cooldown personnalisé
      const cooldownMinutes = alert.cooldown_minutes || 60;
      
      if (alert.last_triggered_at) {
        const minutesSince = (Date.now() - new Date(alert.last_triggered_at)) / (1000 * 60);
        if (minutesSince < cooldownMinutes) {
          continue; // Skip si cooldown actif
        }
      }
      
      // Calculer seuil selon le type
      const currentRate = alert.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
      let threshold;
      let refValue;
      
      if (alert.threshold_type === 'absolute') {
        // Seuil absolu : utiliser directement la valeur
        threshold = alert.threshold_value;
        refValue = null;
        
      } else if (alert.threshold_type === 'relative') {
        // Seuil relatif : calculer selon référence
        if (alert.reference_type === 'current') {
          refValue = currentRate;
        } else if (alert.reference_type === 'avg7d') {
          refValue = await db.getAverage(alert.pair, 7);
        } else if (alert.reference_type === 'avg30d') {
          refValue = await db.getAverage30Days(alert.pair);
        } else if (alert.reference_type === 'avg90d') {
          refValue = await db.getAverage(alert.pair, 90);
        }
        
        if (!refValue) {
          console.log(`[CRON-PROGRAMMED] ⚠️ No reference data for ${alert.pair} (${alert.reference_type})`);
          continue;
        }
        
        threshold = refValue * (1 + alert.threshold_value / 100);
      }
      
      // Déclencher si seuil atteint
      if (currentRate >= threshold) {
        console.log(`[CRON-PROGRAMMED] 🎯 Alert triggered for user ${alert.users.telegram_id}`);
        console.log(`  Current: ${currentRate.toFixed(4)} >= Threshold: ${threshold.toFixed(4)}`);
        
        await sendProgrammedAlert(alert, currentRate, threshold, refValue);
        
        // Mettre à jour last_triggered_at
        await db.updateAlert(alert.id, {
          last_triggered_at: new Date().toISOString()
        });
      }
    }
    
    console.log('[CRON-PROGRAMMED] ✅ Check complete');
    
  } catch (error) {
    console.error('[CRON-PROGRAMMED] ❌ Error:', error);
  }
}

// ==========================================
// HELPER : Envoyer alerte programmée
// ==========================================

async function sendProgrammedAlert(alert, currentRate, threshold, refValue) {
  try {
    const user = await db.getUser(alert.users.telegram_id);
    if (!user) return;
    
    const locale = getLocale(user.language);
    const msg = messages[user.language];
    
    // Labels pour affichage
    const typeLabels = {
      absolute: { fr: '🎯 Absolu', pt: '🎯 Absoluto', en: '🎯 Absolute' },
      relative: { fr: '📊 Relatif', pt: '📊 Relativo', en: '📊 Relative' }
    };
    
    const refLabels = {
      current: { fr: 'Taux actuel', pt: 'Taxa atual', en: 'Current rate' },
      avg7d: { fr: 'Moyenne 7j', pt: 'Média 7 dias', en: '7-day avg' },
      avg30d: { fr: 'Moyenne 30j', pt: 'Média 30 dias', en: '30-day avg' },
      avg90d: { fr: 'Moyenne 90j', pt: 'Média 90 dias', en: '90-day avg' }
    };
    
    const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    const typeLabel = typeLabels[alert.threshold_type][user.language];
    
    let text = `🔔 ALERTE DÉCLENCHÉE

${pairText}
${typeLabel}`;

    if (alert.threshold_type === 'relative') {
      const refLabel = refLabels[alert.reference_type][user.language];
      text += ` : +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabel}`;
    } else {
      text += ` : ≥ ${formatRate(alert.threshold_value, locale)}`;
    }
    
    text += `

💡 Ton seuil est atteint !

<b>Analyse :</b>
• Taux actuel : ${formatRate(currentRate, locale)}`;

    if (alert.threshold_type === 'relative' && refValue) {
      const refLabel = refLabels[alert.reference_type][user.language];
      const delta = ((currentRate - refValue) / refValue) * 100;
      text += `
• ${refLabel} : ${formatRate(refValue, locale)}
• Écart : +${formatAmount(delta, 1, locale)}%`;
    }
    
    text += `
• Seuil alerte : ${formatRate(threshold, locale)}

⏰ Prochaine alerte possible dans ${formatCooldown(alert.cooldown_minutes)}`;
    
    const amountExample = alert.pair === 'eurbrl' ? 1000 : 5000;
    const kb = buildKeyboards(msg, 'premium_alert', {
      pair: alert.pair,
      amount: amountExample,
      alertId: alert.id
    });
    
    await bot.telegram.sendMessage(user.telegram_id, text, {
      parse_mode: 'HTML',
      ...kb
    });
    
    console.log(`[CRON-PROGRAMMED] ✅ Alert sent to user ${user.telegram_id}`);
    
  } catch (error) {
    console.error(`[CRON-PROGRAMMED] Failed to send alert:`, error.message);
  }
}

// Helper formatCooldown (si pas déjà dans rates.js)
function formatCooldown(minutes) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}j`;
  return `${Math.floor(minutes / 10080)} semaine(s)`;
}