// Helper pour formater cooldown
export function formatCooldown(minutes, lang) {
    if (minutes === 15) {
      return { fr: '15 minutes', pt: '15 minutos', en: '15 minutes' }[lang];
    } else if (minutes === 60) {
      return { fr: '1 heure', pt: '1 hora', en: '1 hour' }[lang];
    } else if (minutes === 360) {
      return { fr: '6 heures', pt: '6 horas', en: '6 hours' }[lang];
    } else if (minutes === 1440) {
      return { fr: '24 heures', pt: '24 horas', en: '24 hours' }[lang];
    } else if (minutes === 10080) {
      return { fr: '1 semaine', pt: '1 semana', en: '1 week' }[lang];
    }
    return `${minutes}min`;
  }