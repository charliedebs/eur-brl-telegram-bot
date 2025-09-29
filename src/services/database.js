import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export class DatabaseService {
  async getUser(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get user:', error);
      return null;
    }
    
    return data;
  }
  
  async createUser(telegramId, language = 'fr') {
    const { data, error } = await supabase
      .from('users')
      .insert([{ telegram_id: telegramId, language }])
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create user:', error);
      return null;
    }
    
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
      console.error('Failed to update user:', error);
      return null;
    }
    
    return data;
  }
  
  async createAlert(userId, alertData) {
    const { data, error } = await supabase
      .from('alerts')
      .insert([{ user_id: userId, ...alertData }])
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create alert:', error);
      return null;
    }
    
    return data;
  }
  
  async getUserAlerts(telegramId) {
    const user = await this.getUser(telegramId);
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to get alerts:', error);
      return [];
    }
    
    return data || [];
  }
  
  async getActiveAlerts() {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        users!inner (telegram_id, language)
      `)
      .eq('active', true);
    
    if (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
    
    return data || [];
  }
  
  async updateAlert(alertId, updates) {
    const { data, error } = await supabase
      .from('alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update alert:', error);
      return null;
    }
    
    return data;
  }
  
  async disableAlert(alertId) {
    return this.updateAlert(alertId, { active: false });
  }
}