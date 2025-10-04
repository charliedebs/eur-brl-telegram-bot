// test-rates.js
import 'dotenv/config';
import { saveRatesHistory } from './src/jobs/rates-history.js';

console.log('🧪 Testing rates history job\n');

saveRatesHistory()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });