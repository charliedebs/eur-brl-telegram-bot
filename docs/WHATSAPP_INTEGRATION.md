# 📱 WhatsApp Integration Guide

## Overview

The EUR/BRL bot now supports **WhatsApp** alongside Telegram! The integration uses the same platform-agnostic `BotEngine` architecture, ensuring consistent functionality across both platforms.

## Architecture

```
┌─────────────────────────────────────────────┐
│              User Messages                   │
│         (Telegram / WhatsApp)                │
└──────────────┬──────────────────────────────┘
               │
       ┌───────▼────────┐
       │   Platform     │
       │   Adapters     │
       ├────────────────┤
       │ • Telegram     │
       │ • WhatsApp     │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │   BotEngine    │
       │ (Platform-     │
       │  Agnostic)     │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │   Handlers     │
       ├────────────────┤
       │ • Comparison   │
       │ • Guide        │
       │ • Alert        │
       │ • Premium      │
       └────────────────┘
```

## Key Differences: Telegram vs WhatsApp

| Feature | Telegram | WhatsApp |
|---------|----------|----------|
| **Buttons** | Inline keyboard buttons | Numbered text menus |
| **Selection** | Click button | Reply with number (1, 2, 3...) |
| **Authentication** | Bot token (instant) | QR code scan (one-time) |
| **Formatting** | HTML (`<b>`, `<i>`, `<code>`) | Markdown (`*bold*`, `_italic_`, ` ```code``` `) |
| **Deployment** | Stateless (webhook/polling) | Stateful (requires persistent session) |

## Components

### 1. WhatsApp Adapter (`src/platforms/whatsapp/adapter.js`)

**Responsibilities:**
- Send text messages with formatted text
- Send photos with captions
- Convert inline buttons to numbered text menus
- Parse user number selections (1, 2, 3...) back to button IDs
- Extract user info from WhatsApp messages

**Key Methods:**
```javascript
// Send message with buttons converted to numbered menu
await adapter.sendMessage(chatId, text, { buttons: [...] });

// Send photo with caption and buttons
await adapter.sendPhoto(chatId, photo, { caption, buttons });

// Parse "1", "2", "3" to button IDs
const buttonId = adapter.parseButtonSelection("2", lastButtons);
```

### 2. WhatsApp Bot Initialization (`src/platforms/whatsapp/index.js`)

**Features:**
- QR code authentication via `whatsapp-web.js`
- Event handlers (messages, authentication, errors)
- Button cache for number-based selection
- Integration with `BotEngine`

**Example Flow:**
```
1. User sends message → WhatsApp client receives
2. Extract message info → Pass to BotEngine
3. BotEngine processes → Returns response with buttons
4. Adapter converts buttons → Numbered text menu
5. Cache buttons for user → Enable number selection
6. Send formatted response → User sees menu
7. User replies "2" → Adapter maps to button ID
8. BotEngine handles action → Process continues
```

## Enabling WhatsApp

### 1. Set Environment Variable

```bash
# .env
WHATSAPP_ENABLED=true
```

### 2. Install Dependencies

All required dependencies are already in `package.json`:
- `whatsapp-web.js@^1.34.2` - WhatsApp Web API wrapper
- `qrcode-terminal@^0.12.0` - QR code display in terminal

```bash
npm install
```

### 3. Start the Bot

```bash
npm start
```

### 4. Scan QR Code

When the bot starts with `WHATSAPP_ENABLED=true`, you'll see:

```
📱 WhatsApp QR Code:

[QR CODE APPEARS HERE]

✅ Open WhatsApp on your phone
✅ Go to Settings > Linked Devices
✅ Tap "Link a Device"
✅ Scan the QR code above
```

**Important:** The QR code appears only once. After scanning, the session is saved in `.wwebjs_auth/` directory.

### 5. Test the Bot

Send a message to the linked WhatsApp number:
- `/start` - Initialize bot
- `/rate 1000` - Compare EUR/BRL rates
- `/alert` - Create a rate alert

## Deployment Considerations

### Development (Local)

✅ **Works out of the box** with QR code authentication

```bash
WHATSAPP_ENABLED=true npm run dev
```

### Production (Server)

⚠️ **Requires special configuration:**

1. **Headless Browser**: WhatsApp Web requires Chromium
   ```bash
   # Install Chromium on server
   apt-get install -y chromium-browser
   ```

2. **Persistent Storage**: Session data must persist across restarts
   ```javascript
   // Already configured in src/platforms/whatsapp/index.js
   authStrategy: new LocalAuth({
     clientId: 'eur-brl-bot',
     dataPath: './.wwebjs_auth'  // Mount persistent volume here
   })
   ```

3. **Memory Requirements**: Puppeteer + Chromium needs ~500MB RAM minimum

4. **First-Time Setup**: Manual QR scan required (connect to server terminal)

### Render Deployment

For Render.com deployment:

1. **Add Buildpack** (for Chromium):
   ```yaml
   # render.yaml
   buildCommand: |
     apt-get update
     apt-get install -y chromium-browser
     npm install
   ```

2. **Environment Variables**:
   ```
   WHATSAPP_ENABLED=true
   PUPPETEER_SKIP_DOWNLOAD=false
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```

3. **Persistent Disk**:
   - Mount disk at `./.wwebjs_auth/`
   - Minimum 1GB for session data

4. **Initial QR Scan**:
   - Use Render Shell to access terminal
   - Run bot and scan QR code
   - Session persists on disk

## Button Menu Format

WhatsApp doesn't support inline keyboards like Telegram. Instead, buttons are converted to numbered text menus:

**Telegram:**
```
[Button 1] [Button 2]
[Button 3]
```

**WhatsApp:**
```
📱 Menu:
1. Button 1
2. Button 2
3. Button 3

💬 Digite o número da opção desejada
```

User replies with `1`, `2`, or `3` to select.

## Error Handling

The WhatsApp adapter includes comprehensive error handling:

- **Authentication failures**: Logged and notified
- **Connection issues**: Automatic reconnection
- **Message send failures**: Fallback error message
- **Session corruption**: Clear `.wwebjs_auth/` and re-scan

## Logs

WhatsApp events are logged with `[WHATSAPP]` prefix:

```
[WHATSAPP] Initializing WhatsApp bot...
[WHATSAPP] QR Code received. Please scan with your phone
[WHATSAPP] WhatsApp authenticated successfully
[WHATSAPP] WhatsApp bot is ready!
[WHATSAPP] Processing message: userId=5521999999999
```

## Testing

### Unit Tests

```bash
# Test adapter loads
node -e "import('./src/platforms/whatsapp/adapter.js').then(() => console.log('✅ Adapter OK'))"

# Test bot engine
node -e "import('./src/core/bot-engine.js').then(() => console.log('✅ Engine OK'))"
```

### Integration Tests

1. Enable WhatsApp: `WHATSAPP_ENABLED=true`
2. Start bot: `npm start`
3. Scan QR code
4. Send test messages:
   - `oi` → Should show welcome menu
   - `1000` → Should show rate comparison
   - `/help` → Should show help text

## Limitations

1. **Single Device**: One WhatsApp number = One bot instance
2. **Session Required**: Not fully stateless (unlike Telegram)
3. **QR Re-authentication**: May be needed every ~14 days
4. **Group Messages**: Currently ignored (can be enabled)
5. **Media Support**: Limited compared to Telegram
6. **Rate Limits**: WhatsApp has stricter anti-spam rules

## Migration Path

### From Telegram-Only to Multi-Platform

The bot is now **multi-platform** by design:

1. **Database**: Multi-platform support added (migration `002_add_platform_support.sql`)
   - `platform` column in users table
   - `user_id` now stores Telegram ID or WhatsApp number

2. **Handlers**: Platform-agnostic
   - All handlers work with any platform
   - No Telegram-specific dependencies

3. **Messages**: Same message files for all platforms
   - `src/bot/messages/messages-pt.js` (Portuguese)
   - `src/bot/messages/messages-fr.js` (French)
   - `src/bot/messages/messages-en.js` (English)

### Adding More Platforms (Future)

To add a new platform (e.g., Discord, Slack):

1. **Create adapter**: `src/platforms/discord/adapter.js`
   - Implement: `sendMessage`, `sendPhoto`, `extractUserInfo`
   - Convert keyboards to platform-specific format

2. **Create platform entry point**: `src/platforms/discord/index.js`
   - Initialize platform client
   - Set up event handlers
   - Create `BotEngine` with adapter

3. **Update server.js**: Add initialization logic
   ```javascript
   if (process.env.DISCORD_ENABLED === 'true') {
     const { createDiscordBot } = await import('./platforms/discord/index.js');
     await createDiscordBot();
   }
   ```

## Support

For issues or questions:
- Check logs: `[WHATSAPP]` prefix
- Clear session: `rm -rf .wwebjs_auth/`
- Restart bot: Re-scan QR code
- GitHub Issues: [Report bugs](https://github.com/charliedebs/eur-brl-telegram-bot/issues)

## Status

✅ **Fully Implemented**
- WhatsApp adapter
- BotEngine integration
- Button menu system
- Session management
- Error handling
- Multi-language support

🚧 **Future Enhancements**
- Group message support
- Webhook-based WhatsApp (Business API)
- Media message handling
- Voice message transcription
- Contact/location sharing

---

**Last Updated:** November 12, 2025
