# WhatsApp Cloud API Integration

This bot now uses **WhatsApp Cloud API** (official Meta API) instead of whatsapp-web.js.

## Benefits

✅ **No QR Code Required** - No need to scan QR codes or keep a phone connected
✅ **Real Interactive Buttons** - Up to 3 reply buttons or list messages (up to 10 options)
✅ **Professional & Reliable** - Hosted by Meta, no connection issues
✅ **Free Tier** - Free for conversations within 24h window (1000+ messages/month)
✅ **Webhooks** - Real-time message delivery via webhooks

## Setup Instructions

### 1. Get WhatsApp Cloud API Credentials

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Create an app or select existing app
3. Add **WhatsApp** product
4. Navigate to **API Setup** in WhatsApp section
5. Copy the following credentials:
   - **Phone Number ID** (`WHATSAPP_PHONE_NUMBER_ID`)
   - **WhatsApp Business Account ID** (`WHATSAPP_BUSINESS_ACCOUNT_ID`)
   - **Access Token** (`WHATSAPP_ACCESS_TOKEN`)
   - **App Secret** (`WHATSAPP_APP_SECRET`)

### 2. Configure Environment Variables

Add these to your `.env` file or Render environment variables:

```bash
# Enable WhatsApp
WHATSAPP_ENABLED=true

# WhatsApp Cloud API Credentials
WHATSAPP_API_VERSION=v21.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_APP_SECRET=your_app_secret_here
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token_here
```

**Note**: `WHATSAPP_VERIFY_TOKEN` is a custom string you create for webhook verification. Choose something secure like `eurbrlbot_webhook_2024`.

### 3. Configure Webhook in Meta Dashboard

1. In your app's WhatsApp configuration, go to **Configuration** > **Webhook**
2. Click **Edit**
3. Enter your webhook details:
   - **Callback URL**: `https://your-domain.com/webhook/whatsapp`
   - **Verify Token**: The same token you set in `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to **messages** webhook field
5. Click **Verify and Save**

### 4. Test the Integration

1. Send a message to your WhatsApp Business number
2. The bot should respond automatically
3. You'll see real interactive buttons!

## Access Token Management

### Temporary vs Permanent Tokens

- The token from the dashboard is **temporary** (24 hours)
- For production, create a **system user** with a permanent token:

1. Go to **Meta Business Suite** > **Settings** > **System Users**
2. Create a system user
3. Add **WhatsApp Management** permissions
4. Generate a permanent token
5. Replace `WHATSAPP_ACCESS_TOKEN` with the permanent token

## Architecture

```
User (WhatsApp) → Meta Cloud API → Webhook → Your Server
                                      ↓
                                  BotEngine
                                      ↓
                              Response sent via
                              Meta Cloud API
```

### Key Files

- `src/platforms/whatsapp/cloud-adapter.js` - WhatsApp Cloud API adapter
- `src/platforms/whatsapp/index.js` - Platform integration
- `src/platforms/whatsapp/keyboards.js` - Keyboard converter
- `src/server.js` - Webhook endpoints (GET & POST /webhook/whatsapp)

## Interactive Features

### Reply Buttons (≤3 buttons)
```javascript
// Automatically used when response has 1-3 buttons
response = {
  text: "Choose an option:",
  buttons: [
    { id: 'action1', text: 'Option 1' },
    { id: 'action2', text: 'Option 2' },
    { id: 'action3', text: 'Option 3' }
  ]
};
```

### List Messages (4-10 buttons)
```javascript
// Automatically used when response has 4-10 buttons
response = {
  text: "Select from menu:",
  buttons: [
    { id: 'opt1', text: 'Option 1' },
    { id: 'opt2', text: 'Option 2' },
    // ... up to 10 options
  ]
};
```

### Text Menu Fallback (>10 buttons)
```javascript
// Automatically falls back to numbered text menu
response = {
  text: "Choose an option:",
  buttons: [
    // More than 10 buttons - displayed as numbered list
  ]
};
```

## Pricing

### Free Tier
- **Conversations within 24h**: FREE
- **1000+ service conversations/month**: FREE (as of November 2024)
- **Marketing templates**: ~$0.005-0.01 per message

### What counts as a conversation?
- User initiates chat → Free within 24h
- Bot responds within 24h → Free
- Bot sends message after 24h → Paid (requires template)

## Monitoring

- **Health Check**: GET `/health` - Shows WhatsApp status
- **Admin Dashboard**: GET `/admin/whatsapp-qr` - Shows Cloud API status
- **Logs**: Check for `[WHATSAPP-CLOUD]` prefix

## Migration from whatsapp-web.js

✅ **Completed** - This bot has been migrated from whatsapp-web.js to Cloud API

**Key differences:**
| Feature | whatsapp-web.js | Cloud API |
|---------|----------------|-----------|
| Authentication | QR code | API credentials |
| Buttons | Text-based menu | Real interactive buttons |
| Reliability | Unstable | Very stable |
| Cost | Free | Free (24h window) |
| Official | ❌ No | ✅ Yes |
| Terms of Service | ⚠️ Violates ToS | ✅ Compliant |

## Troubleshooting

### Webhook verification fails
- Check `WHATSAPP_VERIFY_TOKEN` matches in both .env and Meta dashboard
- Ensure webhook URL is accessible publicly

### Messages not received
- Check webhook subscription includes "messages" field
- Verify webhook URL returns 200 status
- Check logs for errors

### Access token expired
- Replace with system user permanent token
- Current token expires in 24 hours

### No interactive buttons appearing
- Ensure you have fewer than 10 buttons (otherwise list is used)
- Check if WhatsApp app is updated on user's phone
- Verify buttons are correctly formatted

## Support

For issues or questions:
- Check logs: `[WHATSAPP-CLOUD]` prefix
- Meta documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
- WhatsApp Node.js SDK: https://github.com/WhatsApp/WhatsApp-Nodejs-SDK
