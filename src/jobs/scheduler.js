// src/jobs/scheduler.js
import cron from 'node-cron';
import { saveRatesHistory } from './rates-history.js';
import { checkSpontaneousAlerts } from './spontaneous-alerts.js';
import { checkPremiumAlerts } from './alerts.js'; // Alertes PROGRAMMÉES uniquement

export function startCronJobs() {
  console.log('📅 Starting CRON jobs...\n');
  
  // ==========================================
  // JOB 1 : Historique taux (toutes les 2h)
  // ==========================================
  cron.schedule('0 */2 * * *', async () => {
    await saveRatesHistory();
  });
  console.log('✅ Job 1: Rates History - Every 2 hours');
  
  // ==========================================
  // JOB 2 : Alertes SPONTANÉES (toutes les 6h)
  // Free: >5% avg90d + cooldown 14j
  // Premium: >3% avg30d + cooldown 6h
  // ==========================================
  cron.schedule('0 */6 * * *', async () => {
    await checkSpontaneousAlerts();
  });
  console.log('✅ Job 2: Spontaneous Alerts (Free + Premium) - Every 6 hours');
  
  // ==========================================
  // JOB 3 : Alertes PROGRAMMÉES Premium (toutes les 2h)
  // User configure seuil/preset/cooldown
  // ==========================================
  cron.schedule('0 */2 * * *', async () => {
    await checkPremiumAlerts();
  });
  console.log('✅ Job 3: Programmed Alerts (Premium) - Every 2 hours');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log('🕐 Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('🕐 Current time:', new Date().toISOString());
  console.log('');
  console.log('Next executions (UTC):');
  console.log('  - Rates History: Every 2 hours (00:00, 02:00, 04:00...)');
  console.log('  - Spontaneous Alerts: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
  console.log('  - Programmed Alerts: Every 2 hours (00:00, 02:00, 04:00...)');
  console.log('='.repeat(60) + '\n');
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