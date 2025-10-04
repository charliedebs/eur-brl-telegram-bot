// src/jobs/scheduler.js
import cron from 'node-cron';
import { saveRatesHistory } from './rates-history.js';

export function startCronJobs() {
  console.log('📅 Starting CRON jobs...');
  
  // Job unique : Sauvegarde historique toutes les 2h
  cron.schedule('0 */2 * * *', async () => {
    await saveRatesHistory();
  });
  
  console.log('✅ CRON job started');
  console.log('  - Rates History: Every 2 hours (00:00, 02:00, 04:00, etc. UTC)');
  console.log('  - Timezone: Check Railway logs to confirm');
  console.log('🕐 Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('🕐 Current time:', new Date().toISOString());
}