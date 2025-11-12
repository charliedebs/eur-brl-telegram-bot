// src/platforms/telegram/index.js
// Telegram platform integration with BotEngine

import { Telegraf } from 'telegraf';
import { TelegramAdapter } from './adapter.js';
import { BotEngine } from '../../core/bot-engine.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize Telegram bot with BotEngine
 */
export function createTelegramBot(token) {
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  // Create Telegraf instance
  const bot = new Telegraf(token);

  // Create adapter and bot engine
  const adapter = new TelegramAdapter(bot);
  const engine = new BotEngine(adapter);

  // Set up message handlers
  setupMessageHandlers(bot, engine, adapter);

  // Set up button handlers
  setupButtonHandlers(bot, engine, adapter);

  // Error handling
  bot.catch((error, ctx) => {
    logger.error('[TELEGRAM] Bot error:', {
      error: error.message,
      update: ctx.update
    });
  });

  return { bot, engine, adapter };
}

/**
 * Set up message handlers
 */
function setupMessageHandlers(bot, engine, adapter) {
  // Handle all text messages
  bot.on('text', async (ctx) => {
    try {
      // Delegate all message processing to adapter (harmonized architecture)
      const response = await adapter.processIncomingMessage(ctx, engine);

      // Send response
      await adapter.sendResponse(ctx.chat.id, response);

    } catch (error) {
      logger.error('[TELEGRAM] Error handling message:', {
        error: error.message,
        userId: ctx.from?.id
      });

      await ctx.reply('❌ Erro ao processar mensagem. Tente novamente.');
    }
  });
}

/**
 * Set up button (callback query) handlers
 */
function setupButtonHandlers(bot, engine, adapter) {
  // Handle all callback queries (button clicks)
  bot.on('callback_query', async (ctx) => {
    try {
      // Delegate button processing to adapter (harmonized architecture)
      const { response, editInfo } = await adapter.processButtonClick(ctx, engine);

      // Telegram-specific: Try to edit the message for better UX
      if (editInfo.shouldEdit) {
        try {
          await adapter.editMessage(
            editInfo.chatId,
            editInfo.messageId,
            adapter.formatText(response.text),
            { keyboard: response.keyboard, buttons: response.buttons }
          );
        } catch (editError) {
          // If edit fails (e.g., message too old), send new message
          logger.warn('[TELEGRAM] Could not edit message, sending new one');
          await adapter.sendResponse(ctx.chat.id, response);
        }
      } else {
        // No message to edit, send new response
        await adapter.sendResponse(ctx.chat.id, response);
      }

    } catch (error) {
      logger.error('[TELEGRAM] Error handling button click:', {
        error: error.message,
        userId: ctx.from?.id
      });

      await ctx.reply('❌ Erro ao processar ação. Tente novamente.');
    }
  });
}

export { TelegramAdapter } from './adapter.js';
