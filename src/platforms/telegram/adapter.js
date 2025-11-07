// src/platforms/telegram/adapter.js
// Telegram-specific adapter for BotEngine

import { Markup } from 'telegraf';
import { logger } from '../../utils/logger.js';

export class TelegramAdapter {
  constructor(bot) {
    this.bot = bot;
    this.platform = 'telegram';
  }

  /**
   * Send a text message
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const telegramOptions = {
        parse_mode: options.parseMode || 'HTML',
        ...options.telegramOptions
      };

      // Add keyboard if buttons provided
      if (options.buttons && options.buttons.length > 0) {
        telegramOptions.reply_markup = this.formatButtons(options.buttons);
      }

      return await this.bot.telegram.sendMessage(chatId, text, telegramOptions);
    } catch (error) {
      logger.error('[TELEGRAM-ADAPTER] Error sending message:', {
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
      const telegramOptions = {
        parse_mode: options.parseMode || 'HTML',
        caption: options.caption,
        ...options.telegramOptions
      };

      // Add keyboard if buttons provided
      if (options.buttons && options.buttons.length > 0) {
        telegramOptions.reply_markup = this.formatButtons(options.buttons);
      }

      return await this.bot.telegram.sendPhoto(chatId, photo, telegramOptions);
    } catch (error) {
      logger.error('[TELEGRAM-ADAPTER] Error sending photo:', {
        error: error.message,
        chatId
      });
      throw error;
    }
  }

  /**
   * Edit an existing message
   */
  async editMessage(chatId, messageId, text, options = {}) {
    try {
      const telegramOptions = {
        parse_mode: options.parseMode || 'HTML',
        chat_id: chatId,
        message_id: messageId,
        ...options.telegramOptions
      };

      // Add keyboard if buttons provided
      if (options.buttons && options.buttons.length > 0) {
        telegramOptions.reply_markup = this.formatButtons(options.buttons);
      }

      return await this.bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        text,
        telegramOptions
      );
    } catch (error) {
      logger.error('[TELEGRAM-ADAPTER] Error editing message:', {
        error: error.message,
        chatId,
        messageId
      });
      throw error;
    }
  }

  /**
   * Answer callback query (button click)
   */
  async answerCallbackQuery(callbackQueryId, text = '', options = {}) {
    try {
      return await this.bot.telegram.answerCbQuery(callbackQueryId, text, options);
    } catch (error) {
      logger.error('[TELEGRAM-ADAPTER] Error answering callback query:', {
        error: error.message,
        callbackQueryId
      });
      throw error;
    }
  }

  /**
   * Format generic buttons to Telegram inline keyboard
   *
   * Input: [{ id: 'action', text: 'Button Text' }, ...]
   * Output: { inline_keyboard: [[{ text: 'Button Text', callback_data: 'action' }], ...] }
   */
  formatButtons(buttons) {
    if (!buttons || buttons.length === 0) {
      return undefined;
    }

    // Convert to Telegram inline keyboard format
    const keyboard = buttons.map(button => {
      if (button.url) {
        // URL button
        return [Markup.button.url(button.text, button.url)];
      } else {
        // Callback button
        return [Markup.button.callback(button.text, button.id)];
      }
    });

    return { inline_keyboard: keyboard };
  }

  /**
   * Format text for Telegram (HTML)
   */
  formatText(text) {
    // Telegram uses HTML by default in our bot
    // Replace markdown-style formatting if needed
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **bold** → <b>bold</b>
      .replace(/\*(.*?)\*/g, '<i>$1</i>') // *italic* → <i>italic</i>
      .replace(/`(.*?)`/g, '<code>$1</code>'); // `code` → <code>code</code>
  }

  /**
   * Extract user info from Telegram context
   */
  extractUserInfo(ctx) {
    return {
      userId: ctx.from.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      languageCode: ctx.from.language_code,
      platform: 'telegram'
    };
  }

  /**
   * Extract message info from Telegram context
   */
  extractMessageInfo(ctx) {
    const userInfo = this.extractUserInfo(ctx);

    return {
      ...userInfo,
      text: ctx.message?.text || ctx.callbackQuery?.data || '',
      messageId: ctx.message?.message_id,
      chatId: ctx.chat?.id
    };
  }

  /**
   * Send response from BotEngine to Telegram
   */
  async sendResponse(chatId, response, options = {}) {
    try {
      // Handle different response types
      if (response.image) {
        // Send photo with caption
        return await this.sendPhoto(chatId, response.image, {
          caption: this.formatText(response.text),
          buttons: response.buttons,
          ...options
        });
      } else {
        // Send text message
        return await this.sendMessage(chatId, this.formatText(response.text), {
          buttons: response.buttons,
          ...options
        });
      }
    } catch (error) {
      logger.error('[TELEGRAM-ADAPTER] Error sending response:', {
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
        logger.error('[TELEGRAM-ADAPTER] Error sending fallback message:', {
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
      return await this.bot.telegram.sendChatAction(chatId, 'typing');
    } catch (error) {
      logger.error('[TELEGRAM-ADAPTER] Error sending typing indicator:', {
        error: error.message,
        chatId
      });
    }
  }

  /**
   * Get platform name
   */
  getPlatform() {
    return this.platform;
  }
}

export default TelegramAdapter;
