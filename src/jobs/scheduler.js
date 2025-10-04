import cron from 'node-cron';
import { saveRatesAndCheckFreeAlerts, checkPremiumAlerts } from './alerts.js';

export function startCronJobs() {
  console.log('📅 Starting CRON jobs...');
  
  // Job 1 : Toutes les 2 heures (00:00, 02:00, 04:00, etc.)
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] Job 1: Rates & Free Alerts');
    await saveRatesAndCheckFreeAlerts();
  });
  
  // Job 2 : Toutes les 2 heures également (cohérence)
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] Job 2: Premium Alerts');
    await checkPremiumAlerts();
  });
  
  console.log('✅ CRON jobs started');
  console.log('  - Job 1: Every 2 hours (rates + free alerts)');
  console.log('  - Job 2: Every 2 hours (premium alerts)');
}