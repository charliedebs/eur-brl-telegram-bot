import { formatAmount, formatRate, getLocale } from '../services/rates.js';
import { LINKS } from '../config/constants.js';

// Messages français validés
const fr = {
  // Écran 0 : Intro + sélection langue
  INTRO_TEXT: `👋 Oi !

🌐 Choisis ta langue · Escolha o idioma · Choose your language`,

  // Écran "À propos"
  ABOUT_TEXT: `💡 À propos

Ce bot compare les taux EUR↔BRL et te guide pour des transferts on-chain (via blockchain).

Les taux on-chain sont souvent meilleurs que les plateformes traditionnelles. C'est légal, sûr et utilisé par de nombreuses institutions.

Service gratuit, financé par des liens de parrainage.`,

  // Écran 1 : Choix route/montant
  promptAmt: `💬 Envoie un montant ou choisis :`,
  
  // Écran 1bis : Clarification route
  askRoute: (amount, locale) => `Tu veux faire quoi avec ${formatAmount(amount, 0, locale)} ?`,
  
  // Écran 2 : Carte comparaison
  buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, winner, locale }) => {
    const title = route === 'eurbrl' ? '💱 EUR → BRL' : '💱 BRL → EUR';
    const ref = `📊 Réf. ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}`;
    
    const onchainLine = route === 'eurbrl'
      ? `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`
      : `🌍 On-chain\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
    
    const bankLine = route === 'eurbrl'
      ? `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
      : `🏦 ${bestBank.provider}\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
    
    let othersText = '';
    if (others.length > 0) {
      const othersList = others.map(p => 
        route === 'eurbrl' 
          ? `${p.provider} R$${formatAmount(p.out, 0, locale)}`
          : `${p.provider} €${formatAmount(p.out, 2, locale)}`
      ).join(' • ');
      othersText = `\n\nAutres : ${othersList}`;
    }
    
    const sign = delta >= 0 ? '+' : '−';
    const deltaText = `\n\n✅ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
    
    return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
  },

  // Écran 2bis : Sources des données
  SOURCES_TEXT: `📊 Sources des données

Taux de référence EUR/BRL : Yahoo Finance (taux de change officiel)

Calcul on-chain : 
• Taux crypto : CoinGecko (USDC/EUR, USDC/BRL)
• Frais réels inclus :
  - Trading ~0,1-0,2%
  - Réseau Polygon ~1 USDC
  - Retrait Pix ~R$3,50

Taux off-chain : API Wise Comparisons (taux live des providers)

Liens de parrainage : gratuits pour toi, financent le service.`,

  // Écran 3 : Rester off-chain
  buildOffChain: ({ route, amount, bestBank, others, locale }) => {
    const title = '🏦 Off-chain';
    
    const bestLine = route === 'eurbrl'
      ? `Meilleur : ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
      : `Meilleur : ${bestBank.provider}\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
    
    let othersText = '';
    if (others.length > 0) {
      othersText = '\n\nAutres options :\n' + others.map(p => {
        if (route === 'eurbrl') {
          return `• ${p.provider} : R$${formatAmount(p.out, 0, locale)} (${formatRate(p.rate, locale)})`;
        } else {
          return `• ${p.provider} : €${formatAmount(p.out, 2, locale)} (${formatRate(p.rate, locale)})`;
        }
      }).join('\n');
    }
    
    return `${title}\n\n${bestLine}${othersText}\n\n💡 Souvent un peu plus cher que l'on-chain, mais certains préfèrent ces solutions pour leur simplicité.\n\n✅ Plateformes régulées et fiables. Si tu n'as pas encore de compte, utilise nos liens de parrainage : c'est gratuit pour toi, ça finance le service (et tu peux même souvent y gagner).\n\n*Données fournies par Wise Comparisons*`;
  },

  // Écran 4 : Route on-chain
  ONCHAIN_INTRO: `🚀 Route On-Chain

C'est la méthode que nous utilisons nous-mêmes — et la raison pour laquelle ce bot existe. Nous la recommandons parce qu'elle élimine le superflu : moins d'intermédiaires, moins de frais, plus de transparence.

🔄 Étapes simples :
1️⃣ Europe → échange tes EUR → USDC (stablecoin)
2️⃣ Blockchain → envoie tes USDC (rapide, peu coûteux)
3️⃣ Brésil → retransforme tes USDC en BRL, reçus par Pix

ℹ️ Ce qu'il te faut :
• un compte exchange 🇪🇺 en Europe
• un compte exchange 🇧🇷 au Brésil

💡 Les transferts classiques peuvent coûter entre 2,5 % et 6 %, voire plus — alors que via la blockchain, tu peux limiter ça à 0-1 % (on te met quelques sources pour te le prouver !).`,

  // Écran 4bis : Preuves & sources
  SOURCES_PROOF: `📊 Preuves & sources (2025)

💡 Pourquoi on dit que la blockchain est souvent bien moins chère ?

• 💱 Cryptocurrency-based remittance statistics 2025 : les services traditionnels appliquent en moyenne 6,5 % de frais, alors que les transferts crypto (stablecoins, etc.) peuvent coûter aussi peu que 1 %.

• 📈 Global Remittance Prices – World Bank : en mars 2025, le coût moyen des transferts par voies traditionnelles est de 6,49 % du montant envoyé.

• 🔍 CFA Institute — "Blockchain in FX and Remittances" (2025) : des investisseurs institutionnels utilisent déjà les stablecoins pour réduire les temps de règlement, diminuer les coûts, et gérer les risques sur les transferts cross-border.

• 📊 McKinsey – "The stable door opens : tokenized cash / stablecoins" (2025) : le volume des envois transfrontaliers utilisant des stablecoins a augmenté rapidement, et les stablecoins sont de plus en plus envisagés comme infrastructure de paiement moderne.`,

  // Écran 5 : Ouvrir compte Europe
  EXCHANGES_EU: `🇪🇺 Exchanges en Europe

Notre préférence :
• Kraken — SEPA simple/gratuit, sérieux, USDC dispo. (👋 C'est aussi ce qu'on utilise nous)

Autres solutions :
• Binance (UE) — très liquide, frais ~0,10%
  ⚠️ Si tu choisis Binance côté 🇪🇺, il faudra un autre exchange côté 🇧🇷
• Bitvavo — SEPA gratuit, UX simple, frais bas
• Bitstamp — vétéran UE, sérieux
• Coinbase Advanced — simple mais frais plus élevés

À vérifier : SEPA ok • USDC dispo • frais raisonnables • réputation

Nos liens de parrainage financent le service (gratuits pour toi, parfois bonus).`,

  // Écran 6 : Ouvrir compte Brésil
  EXCHANGES_BR: `🇧🇷 Exchanges au Brésil

Notre préférence :
• Binance BR — Pix natif, liquidité énorme, frais bas (~0,10%) + 3,50 BRL fixes par retrait Pix. (👋 C'est aussi ce qu'on utilise nous)

Autres solutions :
• Bitso — Pix gratuit et instantané, interface claire, régulé localement
• Mercado Bitcoin — acteur local historique, Pix supporté
• Foxbit — Pix 24/7, frais corrects

À vérifier : Pix ok • USDC dispo • frais raisonnables • réputation

Nos liens de parrainage financent le service (gratuits pour toi, parfois bonus).

⚠️ Rappel : un exchange sert à un côté. Il faut un 🇪🇺 (SEPA) + un 🇧🇷 (Pix).`,

  // Écrans pédagogiques
  WHAT_IS_USDC: `🪙 C'est quoi l'USDC ?

USDC = USD Coin, un "stablecoin" (crypto stable).

En pratique :
• 1 USDC vaut toujours ~1 dollar américain
• Émis par Circle (entreprise régulée aux USA)
• Réserves vérifiées régulièrement
• Accepté sur tous les exchanges majeurs

Pourquoi on choisit l'USDC ?
• Conforme à MiCA (réglementation européenne des crypto-actifs)
• Utilisable légalement et simplement en Europe
• Contrairement au Bitcoin qui fluctue, l'USDC reste stable

C'est parfait pour transférer de l'argent sans risque de variation.

Tu l'utilises comme "monnaie pivot" : EUR → USDC → BRL.`,

  WHAT_IS_EXCHANGE: `🏦 C'est quoi un exchange ?

Un exchange crypto, c'est comme un bureau de change digital.

Tu peux :
• Déposer de l'argent classique (EUR, BRL...)
• Acheter/vendre des cryptos (USDC, Bitcoin...)
• Les envoyer vers d'autres exchanges

Les plus connus : Kraken, Binance, Coinbase, Bitso...

Pour notre cas :
• Exchange Europe = tu déposes EUR, tu achètes USDC
• Exchange Brésil = tu reçois USDC, tu les vends en BRL, tu retires par Pix

C'est réglementé et sûr (si tu choisis des plateformes reconnues).`,

  MARKET_VS_LIMIT: `📈 Market vs Limit

<b>Market (au marché)</b> :
• Exécution immédiate au prix actuel
• Simple et rapide
• Recommandé pour débuter

<b>Limit (limite)</b> :
• Tu fixes TON prix d'achat/vente
• L'ordre s'exécute uniquement si le marché atteint ton prix
• Utile pour gros montants ou optimiser le taux

<i>Astuce : si tu veux « juste échanger », choisis Market.</i>`,

  // Écran 7 : Transition
  GUIDE_TRANSITION: `✅ Tu as (ou tu vas avoir) :
• Un compte 🇪🇺 pour déposer tes EUR (SEPA → USDC)
• Un compte 🇧🇷 pour retirer tes BRL (USDC → Pix)

🌐 Tu fais ton premier pas on-chain.
C'est plus qu'un simple transfert :
• tu découvres une technologie qui change déjà la finance mondiale,
• tu rejoins des millions d'utilisateurs, d'entreprises et d'institutions,
• tu gardes plus de valeur pour toi (et moins pour les intermédiaires 💸).

🚀 Maintenant, on commence concrètement : première étape → déposer tes EUR sur ton compte 🇪🇺 et les convertir en USDC.`,

  // Étape 1 : Dépôt EUR & achat USDC
  STEP_1_1: (amount, locale) => `1️⃣ Déposer tes EUR sur ton compte exchange

• Va dans la section "Dépôt / Deposit / Fiat".
• Choisis EUR comme devise.
• Méthode la plus simple : virement SEPA (rapide, frais bas ou nuls).

💡 "Fiat" = les monnaies classiques (EUR, USD, BRL…).

👉 Recommandé : Kraken.

Estimation de ton solde : €${formatAmount(amount, 0, locale)}
*⚠️ C'est une estimation, proche du réel. Les frais et délais bancaires peuvent légèrement varier.*`,

  STEP_1_2: (amount, locale) => `2️⃣ Accéder au marché pour acheter USDC

• Dans ton exchange, cherche "Trader / Marché / Trade".
• Sélectionne la paire EUR/USDC.

💡 Un marché crypto, c'est comme un bureau de change : tu échanges une monnaie contre une autre.

Estimation de ton solde : €${formatAmount(amount, 0, locale)} (prêt pour achat USDC)
*⚠️ Estimation indicative.*`,

  STEP_1_3: (usdcAmount, locale) => `3️⃣ Acheter tes USDC

• Choisis le type d'ordre :
  • Au marché (Market) → instantané, simple, recommandé.
  • Limite (Limit) → tu fixes ton prix, utile pour grosses sommes/liquidité.

👉 Pour débuter : ordre au marché.

Estimation de ton solde : ~${formatAmount(usdcAmount, 2, locale)} USDC
*⚠️ Estimation proche du réel. Les frais & prix peuvent légèrement varier.*`,

  STEP_1_4: `✅ Bien joué ! Tu as maintenant des USDC dans ton compte 🇪🇺.

✨ Les USDC sont des "stablecoins" : ~1 USDC = 1 USD.
C'est la clé pour transférer ton argent de manière rapide et peu coûteuse.

Prochaine étape : les envoyer on-chain vers le Brésil.`,

  // Étape 2 : Transfert on-chain
  STEP_2_1: `✨ C'est l'étape "on-chain" → rapide et peu coûteuse, mais demande un peu de concentration.
Contrairement à une banque, si tu fais une erreur, il n'y a pas de SAV pour récupérer tes fonds.

1️⃣ Récupérer ton adresse de dépôt 🇧🇷

• Dans ton exchange brésilien, cherche "Dépôt / Crypto".
• Choisis USDC comme crypto à déposer.
• Sélectionne le réseau de transfert.

💡 Nous recommandons Polygon (MATIC) → rapide, fiable, frais bas (~1 USDC).

• Copie soigneusement l'adresse.

💡 Imagine que c'est comme ton IBAN bancaire, mais version blockchain (une longue suite de lettres et chiffres).`,

  STEP_2_2: (usdcAmount, locale) => `2️⃣ Envoyer depuis ton exchange 🇪🇺

• Va dans "Retrait / Withdraw" → USDC.
• Colle l'adresse copiée.
• Choisis le même réseau que celui du dépôt (ex. Polygon).

💡 Le réseau, c'est comme les rails d'un train : si ce n'est pas les mêmes des deux côtés, l'argent part ailleurs et il est perdu.

• Indique ton montant. Tu peux tout envoyer, ou commencer par un test (ex. 10 USDC).

👉 Le test coûte un peu plus cher (frais fixes ~1 USDC s'appliquent deux fois), mais c'est une bonne pratique courante en crypto.

Estimation : tu recevras ~${formatAmount(usdcAmount - 1, 2, locale)} USDC côté 🇧🇷
*⚠️ Estimation proche du réel (frais réseau ~1 USDC).*`,

  STEP_2_3: `3️⃣ Vérifier et confirmer

• Relis attentivement l'adresse et le réseau avant de valider.

⚠️ Un seul caractère faux dans l'adresse, ou un mauvais réseau, et tes fonds sont définitivement perdus.

👉 Une fois que tu as bien vérifié, tu peux confirmer le transfert.`,

  STEP_2_4: `4️⃣ Attendre l'arrivée

• En général, la transaction prend 1–2 minutes, parfois jusqu'à 10 min.
• Tu verras ton solde USDC apparaître côté 🇧🇷.

✅ Résultat : tes USDC sont arrivés → prêt pour l'étape 3 (vente en BRL + retrait Pix).`,

  // Étape 3 : Vente USDC & Pix
  STEP_3_1: `1️⃣ Trouver le marché USDC/BRL 🇧🇷

• Dans ton exchange brésilien, va dans Trader / Mercado / Marché.
• Sélectionne la paire USDC/BRL.

👉 Prochaine étape : tes USDC se transforment enfin en BRL 🎉`,

  STEP_3_2: (brlAmount, locale) => `2️⃣ Passer ton ordre

• "Au marché / Market" → instantané, au prix actuel (simple, recommandé).
• "Limite / Limit" → tu fixes ton prix, utile pour grosses sommes.

👉 Pour la plupart des gens, "ordre au marché" = le plus simple et rapide.

Estimation de ton solde : ~R$${formatAmount(brlAmount, 2, locale)}
*⚠️ Estimation proche du réel (frais ~0,10–0,20%).*`,

  STEP_3_3: (brlNet, locale) => `3️⃣ Retirer ton argent en R$

• Une fois tes USDC vendus, ton solde apparaît en BRL.
• Va dans Retrait / Saque / Withdraw.
• Choisis Pix comme méthode.

👉 Entre ta clé Pix (CPF, email, tel, clé aléatoire)… mais ça, tu sais déjà faire 😉

💡 D'ailleurs : comme pour une adresse crypto, si la clé est fausse, l'argent part au mauvais endroit.

👉 Généralement, les frais sont très bas (ex. Binance ~R$3,50 par retrait Pix).
Ça devrait être gratuit honnêtement… mais bon 😅

Estimation de ton solde reçu : ~R$${formatAmount(brlNet, 2, locale)} nets
*⚠️ Allez, on ne devrait pas être trop loin de la réalité ;)*`,

  WHY_NOT_EXACT: `🤔 Pourquoi on ne peut pas te donner le montant exact ?

Les variables qui bougent en temps réel :

• Frais des exchanges : peuvent varier selon ton profil utilisateur, ton volume de trading, ou des promotions ponctuelles (mais restent toujours faibles).

• Frais réseau : fluctuent selon la congestion du réseau blockchain (~1 USDC en moyenne sur Polygon, mais ça peut varier).

• Taux de change : les marchés crypto bougent en temps réel, même si l'USDC reste stable, le taux USDC/BRL peut légèrement fluctuer entre le moment où tu calcules et celui où tu exécutes.

Nos estimations sont prudentes et proches du réel. Tu ne devrais avoir aucune mauvaise surprise.`,

  STEP_3_4: `✅ Ton transfert est terminé !

• Tu as converti tes EUR en USDC côté 🇪🇺.
• Tu les as envoyés on-chain.
• Tu les as vendus contre BRL et retirés via Pix côté 🇧🇷.

✨ Résultat : rapide, sûr et à moindre coût.

🌍 Tu viens de faire un vrai passage par la blockchain.
Ce que tu as appris aujourd'hui sera de plus en plus utilisé dans le futur : tu viens de prendre une longueur d'avance.

🙌 On espère que tu as kiffé l'expérience !`,

  // Boutons
  btn: {
    langFR: '🇫🇷 Français',
    langPT: '🇧🇷 Português',
    langEN: '🇬🇧 English',
    about: 'ℹ️ À propos',
    eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
    brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (SEPA) · R$${formatAmount(amt, 0, locale)}`,
    contOn: '🚀 Continuer on-chain',
    stayOff: '🏦 Rester off-chain',
    change: '✏️ Changer montant',
    back: '⬅️ Retour',
    sources: '📊 Sources des données',
    openWise: '🔗 Ouvrir Wise',
    openRemitly: '🔗 Ouvrir Remitly',
    openInstarem: '🔗 Ouvrir Instarem',
    seeOnchain: '🚀 Voir route on-chain',
    createEU: '🇪🇺 Créer compte Europe',
    createBR: '🇧🇷 Créer compte Brésil',
    startGuide: '🚀 Démarrer le guide',
    whatIsUSDC: '🪙 Qu\'est-ce que l\'USDC ?',
    whatIsExchange: '🏦 Qu\'est-ce qu\'un exchange ?',
    proofSources: '📊 Preuves & sources',
    openKraken: '🔗 Ouvrir Kraken',
    openBinanceEU: '🔗 Ouvrir Binance (UE)',
    openBitvavo: '🔗 Ouvrir Bitvavo',
    openBitstamp: '🔗 Ouvrir Bitstamp',
    openCoinbase: '🔗 Ouvrir Coinbase',
    openBinanceBR: '🔗 Ouvrir Binance BR',
    openBitso: '🔗 Ouvrir Bitso',
    openMercadoBitcoin: '🔗 Ouvrir Mercado Bitcoin',
    openFoxbit: '🔗 Ouvrir Foxbit',
    startStep1: '🚀 Déposer & convertir mes EUR en USDC',
    step1Done: '✅ J\'ai déposé mes EUR',
    step1_2Done: '✅ J\'ai trouvé le marché EUR/USDC',
    step1_3Done: '✅ J\'ai acheté mes USDC',
    marketVsLimit: 'ℹ️ Market vs Limit',
    nextStep2: '👉 Passer à l\'étape 2 (transfert)',
    step2Done: '✅ J\'ai mon adresse → continuer',
    step2_2Done: '✅ J\'ai saisi mon montant',
    step2_3Done: '✅ J\'ai confirmé le transfert',
    step3Start: '🇧🇷 Étape 3 — Vendre USDC & retirer en Pix',
    step3_1Done: '✅ J\'ai trouvé le marché',
    step3_2Done: '✅ J\'ai passé mon ordre',
    step3_3Done: '✅ J\'ai lancé mon Pix',
    whyNotExact: '🤔 Pourquoi pas le solde exact ?',
    setAlert: '⏰ Activer mon alerte',
    premium: '🚀 Découvrir Premium',
    giveFeedback: '💬 Donner une suggestion',
  },
};

// Placeholder PT/EN (on les fera après)
const pt = { ...fr };
const en = { ...fr };

export const messages = { fr, pt, en };