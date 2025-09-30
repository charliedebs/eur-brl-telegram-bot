import { formatAmount, formatRate, getLocale } from '../services/rates.js';

const fr = {
  INTRO_TEXT: `👋 <b>Bienvenue !</b>

La blockchain est aujourd'hui un moyen très efficace et économique, parfaitement légal et déjà utilisé par beaucoup d'institutions pour les transferts internationaux.

👉 Les taux sont souvent bien meilleurs que ceux des plateformes traditionnelles.

Je suis là pour t'expliquer, comparer et te guider pas à pas.

💡 C'est gratuit !

🌐 Choisis ta langue pour commencer 👇`,

  pickLang: '🌐 Choisis ta langue',
  promptAmt: `💬 Envoie un montant (ex. <b>1000</b>) ou choisis une route.`,
  askRoute: (amount) => `Tu veux faire quoi avec <b>${formatAmount(amount, 0, 'fr-FR')}</b> ?`,
  askAmount: `✏️ Entre un montant (ex. 1000 ou "€1000" / "R$1.000").`,
  invalidAmount: `⚠️ Montant invalide.\nExemples : 1000, €1000, R$1.000`,
  errorRates: `⚠️ Taux indisponibles. Réessaie dans un instant.`,
  errorGeneral: `❌ Une erreur est survenue. Réessaie.`,
  
  buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, winner }) => {
    const locale = 'fr-FR';
    const title = route === 'eurbrl' ? '<b>💱 Comparaison EUR → BRL</b>' : '<b>💱 Comparaison BRL → EUR</b>';
    const ref = `📊 Taux : ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}`;
    
    const onchainLine = route === 'eurbrl'
      ? `🌍 On-chain (Pix)\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(onchain.out, 2, locale)}\nTaux : ${formatRate(onchain.rate, locale)}`
      : `🌍 On-chain (SEPA)\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)}\nTaux : ${formatRate(onchain.rate, locale)}`;
    
    const bankLine = route === 'eurbrl'
      ? `🏦 Meilleur off-chain (${bestBank.provider})\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(bestBank.out, 2, locale)}\nTaux : ${formatRate(bestBank.rate, locale)}`
      : `🏦 Meilleur off-chain (${bestBank.provider})\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)}\nTaux : ${formatRate(bestBank.rate, locale)}`;
    
    let othersText = '';
    if (others.length > 0) {
      othersText = '\n\nAutres :\n' + others.map(p => 
        `• ${p.provider} : ${formatAmount(p.out, 2, locale)} (${formatRate(p.rate, locale)})`
      ).join('\n');
    }
    
    const sign = delta >= 0 ? '+' : '−';
    const deltaText = `\nΔ : ${sign}${formatAmount(Math.abs(delta), 1, locale)}% en faveur de ${winner}`;
    const footer = `\nDonnées via Wise Comparisons. Liens de parrainage gratuits pour toi.`;
    
    return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}${footer}`;
  },
  
  onchainIntro: `🚀 Route on-chain (recommandée)

L'idée : tu envoies tes euros et tu reçois des reais par Pix via USDC (un dollar numérique).

1️⃣ Europe → change EUR en USDC
2️⃣ Transfert blockchain (rapide, peu cher)
3️⃣ Brésil → change USDC en BRL et reçois par Pix

Il te faut :
- Un compte exchange Europe
- Un compte exchange Brésil

💡 C'est simple, je te guide pas à pas.`,
  
  alertsPrompt: `⏰ Créer une alerte

Dis-moi en une phrase :
- "Alerte EUR→BRL si > 6,20"
- "Préviens-moi BRL→EUR sous 0,17"`,
  
  alertCreated: (alert) => `✅ Alerte créée !\n• ${alert.pair === 'eurbrl' ? 'EUR→BRL' : 'BRL→EUR'} ${alert.direction} ${formatRate(alert.threshold, 'fr-FR')}\n\nJe t'enverrai un message quand c'est atteint.`,
  
  alertParseError: `😕 Je n'ai pas compris.\nPrécise : paire (EUR→BRL), sens (>/<), seuil (ex. 6,20)`,
  
  alertTriggered: (alert, rates) => {
    const currentRate = alert.pair === 'eurbrl' ? rates.cross : 1 / rates.cross;
    return `🔔 Alerte déclenchée !\n${alert.pair === 'eurbrl' ? 'EUR→BRL' : 'BRL→EUR'} : ${formatRate(currentRate, 'fr-FR')} ${alert.direction} ${formatRate(alert.threshold, 'fr-FR')}\n\nC'est le moment !`;
  },
  
  alertsList: (alerts) => {
    const list = alerts.map(a => `• ${a.pair === 'eurbrl' ? 'EUR→BRL' : 'BRL→EUR'} ${a.direction} ${formatRate(a.threshold, 'fr-FR')}`).join('\n');
    return `🔔 Mes alertes\n\n${list}`;
  },
  
  alertsEmpty: `🔔 Aucune alerte active.`,
  alertDisabled: `Alerte désactivée ✅`,
  
  premiumInfo: `🚀 Premium\n\nPour aller plus loin :\n• Multi-alertes\n• Multi-devises\n• Vérifs plus rapides\n\nIntéressé ?`,
  premiumThanks: `Merci ! Ton intérêt est noté ✅`,
  
  HELP_FAQ: `❓ Aide\n\n• On-chain = transfert blockchain (rapide, peu coûteux)\n• USDC = stablecoin (≈1 USD)\n• Temps : 1-10 min\n• Frais : ~0,1-0,2% + réseau ~1 USDC + Pix ~R$3,50`,
  
  btn: {
    langFR: '🇫🇷 Français',
    langPT: '🇧🇷 Português',
    langEN: '🇬🇧 English',
    eurbrl: (amt) => `🇪🇺 EUR → 🇧🇷 BRL · €${formatAmount(amt, 0, 'fr-FR')}`,
    brleur: (amt) => `🇧🇷 BRL → 🇪🇺 EUR · R$${formatAmount(amt, 0, 'fr-FR')}`,
    contOn: '🚀 Continuer on-chain',
    stayOff: '🏦 Rester off-chain',
    change: '✏️ Changer montant',
    back: '⬅️ Retour',
    setAlert: '⏰ Alerte',
    premium: '🚀 Premium',
    help: '🆘 Aide',
  },
};

const pt = { ...fr, INTRO_TEXT: `👋 <b>Bem-vindo!</b>\n\nO blockchain é eficiente, econômico e legal para transferências internacionais.\n\n💡 É grátis!\n\n🌐 Escolha o idioma 👇`, promptAmt: `💬 Envie um valor (ex. <b>1000</b>).` };
const en = { ...fr, INTRO_TEXT: `👋 <b>Welcome!</b>\n\nBlockchain is efficient, economical and legal for international transfers.\n\n💡 It's free!\n\n🌐 Choose language 👇`, promptAmt: `💬 Send an amount (e.g., <b>1000</b>).` };

export const messages = { fr, pt, en };