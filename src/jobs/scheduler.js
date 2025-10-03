import cron from 'node-cron';
import { saveRatesAndCheckFreeAlerts, checkPremiumAlerts } from './alerts.js';

export function startCronJobs() {
  console.log('📅 Starting CRON jobs...');
  
  // Job 1 : Toutes les 6 heures (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ [CRON] Job 1: Rates & Free Alerts');
    await saveRatesAndCheckFreeAlerts();
  });
  
  // Job 2 : Toutes les 2 heures
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] Job 2: Premium Alerts');
    await checkPremiumAlerts();
  });
  
  console.log('✅ CRON jobs started');
  console.log('  - Job 1: Every 6 hours (rates + free alerts)');
  console.log('  - Job 2: Every 2 hours (premium alerts)');
}