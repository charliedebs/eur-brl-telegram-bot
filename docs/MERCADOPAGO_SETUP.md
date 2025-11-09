# 🚀 Mercado Pago Setup Guide

**Complete guide to set up Mercado Pago for professional payment processing**

---

## 📋 Why Mercado Pago?

✅ **Professional Pix QR codes** that work 100% of the time
✅ **Automatic payment confirmation** via webhook (no manual activation)
✅ **Professional appearance** - no personal CPF/name shown to users
✅ **Support for credit cards, boleto, and other payment methods**
✅ **Official API** - fully supported and reliable
✅ **Detailed reports** - track all payments in one dashboard

---

## 🎯 Setup Steps

### **Step 1: Create Mercado Pago Account**

1. Go to [https://www.mercadopago.com.br](https://www.mercadopago.com.br)
2. Click **"Criar conta"** (Create account)
3. Choose **"Vendedor"** (Seller) account type
4. Fill in your details:
   - Email
   - Password
   - CPF (or CNPJ if you have a company)
5. Verify your email

**⏱️ Time required:** 5 minutes

---

### **Step 2: Upgrade to Business Account (Optional but Recommended)**

For a more professional appearance:

1. Log in to [https://www.mercadopago.com.br](https://www.mercadopago.com.br)
2. Go to **"Configurações"** → **"Conta"**
3. Select **"Conta empresa"** (Business account)
4. Fill in business details (you can use MEI if you have one)

**Benefits:**
- Payments show your business name instead of personal name
- Better for tax purposes
- Professional branding

**⏱️ Time required:** 10 minutes (optional)

---

### **Step 3: Get Your Access Token**

1. Go to [https://www.mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Click on **"Suas integrações"** (Your integrations)
3. Click **"Criar aplicação"** (Create application)
4. Fill in the form:
   - **Nome da aplicação:** EUR/BRL Bot
   - **Modelo de integração:** Pagamentos online
   - **Produto:** Checkout Transparente
5. Click **"Criar aplicação"**

6. You'll see two tokens:
   - **Public Key** (starts with `APP_USR`)
   - **Access Token** (starts with `APP_USR`)

7. **Copy the Access Token** (you'll need it for Step 5)

**⚠️ IMPORTANT:** Keep this token **SECRET**! Don't share it or commit it to git.

**⏱️ Time required:** 5 minutes

---

### **Step 4: Set Up Webhook (for automatic payment confirmation)**

This is crucial - it allows your bot to automatically detect when a payment is completed!

1. In the **Mercado Pago Developers** dashboard:
2. Go to your application
3. Click **"Webhooks"** in the left menu
4. Add a new webhook:
   - **URL:** `https://your-bot-domain.com/webhook/mercadopago`
   - **Events:** Select:
     - `payment` (all payment events)

5. Save the webhook

**📝 Note:** You need a public HTTPS URL for webhooks. Options:
- **Production:** Use your hosting URL (Railway, Render, Heroku, etc.)
- **Development:** Use [ngrok](https://ngrok.com) to expose localhost:
  ```bash
  ngrok http 3000
  # Copy the https URL (e.g., https://abc123.ngrok.io)
  # Set webhook to: https://abc123.ngrok.io/webhook/mercadopago
  ```

**⏱️ Time required:** 10 minutes

---

### **Step 5: Configure Your Bot**

Add the Access Token to your `.env` file:

```bash
# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890abcdef-xxxxxx-xxxxxxxxxxxxxxxxx
```

**Replace with your actual Access Token from Step 3!**

**⏱️ Time required:** 1 minute

---

### **Step 6: Test the Integration**

1. **Start your bot:**
   ```bash
   npm start
   ```

2. **Send test commands:**
   - Send `/premium` to your bot
   - Select a plan (3 months / 6 months / 12 months)
   - Click **"Mercado Pago"**
   - You should receive a payment link with a **"Pagar / Pay"** button

3. **Click the payment button** - it will open Mercado Pago checkout

4. **Test the payment:**
   - **Option 1: Use test credentials** (for testing without real money)
     - Go to [https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing)
     - Use test cards provided in documentation

   - **Option 2: Make a small real payment** (e.g., 3-month plan R$ 15)
     - Use your own Pix or credit card
     - Money will go to your Mercado Pago account

5. **Verify automatic confirmation:**
   - After payment, your bot should automatically detect it via webhook
   - Premium status should activate automatically
   - Check with `/checkpayment`

**⏱️ Time required:** 10 minutes

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] Mercado Pago account created and verified
- [ ] Access Token copied to `.env` file
- [ ] Webhook URL configured correctly
- [ ] Bot starts without errors
- [ ] `/premium` command shows payment options
- [ ] "Mercado Pago" button generates payment link
- [ ] Payment link opens Mercado Pago checkout
- [ ] Payment can be completed successfully
- [ ] Webhook receives payment notification
- [ ] Premium is activated automatically
- [ ] `/checkpayment` shows premium status

---

## 🔍 How Mercado Pago Payment Flow Works

1. **User selects a plan** (3, 6, or 12 months)
2. **User clicks "Mercado Pago"** button
3. **Bot creates a payment preference** via Mercado Pago API
4. **User receives payment link** with button
5. **User clicks button** → opens Mercado Pago checkout page
6. **User chooses payment method:**
   - **Pix:** Scan QR code with bank app (instant)
   - **Credit Card:** Enter card details (instant)
   - **Boleto:** Generate boleto to pay at bank (takes 1-3 days)
7. **User completes payment**
8. **Mercado Pago sends webhook** to your bot
9. **Bot automatically activates premium** for the user
10. **User receives confirmation** message

**Total time:** 1-2 minutes for Pix, instant for cards

---

## 💡 Payment Methods Available

When users click the Mercado Pago link, they can choose:

| Method | Time | Fee |
|--------|------|-----|
| **Pix** | Instant | ~1% |
| **Credit Card** | Instant | ~4-5% |
| **Debit Card** | Instant | ~2-3% |
| **Boleto** | 1-3 days | ~3% |

**💰 Fees are deducted by Mercado Pago before transferring to your account.**

---

## 🔒 Security Best Practices

### 1. **Never commit your Access Token to git**

✅ Good:
```bash
# .env (not committed)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-real-token-here
```

❌ Bad:
```javascript
// Hardcoded in code - NEVER DO THIS!
const token = 'APP_USR-1234567890abcdef';
```

### 2. **Use production credentials only in production**

- Development: Use test credentials
- Production: Use production credentials

### 3. **Validate webhook signatures** (already implemented in code)

The bot validates that webhooks actually come from Mercado Pago.

### 4. **Monitor your Mercado Pago dashboard**

Check for suspicious activity regularly:
[https://www.mercadopago.com.br/activities](https://www.mercadopago.com.br/activities)

---

## 💰 Receiving Your Money

### **How to withdraw from Mercado Pago:**

1. Money from payments goes to your **Mercado Pago balance**
2. Go to **"Dinheiro disponível"** (Available money)
3. Click **"Transferir"** (Transfer)
4. Choose:
   - **Bank account:** Add your bank details (free, takes 1 business day)
   - **Pix:** Instant withdrawal (may have a small fee)

### **Fees:**

- **Transaction fees:** ~1-5% (depends on payment method)
- **Withdrawal to bank:** Free
- **Pix withdrawal:** Usually free, check current rates

### **Tax reporting:**

Mercado Pago provides monthly reports for tax purposes.
Download from: **Configurações → Relatórios**

---

## 🐛 Troubleshooting

### **Issue: "Access Token inválido"**

**Solution:**
- Verify token is correct in `.env`
- Check you copied **Access Token**, not Public Key
- Make sure there are no spaces or line breaks in token

### **Issue: Payment link doesn't work**

**Solution:**
- Check logs for errors: `tail -f logs/error.log`
- Verify Access Token is configured
- Check your Mercado Pago account is active and verified

### **Issue: Webhook not receiving notifications**

**Solution:**
1. Check webhook URL is correct and publicly accessible
2. Test webhook with ngrok for local development
3. Check webhook endpoint is registered in Mercado Pago dashboard
4. Look for webhook errors in logs: `tail -f logs/combined.log | grep WEBHOOK`

### **Issue: Premium not activating automatically**

**Solution:**
1. Check webhook is configured correctly
2. Verify webhook endpoint is reachable
3. Check logs for webhook processing errors
4. Manually check payment status in Mercado Pago dashboard

### **Issue: Test payments not working**

**Solution:**
- Make sure you're using test credentials from Mercado Pago docs
- Verify you're in "Modo Sandbox" (test mode) in developer dashboard
- Use correct test card numbers from documentation

---

## 📊 Monitoring Payments

### **Mercado Pago Dashboard**

Monitor all payments:
[https://www.mercadopago.com.br/activities](https://www.mercadopago.com.br/activities)

Filter by:
- Date range
- Payment status (approved, pending, rejected)
- Payment method (pix, credit card, etc.)

### **Bot Logs**

```bash
# View all payment activity
tail -f logs/combined.log | grep -E 'PAYMENT|WEBHOOK|PREMIUM'

# View only errors
tail -f logs/error.log
```

### **Database Check**

```bash
# Check premium users
# (Connect to your Supabase dashboard or use SQL client)
SELECT telegram_id, premium_until, plan_type
FROM users
WHERE premium_until > NOW()
ORDER BY premium_until DESC;
```

---

## 🎯 Next Steps After Setup

1. **Test thoroughly** with small payments
2. **Monitor logs** for first few transactions
3. **Set up automatic backup** of Mercado Pago transaction data
4. **Create refund policy** for users
5. **Announce to users** that Mercado Pago is available!

---

## 📚 Additional Resources

- **Mercado Pago Docs:** [https://www.mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
- **API Reference:** [https://www.mercadopago.com.br/developers/pt/reference](https://www.mercadopago.com.br/developers/pt/reference)
- **Test Cards:** [https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing)
- **Webhook Events:** [https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

---

## ❓ FAQ

### **Q: Can I use Mercado Pago if I don't have a company?**
A: Yes! You can use a personal account (CPF). For a more professional appearance, consider registering as MEI (Microempreendedor Individual).

### **Q: How long does it take to receive money?**
A: Money is available in your Mercado Pago balance immediately after payment. Withdrawal to bank takes 1 business day.

### **Q: What's the difference between Pix Manual and Mercado Pago Pix?**
A:
- **Pix Manual:** Shows your Pix key, user pays manually, you activate premium manually
- **Mercado Pago Pix:** Generates QR code, automatic confirmation, professional appearance

### **Q: Can users pay with credit card?**
A: Yes! Mercado Pago supports credit cards, debit cards, boleto, and Pix.

### **Q: What if a payment fails?**
A: The webhook will notify your bot. You can also check payment status in the Mercado Pago dashboard and handle manually if needed.

### **Q: Can I offer discounts or coupons?**
A: Yes! Mercado Pago supports discount codes. You can configure them in the payment preference creation.

---

## 🎉 Success!

Once setup is complete, you'll have:

✅ Professional payment processing
✅ Automatic payment confirmation
✅ Multiple payment methods (Pix, cards, boleto)
✅ Detailed transaction reports
✅ Secure and reliable system
✅ Professional appearance (no personal info shown)

**You're ready to accept payments! 🚀**

---

## 💬 Need Help?

If you encounter issues:

1. **Check this guide** thoroughly
2. **Review bot logs:** `tail -f logs/error.log`
3. **Check Mercado Pago dashboard** for payment status
4. **Review Mercado Pago documentation**
5. **Test webhook** with ngrok for local debugging

**Remember:** Mercado Pago support is available at [https://www.mercadopago.com.br/ajuda](https://www.mercadopago.com.br/ajuda)

---

**Happy selling! 💰**
