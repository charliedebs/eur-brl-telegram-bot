# Payment System Setup Guide

This guide explains how to configure the payment system for your EUR/BRL Telegram bot, including Pix (via Mercado Pago), manual Pix, and PayPal integration.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Payment Methods](#payment-methods)
3. [Mercado Pago Setup (Pix + Cards)](#mercado-pago-setup)
4. [PayPal Setup](#paypal-setup)
5. [Manual Pix Setup](#manual-pix-setup)
6. [Database Configuration](#database-configuration)
7. [Testing Payments](#testing-payments)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Your bot now supports **three payment methods**:

| Method | Currency | Target Audience | Automation | Setup Difficulty |
|--------|----------|----------------|------------|------------------|
| **Mercado Pago** | BRL (R$) | Brazilian users | ✅ Fully automated | Medium |
| **PayPal** | USD ($) | International users | ✅ Fully automated | Medium |
| **Manual Pix** | BRL (R$) | Brazilian users | ❌ Manual confirmation | Easy |

**Premium Plans:**
- 🟢 **Monthly**: R$ 29.90 / $5.99 (30 days)
- 🔵 **Quarterly**: R$ 79.90 / $15.99 (90 days) - Save 11%
- 🟣 **Annual**: R$ 299.90 / $59.99 (365 days) - Save 17%

---

## 💳 Payment Methods

### 1. **Mercado Pago** (Recommended for Brazil)

**Advantages:**
- ✅ Automated Pix payments
- ✅ Accept credit/debit cards
- ✅ Instant payment confirmation
- ✅ No manual intervention needed
- ✅ Built-in anti-fraud protection

**Disadvantages:**
- ❌ Requires business account
- ❌ Transaction fees (~3.99% + R$ 0.40)
- ❌ Only works in Brazil

### 2. **PayPal** (Recommended for International)

**Advantages:**
- ✅ Global payment acceptance
- ✅ Support for credit cards worldwide
- ✅ Automated confirmation
- ✅ Buyer protection included

**Disadvantages:**
- ❌ Higher fees (~4.99% + fixed fee)
- ❌ Not popular in Brazil
- ❌ Currency conversion fees

### 3. **Manual Pix** (Fallback Option)

**Advantages:**
- ✅ Zero setup cost
- ✅ No third-party fees
- ✅ Direct to your bank account
- ✅ Works immediately

**Disadvantages:**
- ❌ Requires manual confirmation
- ❌ Slower activation (admin intervention)
- ❌ No automatic refunds

---

## 🇧🇷 Mercado Pago Setup

### Step 1: Create Mercado Pago Account

1. Go to [mercadopago.com.br](https://www.mercadopago.com.br)
2. Register for a business account
3. Complete identity verification (CPF/CNPJ)
4. Link your bank account for withdrawals

### Step 2: Get API Credentials

1. Log into your Mercado Pago account
2. Go to **"Seu negócio" → "Configurações" → "Credenciais"**
3. Copy your **Access Token**:
   - For testing: Use **Sandbox credentials**
   - For production: Use **Production credentials**

**Example:**
```
Access Token: APP_USR-1234567890123456-123456-abcdef...
```

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=APP_USR-your-access-token-here
MERCADOPAGO_WEBHOOK_URL=https://yourdomain.com/webhook/mercadopago

# Your server URL (for payment redirects)
APP_URL=https://t.me/your_bot_username
```

### Step 4: Set Up Webhooks

1. In Mercado Pago dashboard, go to **"Webhooks"**
2. Click **"Add new webhook"**
3. Configure:
   - **URL**: `https://yourdomain.com/webhook/mercadopago`
   - **Events**: Select **"Payments"**
   - **API Version**: V1

4. Save and note the webhook secret (optional, for signature verification)

### Step 5: Test in Sandbox Mode

1. Use sandbox credentials initially
2. Test with [Mercado Pago test cards](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards)
3. Verify webhook notifications are received
4. Check payment activation works

**Test Card:**
```
Card: 5031 4332 1540 6351
CVV: 123
Expiry: Any future date
Name: APRO (for approved)
```

### Step 6: Go Live

1. Switch to production credentials
2. Update `MERCADOPAGO_ACCESS_TOKEN` in `.env`
3. Test with small real payment
4. Monitor logs for any issues

---

## 🌍 PayPal Setup

### Step 1: Create PayPal Business Account

1. Go to [paypal.com/business](https://www.paypal.com/business)
2. Sign up for a business account
3. Complete verification process
4. Link your bank account

### Step 2: Create App for API Access

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. Click **"Apps & Credentials"**
3. Create a new app:
   - **App Name**: "EUR-BRL Bot"
   - **App Type**: "Merchant"

4. Get your credentials:
   - **Client ID**
   - **Secret**

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your-client-id-here
PAYPAL_CLIENT_SECRET=your-client-secret-here
PAYPAL_MODE=sandbox  # Change to 'live' for production
PAYPAL_WEBHOOK_ID=your-webhook-id-here  # Optional, for verification

# Your server URL
APP_URL=https://t.me/your_bot_username
```

### Step 4: Set Up Webhooks

1. In PayPal Developer Dashboard, go to **"Webhooks"**
2. Click **"Add Webhook"**
3. Configure:
   - **Webhook URL**: `https://yourdomain.com/webhook/paypal`
   - **Events**: Select:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`

4. Save and copy the **Webhook ID**

### Step 5: Test in Sandbox Mode

1. Use sandbox credentials
2. Create [sandbox test accounts](https://developer.paypal.com/dashboard/accounts)
3. Test complete payment flow
4. Verify webhook notifications

**Test Accounts:**
- **Buyer**: Use sandbox personal account
- **Seller**: Use sandbox business account

### Step 6: Go Live

1. Switch `PAYPAL_MODE` to `live`
2. Use production credentials
3. Test with small real payment
4. Monitor for successful activations

---

## 🏦 Manual Pix Setup

This is the simplest option requiring no third-party setup.

### Step 1: Get Your Pix Key

Your Pix key can be:
- 📧 Email address
- 📱 Phone number (+55...)
- 🆔 CPF/CNPJ
- 🔑 Random key (UUID)

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Manual Pix Configuration
PIX_KEY=your-email@example.com  # Or your phone/CPF/random key
```

### Step 3: Handle Manual Confirmations

When users pay via manual Pix:

1. They receive a QR code and your Pix key
2. They make the payment in their banking app
3. They send you the payment receipt via `/suporte`
4. **You manually confirm** by running:

```bash
# Admin command to confirm payment
# (You'll need to implement this admin interface)
```

**Or via database:**
```sql
-- Update payment status manually
UPDATE payments
SET status = 'approved',
    confirmed_at = NOW()
WHERE payment_id = 'USER123_monthly_1234567890';

-- Activate premium
UPDATE users
SET premium_until = NOW() + INTERVAL '30 days'
WHERE telegram_id = 123456789;
```

### Step 4: Notify User

After manual confirmation, send a message:

```javascript
await bot.telegram.sendMessage(
  telegram_id,
  '🎉 Pagamento confirmado! Seu Premium foi ativado.'
);
```

---

## 🗄️ Database Configuration

### Step 1: Create Payments Table

Run this SQL in your Supabase SQL Editor:

```sql
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
    confirmed_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX idx_payments_payment_id ON payments(payment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
```

This table tracks all payments across all methods.

### Step 2: Verify User Table

Ensure your `users` table has the `premium_until` column:

```sql
-- Add if missing
ALTER TABLE users
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;

-- Index for premium queries
CREATE INDEX IF NOT EXISTS idx_users_premium_until ON users(premium_until);
```

---

## 🧪 Testing Payments

### Test Checklist

#### 1. **Test Manual Pix**
```bash
# In Telegram:
/premium
# Select a plan
# Select "Pix Manual"
# Verify QR code is generated
# Check payment record in database
```

#### 2. **Test Mercado Pago (Sandbox)**
```bash
# Set sandbox credentials
MERCADOPAGO_ACCESS_TOKEN=TEST-...

# In Telegram:
/premium
# Select plan
# Select "Mercado Pago"
# Use test card to complete payment
# Verify webhook is received
# Check premium is activated
```

#### 3. **Test PayPal (Sandbox)**
```bash
# Use sandbox credentials
PAYPAL_MODE=sandbox

# In Telegram:
/premium
# Select plan
# Select "PayPal"
# Complete payment with sandbox account
# Verify webhook is received
# Check premium activation
```

#### 4. **Test Premium Features**
```bash
# After activation, test:
/checkpayment  # Verify premium status
/alert         # Test premium feature access
```

### Monitor Logs

Watch for payment events:

```bash
# On your server
tail -f logs/combined.log | grep PAYMENT
tail -f logs/combined.log | grep WEBHOOK
```

---

## 🔧 Troubleshooting

### Issue: Mercado Pago Webhook Not Received

**Solutions:**
1. Verify webhook URL is publicly accessible (use ngrok for local testing)
2. Check Mercado Pago dashboard for webhook errors
3. Ensure `MERCADOPAGO_WEBHOOK_URL` matches configured URL
4. Test webhook manually with cURL:

```bash
curl -X POST https://yourdomain.com/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type": "payment", "data": {"id": "123456"}}'
```

### Issue: PayPal Payment Not Captured

**Solutions:**
1. Verify order status in PayPal dashboard
2. Check if user completed payment approval
3. Ensure webhook signature verification isn't blocking
4. Review logs for capture errors

### Issue: Manual Pix QR Code Not Generated

**Solutions:**
1. Verify `qrcode` package is installed: `npm list qrcode`
2. Check `PIX_KEY` is set in environment
3. Review error logs for QR generation failures

### Issue: Premium Not Activating

**Solutions:**
1. Check database connection
2. Verify `premium_until` field exists in users table
3. Review payment webhook logs
4. Manually check payment status:

```javascript
// In node REPL or script
const { checkPaymentStatus } = require('./src/services/payments/mercadopago');
await checkPaymentStatus('PAYMENT_ID');
```

### Issue: Wrong Price Displayed

**Solutions:**
1. Verify plan configuration in `src/services/payments/mercadopago.js`
2. Check currency conversion if needed
3. Ensure plan name matches ('monthly', 'quarterly', 'annual')

---

## 🔒 Security Best Practices

1. **Never commit credentials** to git
   - Use `.env` file (already in `.gitignore`)
   - Rotate keys if accidentally exposed

2. **Verify webhook signatures**
   - Mercado Pago: Implement signature validation
   - PayPal: Already implemented, ensure `PAYPAL_WEBHOOK_ID` is set

3. **Use HTTPS in production**
   - Webhooks require HTTPS
   - Use services like Railway, Heroku, or VPS with SSL

4. **Monitor for fraud**
   - Review unusual payment patterns
   - Set up alerts for high-value transactions
   - Check Mercado Pago/PayPal dashboards regularly

5. **Backup payment data**
   - Regularly backup your Supabase database
   - Keep payment records for accounting/taxes

---

## 📊 Admin Dashboard (Optional)

For better payment management, consider building an admin dashboard:

```javascript
// Example: List recent payments
bot.command('adminpayments', async (ctx) => {
  // Check if user is admin
  if (ctx.from.id !== parseInt(process.env.ADMIN_TELEGRAM_ID)) {
    return ctx.reply('❌ Unauthorized');
  }

  const db = new DatabaseService();
  const payments = await db.getPendingPayments();

  let text = '💰 Pending Payments:\n\n';
  payments.forEach(p => {
    text += `User: ${p.telegram_id}\n`;
    text += `Plan: ${p.plan}\n`;
    text += `Amount: ${p.currency} ${p.amount}\n`;
    text += `Method: ${p.method}\n`;
    text += `Created: ${new Date(p.created_at).toLocaleString()}\n\n`;
  });

  await ctx.reply(text);
});
```

---

## 📞 Support

If you encounter issues:

1. Check the logs: `logs/error.log` and `logs/combined.log`
2. Review webhook status in provider dashboards
3. Test with sandbox/test credentials first
4. Verify all environment variables are set correctly

For Mercado Pago issues: [Mercado Pago Support](https://www.mercadopago.com.br/developers/pt/support)
For PayPal issues: [PayPal Developer Support](https://developer.paypal.com/support/)

---

## ✅ Final Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database `payments` table created
- [ ] Webhooks tested and working
- [ ] Test payments completed successfully in sandbox
- [ ] Premium activation verified
- [ ] Logs monitored for errors
- [ ] Backup system in place
- [ ] Admin notification system working
- [ ] Terms of service updated (if applicable)
- [ ] Refund policy defined

**Congratulations! Your payment system is ready to accept Premium subscriptions! 🎉**
