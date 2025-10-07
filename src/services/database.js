import { createClient } from '@supabase/supabase-js';

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
  // USERS
  // ==========================================
  
  async getUser(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('[DB] Failed to get user:', error);
      return null;
    }
    
    return data;
  }
  
  async createUser(telegramId, language = 'pt') {
    const { data, error } = await supabase
      .from('users')
      .insert([{ telegram_id: telegramId, language }])
      .select()
      .single();
    
    if (error) {
      console.error('[DB] Failed to create user:', error);
      return null;
    }
    
    console.log(`[DB] ✅ User created: ${telegramId} (${language})`);
    return data;
  }
  
  async updateUser(telegramId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      console.error('[DB] Failed to update user:', error);
      return null;
    }
    
    return data;
  }

  async getAllActiveUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, language')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[DB] Failed to get active users:', error);
      return [];
    }
    
    return data || [];
  }

  // ==========================================
  // PREMIUM
  // ==========================================

  async isPremium(telegramId) {
    const user = await this.getUser(telegramId);
    if (!user) return false;
    
    if (!user.premium_until) return false;
    
    const now = new Date();
    const premiumUntil = new Date(user.premium_until);
    
    return premiumUntil > now;
  }

  async getPremiumUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .not('premium_until', 'is', null)
      .gte('premium_until', new Date().toISOString());
    
    if (error) {
      console.error('[DB] Failed to get premium users:', error);
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
      console.error('[DB] Failed to get expiring users:', error);
      return [];
    }
    
    return data || [];
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
      console.error('[DB] Failed to save rate history:', error);
      return null;
    }
    
    console.log(`[DB] ✅ Rate saved: ${rateData.pair} = ${rateData.rate}`);
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
      console.error('[DB] Failed to get rate history:', error);
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
      console.error('[DB] Failed to get last rate:', error);
      return null;
    }
    
    return data;
  }

// ==========================================
// RATES HISTORY - Ajouter méthode getAverage générique
// ==========================================

async getAverage(pair, days = 30) {
  const history = await this.getRateHistory(pair, days);
  if (history.length === 0) return null;
  
  const sum = history.reduce((acc, h) => acc + parseFloat(h.rate), 0);
  return sum / history.length;
}

// ==========================================
// ALERTS - Méthode createAlert mise à jour
// ==========================================

async createAlert(userId, alertData) {
  // Validation : threshold_type requis
  if (!alertData.threshold_type) {
    console.error('[DB] Missing threshold_type');
    return null;
  }

  // Validation : threshold_value requis
  if (alertData.threshold_value === undefined || alertData.threshold_value === null) {
    console.error('[DB] Missing threshold_value');
    return null;
  }
  
  // Validation : reference_type requis si relatif
  if (alertData.threshold_type === 'relative' && !alertData.reference_type) {
    console.error('[DB] Missing reference_type for relative threshold');
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
      reference_type: alertData.reference_type,     // 'current' | 'avg7d' | 'avg30d' | 'avg90d' | null
      preset: alertData.preset || null,
      cooldown_minutes: alertData.cooldown_minutes || 60,
      active: true
    }])
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Failed to create alert:', error);
    return null;
  }
  
  const typeLabel = alertData.threshold_type === 'absolute' 
    ? `seuil ${alertData.threshold_value}` 
    : `+${alertData.threshold_value}% vs ${alertData.reference_type}`;
  
  console.log(`[DB] ✅ Alert created: ${alertData.pair} ${typeLabel} (cooldown: ${alertData.cooldown_minutes}min)`);
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
      console.error('[DB] Failed to get user alerts:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getActiveAlerts() {
    const { data, error } = await supabase
      .from('user_alerts')
      .select(`
        *,
        users!inner (telegram_id, language)
      `)
      .eq('active', true);
    
    if (error) {
      console.error('[DB] Failed to get active alerts:', error);
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
      console.error('[DB] Failed to update alert:', error);
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
      console.error('[DB] Failed to create pix payment:', error);
      return null;
    }
    
    console.log(`[DB] ✅ Pix payment created: ${paymentData.amount} R$ (${paymentData.duration_months}m)`);
    return data;
  }

  async getPixPayment(paymentId) {
    const { data, error } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('[DB] Failed to get pix payment:', error);
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
      console.error('[DB] Failed to update pix payment:', error);
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

      console.log(`[DB] ✅ Premium activated until ${premiumUntil.toISOString()}`);
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
      console.error('[DB] Failed to get expired payments:', error);
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
      console.error('[DB] Failed to log free alert:', error);
      return null;
    }
    
    console.log(`[DB] ✅ Free alert logged: ${pair} = ${rate} (${usersCount} users)`);
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
      console.error('[DB] Failed to get last free alert:', error);
      return null;
    }
    
    return data;
  }

  // ==========================================
  // NLU LOGS (déjà existant, on garde)
  // ==========================================

  async logNLU(logData) {
    const { data, error } = await supabase
      .from('nlu_logs')
      .insert([logData])
      .select()
      .single();
    
    if (error) {
      console.error('[DB] Failed to log NLU:', error);
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
        console.error('[DB] Failed to update NLU feedback:', error);
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
      console.error('[DB] Failed to get NLU feedbacks:', error);
      return [];
    }
    
    return data || [];
  }
}

export default DatabaseService;