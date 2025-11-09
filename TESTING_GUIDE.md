# 🧪 Testing Guide - WhatsApp Integration

**Complete guide to test your multi-platform bot locally**

---

## ✅ Pre-Flight Check

Before testing, verify you have:

- [ ] `.env` file exists (copy from `.env.example` if needed)
- [ ] All required environment variables set:
  - `TELEGRAM_BOT_TOKEN`
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `OPENAI_API_KEY`
- [ ] Dependencies installed: `npm install`

---

## 🎯 Testing Strategy

We'll test in **3 phases**:

1. **Phase 1**: Telegram Only (verify nothing broke)
2. **Phase 2**: WhatsApp Integration (test new feature)
3. **Phase 3**: Both Running Together (verify independence)

---

## 📱 PHASE 1: Test Telegram Bot (Verify Zero Breaking Changes)

### **Objective**: Confirm existing Telegram bot works perfectly

### **Step 1: Ensure WhatsApp is Disabled**

Check your `.env` file:

```bash
# WhatsApp should NOT be set, or set to false
# WHATSAPP_ENABLED=false   # or just leave it unset
```

### **Step 2: Start the Bot**

```bash
npm start
```

### **Expected Output:**

```
✅ Environment variables validated
ℹ️  WHATSAPP_ENABLED not set - WhatsApp bot will not start (Telegram only)
Server running on port 3000
📅 Starting CRON jobs...
✅ Job 1: Rates History - Every 2 hours
✅ Job 2: Spontaneous Alerts - Every 6 hours
✅ Job 3: Programmed Alerts - Every 2 hours
Development mode: using polling
ℹ️  WhatsApp bot disabled. Set WHATSAPP_ENABLED=true to enable.
```

**✅ If you see this, Telegram bot is running!**

### **Step 3: Test Telegram Bot**

Open Telegram and message your bot. Test these commands:

**Basic Commands:**
```
/start
/help
/comparar 1000
/premium
/checkpayment
/lang
```

**Natural Language:**
```
quanto fica 1000 euros em reais?
how much is 500 euros in reais?
```

**Premium Flow:**
1. Send `/premium`
2. Click a plan button (Mensal/Trimestral/Anual)
3. Select a payment method
4. Verify QR code or payment link appears

### **Step 4: Check Health Endpoint**

In another terminal:

```bash
curl http://localhost:3000/health | jq
```

**Expected:**
```json
{
  "status": "ok",
  "services": {
    "telegram": "ok",
    "whatsapp": "disabled",
    "database": "ok"
  }
}
```

### **Step 5: Monitor Logs**

Watch the logs while testing:

```bash
# In another terminal
tail -f logs/combined.log
```

Look for:
- No errors
- Telegram messages being processed
- Database queries succeeding
- Payment flows working

---

## ✅ Phase 1 Complete!

**If everything above works, you've confirmed:**
- ✅ Telegram bot works perfectly
- ✅ No breaking changes
- ✅ All features functional
- ✅ Ready for Phase 2

Press **Ctrl+C** to stop the bot before Phase 2.

---

## 📱 PHASE 2: Test WhatsApp Bot (New Feature)

### **Objective**: Test WhatsApp integration in isolation

### **Step 1: Enable WhatsApp**

Edit your `.env` file and add:

```bash
WHATSAPP_ENABLED=true
```

Save the file.

### **Step 2: Start the Bot**

```bash
npm start
```

### **Expected Output:**

```
✅ Environment variables validated
ℹ️  WHATSAPP_ENABLED not set - WhatsApp bot will not start (Telegram only)
Server running on port 3000
Development mode: using polling
[WHATSAPP] Starting WhatsApp bot...
[WHATSAPP] Initializing WhatsApp bot...

📱 WhatsApp QR Code:

████ ████   ████ ████   ████ ████
████      ████  █    █      ████
████ ████ ████  █ ██ █ ████ ████
████ ████ ████  █    █ ████ ████
████      ████  █ ██ █      ████
████ ████   ████ ████   ████ ████

✅ Open WhatsApp on your phone
✅ Go to Settings > Linked Devices
✅ Tap "Link a Device"
✅ Scan the QR code above
```

**You should see a QR code in your terminal!**

### **Step 3: Scan QR Code with Your Phone**

**On your phone:**

1. Open **WhatsApp**
2. Tap the **⋮** menu (top right) or **Settings**
3. Select **Linked Devices**
4. Tap **Link a Device**
5. **Scan the QR code** from your terminal

### **Step 4: Wait for Connection**

After scanning, you should see:

```
[WHATSAPP] WhatsApp authenticated successfully
[WHATSAPP] WhatsApp bot is ready!
✅ WhatsApp bot is connected and ready!
```

**🎉 Success! WhatsApp is connected!**

### **Step 5: Test WhatsApp Bot**

Send messages to your WhatsApp number (the one you scanned with):

**Basic Commands:**
```
/start
/help
/comparar 1000
/premium
/checkpayment
/lang
```

**Test Button Interaction:**

1. Send `/premium`
2. You'll see a numbered menu:
   ```
   📱 Menu:
   1. 🟢 Mensal
   2. 🔵 Trimestral
   3. 🟣 Anual

   💬 Digite o número da opção desejada
   ```
3. Type `1` to select "Mensal"
4. You'll get payment methods menu
5. Type number to select payment method
6. Verify QR code or payment link appears

**Natural Language:**
```
quanto fica 500 euros?
how much is 1000 euros in reais?
```

### **Step 6: Test Image Sending (Pix QR Code)**

1. Send `/premium`
2. Select a plan (type `1`)
3. Select "Pix Manual" payment method
4. **Verify QR code image appears** in WhatsApp
5. Check the Pix key is displayed

### **Step 7: Check Health Endpoint**

```bash
curl http://localhost:3000/health | jq
```

**Expected:**
```json
{
  "status": "ok",
  "services": {
    "telegram": "ok",
    "whatsapp": "ok",  // or "CONNECTED"
    "database": "ok"
  }
}
```

### **Step 8: Monitor WhatsApp Logs**

```bash
tail -f logs/combined.log | grep WHATSAPP
```

Look for:
- `[WHATSAPP] Processing message`
- `[WHATSAPP] Button selected`
- No errors

---

## ✅ Phase 2 Complete!

**If everything above works, you've confirmed:**
- ✅ WhatsApp bot connects successfully
- ✅ QR code authentication works
- ✅ Commands are processed
- ✅ Button interaction works (numbered menu)
- ✅ Images/QR codes display
- ✅ Natural language works
- ✅ Payment flow works

---

## 📱 PHASE 3: Test Both Platforms Together

### **Objective**: Verify both bots work independently and simultaneously

Your bot should still be running from Phase 2 with both Telegram and WhatsApp enabled.

### **Step 1: Test Telegram Still Works**

Open Telegram and send:
```
/start
/comparar 1000
```

**Expected**: Telegram bot responds normally

### **Step 2: Test WhatsApp Still Works**

Open WhatsApp and send:
```
/start
/comparar 1000
```

**Expected**: WhatsApp bot responds normally

### **Step 3: Test Simultaneously**

1. Send `/premium` to **Telegram**
2. Immediately send `/premium` to **WhatsApp**
3. Verify **both respond independently**

### **Step 4: Test Independence**

**Simulate WhatsApp failure:**

1. On your phone, close WhatsApp app (or turn off WiFi)
2. WhatsApp bot will disconnect
3. Send message to **Telegram bot**
4. **Expected**: Telegram still works perfectly!

**Re-connect WhatsApp:**

1. Open WhatsApp on phone again
2. WhatsApp bot reconnects automatically
3. Send message to WhatsApp
4. **Expected**: Works again!

### **Step 5: Test Shared Services**

Both bots share the same backend. Test this:

**Scenario: Premium Purchase**

1. In **Telegram**: Send `/checkpayment`
   - Should show: "Você não tem Premium"

2. In **WhatsApp**: Send `/checkpayment`
   - Should show: "Você não tem Premium"

3. Make a premium purchase (through either platform)

4. In **Telegram**: Send `/checkpayment`
   - Should show: "Você é Premium! Expira em: [date]"

5. In **WhatsApp**: Send `/checkpayment`
   - Should show: "Você é Premium! Expira em: [date]"

**✅ This proves both bots share the same database!**

### **Step 6: Check Final Health Status**

```bash
curl http://localhost:3000/health | jq
```

**Expected:**
```json
{
  "status": "ok",
  "uptime": 300,
  "services": {
    "telegram": "ok",
    "whatsapp": "ok",
    "database": "ok"
  }
}
```

---

## ✅ All Phases Complete! 🎉

**Congratulations! You've verified:**
- ✅ Telegram bot works (no breaking changes)
- ✅ WhatsApp bot works (new feature)
- ✅ Both work simultaneously
- ✅ Both work independently
- ✅ Both share backend (database, payments, rates)
- ✅ One platform failing doesn't affect the other

---

## 🐛 Troubleshooting

### Issue: QR Code Not Appearing

**Possible causes:**
- Chromium not installed
- Puppeteer issues

**Solutions:**

1. Install Chromium (Linux):
   ```bash
   sudo apt-get update
   sudo apt-get install -y chromium-browser
   ```

2. Set Puppeteer path:
   ```bash
   export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   npm start
   ```

3. Check logs:
   ```bash
   tail -f logs/error.log | grep WHATSAPP
   ```

### Issue: "Session Expired" After Scan

**Solution:**
Delete session and re-scan:
```bash
rm -rf .wwebjs_auth/
npm start
# Scan QR code again
```

### Issue: WhatsApp Keeps Disconnecting

**Solutions:**
1. Keep phone connected to internet
2. Disable battery optimization for WhatsApp on phone
3. Use a dedicated phone number (not personal account)

### Issue: Bot Doesn't Respond on WhatsApp

**Check:**
1. Are you sending from a group? (Groups are ignored)
2. Is the message coming from your linked phone?
3. Check logs:
   ```bash
   tail -f logs/combined.log | grep WHATSAPP
   ```

### Issue: Telegram Stopped Working

**Quick fix:**
Disable WhatsApp temporarily:
```bash
# In .env
WHATSAPP_ENABLED=false
```

Restart:
```bash
npm start
```

If Telegram works now, the issue is WhatsApp-specific (not a breaking change).

---

## 📊 Performance Testing

### Load Test (Optional)

Send multiple messages rapidly to test:

**Telegram:**
```bash
# Send 10 messages quickly
for i in {1..10}; do
  # Use Telegram API or manual testing
  echo "Send: /comparar $((i * 100))"
done
```

**WhatsApp:**
```bash
# Send messages manually
# Try: /start, /help, /comparar 100, /comparar 200, etc.
```

**Expected:**
- Both bots respond to all messages
- No crashes
- No errors in logs
- Rate limiting works (if configured)

### Memory Usage

Check memory while both bots run:

```bash
ps aux | grep node
```

**Expected:**
- ~200-300MB for Node.js process
- No memory leaks (memory stays stable)

---

## 📋 Final Checklist

Before going live with both bots:

### Telegram Bot:
- [ ] `/start` works
- [ ] `/help` works
- [ ] `/comparar` shows rates
- [ ] `/premium` shows pricing
- [ ] Payment flow works
- [ ] Natural language works
- [ ] No errors in logs

### WhatsApp Bot:
- [ ] QR code scans successfully
- [ ] `/start` works
- [ ] `/help` works
- [ ] `/comparar` shows rates
- [ ] `/premium` shows pricing
- [ ] Numbered menu interaction works (type 1, 2, 3)
- [ ] QR code images display (Pix payments)
- [ ] Payment links work
- [ ] Natural language works
- [ ] No errors in logs

### Both Platforms:
- [ ] Health endpoint shows both as "ok"
- [ ] Database sharing works (premium status synced)
- [ ] Both work simultaneously
- [ ] One failing doesn't affect the other
- [ ] Logs show activity from both platforms

### Production Ready:
- [ ] All environment variables set
- [ ] `.wwebjs_auth/` in `.gitignore`
- [ ] Monitoring set up
- [ ] Backup strategy for WhatsApp session
- [ ] Documentation read

---

## 🚀 Next Steps After Testing

### If All Tests Pass:

1. **Commit the fix** (server.js bug fix from testing)
   ```bash
   git add src/server.js
   git commit -m "fix: correct server initialization in server.js"
   git push
   ```

2. **Deploy to production** (if using cloud platform)
   - Set `WHATSAPP_ENABLED=true` in production env vars
   - Check logs for QR code
   - Scan QR code with production phone number
   - Test both platforms in production

3. **Announce to users**
   - Tell Telegram users about WhatsApp
   - Share WhatsApp number
   - Explain button interaction (type numbers)

4. **Monitor closely** for first 24-48 hours
   - Watch logs for errors
   - Check health endpoint regularly
   - Respond to user feedback quickly

### If Tests Fail:

1. **Check logs** first:
   ```bash
   tail -100 logs/error.log
   ```

2. **Review troubleshooting** section above

3. **Disable WhatsApp** and verify Telegram works:
   ```bash
   # In .env
   WHATSAPP_ENABLED=false
   ```

4. **Report issues** with:
   - Error logs
   - Steps to reproduce
   - Environment details

---

## 📞 Support

**Quick Commands:**

```bash
# View all logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# View WhatsApp activity
tail -f logs/combined.log | grep WHATSAPP

# View Telegram activity
tail -f logs/combined.log | grep -E "Telegram|BOT"

# Check health
curl http://localhost:3000/health | jq

# Check if server is running
lsof -i :3000

# Kill server if needed
pkill -f "node src/server.js"
```

**Documentation:**
- WhatsApp setup: `docs/WHATSAPP_SETUP.md`
- Migration plan: `docs/WHATSAPP_MIGRATION_PLAN.md`
- Architecture: `docs/ARCHITECTURE_MULTIPLATFORM.md`

---

## 🎉 Testing Complete!

Once all three phases pass, you have:

- ✅ Multi-platform bot running perfectly
- ✅ Zero breaking changes confirmed
- ✅ Independent platform operation verified
- ✅ Shared backend working correctly
- ✅ Ready for production deployment

**Happy testing! 🚀**
