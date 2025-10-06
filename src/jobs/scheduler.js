// ============================================
// REMPLACER COMPLÈTEMENT src/jobs/scheduler.js
// ============================================

import cron from 'node-cron';
import { saveRatesHistory } from './rates-history.js';
import { saveRatesAndCheckFreeAlerts, checkPremiumAlerts } from './alerts.js';

export function startCronJobs() {
  console.log('📅 Starting CRON jobs...');
  
  // Job 1 : Sauvegarde historique (toutes les 2h)
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] Rates History job starting...');
    await saveRatesHistory();
  });
  
  // Job 2 : Alertes gratuites + sauvegarde taux (toutes les 6h)
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ [CRON] Free Alerts job starting...');
    await saveRatesAndCheckFreeAlerts();
  });
  
  // Job 3 : Alertes Premium (toutes les 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('\n⏰ [CRON] Premium Alerts job starting...');
    await checkPremiumAlerts();
  });
  
  console.log('✅ CRON jobs started successfully\n');
  console.log('📋 Schedule:');
  console.log('  • Rates History: Every 2 hours (00:00, 02:00, 04:00, etc.)');
  console.log('  • Free Alerts: Every 6 hours (00:00, 06:00, 12:00, 18:00)');
  console.log('  • Premium Alerts: Every 15 minutes');
  console.log('\n🕐 Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('🕐 Current server time:', new Date().toISOString());
  console.log('');
}