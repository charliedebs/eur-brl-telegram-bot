import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export class DatabaseService {
  constructor() {
    this.supabase = supabase; // Important pour bot/index.js
  }

  // ==========================================
  // USERS - MULTI-PLATFORM METHODS (NEW)
  // ==========================================

  /**
   * Get user by platform and platform-specific user ID
   * @param {string} platform - 'telegram' | 'whatsapp' | etc.
   * @param {string} platformUserId - Platform-specific user ID
   */
  async getUserByPlatform(platform, platformUserId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('platform', platform)
      .eq('platform_user_id', platformUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get user:', { error, platform, platformUserId });
      return null;
    }

    return data;
  }

  /**
   * Create user with platform specification
   * @param {string} platform - 'telegram' | 'whatsapp' | etc.
   * @param {string} platformUserId - Platform-specific user ID
   * @param {string} language - 'pt' | 'en' | 'fr'
   */
  async createUserByPlatform(platform, platformUserId, language = 'pt') {
    const userData = {
      platform,
      platform_user_id: platformUserId,
      language
    };

    // For Telegram, also set telegram_id for backwards compatibility
    if (platform === 'telegram') {
      userData.telegram_id = platformUserId;
    }

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to create user:', { error, platform, platformUserId });
      return null;
    }

    logger.info(`[DB] ✅ User created: ${platform}:${platformUserId} (${language})`);
    return data;
  }

  /**
   * Update user by platform
   * @param {string} platform - 'telegram' | 'whatsapp' | etc.
   * @param {string} platformUserId - Platform-specific user ID
   * @param {object} updates - Fields to update
   */
  async updateUserByPlatform(platform, platformUserId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('platform', platform)
      .eq('platform_user_id', platformUserId)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to update user:', { error, platform, platformUserId });
      return null;
    }

    return data;
  }

  // ==========================================
  // USERS - LEGACY METHODS (BACKWARDS COMPATIBLE)
  // ==========================================

  /**
   * Get user by Telegram ID (legacy method for backwards compatibility)
   * @deprecated Use getUserByPlatform('telegram', telegramId) instead
   */
  async getUser(telegramId) {
    return this.getUserByPlatform('telegram', telegramId);
  }

  /**
   * Create user with Telegram ID (legacy method for backwards compatibility)
   * @deprecated Use createUserByPlatform('telegram', telegramId, language) instead
   */
  async createUser(telegramId, language = 'pt') {
    return this.createUserByPlatform('telegram', telegramId, language);
  }

  /**
   * Update user by Telegram ID (legacy method for backwards compatibility)
   * @deprecated Use updateUserByPlatform('telegram', telegramId, updates) instead
   */
  async updateUser(telegramId, updates) {
    return this.updateUserByPlatform('telegram', telegramId, updates);
  }

  async getAllActiveUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, platform, platform_user_id, language')
      .order('created_at', { ascending: false});

    if (error) {
      logger.error('[DB] Failed to get active users:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // PREMIUM
  // ==========================================

  /**
   * Check if user is premium by platform
   */
  async isPremiumByPlatform(platform, platformUserId) {
    const user = await this.getUserByPlatform(platform, platformUserId);
    if (!user) return false;

    if (!user.premium_until) return false;

    const now = new Date();
    const premiumUntil = new Date(user.premium_until);

    return premiumUntil > now;
  }

  /**
   * Check if user is premium by Telegram ID (legacy)
   * @deprecated Use isPremiumByPlatform('telegram', telegramId) instead
   */
  async isPremium(telegramId) {
    return this.isPremiumByPlatform('telegram', telegramId);
  }

  async getPremiumUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .not('premium_until', 'is', null)
      .gte('premium_until', new Date().toISOString());

    if (error) {
      logger.error('[DB] Failed to get premium users:', error);
      return [];
    }

    return data || [];
  }

  async getUsersExpiringIn(days) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .gte('premium_until', new Date().toISOString())
      .lte('premium_until', targetDate.toISOString());

    if (error) {
      logger.error('[DB] Failed to get expiring users:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // SPONTANEOUS ALERTS PAUSE/RESUME
  // ==========================================

  async pauseSpontaneousAlerts(telegramId, durationDays = 7) {
    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + durationDays);

    const { data, error } = await supabase
      .from('users')
      .update({ spontaneous_alerts_paused_until: pauseUntil.toISOString() })
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to pause spontaneous alerts:', error);
      return null;
    }

    logger.info(`[DB] ✅ Paused spontaneous alerts for user ${telegramId} until ${pauseUntil.toISOString()}`);
    return data;
  }

  async resumeSpontaneousAlerts(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .update({ spontaneous_alerts_paused_until: null })
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to resume spontaneous alerts:', error);
      return null;
    }

    logger.info(`[DB] ✅ Resumed spontaneous alerts for user ${telegramId}`);
    return data;
  }

  async isSpontaneousAlertsPaused(telegramId) {
    const user = await this.getUser(telegramId);
    if (!user || !user.spontaneous_alerts_paused_until) {
      return false;
    }

    const pausedUntil = new Date(user.spontaneous_alerts_paused_until);
    const now = new Date();

    return pausedUntil > now;
  }

  // ==========================================
  // RATES HISTORY
  // ==========================================

  async saveRateHistory(rateData) {
    const { data, error } = await supabase
      .from('rates_history')
      .insert([rateData])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to save rate history:', error);
      return null;
    }

    logger.info(`[DB] ✅ Rate saved: ${rateData.pair} = ${rateData.rate}`);
    return data;
  }

  async getRateHistory(pair, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('rates_history')
      .select('*')
      .eq('pair', pair)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error('[DB] Failed to get rate history:', error);
      return [];
    }

    return data || [];
  }

  async getAverage30Days(pair) {
    const history = await this.getRateHistory(pair, 30);
    if (history.length === 0) return null;

    const sum = history.reduce((acc, h) => acc + parseFloat(h.rate), 0);
    return sum / history.length;
  }

  async getLastRate(pair) {
    const { data, error } = await supabase
      .from('rates_history')
      .select('*')
      .eq('pair', pair)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get last rate:', error);
      return null;
    }

    return data;
  }

  async getAverage(pair, days = 30) {
    const history = await this.getRateHistory(pair, days);
    if (history.length === 0) return null;

    const sum = history.reduce((acc, h) => acc + parseFloat(h.rate), 0);
    return sum / history.length;
  }

  // ==========================================
  // ALERTS
  // ==========================================

  async createAlert(userId, alertData) {
    // Validation : threshold_type requis
    if (!alertData.threshold_type) {
      logger.error('[DB] Missing threshold_type');
      return null;
    }

    // Validation : threshold_value requis
    if (alertData.threshold_value === undefined || alertData.threshold_value === null) {
      logger.error('[DB] Missing threshold_value');
      return null;
    }

    // Validation : reference_type requis si relatif
    if (alertData.threshold_type === 'relative' && !alertData.reference_type) {
      logger.error('[DB] Missing reference_type for relative threshold');
      return null;
    }

    const { data, error } = await this.supabase
      .from('user_alerts')
      .insert([{
        user_id: userId,
        alert_type: 'programmed',
        pair: alertData.pair,
        threshold_type: alertData.threshold_type,    // 'absolute' | 'relative'
        threshold_value: alertData.threshold_value,   // 6.30 | 3.0
        reference_type: alertData.reference_type,     // 'current' | 'avg30d' | 'avg90d' | 'avg365d' | null
        preset: alertData.preset || null,
        cooldown_minutes: alertData.cooldown_minutes || 60,
        active: true
      }])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to create alert:', error);
      return null;
    }

    const typeLabel = alertData.threshold_type === 'absolute'
      ? `seuil ${alertData.threshold_value}`
      : `+${alertData.threshold_value}% vs ${alertData.reference_type}`;

    logger.info(`[DB] ✅ Alert created: ${alertData.pair} ${typeLabel} (cooldown: ${alertData.cooldown_minutes}min)`);
    return data;
  }

  async getUserAlerts(telegramId) {
    const user = await this.getUser(telegramId);
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[DB] Failed to get user alerts:', error);
      return [];
    }

    return data || [];
  }

  async getActiveAlerts() {
    const { data, error } = await supabase
      .from('user_alerts')
      .select(`
        *,
        users!inner (telegram_id, platform, platform_user_id, language)
      `)
      .eq('active', true);

    if (error) {
      logger.error('[DB] Failed to get active alerts:', error);
      return [];
    }

    return data || [];
  }

  async updateAlert(alertId, updates) {
    const { data, error } = await supabase
      .from('user_alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to update alert:', error);
      return null;
    }

    return data;
  }

  async disableAlert(alertId) {
    return this.updateAlert(alertId, { active: false });
  }

  // ==========================================
  // PIX PAYMENTS
  // ==========================================

  async createPixPayment(paymentData) {
    const { data, error } = await supabase
      .from('pix_payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to create pix payment:', error);
      return null;
    }

    logger.info(`[DB] ✅ Pix payment created: ${paymentData.amount} R$ (${paymentData.duration_months}m)`);
    return data;
  }

  async getPixPayment(paymentId) {
    const { data, error } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get pix payment:', error);
      return null;
    }

    return data;
  }

  async updatePixPayment(paymentId, updates) {
    const { data, error } = await supabase
      .from('pix_payments')
      .update(updates)
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to update pix payment:', error);
      return null;
    }

    return data;
  }

  async confirmPixPayment(paymentId) {
    const payment = await this.getPixPayment(paymentId);
    if (!payment) return null;

    // Mettre à jour le paiement
    await this.updatePixPayment(paymentId, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    });

    // Activer Premium pour l'user
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + payment.duration_months);

    const { data: userData } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', payment.user_id)
      .single();

    if (userData) {
      await this.updateUser(userData.telegram_id, {
        premium_until: premiumUntil.toISOString(),
        subscription_type: `pix_${payment.duration_months}months`,
        subscription_amount: payment.amount
      });

      logger.info(`[DB] ✅ Premium activated until ${premiumUntil.toISOString()}`);
    }

    return payment;
  }

  async getExpiredPixPayments() {
    const { data, error } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      logger.error('[DB] Failed to get expired payments:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // FREE ALERTS (marketing)
  // ==========================================

  async logFreeAlert(pair, rate, usersCount) {
    const { data, error } = await supabase
      .from('free_alerts_sent')
      .insert([{
        pair,
        rate,
        users_count: usersCount
      }])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to log free alert:', error);
      return null;
    }

    logger.info(`[DB] ✅ Free alert logged: ${pair} = ${rate} (${usersCount} users)`);
    return data;
  }

  async getLastFreeAlert(pair) {
    const { data, error } = await supabase
      .from('free_alerts_sent')
      .select('*')
      .eq('pair', pair)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get last free alert:', error);
      return null;
    }

    return data;
  }

  // ==========================================
  // NLU LOGS
  // ==========================================

  async logNLU(logData) {
    const { data, error } = await supabase
      .from('nlu_logs')
      .insert([logData])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to log NLU:', error);
      return null;
    }

    return data;
  }

  async updateNLUFeedback(userId, inputText, feedback, actualIntent = null) {
    const { data: logs } = await supabase
      .from('nlu_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('input_text', inputText)
      .order('created_at', { ascending: false })
      .limit(1);

    if (logs && logs[0]) {
      const { error } = await supabase
        .from('nlu_logs')
        .update({
          user_feedback: feedback,
          actual_intent: actualIntent,
          updated_at: new Date().toISOString()
        })
        .eq('id', logs[0].id);

      if (error) {
        logger.error('[DB] Failed to update NLU feedback:', error);
      }
    }
  }

  async getNLUFeedbacks(limit = 100) {
    const { data, error } = await supabase
      .from('nlu_logs')
      .select('*')
      .not('user_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[DB] Failed to get NLU feedbacks:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // PAYMENTS
  // ==========================================

  async createPayment(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        telegram_id: paymentData.telegram_id,
        plan: paymentData.plan,
        method: paymentData.method,
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_id: paymentData.payment_id,
        status: paymentData.status || 'pending',
        payment_data: paymentData.data || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to create payment:', error);
      return null;
    }

    logger.info(`[DB] ✅ Payment created: ${paymentData.payment_id}`);
    return data;
  }

  async getPayment(payment_id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get payment:', error);
      return null;
    }

    return data;
  }

  async getPaymentsByUser(telegram_id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('telegram_id', telegram_id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[DB] Failed to get user payments:', error);
      return [];
    }

    return data || [];
  }

  async updatePaymentStatus(payment_id, status, details = {}) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status,
        confirmed_at: status === 'approved' ? new Date().toISOString() : null,
        ...details
      })
      .eq('payment_id', payment_id)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to update payment status:', error);
      return null;
    }

    logger.info(`[DB] ✅ Payment status updated: ${payment_id} -> ${status}`);
    return data;
  }

  async getPendingPayments() {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[DB] Failed to get pending payments:', error);
      return [];
    }

    return data || [];
  }

  async getExpiredPendingPayments(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data, error} = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime.toISOString());

    if (error) {
      logger.error('[DB] Failed to get expired pending payments:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================

  async createSubscription(subscriptionData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        telegram_id: subscriptionData.telegram_id,
        payment_id: subscriptionData.provider_subscription_id, // Use subscription ID as payment_id
        method: subscriptionData.provider, // 'mercadopago' | 'paypal'
        plan: subscriptionData.plan,
        amount: subscriptionData.price,
        currency: subscriptionData.currency,
        status: subscriptionData.status || 'active',
        is_subscription: true,
        subscription_id: subscriptionData.provider_subscription_id,
        subscription_status: subscriptionData.status || 'active',
        next_billing_date: subscriptionData.next_billing_date,
        payment_data: subscriptionData.data || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to create subscription:', error);
      return null;
    }

    logger.info(`[DB] ✅ Subscription created: ${subscriptionData.provider_subscription_id} (${subscriptionData.provider})`);
    return data;
  }

  async getActiveSubscription(telegram_id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('telegram_id', telegram_id)
      .eq('is_subscription', true)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get active subscription:', error);
      return null;
    }

    return data;
  }

  async getSubscriptionByProvider(provider, provider_subscription_id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('method', provider)
      .eq('subscription_id', provider_subscription_id)
      .eq('is_subscription', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[DB] Failed to get subscription by provider:', error);
      return null;
    }

    return data;
  }

  async updateSubscription(subscription_id, updates) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription_id)
      .eq('is_subscription', true)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to update subscription:', error);
      return null;
    }

    logger.info(`[DB] ✅ Subscription updated: ${subscription_id}`);
    return data;
  }

  async cancelUserSubscription(telegram_id) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        subscription_status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('telegram_id', telegram_id)
      .eq('is_subscription', true)
      .eq('subscription_status', 'active')
      .select();

    if (error) {
      logger.error('[DB] Failed to cancel subscription:', error);
      return null;
    }

    logger.info(`[DB] ✅ Subscription cancelled for user: ${telegram_id}`);
    return data && data.length > 0 ? data[0] : null;
  }

  async getAllActiveSubscriptions() {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('is_subscription', true)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[DB] Failed to get active subscriptions:', error);
      return [];
    }

    return data || [];
  }

  async getExpiringSubscriptions(days = 3) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('is_subscription', true)
      .eq('subscription_status', 'active')
      .gte('next_billing_date', new Date().toISOString())
      .lte('next_billing_date', targetDate.toISOString());

    if (error) {
      logger.error('[DB] Failed to get expiring subscriptions:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // SUPPORT TICKETS
  // ==========================================

  async createSupportTicket(telegram_id, message_type, message) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .insert([{
        telegram_id,
        message_type, // 'predefined' or 'custom'
        message,
        status: 'open'
      }])
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to create support ticket:', { error, telegram_id });
      throw new Error('Failed to create support ticket');
    }

    logger.info('[DB] Support ticket created:', { telegram_id, message_type });
    return data;
  }

  async getSupportTickets(status = null) {
    let query = this.supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[DB] Failed to get support tickets:', { error });
      return [];
    }

    return data || [];
  }

  async closeSupportTicket(ticket_id) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .update({ status: 'closed' })
      .eq('id', ticket_id)
      .select()
      .single();

    if (error) {
      logger.error('[DB] Failed to close support ticket:', { error, ticket_id });
      throw new Error('Failed to close support ticket');
    }

    return data;
  }
}

export default DatabaseService;
