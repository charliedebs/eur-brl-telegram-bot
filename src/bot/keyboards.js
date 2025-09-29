import { Markup } from 'telegraf';
import { DEFAULTS, LINKS } from '../config/constants.js';

export function buildKeyboards(msg, type, options = {}) {
  const { route = 'eurbrl', amount = DEFAULTS.EUR, alerts = [] } = options;
  
  switch (type) {
    case 'main':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.eurbrl(DEFAULTS.EUR), `route:eurbrl:${DEFAULTS.EUR}`)],
        [Markup.button.callback(msg.btn.brleur(DEFAULTS.BRL), `route:brleur:${DEFAULTS.BRL}`)],
        [Markup.button.callback(msg.btn.help, 'help:open')],
      ]);
    
    case 'comparison':
      return Markup.inlineKeyboard([
        [Markup.button.callback(msg.btn.contOn, `mode:onchain:${route}:${amount}`)],
        [Markup.button.callback(msg.btn.change, `action:change_amount:${route}`)],
        [Markup.button.callback(msg.btn.setAlert, 'alerts:start'), Markup.button.callback(msg.btn.premium, 'premium:open')],
      ]);
    
    case 'onchain':
      return Markup.inlineKeyboard([
        [Markup.button.url('🇪🇺 Kraken', LINKS.KRAKEN), Markup.button.url('🇧🇷 Binance BR', LINKS.BINANCE_BR)],
        [Markup.button.callback(msg.btn.back, 'action:back_main')],
      ]);
    
    case 'alerts_list':
      const buttons = alerts.map(a => [
        Markup.button.callback(`⛔ ${a.pair}`, `alerts:disable:${a.id}`),
      ]);
      buttons.push([Markup.button.callback('➕ Nouvelle', 'alerts:start'), Markup.button.callback(msg.btn.back, 'action:back_main')]);
      return Markup.inlineKeyboard(buttons);
    
    case 'premium':
      return Markup.inlineKeyboard([
        [Markup.button.callback('✨ Intéressé', 'premium:interest')],
        [Markup.button.callback(msg.btn.back, 'action:back_main')],
      ]);
    
    case 'route_choice':
      return Markup.inlineKeyboard([
        [Markup.button.callback('🇪🇺 EUR → 🇧🇷 BRL', `route:eurbrl:${amount}`)],
        [Markup.button.callback('🇧🇷 BRL → 🇪🇺 EUR', `route:brleur:${amount}`)],
      ]);
    
    default:
      return Markup.inlineKeyboard([[Markup.button.callback(msg.btn.back, 'action:back_main')]]);
  }
}