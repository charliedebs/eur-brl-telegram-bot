# 🚀 WhatsApp Quick Start Guide

## Enable WhatsApp in 5 Minutes

### 1️⃣ Set Environment Variable

Edit your `.env` file:

```bash
# Enable WhatsApp
WHATSAPP_ENABLED=true
```

### 2️⃣ Install Dependencies (if not done)

```bash
npm install
```

### 3️⃣ Start the Bot

```bash
npm start
```

### 4️⃣ Scan QR Code

You'll see a QR code in your terminal:

```
📱 WhatsApp QR Code:

[QR CODE HERE]

✅ Open WhatsApp on your phone
✅ Go to Settings > Linked Devices
✅ Tap "Link a Device"
✅ Scan the QR code above
```

### 5️⃣ Test It!

Send a message to your linked WhatsApp number:

```
/start
```

You should receive the welcome menu!

## Example Interaction

**User:** `/rate 1000`

**Bot:**
```
💱 Comparação EUR → BRL

Você quer enviar: 1000 EUR
Destinatário recebe: 6,245.50 BRL

🏆 Melhor opção: Wise
Taxa: 6.2455 BRL/EUR
Custo: 4.20 EUR

📱 Menu:
1. Ver guia completo
2. Criar alerta de taxa
3. Converter BRL → EUR
4. Voltar ao menu

💬 Digite o número da opção desejada
```

**User:** `1`

**Bot:** [Shows complete transfer guide]

## Troubleshooting

### QR Code Won't Scan
- Make sure QR code is fully visible in terminal
- Try maximizing terminal window
- Ensure phone camera can focus on screen

### Bot Doesn't Respond
- Check logs for errors
- Verify `WHATSAPP_ENABLED=true` in `.env`
- Restart bot: Ctrl+C and `npm start`

### "Session Expired" Error
```bash
# Clear session and re-scan
rm -rf .wwebjs_auth/
npm start
```

## Next Steps

- Read full documentation: `docs/WHATSAPP_INTEGRATION.md`
- Configure premium features
- Set up alerts
- Deploy to production

## Need Help?

- Check logs: Look for `[WHATSAPP]` prefix
- GitHub Issues: [Report bugs](https://github.com/charliedebs/eur-brl-telegram-bot/issues)
- Documentation: See `docs/` folder

---

✨ **That's it!** Your bot is now live on WhatsApp.
