// src/jobs/programmed-alerts.js - NOUVEAU FICHIER
// Remplace la logique dans alerts.js si tu veux séparer

import 'dotenv/config';
import { bot } from '../bot/index.js';
import { getRates } from '../services/rates.js';
import { DatabaseService } from '../services/database.js';
import { messages } from '../bot/messages/messages-loader.js';
import { buildKeyboards } from '../bot/keyboards.js';
import { getLocale, formatRate, formatAmount } from '../services/rates.js';
import { logger } from '../utils/logger.js';

const db = new DatabaseService();

// ==========================================
// CRON : Vérifier alertes programmées
// Fréquence : Toutes les 15 minutes
// ==========================================

export async function checkProgrammedAlerts() {
  logger.info('[CRON-PROGRAMMED] 🔔 Checking programmed alerts...');

  try {
    const rates = await getRates();
    if (!rates) {
      logger.error('[CRON-PROGRAMMED] ❌ Failed to fetch rates');
      return;
    }

    const alerts = await db.getActiveAlerts();
    logger.info(`[CRON-PROGRAMMED] Found ${alerts.length} active alerts`);
    
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
          // ❌ This should never happen - bot/index.js converts these to absolute
          // If we find one, it's a data corruption issue - skip it
          logger.error(`[CRON-PROGRAMMED] ❌ Invalid alert ${alert.id}: reference_type='current' should be absolute`);
          logger.error(`[CRON-PROGRAMMED] Skipping alert. User: ${alert.users.telegram_id}, Pair: ${alert.pair}`);
          continue;
        } else if (alert.reference_type === 'avg7d') {
          refValue = await db.getAverage(alert.pair, 7);
        } else if (alert.reference_type === 'avg30d') {
          refValue = await db.getAverage30Days(alert.pair);
        } else if (alert.reference_type === 'avg90d') {
          refValue = await db.getAverage(alert.pair, 90);
        }

        if (!refValue) {
          logger.warn(`[CRON-PROGRAMMED] ⚠️ No reference data for ${alert.pair} (${alert.reference_type})`);
          continue;
        }

        threshold = refValue * (1 + alert.threshold_value / 100);
      }

      // Déclencher si seuil atteint
      if (currentRate >= threshold) {
        logger.info(`[CRON-PROGRAMMED] 🎯 Alert triggered for user ${alert.users.telegram_id}`);
        logger.info(`  Current: ${currentRate.toFixed(4)} >= Threshold: ${threshold.toFixed(4)}`);
        
        await sendProgrammedAlert(alert, currentRate, threshold, refValue);
        
        // Mettre à jour last_triggered_at
        await db.updateAlert(alert.id, {
          last_triggered_at: new Date().toISOString()
        });
      }
    }

    logger.info('[CRON-PROGRAMMED] ✅ Check complete');

  } catch (error) {
    logger.error('[CRON-PROGRAMMED] ❌ Error:', { error: error.message, stack: error.stack });
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

    // Use PROGRAMMED_ALERT message function (supports all languages)
    const text = msg.PROGRAMMED_ALERT
      ? msg.PROGRAMMED_ALERT(alert.pair, currentRate, threshold, refValue, alert, locale)
      : `🔔 ALERTA DISPARADO\n\n${alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}\n\n💡 Seu limite foi atingido!\n\n• Taxa atual: ${formatRate(currentRate, locale)}\n• Limite: ${formatRate(threshold, locale)}`;

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

    logger.info(`[CRON-PROGRAMMED] ✅ Alert sent to user ${user.telegram_id}`);

  } catch (error) {
    logger.error(`[CRON-PROGRAMMED] Failed to send alert:`, { error: error.message });
  }
}