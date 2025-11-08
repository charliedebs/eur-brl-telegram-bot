# Payment System Quick Start

**Get your bot accepting payments in 15 minutes!**

## 🚀 Fastest Setup (Manual Pix Only)

If you want to start accepting payments TODAY with minimal setup:

### 1. Set Your Pix Key (2 minutes)

```bash
# Edit .env file
PIX_KEY=your-email@example.com  # Or phone: +5511999999999
APP_URL=https://t.me/your_bot_username
```

### 2. Create Database Table (1 minute)

Run in Supabase SQL Editor:

```sql
-- The schema.sql already includes this, but run if needed:
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    method VARCHAR(50) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);
```

### 3. Test It! (2 minutes)

```bash
# Restart your bot
npm start

# In Telegram:
/premium
# Select any plan
# Select "🏦 Pix Manual"
# You'll get a QR code!
```

### 4. Confirm Payments Manually

When users pay:

```sql
-- In Supabase SQL Editor:
-- 1. Find the payment
SELECT * FROM payments WHERE telegram_id = USER_TELEGRAM_ID ORDER BY created_at DESC LIMIT 1;

-- 2. Confirm it
UPDATE payments SET status = 'approved', confirmed_at = NOW() WHERE payment_id = 'PAYMENT_ID_FROM_ABOVE';

-- 3. Activate Premium
UPDATE users SET premium_until = NOW() + INTERVAL '30 days' WHERE telegram_id = USER_TELEGRAM_ID;
```

**Done! ✅** Users can now pay via Pix and you manually activate them.

---

## ⚡ Automated Setup (Recommended)

For automated payments without manual work:

### Option A: Mercado Pago (Brazilian Users)

**Setup Time: ~30 minutes**

1. **Get Access Token** ([Guide](https://www.mercadopago.com.br/developers/pt/docs/credentials))
   ```bash
   # Add to .env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-your-token-here
   MERCADOPAGO_WEBHOOK_URL=https://yourdomain.com/webhook/mercadopago
   ```

2. **Configure Webhook** in Mercado Pago Dashboard
   - URL: `https://yourdomain.com/webhook/mercadopago`
   - Events: "Payments"

3. **Test in Sandbox**
   ```bash
   # Use sandbox token first
   MERCADOPAGO_ACCESS_TOKEN=TEST-...

   # Test with card: 5031 4332 1540 6351
   ```

4. **Go Live**
   ```bash
   # Switch to production token
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-production-token
   ```

**Features:**
- ✅ Instant Pix payments
- ✅ Credit/debit cards accepted
- ✅ Automatic premium activation
- ✅ No manual work needed

---

### Option B: PayPal (International Users)

**Setup Time: ~30 minutes**

1. **Get API Credentials** ([Dashboard](https://developer.paypal.com/dashboard))
   ```bash
   # Add to .env
   PAYPAL_CLIENT_ID=your-client-id
   PAYPAL_CLIENT_SECRET=your-secret
   PAYPAL_MODE=sandbox  # Change to 'live' later
   ```

2. **Configure Webhook**
   - URL: `https://yourdomain.com/webhook/paypal`
   - Events: `PAYMENT.CAPTURE.COMPLETED`

3. **Test in Sandbox**
   - Create sandbox accounts
   - Test complete flow
   - Verify activation

4. **Go Live**
   ```bash
   PAYPAL_MODE=live
   # Use production credentials
   ```

**Features:**
- ✅ Accept credit cards globally
- ✅ USD payments
- ✅ Automatic activation
- ✅ PayPal buyer protection

---

## 📊 Current Setup Status

Check what you have configured:

```bash
# Run this in your terminal
node -e "
require('dotenv').config();
console.log('Payment Methods Available:');
console.log('✓ Manual Pix:', process.env.PIX_KEY ? 'Yes ✅' : 'No ❌');
console.log('✓ Mercado Pago:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Yes ✅' : 'No ❌');
console.log('✓ PayPal:', process.env.PAYPAL_CLIENT_ID ? 'Yes ✅' : 'No ❌');
"
```

---

## 🧪 Quick Test

### Test Payment Flow (Without Real Money)

1. **Start bot in dev mode**
   ```bash
   npm start
   ```

2. **Test command sequence:**
   ```
   User: /premium
   Bot: Shows pricing plans

   User: Clicks "Monthly"
   Bot: Shows payment methods

   User: Clicks payment method
   Bot: Shows payment details/link
   ```

3. **Check logs:**
   ```bash
   tail -f logs/combined.log | grep PAYMENT
   ```

4. **Verify database:**
   ```sql
   SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;
   ```

---

## 💰 Pricing Configuration

Current plans are set in `src/services/payments/index.js`:

```javascript
monthly: {
  duration: 30,
  prices: { BRL: 29.90, USD: 5.99 }
},
quarterly: {
  duration: 90,
  prices: { BRL: 79.90, USD: 15.99 },
  discount: '11%'
},
annual: {
  duration: 365,
  prices: { BRL: 299.90, USD: 59.99 },
  discount: '17%'
}
```

**To change prices:** Edit these values and restart the bot.

---

## 🔧 Troubleshooting Quick Fixes

### "Payment method not available"
```bash
# Check environment variables are set
env | grep MERCADOPAGO
env | grep PAYPAL
env | grep PIX
```

### "Webhook not received"
```bash
# Test webhook manually
curl -X POST https://yourdomain.com/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# Check logs
tail -f logs/combined.log | grep WEBHOOK
```

### "Premium not activating"
```sql
-- Check payment status
SELECT * FROM payments WHERE telegram_id = USER_ID ORDER BY created_at DESC;

-- Check user premium status
SELECT telegram_id, premium_until FROM users WHERE telegram_id = USER_ID;

-- Manually activate if needed
UPDATE users SET premium_until = NOW() + INTERVAL '30 days' WHERE telegram_id = USER_ID;
```

### "Database error"
```bash
# Verify payments table exists
# Run schema.sql in Supabase
```

---

## 📱 User Commands

Users can:
- `/premium` - View plans and subscribe
- `/checkpayment` - Check Premium status and expiry
- `/suporte` - Contact admin for manual Pix confirmation

Admin can (configure these):
- View pending payments
- Manually confirm payments
- Check payment statistics

---

## 🎯 Recommended Setup Order

**Day 1 (Today):**
1. ✅ Set up Manual Pix (15 mins)
2. ✅ Test payment flow
3. ✅ Accept first manual payment

**Day 2-3:**
1. ⚡ Set up Mercado Pago sandbox
2. ⚡ Test automated payments
3. ⚡ Go live with Mercado Pago

**Day 4-5:**
1. 🌍 Set up PayPal sandbox
2. 🌍 Test international payments
3. 🌍 Go live with PayPal

**Result:** Full payment system operational in less than a week!

---

## 📞 Need Help?

- **Detailed guide:** Read [PAYMENT_SETUP.md](./PAYMENT_SETUP.md)
- **Mercado Pago docs:** https://www.mercadopago.com.br/developers
- **PayPal docs:** https://developer.paypal.com/docs
- **Database setup:** See [schema.sql](./schema.sql)

---

## ✅ Quick Checklist

Before launching:

- [ ] At least ONE payment method configured
- [ ] Database `payments` table created
- [ ] Test payment completed successfully
- [ ] Premium activation verified
- [ ] User can check their premium status
- [ ] Admin can confirm manual payments (if using manual Pix)
- [ ] Logs are being monitored

**You're ready to accept Premium subscriptions! 🚀**
