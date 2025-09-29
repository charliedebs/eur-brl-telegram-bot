export class AlertsService {
    constructor(db) {
      this.db = db;
    }
    
    parseAlertText(text) {
      if (!text) return null;
      
      const lower = text.toLowerCase();
      
      // Detect pair
      let pair = null;
      const hasEUR = /eur|€|euro/.test(lower);
      const hasBRL = /brl|r\$|real|reais/.test(lower);
      
      if (hasEUR && hasBRL) {
        if (/(to|vers|para|→)\s*(brl|r\$)/.test(lower)) pair = 'eurbrl';
        else if (/(to|vers|para|→)\s*(eur|€)/.test(lower)) pair = 'brleur';
        else pair = 'eurbrl';
      }
      
      // Detect direction
      let direction = null;
      if (lower.includes('>') || /au[\s-]?dessus|acima|above|plus|maior/.test(lower)) {
        direction = '>';
      } else if (lower.includes('<') || /en[\s-]?dessous|abaixo|below|moins|menor/.test(lower)) {
        direction = '<';
      }
      
      // Extract threshold
      const numMatch = text.match(/[\d]+[.,]?[\d]*/);
      const threshold = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : null;
      
      if (pair && direction && threshold && isFinite(threshold) && threshold > 0) {
        return { pair, direction, threshold };
      }
      
      return null;
    }
    
    async createAlert(telegramId, alertData) {
      const user = await this.db.getUser(telegramId);
      if (!user) return null;
      
      const existing = await this.db.getUserAlerts(telegramId);
      const duplicate = existing.find(a => 
        a.pair === alertData.pair && 
        a.direction === alertData.direction &&
        Math.abs(a.threshold - alertData.threshold) < 0.0001
      );
      
      if (duplicate) {
        return { duplicate: true, alert: duplicate };
      }
      
      return await this.db.createAlert(user.id, alertData);
    }
    
    async getUserAlerts(telegramId) {
      return await this.db.getUserAlerts(telegramId);
    }
    
    async disableAlert(alertId) {
      return await this.db.disableAlert(alertId);
    }
    
    async checkAlerts(rates) {
      const alerts = await this.db.getActiveAlerts();
      const triggered = [];
      
      for (const alert of alerts) {
        const currentRate = alert.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
        
        const shouldTrigger = 
          (alert.direction === '>' && currentRate >= alert.threshold) ||
          (alert.direction === '<' && currentRate <= alert.threshold);
        
        if (shouldTrigger) {
          await this.db.updateAlert(alert.id, {
            active: false,
            triggered_at: new Date().toISOString()
          });
          
          triggered.push({
            ...alert,
            current_rate: currentRate,
            telegram_id: alert.users.telegram_id
          });
        }
      }
      
      return triggered;
    }
  }