// src/platforms/whatsapp/index.js
// WhatsApp Cloud API platform integration with BotEngine
// Uses official Meta Cloud API instead of whatsapp-web.js

import { WhatsAppCloudAdapter } from './cloud-adapter.js';
import { BotEngine } from '../../core/bot-engine.js';
import { logger } from '../../utils/logger.js';

// Global state for status
export let whatsappStatus = 'initializing';
export let whatsappAdapter = null;
export let whatsappEngine = null;

/**
 * Initialize WhatsApp Cloud API bot with BotEngine
 * No QR code needed - works via webhooks with Cloud API credentials
 */
export async function createWhatsAppBot() {
  logger.info('[WHATSAPP-CLOUD] Initializing WhatsApp Cloud API bot...');

  // Validate required environment variables
  const required = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_VERIFY_TOKEN'
  ];

  const missing = required.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    const errorMsg = `Missing required WhatsApp environment variables: ${missing.join(', ')}`;
    logger.error('[WHATSAPP-CLOUD] ' + errorMsg);
    whatsappStatus = 'error';
    throw new Error(errorMsg);
  }

  try {
    // Create adapter and bot engine
    whatsappAdapter = new WhatsAppCloudAdapter();
    whatsappEngine = new BotEngine(whatsappAdapter);

    whatsappStatus = 'ready';

    logger.info('[WHATSAPP-CLOUD] WhatsApp Cloud API bot initialized successfully');
    logger.info('[WHATSAPP-CLOUD] Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);
    logger.info('[WHATSAPP-CLOUD] Webhook URL should be: https://your-domain.com/webhook/whatsapp');
    console.log('✅ WhatsApp Cloud API bot is ready!');
    console.log('📱 Configure webhook at: https://developers.facebook.com/apps');

    return {
      adapter: whatsappAdapter,
      engine: whatsappEngine,
      status: whatsappStatus
    };

  } catch (error) {
    whatsappStatus = 'error';
    logger.error('[WHATSAPP-CLOUD] Failed to initialize:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get current WhatsApp status
 */
export function getWhatsAppStatus() {
  return {
    status: whatsappStatus,
    adapter: whatsappAdapter,
    engine: whatsappEngine,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    isReady: whatsappStatus === 'ready'
  };
}

export { WhatsAppCloudAdapter } from './cloud-adapter.js';
