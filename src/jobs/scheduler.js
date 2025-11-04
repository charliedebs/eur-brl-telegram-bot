// src/jobs/scheduler.js
import cron from 'node-cron';
import { saveRatesHistory } from './rates-history.js';
import { checkSpontaneousAlerts } from './spontaneous-alerts.js';
import { checkPremiumAlerts } from './alerts.js'; // Alertes PROGRAMMÉES uniquement
import { checkProgrammedAlerts } from './programmed-alerts.js';
import { logger } from '../utils/logger.js';

export function startCronJobs() {
  logger.info('📅 Starting CRON jobs...\n');

  // ==========================================
  // JOB 1 : Historique taux (toutes les 2h)
  // ==========================================
  cron.schedule('0 */2 * * *', async () => {
    await saveRatesHistory();
  });
  logger.info('✅ Job 1: Rates History - Every 2 hours');

  // ==========================================
  // JOB 2 : Alertes SPONTANÉES (toutes les 6h)
  // Free: >5% avg90d + cooldown 14j
  // Premium: >3% avg30d + cooldown 6h
  // ==========================================
  cron.schedule('0 */6 * * *', async () => {
    await checkSpontaneousAlerts();
  });
  logger.info('✅ Job 2: Spontaneous Alerts (Free + Premium) - Every 6 hours');

  // ==========================================
  // JOB 3 : Alertes PROGRAMMÉES Premium (toutes les 2h)
  // User configure seuil/preset/cooldown
  // ==========================================
  cron.schedule('*/15 * * * *', checkProgrammedAlerts);
  logger.info('✅ Job 3: Programmed Alerts (Premium) - Every 2 hours');

  logger.info('\n' + '='.repeat(60));
  logger.info('📋 SUMMARY');
  logger.info('='.repeat(60));
  logger.info('🕐 Server timezone:', { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  logger.info('🕐 Current time:', { time: new Date().toISOString() });
  logger.info('');
  logger.info('Next executions (UTC):');
  logger.info('  - Rates History: Every 2 hours (00:00, 02:00, 04:00...)');
  logger.info('  - Spontaneous Alerts: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
  logger.info('  - Programmed Alerts: Every 2 hours (00:00, 02:00, 04:00...)');
  logger.info('='.repeat(60) + '\n');
}

// ==========================================
// INFO: Alertes DÉCLENCHÉES (manuelles)
// ==========================================
// Ces alertes ne sont PAS dans le CRON.
// Elles sont déclenchées manuellement par l'admin via CLI :
//
// node src/jobs/triggered-alerts.js --audience=all
// node src/jobs/triggered-alerts.js --audience=premium --pairs=eurbrl
// node src/jobs/triggered-alerts.js --audience=free
//
// Voir src/jobs/triggered-alerts.js pour details.