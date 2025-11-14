// src/platforms/whatsapp/keyboards.js
// WhatsApp-specific keyboard converter
// Converts abstract button definitions to simple button arrays for WhatsApp

import { getKeyboardDefinition } from '../../core/keyboards/keyboard-types.js';

/**
 * Build keyboard buttons for WhatsApp
 * Returns array of buttons: [{ text: string, id: string, url?: string }, ...]
 *
 * @param {Object} msg - Localized message object
 * @param {string} type - Keyboard type identifier
 * @param {Object} options - Additional options
 * @returns {Array} Array of button objects for WhatsApp
 */
export function buildWhatsAppKeyboard(msg, type, options = {}) {
  // Get abstract button definitions from core
  const buttons = getKeyboardDefinition(msg, type, options);

  // Convert to WhatsApp format (strip row property, keep rest)
  return buttons.map(({ text, id, url }) => {
    const button = { text, id };
    if (url) {
      button.url = url;
    }
    return button;
  });
}

export default buildWhatsAppKeyboard;
