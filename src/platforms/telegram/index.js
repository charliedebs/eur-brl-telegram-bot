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
      await adapter.sendTyping(ctx.chat.id);

      const messageInfo = adapter.extractMessageInfo(ctx);

      logger.info('[TELEGRAM] Processing message:', {
        userId: messageInfo.userId,
        text: messageInfo.text.substring(0, 50)
      });

      // Process message through BotEngine
      const response = await engine.processMessage({
        userId: messageInfo.userId,
        text: messageInfo.text,
        platform: 'telegram',
        username: messageInfo.username,
        messageId: messageInfo.messageId
      });

      // Send response
      await adapter.sendResponse(ctx.chat.id, response);

    } catch (error) {
      logger.error('[TELEGRAM] Error handling message:', {
        error: error.message,
        userId: ctx.from.id
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
      await ctx.answerCbQuery();

      const userInfo = adapter.extractUserInfo(ctx);
      const buttonId = ctx.callbackQuery.data;

      logger.info('[TELEGRAM] Processing button click:', {
        userId: userInfo.userId,
        buttonId
      });

      // Process button click through BotEngine
      const response = await engine.handleButtonClick({
        userId: userInfo.userId,
        buttonId,
        platform: 'telegram'
      });

      // Edit the message with new response
      if (ctx.callbackQuery.message) {
        try {
          await adapter.editMessage(
            ctx.callbackQuery.message.chat.id,
            ctx.callbackQuery.message.message_id,
            adapter.formatText(response.text),
            { buttons: response.buttons }
          );
        } catch (editError) {
          // If edit fails (e.g., message too old), send new message
          logger.warn('[TELEGRAM] Could not edit message, sending new one');
          await adapter.sendResponse(ctx.chat.id, response);
        }
      } else {
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
