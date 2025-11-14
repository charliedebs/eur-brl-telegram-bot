// src/platforms/telegram/keyboards.js
// Telegram-specific keyboard converter
// Converts abstract button definitions to Telegram inline keyboards

import { Markup } from 'telegraf';
import { getKeyboardDefinition } from '../../core/keyboards/keyboard-types.js';

/**
 * Build Telegram inline keyboard from abstract button definitions
 * @param {Object} msg - Localized message object
 * @param {string} type - Keyboard type identifier
 * @param {Object} options - Additional options
 * @returns {Object} Telegraf Markup.inlineKeyboard object
 */
export function buildKeyboards(msg, type, options = {}) {
  // Get abstract button definitions from core
  const buttons = getKeyboardDefinition(msg, type, options);

  // Convert to Telegram format
  return convertToTelegramKeyboard(buttons);
}

/**
 * Convert abstract button array to Telegram inline keyboard
 * @param {Array} buttons - Array of button definitions: [{ text, id, url?, row? }, ...]
 * @returns {Object} Telegraf Markup.inlineKeyboard object
 */
function convertToTelegramKeyboard(buttons) {
  if (!buttons || buttons.length === 0) {
    return Markup.inlineKeyboard([]);
  }

  // Group buttons by row
  const rows = {};
  buttons.forEach((button) => {
    const rowIndex = button.row !== undefined ? button.row : 0;
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push(button);
  });

  // Convert to Telegram button format
  const telegramRows = Object.keys(rows)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((rowIndex) => {
      return rows[rowIndex].map((button) => {
        if (button.url) {
          // URL button
          return Markup.button.url(button.text, button.url);
        } else {
          // Callback button
          return Markup.button.callback(button.text, button.id);
        }
      });
    });

  return Markup.inlineKeyboard(telegramRows);
}
