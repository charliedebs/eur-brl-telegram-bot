// src/platforms/whatsapp/adapter.js
// WhatsApp-specific adapter for BotEngine

import { logger } from '../../utils/logger.js';

export class WhatsAppAdapter {
  constructor(client) {
    this.client = client;
    this.platform = 'whatsapp';
  }

  /**
   * Send a text message
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      // Format text for WhatsApp (markdown)
      const formattedText = this.formatText(text);

      // WhatsApp doesn't support inline buttons like Telegram
      // Add buttons as text menu if provided
      let finalText = formattedText;
      if (options.buttons && options.buttons.length > 0) {
        finalText += '\n\n' + this.formatButtonsAsText(options.buttons);
      }

      return await this.client.sendMessage(chatId, finalText);
    } catch (error) {
      logger.error('[WHATSAPP-ADAPTER] Error sending message:', {
        error: error.message,
        chatId
      });
      throw error;
    }
  }

  /**
   * Send a photo with optional caption
   */
  async sendPhoto(chatId, photo, options = {}) {
    try {
      const { MessageMedia } = await import('whatsapp-web.js');
      let media;

      // Handle different photo formats
      if (typeof photo === 'string' && photo.startsWith('data:')) {
        // Data URL (like QR code)
        const base64Data = photo.split(',')[1];
        const mimeType = photo.split(':')[1].split(';')[0];
        media = new MessageMedia(mimeType, base64Data);
      } else if (Buffer.isBuffer(photo)) {
        // Buffer
        media = new MessageMedia('image/png', photo.toString('base64'));
      } else {
        // URL or file path
        media = await MessageMedia.fromUrl(photo);
      }

      // Format caption with buttons as text
      let caption = options.caption ? this.formatText(options.caption) : '';
      if (options.buttons && options.buttons.length > 0) {
        caption += '\n\n' + this.formatButtonsAsText(options.buttons);
      }

      return await this.client.sendMessage(chatId, media, { caption });
    } catch (error) {
      logger.error('[WHATSAPP-ADAPTER] Error sending photo:', {
        error: error.message,
        chatId
      });
      throw error;
    }
  }

  /**
   * Send message with buttons (WhatsApp interactive buttons)
   * Note: Limited to 3 buttons in whatsapp-web.js
   */
  async sendMessageWithButtons(chatId, text, buttons) {
    try {
      if (!buttons || buttons.length === 0) {
        return await this.sendMessage(chatId, text);
      }

      // WhatsApp buttons are limited
      // For simplicity, we'll use text-based menu
      const formattedText = this.formatText(text);
      const buttonMenu = this.formatButtonsAsText(buttons);

      return await this.client.sendMessage(chatId, `${formattedText}\n\n${buttonMenu}`);
    } catch (error) {
      logger.error('[WHATSAPP-ADAPTER] Error sending message with buttons:', {
        error: error.message,
        chatId
      });
      throw error;
    }
  }

  /**
   * Format buttons as numbered text menu
   */
  formatButtonsAsText(buttons) {
    if (!buttons || buttons.length === 0) {
      return '';
    }

    let menu = '📱 *Menu:*\n';
    buttons.forEach((button, index) => {
      const number = index + 1;
      let line = `${number}. ${button.text}`;

      // Add URL if button has one
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
    // Convert HTML/Markdown to WhatsApp format
    return text
      .replace(/<b>(.*?)<\/b>/g, '*$1*')         // <b> → *bold*
      .replace(/<i>(.*?)<\/i>/g, '_$1_')         // <i> → _italic_
      .replace(/<code>(.*?)<\/code>/g, '```$1```') // <code> → ```code```
      .replace(/\*\*(.*?)\*\*/g, '*$1*')         // **bold** → *bold*
      .replace(/__(.*?)__/g, '_$1_')             // __italic__ → _italic_
      .replace(/<[^>]*>/g, '');                  // Remove other HTML tags
  }

  /**
   * Extract user info from WhatsApp message
   */
  extractUserInfo(msg) {
    return {
      userId: msg.from,
      username: msg._data.notifyName || msg.from,
      firstName: msg._data.notifyName || 'User',
      lastName: '',
      languageCode: 'pt', // Default to Portuguese, can be enhanced
      platform: 'whatsapp'
    };
  }

  /**
   * Extract message info from WhatsApp message
   */
  extractMessageInfo(msg) {
    const userInfo = this.extractUserInfo(msg);

    return {
      ...userInfo,
      text: msg.body || '',
      messageId: msg.id._serialized,
      chatId: msg.from
    };
  }

  /**
   * Send response from BotEngine to WhatsApp
   */
  async sendResponse(chatId, response, options = {}) {
    try {
      // Support both 'buttons' and 'keyboard' (bot-engine uses 'keyboard')
      const buttons = response.buttons || response.keyboard || null;

      // Handle different response types
      if (response.image) {
        // Send photo with caption
        return await this.sendPhoto(chatId, response.image, {
          caption: response.text,
          buttons: buttons,
          ...options
        });
      } else {
        // Send text message with buttons
        return await this.sendMessage(chatId, response.text, {
          buttons: buttons,
          ...options
        });
      }
    } catch (error) {
      logger.error('[WHATSAPP-ADAPTER] Error sending response:', {
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
        logger.error('[WHATSAPP-ADAPTER] Error sending fallback message:', {
          error: fallbackError.message
        });
      }

      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(chatId) {
    try {
      // WhatsApp typing state
      const chat = await this.client.getChatById(chatId);
      return await chat.sendStateTyping();
    } catch (error) {
      logger.error('[WHATSAPP-ADAPTER] Error sending typing indicator:', {
        error: error.message,
        chatId
      });
    }
  }

  /**
   * Parse button selection from number
   * When user sends "1", "2", etc., map to button ID
   */
  parseButtonSelection(text, lastButtons) {
    const num = parseInt(text.trim());
    if (!isNaN(num) && lastButtons && lastButtons[num - 1]) {
      return lastButtons[num - 1].id;
    }
    return null;
  }

  /**
   * Get platform name
   */
  getPlatform() {
    return this.platform;
  }
}

export default WhatsAppAdapter;
