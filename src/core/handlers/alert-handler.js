/**
 * Alert Handler
 *
 * Handles all alert-related logic:
 * - Alert creation flow (pair → type → reference → threshold → cooldown)
 * - Alert listing and management
 * - Alert deletion
 * - Alert renaming
 * - Spontaneous alerts pause/resume
 */

import { getRates, getLocale, formatRate } from '../../services/rates.js';
import { logger } from '../../utils/logger.js';
import { validateThreshold } from '../../utils/validation.js';

export class AlertHandler {
  constructor(db, messages) {
    this.db = db;
    this.messages = messages;
  }

  /**
   * Get messages for user's language
   */
  getMsg(lang) {
    return this.messages[lang || 'pt'];
  }

  /**
   * Check if user has premium access
   */
  async requirePremium(userId, lang, answerFn, replyFn, kbBuilder) {
    const isPremium = await this.db.isPremium(userId);

    if (!isPremium) {
      const msg = this.getMsg(lang); // Use user's language, not forced PT
      answerFn('🔒 Fonctionnalité Premium');
      const keyboard = kbBuilder(msg, 'not_premium');
      replyFn(msg.NOT_PREMIUM, { parse_mode: 'HTML', keyboard });
      return false;
    }

    return true;
  }

  /**
   * Handle /alert command (entry point)
   */
  async handleAlertCommand(userId, lang, args, chatType, replyFn, kbBuilder) {
    const msg = this.getMsg(lang);

    const isPremium = await this.db.isPremium(userId);
    if (!isPremium) {
      const kb = kbBuilder(msg, 'not_premium');
      return replyFn(msg.NOT_PREMIUM, { parse_mode: 'HTML', keyboard: kb });
    }

    // No parameters → show flow
    if (!args) {
      if (chatType === 'private') {
        const kb = kbBuilder(msg, 'alert_choose_pair');
        return replyFn(msg.ALERT_CHOOSE_PAIR, { parse_mode: 'HTML', keyboard: kb });
      } else {
        // In group → deep link to private
        const deepLinkUrl = `https://t.me/${botUsername}?start=alert`;
        const kb = kbBuilder(msg, 'alert_deeplink', { deepLinkUrl });
        return replyFn(msg.ALERT_DEEPLINK_GROUP, { parse_mode: 'HTML', keyboard: kb });
      }
    }

    // With parameters → parse and create
    const parsed = this.parseAlertParams(args);

    if (!parsed) {
      return replyFn(msg.ALERT_INVALID_SYNTAX);
    }

    // Create alert directly
    return this.createAlert(userId, lang, parsed, replyFn, kbBuilder);
  }

  /**
   * Parse alert parameters from command line
   * Examples: "6.30", "+3%", "brl 0.165", "brl +5%"
   */
  parseAlertParams(args) {
    if (!args) return null;

    // Pattern 1: "6.30" → Absolute EUR→BRL
    const absoluteMatch = args.match(/^(\d+(?:[.,]\d+)?)$/);
    if (absoluteMatch) {
      return {
        pair: 'eurbrl',
        type: 'absolute',
        value: parseFloat(absoluteMatch[1].replace(',', '.'))
      };
    }

    // Pattern 2: "+3%" ou "3%" → Relative EUR→BRL
    const relativeMatch = args.match(/^\+?(\d+(?:[.,]\d+)?)%?$/);
    if (relativeMatch) {
      return {
        pair: 'eurbrl',
        type: 'relative',
        value: parseFloat(relativeMatch[1].replace(',', '.')),
        refType: 'avg30d'
      };
    }

    // Pattern 3: "brl 0.165" → Absolute BRL→EUR
    const brlAbsoluteMatch = args.match(/^brl\s+(\d+(?:[.,]\d+)?)$/i);
    if (brlAbsoluteMatch) {
      return {
        pair: 'brleur',
        type: 'absolute',
        value: parseFloat(brlAbsoluteMatch[1].replace(',', '.'))
      };
    }

    // Pattern 4: "brl +5%" → Relative BRL→EUR
    const brlRelativeMatch = args.match(/^brl\s+\+?(\d+(?:[.,]\d+)?)%?$/i);
    if (brlRelativeMatch) {
      return {
        pair: 'brleur',
        type: 'relative',
        value: parseFloat(brlRelativeMatch[1].replace(',', '.')),
        refType: 'avg30d'
      };
    }

    return null;
  }

  /**
   * Create alert from parsed params
   */
  async createAlert(userId, lang, params, replyFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    try {
      const user = await this.db.getUser(userId);

      const alertData = {
        pair: params.pair,
        threshold_type: params.type,
        threshold_value: params.value,
        reference_type: params.refType || null,
        cooldown_minutes: 60 // Default 1h
      };

      const alert = await this.db.createAlert(user.id, alertData);

      if (!alert) {
        return replyFn(msg.ERROR_UPDATE_FAILED);
      }

      // Calculate display values
      const rates = await getRates();
      const currentRate = params.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

      let refValue = null;
      let calculatedThreshold;

      if (params.type === 'absolute') {
        calculatedThreshold = params.value;
      } else {
        if (params.refType === 'avg30d') {
          refValue = await this.db.getAverage30Days(params.pair);
        } else if (params.refType === 'avg90d') {
          refValue = await this.db.getAverage(params.pair, 90);
        } else if (params.refType === 'avg365d') {
          refValue = await this.db.getAverage(params.pair, 365);
        }
        calculatedThreshold = refValue * (1 + params.value / 100);
      }

      const text = msg.ALERT_CREATED_FULL_V2(alert, currentRate, refValue, calculatedThreshold, locale);
      const keyboard = kbBuilder(msg, 'alert_created', { alert });

      return replyFn(text, { parse_mode: 'HTML', keyboard });

    } catch (error) {
      logger.error('[ALERT] Error creating alert:', {
        error: error.message,
        userId,
        params
      });
      return replyFn(msg.ERROR_GENERAL);
    }
  }

  /**
   * Handle alert pair selection
   */
  async handleAlertChoosePair(userId, lang, editFn, answerFn, replyFn, kbBuilder) {
    const hasPremium = await this.requirePremium(userId, lang, answerFn, replyFn, kbBuilder);
    if (!hasPremium) return;

    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'alert_choose_pair');

    return editFn(msg.ALERT_CHOOSE_PAIR, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle alert type selection (relative vs absolute)
   */
  async handleAlertChooseType(userId, lang, pair, editFn, answerFn, kbBuilder) {
    const isPremium = await this.db.isPremium(userId);
    if (!isPremium) {
      return answerFn('🔒 Fonctionnalité Premium');
    }

    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'alert_choose_type', { pair });

    return editFn(msg.ALERT_CHOOSE_TYPE(pair), { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle relative alert - choose reference
   */
  async handleAlertChooseReference(userId, lang, pair, editFn, answerFn, kbBuilder) {
    const isPremium = await this.db.isPremium(userId);
    if (!isPremium) {
      return answerFn('🔒 Fonctionnalité Premium');
    }

    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    // Get rates and averages
    const rates = await getRates();
    const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

    const [avg30d, avg90d, avg365d] = await Promise.all([
      this.db.getAverage30Days(pair),
      this.db.getAverage(pair, 90),
      this.db.getAverage(pair, 365)
    ]);

    const keyboard = kbBuilder(msg, 'alert_choose_reference', {
      pair,
      currentRate,
      avg30d: avg30d || currentRate,
      avg90d: avg90d || currentRate,
      avg365d: avg365d || currentRate,
      locale
    });

    const text = msg.ALERT_CHOOSE_REFERENCE(pair, currentRate, avg30d, avg90d, avg365d, locale);

    return editFn(text, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle reference selection → choose percentage
   */
  async handleAlertReferenceSelected(userId, lang, refType, pair, editFn, answerFn, sessionUpdate, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    const rates = await getRates();
    const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

    let refValue;

    // If "current", freeze as absolute-like reference
    if (refType === 'current') {
      sessionUpdate({
        alertDraft: {
          pair,
          refType: 'current',
          refValue: currentRate,
          isFrozenCurrent: true
        }
      });

      const keyboard = kbBuilder(msg, 'alert_choose_percent', { pair, refType });
      return editFn(
        msg.ALERT_CHOOSE_PERCENT(pair, refType, currentRate, locale),
        { parse_mode: 'HTML', keyboard }
      );
    }

    // Other references: normal behavior
    if (refType === 'avg30d') {
      refValue = await this.db.getAverage30Days(pair) || currentRate;
    } else if (refType === 'avg90d') {
      refValue = await this.db.getAverage(pair, 90) || currentRate;
    } else if (refType === 'avg365d') {
      refValue = await this.db.getAverage(pair, 365) || currentRate;
    }

    sessionUpdate({ alertDraft: { pair, refType, refValue } });

    const keyboard = kbBuilder(msg, 'alert_choose_percent', { pair, refType });

    return editFn(
      msg.ALERT_CHOOSE_PERCENT(pair, refType, refValue, locale),
      { parse_mode: 'HTML', keyboard }
    );
  }

  /**
   * Handle percentage selection (preset or custom)
   */
  async handleAlertPercentSelected(userId, lang, percent, refType, pair, editFn, answerFn, sessionUpdate, kbBuilder) {
    const msg = this.getMsg(lang);

    if (percent === 'custom') {
      sessionUpdate({ awaitingCustomPercent: { pair, refType } });
      answerFn();
      return editFn(
        `✏️ Entre le pourcentage d'augmentation (1-10)\n\nExemple : 3.5`,
        { parse_mode: 'HTML' }
      );
    }

    // Preset percentage → choose cooldown
    const alertData = {
      pair,
      threshold_type: 'relative',
      threshold_value: parseFloat(percent),
      reference_type: refType
    };

    const keyboard = kbBuilder(msg, 'alert_choose_cooldown_v2', { alertData });
    return editFn(msg.ALERT_CHOOSE_COOLDOWN, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle absolute alert - ask for threshold value
   */
  async handleAlertAbsoluteStart(userId, lang, pair, editFn, answerFn, sessionUpdate, kbBuilder) {
    const isPremium = await this.db.isPremium(userId);
    if (!isPremium) {
      return answerFn('🔒 Fonctionnalité Premium');
    }

    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    const rates = await getRates();
    const currentRate = pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

    sessionUpdate({ awaitingAbsoluteThreshold: { pair } });

    answerFn();
    return editFn(
      msg.ALERT_ENTER_ABSOLUTE(pair, currentRate, locale),
      { parse_mode: 'HTML' }
    );
  }

  /**
   * Handle cooldown selection and finalize alert creation
   */
  async handleAlertCooldownSelected(userId, lang, cooldown, shortcode, editFn, answerFn, replyFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    const parts = shortcode.split('-');

    if (parts.length < 4) {
      logger.error('[ALERT] Invalid shortcode:', { shortcode });
      answerFn('❌ Erreur');
      return replyFn('❌ Erreur de décodage. Réessaie.');
    }

    let alertData = {
      threshold_type: parts[0] === 'rel' ? 'relative' : 'absolute',
      threshold_value: parseFloat(parts[1]),
      reference_type: parts[2] === 'null' ? null : parts[2],
      pair: parts[3],
      cooldown_minutes: cooldown
    };

    // Convert 'current' relative to absolute
    if (alertData.threshold_type === 'relative' && alertData.reference_type === 'current') {
      const rates = await getRates();
      const currentRate = alertData.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
      const absoluteThreshold = currentRate * (1 + alertData.threshold_value / 100);

      alertData = {
        threshold_type: 'absolute',
        threshold_value: absoluteThreshold,
        reference_type: null,
        pair: alertData.pair,
        cooldown_minutes: cooldown
      };

      logger.info('[ALERT] Converted current relative to absolute:', { threshold: absoluteThreshold });
    }

    // Create alert
    const user = await this.db.getUser(userId);
    const alert = await this.db.createAlert(user.id, alertData);

    if (!alert) {
      answerFn('❌ Erreur');
      return replyFn('❌ Erreur lors de la création.');
    }

    // Calculate threshold for display
    const rates = await getRates();
    const currentRate = alertData.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

    let refValue;
    let calculatedThreshold;

    if (alertData.threshold_type === 'absolute') {
      calculatedThreshold = alertData.threshold_value;
      refValue = null;
    } else {
      if (alertData.reference_type === 'avg30d') {
        refValue = await this.db.getAverage30Days(alertData.pair);
      } else if (alertData.reference_type === 'avg90d') {
        refValue = await this.db.getAverage(alertData.pair, 90);
      } else if (alertData.reference_type === 'avg365d') {
        refValue = await this.db.getAverage(alertData.pair, 365);
      }

      calculatedThreshold = refValue * (1 + alertData.threshold_value / 100);
    }

    answerFn('✅ Alerte créée !');

    const text = msg.ALERT_CREATED_FULL_V2(alert, currentRate, refValue, calculatedThreshold, locale);
    const keyboard = kbBuilder(msg, 'alert_created', { alert });

    return editFn(text, { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle alert list view
   */
  async handleAlertList(userId, lang, editFn, answerFn, replyFn, kbBuilder) {
    const hasPremium = await this.requirePremium(userId, lang, answerFn, replyFn, kbBuilder);
    if (!hasPremium) return;

    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    const userAlerts = await this.db.getUserAlerts(userId);
    const isPaused = await this.db.isSpontaneousAlertsPaused(userId);
    const keyboard = kbBuilder(msg, 'alerts_list', { alerts: userAlerts, isPaused });

    return editFn(msg.ALERTS_LIST(userAlerts, locale), { parse_mode: 'HTML', keyboard });
  }

  /**
   * Handle alert view details
   */
  async handleAlertView(userId, lang, alertId, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    try {
      const { data: alert } = await this.db.supabase
        .from('user_alerts')
        .select('*')
        .eq('id', alertId)
        .single();

      if (!alert) {
        return answerFn('❌ Alerte introuvable');
      }

      // Get rates and calculate threshold
      const rates = await getRates();
      const currentRate = alert.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;

      let refValue;
      let calculatedThreshold;

      if (alert.threshold_type === 'absolute') {
        calculatedThreshold = alert.threshold_value;
        refValue = null;
      } else {
        if (alert.reference_type === 'current') {
          refValue = currentRate;
        } else if (alert.reference_type === 'avg30d') {
          refValue = await this.db.getAverage30Days(alert.pair);
        } else if (alert.reference_type === 'avg90d') {
          refValue = await this.db.getAverage(alert.pair, 90);
        } else if (alert.reference_type === 'avg365d') {
          refValue = await this.db.getAverage(alert.pair, 365);
        }
        calculatedThreshold = refValue * (1 + alert.threshold_value / 100);
      }

      const text = msg.ALERT_VIEW_DETAILS(alert, currentRate, refValue, calculatedThreshold, locale);
      const keyboard = kbBuilder(msg, 'alert_details', { alertId });

      return editFn(text, { parse_mode: 'HTML', keyboard });

    } catch (error) {
      logger.error('[ALERT] Error viewing alert:', { error: error.message, alertId });
      return answerFn('❌ Erreur');
    }
  }

  /**
   * Handle alert rename request
   */
  async handleAlertRenameStart(userId, lang, alertId, editFn, answerFn, sessionUpdate) {
    const msg = this.getMsg(lang);

    sessionUpdate({ awaitingAlertName: { alertId } });

    answerFn();
    return editFn(msg.ALERT_NAME_PROMPT, { parse_mode: 'HTML' });
  }

  /**
   * Process alert rename text
   */
  async handleAlertRenameText(userId, lang, alertId, newName, replyFn) {
    const msg = this.getMsg(lang);

    try {
      await this.db.renameAlert(alertId, newName);
      const confirmText = {
        pt: '✅ Nome atualizado!',
        fr: '✅ Nom mis à jour !',
        en: '✅ Name updated!'
      };
      return replyFn(confirmText[lang] || confirmText.pt);
    } catch (error) {
      logger.error('[ALERT] Error renaming alert:', { error: error.message, alertId });
      return replyFn(msg.ERROR_GENERAL);
    }
  }

  /**
   * Handle alert deletion
   */
  async handleAlertDelete(userId, lang, alertId, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const locale = getLocale(lang);

    try {
      await this.db.disableAlert(alertId);

      answerFn('✅ Alerte supprimée');

      const userAlerts = await this.db.getUserAlerts(userId);
      const keyboard = kbBuilder(msg, 'alerts_list', { alerts: userAlerts });

      return editFn(
        msg.ALERTS_LIST(userAlerts, locale),
        { parse_mode: 'HTML', keyboard }
      );

    } catch (error) {
      logger.error('[ALERT] Error deleting alert:', { error: error.message, alertId });
      return answerFn('❌ Erreur lors de la suppression');
    }
  }

  /**
   * Handle spontaneous alerts pause
   */
  async handleSpontaneousPause(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);

    const isPremium = await this.db.isPremium(userId);
    if (!isPremium) {
      return answerFn('🔒 Fonctionnalité Premium');
    }

    // Pause for 7 days
    const result = await this.db.pauseSpontaneousAlerts(userId, 7);

    if (result) {
      const keyboard = kbBuilder(msg, 'spontaneous_paused');
      await editFn(null, { keyboard }); // Just update keyboard
      return answerFn('⏸️ Alertas pausados por 1 semana');
    }

    return answerFn('❌ Erreur');
  }

  /**
   * Handle spontaneous alerts resume
   */
  async handleSpontaneousResume(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);

    const isPremium = await this.db.isPremium(userId);
    if (!isPremium) {
      return answerFn('🔒 Fonctionnalité Premium');
    }

    const result = await this.db.resumeSpontaneousAlerts(userId);

    if (result) {
      const keyboard = kbBuilder(msg, 'spontaneous_active');
      await editFn(null, { keyboard }); // Just update keyboard
      return answerFn('▶️ Alertas reativados');
    }

    return answerFn('❌ Erreur');
  }
}
