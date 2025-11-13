// src/platforms/whatsapp/cloud-adapter.js
// WhatsApp Cloud API adapter for BotEngine (official Meta API)

import WhatsApp from 'whatsapp';
import { logger } from '../../utils/logger.js';
import { buildWhatsAppKeyboard } from './keyboards.js';

export class WhatsAppCloudAdapter {
  constructor() {
    this.platform = 'whatsapp';

    // Initialize WhatsApp Cloud API client
    this.client = new WhatsApp({
      token: process.env.WHATSAPP_ACCESS_TOKEN,
      appSecret: process.env.WHATSAPP_APP_SECRET,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0'
    });

    // Cache last buttons sent to each user for fallback
    this.userButtonCache = new Map();

    logger.info('[WHATSAPP-CLOUD] Adapter initialized with phone ID:',
      process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  /**
   * Process incoming message from webhook
   * This is the main entry point for all WhatsApp messages via webhook
   *
   * @param {Object} webhookData - WhatsApp webhook message data
   * @param {Object} engine - BotEngine instance
   * @returns {Object} Response from BotEngine
   */
  async processIncomingMessage(webhookData, engine) {
    const messageInfo = this.extractMessageInfo(webhookData);

    // Mark message as read
    await this.markAsRead(messageInfo.messageId);

    logger.info('[WHATSAPP-CLOUD] Processing message:', {
      userId: messageInfo.userId,
      text: messageInfo.text.substring(0, 50),
      type: webhookData.type
    });

    // Check if user clicked an interactive button
    if (webhookData.type === 'interactive') {
      const buttonId = webhookData.interactive?.button_reply?.id ||
                       webhookData.interactive?.list_reply?.id;

      if (buttonId) {
        logger.info('[WHATSAPP-CLOUD] Button clicked:', {
          userId: messageInfo.userId,
          buttonId
        });

        const response = await engine.handleButtonClick({
          userId: messageInfo.userId,
          buttonId,
          platform: 'whatsapp'
        });

        return response;
      }
    }

    // Regular message processing
    const response = await engine.processMessage({
      userId: messageInfo.userId,
      text: messageInfo.text,
      platform: 'whatsapp',
      username: messageInfo.username,
      messageId: messageInfo.messageId
    });

    return response;
  }

  /**
   * Send a text message with optional interactive buttons
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const formattedText = this.formatText(text);

      // Convert keyboard to buttons if provided
      const buttons = this.convertKeyboard(options.keyboard || options.buttons);

      // Build message payload
      const message = {
        messaging_product: 'whatsapp',
        to: chatId,
        type: 'text',
        text: { body: formattedText }
      };

      // Add interactive buttons if available (max 3 reply buttons)
      if (buttons && buttons.length > 0) {
        if (buttons.length <= 3) {
          // Use reply buttons for 3 or fewer buttons
          message.type = 'interactive';
          message.interactive = {
            type: 'button',
            body: { text: formattedText },
            action: {
              buttons: buttons.slice(0, 3).map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.text.substring(0, 20) // Max 20 chars
                }
              }))
            }
          };
          delete message.text;
        } else if (buttons.length <= 10) {
          // Use list for 4-10 buttons
          message.type = 'interactive';
          message.interactive = {
            type: 'list',
            body: { text: formattedText },
            action: {
              button: '📱 Menu',
              sections: [{
                title: 'Opções',
                rows: buttons.slice(0, 10).map((btn, idx) => ({
                  id: btn.id,
                  title: btn.text.substring(0, 24), // Max 24 chars
                  description: btn.url ? btn.url.substring(0, 72) : '' // Optional, max 72 chars
                }))
              }]
            }
          };
          delete message.text;
        } else {
          // Too many buttons - send as text with numbered menu
          message.text.body = formattedText + '\n\n' + this.formatButtonsAsText(buttons);

          // Cache buttons for number-based selection
          this.userButtonCache.set(chatId, buttons);
        }
      }

      const result = await this.client.messages.send(message);

      logger.info('[WHATSAPP-CLOUD] Message sent:', {
        chatId,
        messageId: result.messages?.[0]?.id,
        hasButtons: !!buttons?.length
      });

      return result;
    } catch (error) {
      logger.error('[WHATSAPP-CLOUD] Error sending message:', {
        error: error.message,
        chatId
      });
      throw error;
    }
  }

  /**
   * Send a photo with optional caption and buttons
   */
  async sendPhoto(chatId, imageUrl, options = {}) {
    try {
      const caption = options.caption ? this.formatText(options.caption) : '';
      const buttons = this.convertKeyboard(options.keyboard || options.buttons);

      const message = {
        messaging_product: 'whatsapp',
        to: chatId,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      };

      const result = await this.client.messages.send(message);

      // Send buttons separately if provided (WhatsApp doesn't support buttons on media messages)
      if (buttons && buttons.length > 0) {
        await this.sendMessage(chatId, '👇 Escolha uma opção:', {
          buttons
        });
      }

      logger.info('[WHATSAPP-CLOUD] Photo sent:', {
        chatId,
        messageId: result.messages?.[0]?.id
      });

      return result;
    } catch (error) {
      logger.error('[WHATSAPP-CLOUD] Error sending photo:', {
        error: error.message,
        chatId
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    try {
      await this.client.messages.markAsRead(messageId);
    } catch (error) {
      logger.error('[WHATSAPP-CLOUD] Error marking message as read:', {
        error: error.message,
        messageId
      });
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(chatId) {
    try {
      // WhatsApp Cloud API doesn't have a native typing indicator
      // This is a no-op for compatibility with adapter interface
      return;
    } catch (error) {
      logger.error('[WHATSAPP-CLOUD] Error sending typing:', {
        error: error.message,
        chatId
      });
    }
  }

  /**
   * Convert bot-engine keyboard structure to WhatsApp button array
   */
  convertKeyboard(keyboardData) {
    if (!keyboardData) {
      return null;
    }

    // If already an array of buttons, return as is
    if (Array.isArray(keyboardData)) {
      return keyboardData;
    }

    // If it's a bot-engine keyboard structure with type/options/msg
    if (keyboardData.type && keyboardData.msg) {
      try {
        const buttons = buildWhatsAppKeyboard(
          keyboardData.msg,
          keyboardData.type,
          keyboardData.options || {}
        );
        return buttons;
      } catch (error) {
        logger.error('[WHATSAPP-CLOUD] Failed to convert keyboard:', {
          error: error.message,
          type: keyboardData.type
        });
        return null;
      }
    }

    return null;
  }

  /**
   * Format buttons as numbered text menu (fallback for >10 buttons)
   */
  formatButtonsAsText(buttons) {
    if (!buttons || buttons.length === 0) {
      return '';
    }

    let menu = '📱 *Menu:*\n';
    buttons.forEach((button, index) => {
      const number = index + 1;
      let line = `${number}. ${button.text}`;

      if (button.url) {
        line += `\n   🔗 ${button.url}`;
      }

      menu += line + '\n';
    });

    menu += '\n💬 _Digite o número da opção desejada_';
    return menu;
  }

  /**
   * Format text for WhatsApp (markdown)
   */
  formatText(text) {
    if (!text) {
      return '';
    }

    const textStr = String(text);

    // Convert HTML/Markdown to WhatsApp format
    return textStr
      .replace(/<b>(.*?)<\/b>/g, '*$1*')         // <b> → *bold*
      .replace(/<i>(.*?)<\/i>/g, '_$1_')         // <i> → _italic_
      .replace(/<code>(.*?)<\/code>/g, '```$1```') // <code> → ```code```
      .replace(/\*\*(.*?)\*\*/g, '*$1*')         // **bold** → *bold*
      .replace(/__(.*?)__/g, '_$1_')             // __italic__ → _italic_
      .replace(/<[^>]*>/g, '');                  // Remove other HTML tags
  }

  /**
   * Extract message info from WhatsApp webhook data
   */
  extractMessageInfo(webhookData) {
    const from = webhookData.from;
    const name = webhookData.profile?.name || from;

    let text = '';

    // Extract text based on message type
    if (webhookData.type === 'text') {
      text = webhookData.text?.body || '';
    } else if (webhookData.type === 'interactive') {
      // Interactive button click - extract button text or ID
      text = webhookData.interactive?.button_reply?.title ||
             webhookData.interactive?.list_reply?.title ||
             webhookData.interactive?.button_reply?.id ||
             webhookData.interactive?.list_reply?.id || '';
    } else if (webhookData.type === 'button') {
      text = webhookData.button?.text || '';
    }

    // Check if text is a number selection for cached buttons
    const lastButtons = this.userButtonCache.get(from);
    const buttonId = this.parseButtonSelection(text, lastButtons);

    if (buttonId) {
      text = buttonId; // Replace number with button ID
    }

    return {
      userId: from,
      username: name,
      firstName: name,
      lastName: '',
      languageCode: 'pt', // Default, can be enhanced
      platform: 'whatsapp',
      text,
      messageId: webhookData.id,
      chatId: from
    };
  }

  /**
   * Parse button selection from number (e.g., "1", "2", "3")
   */
  parseButtonSelection(text, lastButtons) {
    const num = parseInt(text.trim());
    if (!isNaN(num) && lastButtons && lastButtons[num - 1]) {
      return lastButtons[num - 1].id;
    }
    return null;
  }

  /**
   * Send response from BotEngine to WhatsApp
   */
  async sendResponse(chatId, response, options = {}) {
    try {
      // Handle different response types
      if (response.image) {
        // Send photo with caption
        return await this.sendPhoto(chatId, response.image, {
          caption: response.text,
          keyboard: response.keyboard,
          buttons: response.buttons,
          ...options
        });
      } else {
        // Send text message with buttons
        return await this.sendMessage(chatId, response.text, {
          keyboard: response.keyboard,
          buttons: response.buttons,
          ...options
        });
      }
    } catch (error) {
      logger.error('[WHATSAPP-CLOUD] Error sending response:', {
        error: error.message,
        chatId
      });

      // Try sending error message
      try {
        await this.sendMessage(
          chatId,
          '❌ Erro ao processar sua solicitação. Tente novamente.',
          {}
        );
      } catch (fallbackError) {
        logger.error('[WHATSAPP-CLOUD] Error sending fallback message:', {
          error: fallbackError.message
        });
      }

      throw error;
    }
  }

  /**
   * Get platform name
   */
  getPlatform() {
    return this.platform;
  }

  /**
   * Verify webhook signature from Meta
   */
  static verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('[WHATSAPP-CLOUD] Webhook verified successfully');
      return challenge;
    }

    logger.warn('[WHATSAPP-CLOUD] Webhook verification failed');
    return null;
  }

  /**
   * Parse incoming webhook data from Meta
   */
  static parseWebhook(body) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        logger.warn('[WHATSAPP-CLOUD] Invalid webhook payload - no value');
        return null;
      }

      // Extract message data
      const message = value.messages?.[0];

      if (!message) {
        // Not a message event (could be status update)
        logger.debug('[WHATSAPP-CLOUD] Webhook event is not a message');
        return null;
      }

      // Get contact info
      const contact = value.contacts?.[0];

      return {
        ...message,
        profile: {
          name: contact?.profile?.name || message.from
        },
        metadata: value.metadata
      };
    } catch (error) {
      logger.error('[WHATSAPP-CLOUD] Error parsing webhook:', {
        error: error.message
      });
      return null;
    }
  }
}

export default WhatsAppCloudAdapter;
