// src/platforms/whatsapp/index.js
// WhatsApp platform integration with BotEngine

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { WhatsAppAdapter } from './adapter.js';
import { BotEngine } from '../../core/bot-engine.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize WhatsApp bot with BotEngine
 */
export async function createWhatsAppBot() {
  logger.info('[WHATSAPP] Initializing WhatsApp bot...');

  // Create WhatsApp client with local authentication
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'eur-brl-bot',
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  // Create adapter and bot engine
  const adapter = new WhatsAppAdapter(client);
  const engine = new BotEngine(adapter);

  // Store last buttons sent to users for number-based selection
  const userButtonCache = new Map();

  // Set up event handlers
  setupEventHandlers(client, engine, adapter, userButtonCache);

  // Initialize client
  client.initialize();

  return { client, engine, adapter };
}

/**
 * Set up WhatsApp event handlers
 */
function setupEventHandlers(client, engine, adapter, userButtonCache) {
  // QR Code for authentication
  client.on('qr', (qr) => {
    logger.info('[WHATSAPP] QR Code received. Please scan with your phone:');
    console.log('\n📱 WhatsApp QR Code:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n✅ Open WhatsApp on your phone');
    console.log('✅ Go to Settings > Linked Devices');
    console.log('✅ Tap "Link a Device"');
    console.log('✅ Scan the QR code above\n');
  });

  // Ready
  client.on('ready', () => {
    logger.info('[WHATSAPP] WhatsApp bot is ready!');
    console.log('✅ WhatsApp bot is connected and ready!');
  });

  // Authenticated
  client.on('authenticated', () => {
    logger.info('[WHATSAPP] WhatsApp authenticated successfully');
  });

  // Authentication failure
  client.on('auth_failure', (msg) => {
    logger.error('[WHATSAPP] Authentication failure:', { error: msg });
    console.error('❌ WhatsApp authentication failed:', msg);
  });

  // Disconnected
  client.on('disconnected', (reason) => {
    logger.warn('[WHATSAPP] WhatsApp disconnected:', { reason });
    console.log('⚠️  WhatsApp disconnected:', reason);
  });

  // Handle incoming messages
  client.on('message', async (msg) => {
    try {
      // Ignore group messages and status updates
      if (msg.from.includes('@g.us') || msg.isStatus) {
        return;
      }

      // Ignore own messages
      if (msg.fromMe) {
        return;
      }

      await adapter.sendTyping(msg.from);

      const messageInfo = adapter.extractMessageInfo(msg);

      logger.info('[WHATSAPP] Processing message:', {
        userId: messageInfo.userId,
        text: messageInfo.text.substring(0, 50)
      });

      // Check if message is a button number selection
      const lastButtons = userButtonCache.get(messageInfo.userId);
      const buttonId = adapter.parseButtonSelection(messageInfo.text, lastButtons);

      let response;

      if (buttonId) {
        // User selected a button by number
        logger.info('[WHATSAPP] Button selected:', { userId: messageInfo.userId, buttonId });

        response = await engine.handleButtonClick({
          userId: messageInfo.userId,
          buttonId,
          platform: 'whatsapp'
        });
      } else {
        // Regular message processing
        response = await engine.processMessage({
          userId: messageInfo.userId,
          text: messageInfo.text,
          platform: 'whatsapp',
          username: messageInfo.username,
          messageId: messageInfo.messageId
        });
      }

      // Cache buttons for this user if response has buttons
      if (response.buttons && response.buttons.length > 0) {
        userButtonCache.set(messageInfo.userId, response.buttons);
      }

      // Send response
      await adapter.sendResponse(msg.from, response);

    } catch (error) {
      logger.error('[WHATSAPP] Error handling message:', {
        error: error.message,
        stack: error.stack
      });

      try {
        await client.sendMessage(
          msg.from,
          '❌ Erro ao processar mensagem. Tente novamente.'
        );
      } catch (sendError) {
        logger.error('[WHATSAPP] Error sending error message:', {
          error: sendError.message
        });
      }
    }
  });

  // Handle message creation (for debugging)
  client.on('message_create', (msg) => {
    if (msg.fromMe) {
      logger.debug('[WHATSAPP] Sent message:', {
        to: msg.to,
        text: msg.body?.substring(0, 50)
      });
    }
  });

  // Error handling
  client.on('error', (error) => {
    logger.error('[WHATSAPP] Client error:', {
      error: error.message,
      stack: error.stack
    });
  });
}

export { WhatsAppAdapter } from './adapter.js';
