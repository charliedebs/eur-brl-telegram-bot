import { formatAmount, formatRate, getLocale } from '../services/rates.js';

// Helper pour formater cooldown
function formatCooldown(minutes, lang) {
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

// ============================================
// FRANÇAIS (FR) - COMPLET ✅
// ============================================

const fr = {
  INTRO_TEXT: `👋 Oi !

🌐 Choisis ta langue · Escolha o idioma · Choose your language`,

  ABOUT_TEXT: `💡 À propos

Ce bot compare les taux EUR↔BRL et te guide pour des transferts on-chain (via blockchain).

Les taux on-chain sont souvent meilleurs que les plateformes traditionnelles. C'est légal, sûr et utilisé par de nombreuses institutions.

Service gratuit, financé par des liens de parrainage.`,

  promptAmt: `💬 Envoie un montant ou choisis :`,
  
  askRoute: (amount, locale) => `Tu veux faire quoi avec ${formatAmount(amount, 0, locale)} ?`,
  
  buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale }) => {
    const title = route === 'eurbrl' ? '💱 EUR → BRL' : '💱 BRL → EUR';
    const ref = `📊 Réf. ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}`;
    
    const onchainLine = route === 'eurbrl'
      ? `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`
      : `🌍 On-chain\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
    
    let bankLine;
    if (!bestBank) {
      bankLine = `🏦 Meilleur off-chain\n⚠️ Taux indisponible`;
    } else {
      bankLine = route === 'eurbrl'
        ? `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R$${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `🏦 ${bestBank.provider}\nR$${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
    }
    
    let othersText = '';
    if (others.length > 0) {
      const othersList = others.map(p => 
        route === 'eurbrl' 
          ? `${p.provider} R$${formatAmount(p.out, 0, locale)}` 
          : `${p.provider} €${formatAmount(p.out, 2, locale)}`
      ).join(' • ');
      othersText = `\n\nAutres : ${othersList}`;
    }
    
    let deltaText = '';
    if (delta !== null && bestBank) {
      const sign = delta >= 0 ? '+' : '−';
      deltaText = `\n\n✅ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
    }
    
    return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
  },

  buildCalcDetails: ({ route, amount, rates, onchain, locale }) => {
    const title = '🔍 Détails du calcul on-chain';
    
    if (route === 'eurbrl') {
      const { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet } = onchain.breakdown;
      
      return `${title}

📊 EUR → BRL via USDC

1️⃣ <b>Achat USDC en Europe</b>
   💰 Montant : €${formatAmount(amount, 2, locale)}
   📉 Frais trading (~0,1-0,2%) : −€${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtenus : ${formatAmount(usdcAfterBuy, 2, locale)} USDC

2️⃣ <b>Transfert blockchain</b>
   🌍 Réseau : Polygon (MATIC)
   📉 Frais réseau : −${formatAmount(1, 2, locale)} USDC
   🪙 USDC reçus au Brésil : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Vente USDC au Brésil</b>
   🪙 USDC à vendre : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 Taux USDC/BRL : ${formatRate(rates.usdcBRL, locale)}
   📉 Frais trading (~0,1-0,2%) : −R$${formatAmount(usdcAfterNetwork * rates.usdcBRL * 0.001, 2, locale)}
   💰 BRL obtenus : R$${formatAmount(brlAfterTrade, 2, locale)}

4️⃣ <b>Retrait Pix</b>
   📉 Frais Pix (~R$3,50) : −R$${formatAmount(3.5, 2, locale)}
   
✅ <b>Total reçu : R$${formatAmount(brlNet, 2, locale)}</b>
📊 <b>Taux effectif : ${formatRate(onchain.rate, locale)}</b>

💡 Les frais réels peuvent varier légèrement selon ta plateforme et ton volume de trading.`;
    } else {
      // BRL → EUR
      const { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet } = onchain.breakdown;
      
      return `${title}

📊 BRL → EUR via USDC

1️⃣ <b>Achat USDC au Brésil</b>
   💰 Montant : R$${formatAmount(amount, 2, locale)}
   💱 Taux BRL/USDC : ${formatRate(1/rates.usdcBRL, locale)}
   📉 Frais trading (~0,1-0,2%) : −R$${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtenus : ${formatAmount(usdcFromBRL, 2, locale)} USDC

2️⃣ <b>Transfert blockchain</b>
   🌍 Réseau : Polygon (MATIC)
   📉 Frais réseau : −${formatAmount(1, 2, locale)} USDC
   🪙 USDC reçus en Europe : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Vente USDC en Europe</b>
   🪙 USDC à vendre : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 Taux USDC/EUR : ${formatRate(rates.usdcEUR, locale)}
   📉 Frais trading (~0,1-0,2%) : −€${formatAmount(usdcAfterNetwork * rates.usdcEUR * 0.001, 2, locale)}
   
✅ <b>Total reçu : €${formatAmount(eurNet, 2, locale)}</b>
📊 <b>Taux effectif : ${formatRate(onchain.rate, locale)}</b>

💡 Les frais réels peuvent varier légèrement selon ta plateforme et ton volume de trading.`;
    }
  },

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

  buildOffChain: ({ route, amount, bestBank, others, locale }) => {
    const title = '🏦 Off-chain';
    
    if (!bestBank) {
      return `${title}\n\n⚠️ Taux indisponibles pour le moment.`;
    }
    
    const formatFee = (fee) => {
      if (fee === null || fee === undefined || fee === 0) return 'Sans frais';
      return route === 'eurbrl' ? `${formatAmount(fee, 2, locale)} EUR` : `${formatAmount(fee, 2, locale)} BRL`;
    };
    
    const priorityNames = ['Wise', 'PayPal', 'Western Union'];
    const allProviders = [bestBank, ...others];
    
    const priorityProviders = allProviders.filter(p => priorityNames.includes(p.provider));
    const otherProviders = allProviders.filter(p => !priorityNames.includes(p.provider));
    
    const maxOthers = 6 - priorityProviders.length;
    const topOthers = otherProviders.slice(0, Math.max(2, maxOthers));
    
    const displayProviders = [...priorityProviders, ...topOthers]
      .sort((a, b) => b.out - a.out);
    
    const providersList = displayProviders.map((p, i) => {
      if (route === 'eurbrl') {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 Tu reçois : R$${formatAmount(p.out, 2, locale)}\n📊 Taux : ${formatRate(p.rate, locale)}\n💳 Frais : ${formatFee(p.fee)}`;
      } else {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 Tu reçois : €${formatAmount(p.out, 2, locale)}\n📊 Taux : ${formatRate(p.rate, locale)}\n💳 Frais : ${formatFee(p.fee)}`;
      }
    }).join('\n\n');
    
    const footer = `\n\n💡 Généralement un peu plus cher que on-chain, mais certains préfèrent ces solutions pour leur simplicité.\n\n✅ Plateformes régulées et fiables. Si tu n'as pas encore de compte, utilise nos liens de parrainage : c'est gratuit pour toi, ça finance le service (et tu peux même souvent y gagner).\n\n<i>*Données fournies par Wise Comparisons</i>`;
    
    return `${title}\n\n${providersList}${footer}`;
  },

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

  SOURCES_PROOF: `📊 Preuves & sources (2025)

💡 Pourquoi on dit que la blockchain est souvent bien moins chère ?

• 💱 Cryptocurrency-based remittance statistics 2025 : les services traditionnels appliquent en moyenne 6,5 % de frais, alors que les transferts crypto (stablecoins, etc.) peuvent coûter aussi peu que 1 %.

• 📈 Global Remittance Prices – World Bank : en mars 2025, le coût moyen des transferts par voies traditionnelles est de 6,49 % du montant envoyé.

• 🔍 CFA Institute — "Blockchain in FX and Remittances" (2025) : des investisseurs institutionnels utilisent déjà les stablecoins pour réduire les temps de règlement, diminuer les coûts, et gérer les risques sur les transferts cross-border.

• 📊 McKinsey – "The stable door opens : tokenized cash / stablecoins" (2025) : le volume des envois transfrontaliers utilisant des stablecoins a augmenté rapidement, et les stablecoins sont de plus en plus envisagés comme infrastructure de paiement moderne.`,

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

  GUIDE_TRANSITION: `✅ Tu as (ou tu vas avoir) :
• Un compte 🇪🇺 pour déposer tes EUR (SEPA → USDC)
• Un compte 🇧🇷 pour retirer tes BRL (USDC → Pix)

🌐 Tu fais ton premier pas on-chain.
C'est plus qu'un simple transfert :
• tu découvres une technologie qui change déjà la finance mondiale,
• tu rejoins des millions d'utilisateurs, d'entreprises et d'institutions,
• tu gardes plus de valeur pour toi (et moins pour les intermédiaires 💸).

🚀 Maintenant, on commence concrètement : première étape → déposer tes EUR sur ton compte 🇪🇺 et les convertir en USDC.`,

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


PREMIUM_PRICING: `💎 PASSER À PREMIUM
  
  ✨ Avec Premium :
  • 🔔 Alertes personnalisées illimitées
  • 📢 Alertes spontanées régulières
  • 🎯 Multi-paires (EUR→BRL + BRL→EUR)
  • 📊 Analyses plus poussées
  • 🌍 Multi-devises à venir
  • ⚡ Accès prioritaire aux nouvelles fonctionnalités
  
  [ℹ️ Voir toutes les fonctionnalités Premium]
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  📱 15 R$ / 3 mois
     Soit 5 R$/mois
  
  📱 27 R$ / 6 mois
     Soit 4,50 R$/mois • Économie de 10%
  
  📱 50 R$ / 12 mois
     Soit 4,17 R$/mois • Économie de 17%
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  🔜 Carte bancaire internationale bientôt disponible`,
  
    PREMIUM_DETAILS: `💎 FONCTIONNALITÉS PREMIUM
  
  🔔 ALERTES PERSONNALISÉES ILLIMITÉES
  Configure tes propres seuils de déclenchement.
  Exemple : "Alerte-moi si EUR→BRL dépasse 6,20"
  
  Tu peux créer autant d'alertes que tu veux, pour différents montants ou différentes situations.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  📢 ALERTES SPONTANÉES RÉGULIÈRES
  En mode gratuit : 1-2 alertes/mois (records exceptionnels)
  
  En Premium : alertes régulières dès que les conditions sont favorables, pas besoin d'attendre un record absolu.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  🎯 MULTI-PAIRES
  Surveille EUR→BRL ET BRL→EUR en même temps.
  
  Parfait si tu fais des allers-retours réguliers ou si tu veux optimiser dans les deux sens.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  📊 ANALYSES PLUS POUSSÉES
  • Comparaison avec moyennes 7/30/90 jours
  • Identification des tendances
  • Recommandations basées sur l'historique
  • Insights pour optimiser tes transferts
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  🌍 MULTI-DEVISES (À VENIR)
  Bientôt : USD, GBP, CHF, CAD et autres paires.
  
  Les abonnés Premium y auront accès en priorité, dès le lancement.
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  ⚡ ACCÈS PRIORITAIRE
  • Nouvelles fonctionnalités en avant-première
  • Influence sur la roadmap (propose et vote)
  • Support prioritaire
  • Évolution continue du service`,
  
    ALERT_CREATE_INTRO: `🔔 CRÉER UNE ALERTE
  
  Choisis comment tu veux être alerté :`,
  
    ALERT_PRESET_CONSERVATIVE: `🛡️ Conservateur
  +2% vs moyenne 30j
  Alerte ~1x par mois
  Pour sécuriser un bon taux`,
  
    ALERT_PRESET_BALANCED: `⚖️ Équilibré (Notre choix ⭐)
  +3% vs moyenne 30j
  Alerte ~2-3x par mois
  C'est ce qu'on utilise nous-mêmes`,
  
    ALERT_PRESET_AGGRESSIVE: `🎯 Opportuniste
  +5% vs moyenne 30j
  Alerte ~1x tous les 2 mois
  Pour maximiser, plus rare mais meilleur`,
  
    ALERT_CREATED: (pair, threshold, currentRate, avg30d, alertThreshold, locale) => `✅ Alerte créée !
  
  ${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : +${threshold}% vs moyenne 30j
  
  Je t'alerterai quand le taux dépasse la moyenne des 30 derniers jours de ${threshold}%.
  
  Actuellement :
  • Taux actuel : ${formatRate(currentRate, locale)}
  • Moyenne 30j : ${formatRate(avg30d, locale)}
  • Seuil alerte : ${formatRate(alertThreshold, locale)} (+${threshold}%)`,
  
    ALERT_TRIGGERED: (pair, currentRate, avg30d, threshold, delta, amountExample, savings, locale) => `🔔 ALERTE PREMIUM
  
  ${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}
  
  💡 Ton seuil est atteint !
  
  📊 Analyse :
  • Taux actuel : ${formatRate(currentRate, locale)}
  • Moyenne 30j : ${formatRate(avg30d, locale)}
  • Écart : +${formatAmount(delta, 1, locale)}% ✅
  • ${delta > threshold ? `C'est ${formatAmount(delta - threshold, 1, locale)}% au-dessus de ton seuil` : 'Pile sur ton seuil'}
  
  💰 Sur ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, tu gagnes ~${formatAmount(savings, 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs la moyenne`,
  
    FREE_ALERT: (pair, currentRate, recordDays, amountExample, savings, locale) => `🔔 ALERTE SPÉCIALE
  
  ${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}
  
  📊 C'est le MEILLEUR taux depuis ${recordDays} jours !
  
  💰 Sur ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, tu gagnes ~${formatAmount(savings, 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs la moyenne
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  💎 Avec Premium (5 R$/mois) :
  • Configure tes propres alertes
  • Multi-paires (EUR→BRL + BRL→EUR)
  • Plusieurs seuils personnalisés
  • Alertes régulières (pas juste les records)`,
  
ALERTS_LIST: (alerts, locale) => {
  if (alerts.length === 0) {
    return `🔔 <b>Mes alertes</b>

Tu n'as aucune alerte active.

Crée ta première alerte pour être notifié automatiquement !`;
  }
  
  const emojis = {
    conservative: '🛡️',
    balanced: '⚖️',
    aggressive: '🎯',
    custom: '✏️',
    absolute: '🎯',
    relative: '📊'
  };
  
  let text = `🔔 <b>Mes alertes</b>\n\n`;
  
  alerts.forEach((alert, index) => {
    const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    
    // Emoji selon preset ou type
    let emoji;
    if (alert.preset && emojis[alert.preset]) {
      emoji = emojis[alert.preset];
    } else {
      emoji = emojis[alert.threshold_type] || '🔔';
    }
    
    // Description du seuil
    let threshold;
    if (alert.threshold_type === 'absolute') {
      threshold = `≥ ${formatRate(alert.threshold_value, locale)}`;
    } else {
      const refLabels = {
        current: 'taux actuel',
        avg7d: 'moy. 7j',
        avg30d: 'moy. 30j',
        avg90d: 'moy. 90j'
      };
      const refLabel = refLabels[alert.reference_type] || alert.reference_type;
      threshold = `+${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabel}`;
    }
    
    text += `${index + 1}. ${emoji} ${pairText} : ${threshold}\n`;
  });
  
  text += `\nYou'll be notified when these thresholds are reached.`;
  
  return text;
},


    PREMIUM_EXPIRED: `⚠️ Ton Premium a expiré
  
  Tu nous manques déjà ! 😢
  
  Reprends là où tu t'étais arrêté :
  📱 15 R$ / 3 mois
  📱 27 R$ / 6 mois (−10%)
  📱 50 R$ / 12 mois (−17%)`,
  
  ALERT_CHOOSE_PAIR: `🔔 CRÉER UNE ALERTE

  Quelle route t'intéresse ?`,
  
    ALERT_CHOOSE_PRESET: (pair) => {
      const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
      return `🔔 ALERTE ${pairText}
  
  Choisis un profil :`;
    },
  
    ALERT_CHOOSE_COOLDOWN: `⏰ COOLDOWN
  
  Délai minimum entre deux alertes :
  
  💡 Cooldown : évite les notifications répétées.
  Recommandé : 1 heure pour rester réactif.`,
  

  ALERT_CHOOSE_TYPE: (pair) => `🔔 ALERTE ${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}

  Comment veux-tu définir ton seuil ?`,
  
  // Étape 2a : Choix référence (si relatif)
  ALERT_CHOOSE_REFERENCE: (pair, currentRate, avg7d, avg30d, avg90d, locale) => `📊 SEUIL RELATIF
  
  Taux actuel : ${formatRate(currentRate, locale)}
  
  +X% par rapport à quoi ?
  
  💡 <i>La référence sera recalculée à chaque vérification (toutes les 2h)</i>`,
  
  // Étape 2b : Pourcentage (si relatif)
  ALERT_CHOOSE_PERCENT: (pair, refType, refValue, locale) => {
    const refLabels = {
      current: `Taux actuel (${formatRate(refValue, locale)})`,
      avg7d: `Moyenne 7j (${formatRate(refValue, locale)})`,
      avg30d: `Moyenne 30j (${formatRate(refValue, locale)})`,
      avg90d: `Moyenne 90j (${formatRate(refValue, locale)})`
    };
    
    return `📊 SEUIL RELATIF
  Référence : ${refLabels[refType]}
  
  Entre le pourcentage d'augmentation :`;
  },
  
  // Étape 2 : Valeur absolue
  ALERT_ENTER_ABSOLUTE: (pair, currentRate, locale) => `🎯 SEUIL ABSOLU
  
  Taux actuel : ${formatRate(currentRate, locale)}
  
  Entre le taux qui déclenchera l'alerte :
  (ex: ${formatRate(currentRate * 1.03, locale)})
  
  💡 <i>Conseil : Choisis ~3-5% au-dessus de l'actuel 
     (≈${formatRate(currentRate * 1.03, locale)} - ${formatRate(currentRate * 1.05, locale)})</i>`,
  
  ALERT_INVALID_ABSOLUTE: `⚠️ Valeur invalide.
  
  Entre un nombre décimal (ex: 6.30)`,
  
  // Message confirmation création
  ALERT_CREATED_FULL_V2: (alert, currentRate, refValue, calculatedThreshold, locale) => {
    const typeLabels = {
      absolute: '🎯 Absolu',
      relative: '📊 Relatif'
    };
    
    const refLabels = {
      current: 'Taux actuel',
      avg7d: 'Moyenne 7 jours',
      avg30d: 'Moyenne 30 jours',
      avg90d: 'Moyenne 90 jours'
    };
    
    let text = `✅ ALERTE CRÉÉE
  
  ${alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}
  ${typeLabels[alert.threshold_type]}`;
  
    if (alert.threshold_type === 'relative') {
      text += ` : +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabels[alert.reference_type]}`;
    } else {
      text += ` : ≥ ${formatRate(alert.threshold_value, locale)}`;
    }
    
    text += `\n⏰ Cooldown : ${formatCooldown(alert.cooldown_minutes)}
  
  <b>Actuellement :</b>
  • Taux actuel : ${formatRate(currentRate, locale)}`;
  
    if (alert.threshold_type === 'relative') {
      text += `
  • ${refLabels[alert.reference_type]} : ${formatRate(refValue, locale)}`;
    }
    
    text += `
  • Seuil alerte : ${formatRate(calculatedThreshold, locale)}
  
  Je t'alerterai dès que le taux atteint ${formatRate(calculatedThreshold, locale)} !`;
  
    return text;
  },

    ALERT_CUSTOM_INSTRUCTIONS: (pair) => {
      const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
      return `✏️ SEUIL PERSONNALISÉ
  
  ${pairText}
  
  Envoie ton seuil en pourcentage.
  
  Exemples :
  • +2.5 (alerte à +2,5% vs moyenne 30j)
  • +4 (alerte à +4%)
  
  Min : +1% • Max : +10%`;
    },
  
    ALERT_CREATED_FULL: (pair, preset, threshold, cooldown, currentRate, avg30d, alertThreshold, locale) => {
      const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
      const presetText = {
        conservative: '🛡️ Conservateur',
        balanced: '⚖️ Équilibré',
        aggressive: '🎯 Opportuniste',
        custom: '✏️ Personnalisé'
      }[preset] || '🔔';
      
      const cooldownText = formatCooldown(cooldown, 'fr');
      
      return `✅ ALERTE CRÉÉE
  
  ${pairText}
  ${presetText} : +${threshold}% vs moyenne 30j
  ⏰ Cooldown : ${cooldownText}
  
  Actuellement :
  • Taux actuel : ${formatRate(currentRate, locale)}
  • Moyenne 30j : ${formatRate(avg30d, locale)}
  • Seuil alerte : ${formatRate(alertThreshold, locale)}
  
  Je t'alerterai dès que ce seuil est atteint !`;
    },
  
    ALERT_INVALID_THRESHOLD: `⚠️ Seuil invalide
  
  Entre un nombre entre 1 et 10.
  
  Exemples : 2.5, 3, 5`,
  
    ALERT_VIEW_DETAILS: (alert, currentRate, avg30d, alertThreshold, locale) => {
      const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
      const presetEmoji = {
        conservative: '🛡️',
        balanced: '⚖️',
        aggressive: '🎯',
        custom: '✏️'
      }[alert.preset] || '🔔';
      
      const cooldownText = formatCooldown(alert.cooldown_minutes || 60, 'fr');
      
      let text = `${presetEmoji} <b>Alerte ${pairText}</b>\n\n`;
      text += `Seuil : +${alert.threshold_percent}% vs moyenne 30j\n`;
      text += `⏰ Cooldown : ${cooldownText}\n\n`;
      text += `<b>État actuel :</b>\n`;
      text += `• Taux actuel : ${formatRate(currentRate, locale)}\n`;
      
      if (avg30d && alertThreshold) {
        text += `• Moyenne 30j : ${formatRate(avg30d, locale)}\n`;
        text += `• Seuil alerte : ${formatRate(alertThreshold, locale)}\n`;
        
        const distance = ((alertThreshold - currentRate) / currentRate * 100);
        if (distance > 0) {
          text += `\n📊 Encore ${formatAmount(distance, 1, locale)}% pour déclencher`;
        } else {
          text += `\n✅ Seuil atteint ! Attente cooldown (max 1x/24h)`;
        }
      }
      
      if (alert.last_triggered_at) {
        const lastDate = new Date(alert.last_triggered_at);
        text += `\n\n🔔 Dernière alerte : ${lastDate.toLocaleDateString(locale)}`;
      }
      
      return text;
    },
  

    PREMIUM_EXPIRING_SOON: (daysLeft) => `⏰ Ton Premium expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}
  
  Tu veux renouveler ?
  
  📱 15 R$ / 3 mois
  📱 27 R$ / 6 mois (−10%)
  📱 50 R$ / 12 mois (−17%)`,
  
    NOT_PREMIUM: `🔒 Fonctionnalité Premium
  
  Cette fonctionnalité est réservée aux abonnés Premium.
  
  💎 Passe à Premium pour :
  • Créer des alertes personnalisées
  • Recevoir des alertes régulières
  • Multi-paires et analyses avancées
  
  Prix : à partir de 5 R$/mois`,


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
    seePremium: '💎 Voir Premium',
    subscribe3m: '📱 15 R$ - 3 mois',
    subscribe6m: '📱 27 R$ - 6 mois',
    subscribe12m: '📱 50 R$ - 12 mois',
    premiumDetails: 'ℹ️ Voir toutes les fonctionnalités',
    createAlert: '➕ Créer une alerte',
    myAlerts: '🔔 Mes alertes',
    conservative: '🛡️ Conservateur',
    balanced: '⚖️ Équilibré',
    aggressive: '🎯 Opportuniste',
    custom: '✏️ Personnalisé',
    disableAlert: '🔕 Désactiver',
    editAlert: '✏️ Modifier',
    backToPricing: '⬅️ Retour aux tarifs',
    chooseCooldown15: '⚡ 15 minutes',
    chooseCooldown1h: '⏱️ 1 heure ⭐',
    chooseCooldown6h: '⏰ 6 heures',
    chooseCooldown24h: '📅 24 heures',
    chooseCooldown1week: '📆 1 semaine',
    deleteAlert: '🗑️ Supprimer',
    viewAlert: '👁️ Voir détails',
  }
};

// ============================================
// PORTUGUÊS (PT) - TRADUÇÃO COMPLETA ✅
// ============================================

const pt = {
  INTRO_TEXT: `👋 Oi !

🌐 Escolha o idioma · Choisis ta langue · Choose your language`,

  ABOUT_TEXT: `💡 Sobre

Este bot compara taxas EUR↔BRL e te guia em transferências on-chain (via blockchain).

As taxas on-chain costumam ser melhores que as plataformas tradicionais. É legal, seguro e usado por muitas instituições.

Serviço gratuito, financiado por links de indicação.`,

  promptAmt: `💬 Envie um valor ou escolha:`,
  
  askRoute: (amount, locale) => `O que você quer fazer com ${formatAmount(amount, 0, locale)}?`,
  
  buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale }) => {
    const title = route === 'eurbrl' ? '💱 EUR → BRL' : '💱 BRL → EUR';
    const ref = `📊 Ref. ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}`;
    
    const onchainLine = route === 'eurbrl'
      ? `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`
      : `🌍 On-chain\nR${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
    
    let bankLine;
    if (!bestBank) {
      bankLine = `🏦 Melhor off-chain\n⚠️ Taxa indisponível`;
    } else {
      bankLine = route === 'eurbrl'
        ? `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `🏦 ${bestBank.provider}\nR${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
    }
    
    let othersText = '';
    if (others.length > 0) {
      const othersList = others.map(p => 
        route === 'eurbrl' 
          ? `${p.provider} R${formatAmount(p.out, 0, locale)}` 
          : `${p.provider} €${formatAmount(p.out, 2, locale)}`
      ).join(' • ');
      othersText = `\n\nOutros: ${othersList}`;
    }
    
    let deltaText = '';
    if (delta !== null && bestBank) {
      const sign = delta >= 0 ? '+' : '−';
      deltaText = `\n\n✅ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
    }
    
    return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
  },

  buildCalcDetails: ({ route, amount, rates, onchain, locale }) => {
    const title = '🔍 Detalhes do cálculo on-chain';
    
    if (route === 'eurbrl') {
      const { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet } = onchain.breakdown;
      
      return `${title}

📊 EUR → BRL via USDC

1️⃣ <b>Compra de USDC na Europa</b>
   💰 Valor : €${formatAmount(amount, 2, locale)}
   📉 Taxa de trading (~0,1-0,2%) : −€${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtidos : ${formatAmount(usdcAfterBuy, 2, locale)} USDC

2️⃣ <b>Transferência blockchain</b>
   🌍 Rede : Polygon (MATIC)
   📉 Taxa de rede : −${formatAmount(1, 2, locale)} USDC
   🪙 USDC recebidos no Brasil : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Venda de USDC no Brasil</b>
   🪙 USDC para vender : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 Taxa USDC/BRL : ${formatRate(rates.usdcBRL, locale)}
   📉 Taxa de trading (~0,1-0,2%) : −R${formatAmount(usdcAfterNetwork * rates.usdcBRL * 0.001, 2, locale)}
   💰 BRL obtidos : R${formatAmount(brlAfterTrade, 2, locale)}

4️⃣ <b>Saque Pix</b>
   📉 Taxa Pix (~R$3,50) : −R${formatAmount(3.5, 2, locale)}
   
✅ <b>Total recebido : R${formatAmount(brlNet, 2, locale)}</b>
📊 <b>Taxa efetiva : ${formatRate(onchain.rate, locale)}</b>

💡 As taxas reais podem variar levemente segundo sua plataforma e seu volume de trading.`;
    } else {
      // BRL → EUR
      const { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet } = onchain.breakdown;
      
      return `${title}

📊 BRL → EUR via USDC

1️⃣ <b>Compra de USDC no Brasil</b>
   💰 Valor : R${formatAmount(amount, 2, locale)}
   💱 Taxa BRL/USDC : ${formatRate(1/rates.usdcBRL, locale)}
   📉 Taxa de trading (~0,1-0,2%) : −R${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtidos : ${formatAmount(usdcFromBRL, 2, locale)} USDC

2️⃣ <b>Transferência blockchain</b>
   🌍 Rede : Polygon (MATIC)
   📉 Taxa de rede : −${formatAmount(1, 2, locale)} USDC
   🪙 USDC recebidos na Europa : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Venda de USDC na Europa</b>
   🪙 USDC para vender : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 Taxa USDC/EUR : ${formatRate(rates.usdcEUR, locale)}
   📉 Taxa de trading (~0,1-0,2%) : −€${formatAmount(usdcAfterNetwork * rates.usdcEUR * 0.001, 2, locale)}
   
✅ <b>Total recebido : €${formatAmount(eurNet, 2, locale)}</b>
📊 <b>Taxa efetiva : ${formatRate(onchain.rate, locale)}</b>

💡 As taxas reais podem variar levemente segundo sua plataforma e seu volume de trading.`;
    }
  },

  SOURCES_TEXT: `📊 Fontes dos dados

Taxa de referência EUR/BRL: Yahoo Finance (taxa oficial de câmbio)

Cálculo on-chain:
• Taxas crypto: CoinGecko (USDC/EUR, USDC/BRL)
• Taxas reais incluídas:
  - Trading ~0,1-0,2%
  - Rede Polygon ~1 USDC
  - Saque Pix ~R$3,50

Taxas off-chain: API Wise Comparisons (taxas ao vivo dos provedores)

Links de indicação: gratuitos para você, financiam o serviço.`,

  buildOffChain: ({ route, amount, bestBank, others, locale }) => {
    const title = '🏦 Off-chain';
    
    if (!bestBank) {
      return `${title}\n\n⚠️ Taxas indisponíveis no momento.`;
    }
    
    const formatFee = (fee) => {
      if (fee === null || fee === undefined || fee === 0) return 'Sem taxas';
      return route === 'eurbrl' ? `${formatAmount(fee, 2, locale)} EUR` : `${formatAmount(fee, 2, locale)} BRL`;
    };
    
    const priorityNames = ['Wise', 'PayPal', 'Western Union'];
    const allProviders = [bestBank, ...others];
    
    const priorityProviders = allProviders.filter(p => priorityNames.includes(p.provider));
    const otherProviders = allProviders.filter(p => !priorityNames.includes(p.provider));
    
    const maxOthers = 6 - priorityProviders.length;
    const topOthers = otherProviders.slice(0, Math.max(2, maxOthers));
    
    const displayProviders = [...priorityProviders, ...topOthers]
      .sort((a, b) => b.out - a.out);
    
    const providersList = displayProviders.map((p, i) => {
      if (route === 'eurbrl') {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 Você recebe : R${formatAmount(p.out, 2, locale)}\n📊 Taxa : ${formatRate(p.rate, locale)}\n💳 Taxas : ${formatFee(p.fee)}`;
      } else {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 Você recebe : €${formatAmount(p.out, 2, locale)}\n📊 Taxa : ${formatRate(p.rate, locale)}\n💳 Taxas : ${formatFee(p.fee)}`;
      }
    }).join('\n\n');
    
    const footer = `\n\n💡 Geralmente um pouco mais caro que on-chain, mas alguns preferem essas soluções pela simplicidade.\n\n✅ Plataformas reguladas e confiáveis. Se você ainda não tem conta, use nossos links de indicação: é gratuito para você, financia o serviço (e você pode até ganhar bônus).\n\n<i>*Dados fornecidos por Wise Comparisons</i>`;
    
    return `${title}\n\n${providersList}${footer}`;
  },

  ONCHAIN_INTRO: `🚀 Rota On-Chain

É o método que nós mesmos usamos — e a razão pela qual este bot existe. Recomendamos porque elimina o supérfluo: menos intermediários, menos taxas, mais transparência.

🔄 Etapas simples:
1️⃣ Europa → troca seus EUR → USDC (stablecoin)
2️⃣ Blockchain → envia seus USDC (rápido, baixo custo)
3️⃣ Brasil → converte seus USDC em BRL, recebe por Pix

ℹ️ O que você precisa:
• uma conta exchange 🇪🇺 na Europa
• uma conta exchange 🇧🇷 no Brasil

💡 As transferências tradicionais podem custar entre 2,5% e 6%, ou mais — enquanto via blockchain, você pode limitar isso a 0-1% (temos fontes para provar!).`,

  SOURCES_PROOF: `📊 Provas & fontes (2025)

💡 Por que dizemos que blockchain costuma ser bem mais barato?

• 💱 Cryptocurrency-based remittance statistics 2025: serviços tradicionais aplicam em média 6,5% de taxas, enquanto transferências crypto (stablecoins, etc.) podem custar apenas 1%.

• 📈 Global Remittance Prices – World Bank: em março de 2025, o custo médio das transferências por vias tradicionais é de 6,49% do valor enviado.

• 🔍 CFA Institute — "Blockchain in FX and Remittances" (2025): investidores institucionais já usam stablecoins para reduzir tempos de liquidação, diminuir custos e gerenciar riscos em transferências cross-border.

• 📊 McKinsey – "The stable door opens: tokenized cash / stablecoins" (2025): o volume de envios transfronteiriços usando stablecoins aumentou rapidamente, e stablecoins são cada vez mais vistos como infraestrutura de pagamento moderna.`,

  EXCHANGES_EU: `🇪🇺 Exchanges na Europa

Nossa preferência:
• Kraken — SEPA simples/gratuito, sério, USDC disponível. (👋 É o que usamos também)

Outras soluções:
• Binance (UE) — muito líquido, taxas ~0,10%
  ⚠️ Se escolher Binance lado 🇪🇺, precisará de outro exchange lado 🇧🇷
• Bitvavo — SEPA gratuito, UX simples, taxas baixas
• Bitstamp — veterano UE, sério
• Coinbase Advanced — simples mas taxas mais altas

Verificar: SEPA ok • USDC disponível • taxas razoáveis • reputação

Nossos links de indicação financiam o serviço (gratuitos para você, às vezes bônus).`,

  EXCHANGES_BR: `🇧🇷 Exchanges no Brasil

Nossa preferência:
• Binance BR — Pix nativo, liquidez enorme, taxas baixas (~0,10%) + 3,50 BRL fixos por saque Pix. (👋 É o que usamos também)

Outras soluções:
• Bitso — Pix gratuito e instantâneo, interface clara, regulado localmente
• Mercado Bitcoin — ator local histórico, Pix suportado
• Foxbit — Pix 24/7, taxas corretas

Verificar: Pix ok • USDC disponível • taxas razoáveis • reputação

Nossos links de indicação financiam o serviço (gratuitos para você, às vezes bônus).

⚠️ Lembrete: um exchange serve para um lado. Você precisa de um 🇪🇺 (SEPA) + um 🇧🇷 (Pix).`,

  WHAT_IS_USDC: `🪙 O que é USDC?

USDC = USD Coin, uma "stablecoin" (crypto estável).

Na prática:
• 1 USDC vale sempre ~1 dólar americano
• Emitido pela Circle (empresa regulada nos EUA)
• Reservas verificadas regularmente
• Aceito em todas as exchanges principais

Por que escolhemos USDC?
• Conforme MiCA (regulamentação europeia de cripto-ativos)
• Usável legalmente e simplesmente na Europa
• Ao contrário do Bitcoin que flutua, o USDC permanece estável

É perfeito para transferir dinheiro sem risco de variação.

Você o usa como "moeda pivô": EUR → USDC → BRL.`,

  WHAT_IS_EXCHANGE: `🏦 O que é um exchange?

Um exchange crypto é como um bureau de câmbio digital.

Você pode:
• Depositar dinheiro tradicional (EUR, BRL...)
• Comprar/vender cryptos (USDC, Bitcoin...)
• Enviá-los para outros exchanges

Os mais conhecidos: Kraken, Binance, Coinbase, Bitso...

Para nosso caso:
• Exchange Europa = você deposita EUR, compra USDC
• Exchange Brasil = você recebe USDC, vende por BRL, saca por Pix

É regulamentado e seguro (se escolher plataformas reconhecidas).`,

  MARKET_VS_LIMIT: `📈 Market vs Limit

<b>Market (a mercado)</b>:
• Execução imediata ao preço atual
• Simples e rápido
• Recomendado para iniciantes

<b>Limit (limite)</b>:
• Você fixa SEU preço de compra/venda
• A ordem só executa se o mercado atingir seu preço
• Útil para grandes valores ou otimizar a taxa

<i>Dica: se você quer "só trocar", escolha Market.</i>`,

  GUIDE_TRANSITION: `✅ Você tem (ou vai ter):
• Uma conta 🇪🇺 para depositar seus EUR (SEPA → USDC)
• Uma conta 🇧🇷 para sacar seus BRL (USDC → Pix)

🌐 Você está dando seu primeiro passo on-chain.
É mais que uma simples transferência:
• você descobre uma tecnologia que já está mudando as finanças globais,
• você se junta a milhões de usuários, empresas e instituições,
• você mantém mais valor para você (e menos para os intermediários 💸).

🚀 Agora, começamos concretamente: primeira etapa → depositar seus EUR na sua conta 🇪🇺 e convertê-los em USDC.`,

  STEP_1_1: (amount, locale) => `1️⃣ Depositar seus EUR na conta exchange

• Vá na seção "Depósito / Deposit / Fiat".
• Escolha EUR como moeda.
• Método mais simples: transferência SEPA (rápida, taxas baixas ou nulas).

💡 "Fiat" = as moedas tradicionais (EUR, USD, BRL…).

👉 Recomendado: Kraken.

Estimativa do seu saldo: €${formatAmount(amount, 0, locale)}
*⚠️ É uma estimativa, próxima do real. Taxas e prazos bancários podem variar levemente.*`,

  STEP_1_2: (amount, locale) => `2️⃣ Acessar o mercado para comprar USDC

• No seu exchange, procure "Trader / Mercado / Trade".
• Selecione o par EUR/USDC.

💡 Um mercado crypto é como um bureau de câmbio: você troca uma moeda por outra.

Estimativa do seu saldo: €${formatAmount(amount, 0, locale)} (pronto para compra USDC)
*⚠️ Estimativa indicativa.*`,

  STEP_1_3: (usdcAmount, locale) => `3️⃣ Comprar seus USDC

• Escolha o tipo de ordem:
  • A mercado (Market) → instantâneo, simples, recomendado.
  • Limite (Limit) → você fixa seu preço, útil para grandes valores/liquidez.

👉 Para começar: ordem a mercado.

Estimativa do seu saldo: ~${formatAmount(usdcAmount, 2, locale)} USDC
*⚠️ Estimativa próxima do real. Taxas e preços podem variar levemente.*`,

  STEP_1_4: `✅ Muito bem! Você agora tem USDC na sua conta 🇪🇺.

✨ USDC são "stablecoins": ~1 USDC = 1 USD.
É a chave para transferir seu dinheiro de forma rápida e de baixo custo.

Próxima etapa: enviá-los on-chain para o Brasil.`,

  STEP_2_1: `✨ Esta é a etapa "on-chain" → rápida e de baixo custo, mas requer um pouco de concentração.
Diferente de um banco, se você cometer um erro, não há SAC para recuperar seus fundos.

1️⃣ Recuperar seu endereço de depósito 🇧🇷

• No seu exchange brasileiro, procure "Depósito / Crypto".
• Escolha USDC como crypto a depositar.
• Selecione a rede de transferência.

💡 Recomendamos Polygon (MATIC) → rápida, confiável, taxas baixas (~1 USDC).

• Copie cuidadosamente o endereço.

💡 Imagine que é como seu IBAN bancário, mas versão blockchain (uma longa sequência de letras e números).`,

  STEP_2_2: (usdcAmount, locale) => `2️⃣ Enviar do seu exchange 🇪🇺

• Vá em "Saque / Withdraw" → USDC.
• Cole o endereço copiado.
• Escolha a mesma rede do depósito (ex. Polygon).

💡 A rede é como os trilhos de um trem: se não forem os mesmos dos dois lados, o dinheiro vai para outro lugar e se perde.

• Indique seu valor. Você pode enviar tudo, ou começar com um teste (ex. 10 USDC).

👉 O teste custa um pouco mais (taxas fixas ~1 USDC aplicam-se duas vezes), mas é uma boa prática comum em crypto.

Estimativa: você receberá ~${formatAmount(usdcAmount - 1, 2, locale)} USDC lado 🇧🇷
*⚠️ Estimativa próxima do real (taxa de rede ~1 USDC).*`,

  STEP_2_3: `3️⃣ Verificar e confirmar

• Releia atentamente o endereço e a rede antes de validar.

⚠️ Um único caractere errado no endereço, ou uma rede errada, e seus fundos são definitivamente perdidos.

👉 Uma vez que você verificou bem, pode confirmar a transferência.`,

  STEP_2_4: `4️⃣ Aguardar a chegada

• Geralmente, a transação leva 1-2 minutos, às vezes até 10 min.
• Você verá seu saldo USDC aparecer lado 🇧🇷.

✅ Resultado: seus USDC chegaram → pronto para a etapa 3 (venda em BRL + saque Pix).`,

  STEP_3_1: `1️⃣ Encontrar o mercado USDC/BRL 🇧🇷

• No seu exchange brasileiro, vá em Trader / Mercado / Market.
• Selecione o par USDC/BRL.

👉 Próxima etapa: seus USDC finalmente se transformam em BRL 🎉`,

  STEP_3_2: (brlAmount, locale) => `2️⃣ Fazer sua ordem

• "A mercado / Market" → instantâneo, ao preço atual (simples, recomendado).
• "Limite / Limit" → você fixa seu preço, útil para grandes valores.

👉 Para a maioria das pessoas, "ordem a mercado" = o mais simples e rápido.

Estimativa do seu saldo: ~R${formatAmount(brlAmount, 2, locale)}
*⚠️ Estimativa próxima do real (taxas ~0,10-0,20%).*`,

  STEP_3_3: (brlNet, locale) => `3️⃣ Sacar seu dinheiro em R$

• Uma vez seus USDC vendidos, seu saldo aparece em BRL.
• Vá em Saque / Withdraw.
• Escolha Pix como método.

👉 Digite sua chave Pix (CPF, email, tel, chave aleatória)… mas isso você já sabe fazer 😉

💡 Aliás: como para um endereço crypto, se a chave estiver errada, o dinheiro vai para o lugar errado.

👉 Geralmente, as taxas são muito baixas (ex. Binance ~R$3,50 por saque Pix).
Deveria ser gratuito honestamente… mas enfim 😅

Estimativa do seu saldo recebido: ~R${formatAmount(brlNet, 2, locale)} líquidos
*⚠️ Bom, não devemos estar muito longe da realidade ;)*`,

  WHY_NOT_EXACT: `🤔 Por que não podemos dar o valor exato?

As variáveis que se movem em tempo real:

• Taxas dos exchanges: podem variar segundo seu perfil de usuário, seu volume de trading, ou promoções pontuais (mas sempre permanecem baixas).

• Taxas de rede: flutuam segundo a congestionamento da rede blockchain (~1 USDC em média na Polygon, mas pode variar).

• Taxa de câmbio: os mercados crypto se movem em tempo real, mesmo se o USDC permanece estável, a taxa USDC/BRL pode flutuar levemente entre o momento que você calcula e quando executa.

Nossas estimativas são prudentes e próximas do real. Você não deve ter surpresas desagradáveis.`,

  STEP_3_4: `✅ Sua transferência está concluída!

• Você converteu seus EUR em USDC lado 🇪🇺.
• Você os enviou on-chain.
• Você os vendeu por BRL e sacou via Pix lado 🇧🇷.

✨ Resultado: rápido, seguro e de baixo custo.

🌍 Você acabou de fazer uma verdadeira passagem pela blockchain.
O que você aprendeu hoje será cada vez mais usado no futuro: você acabou de dar um passo à frente.

🙌 Esperamos que você tenha curtido a experiência!`,


PREMIUM_PRICING: `💎 ASSINAR PREMIUM

✨ Com Premium :
• 🔔 Alertas personalizados ilimitados
• 📢 Alertas espontâneos regulares
• 🎯 Multi-pares (EUR→BRL + BRL→EUR)
• 📊 Análises mais avançadas
• 🌍 Multi-moedas em breve
• ⚡ Acesso prioritário às novas funcionalidades

[ℹ️ Ver todas as funcionalidades Premium]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 15 R$ / 3 meses
   Ou seja 5 R$/mês

📱 27 R$ / 6 meses
   Ou seja 4,50 R$/mês • Economia de 10%

📱 50 R$ / 12 meses
   Ou seja 4,17 R$/mês • Economia de 17%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔜 Cartão de crédito internacional em breve`,

  PREMIUM_DETAILS: `💎 FUNCIONALIDADES PREMIUM

🔔 ALERTAS PERSONALIZADOS ILIMITADOS
Configure seus próprios limites de disparo.
Exemplo: "Me avise se EUR→BRL ultrapassar 6,20"

Você pode criar quantos alertas quiser, para diferentes valores ou situações.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📢 ALERTAS ESPONTÂNEOS REGULARES
No modo gratuito: 1-2 alertas/mês (recordes excepcionais)

No Premium: alertas regulares assim que as condições forem favoráveis, sem precisar esperar um recorde absoluto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MULTI-PARES
Monitore EUR→BRL E BRL→EUR ao mesmo tempo.

Perfeito se você faz transferências regulares nos dois sentidos ou quer otimizar em ambas as direções.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ANÁLISES MAIS AVANÇADAS
• Comparação com médias de 7/30/90 dias
• Identificação de tendências
• Recomendações baseadas no histórico
• Insights para otimizar suas transferências

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 MULTI-MOEDAS (EM BREVE)
Em breve: USD, GBP, CHF, CAD e outros pares.

Os assinantes Premium terão acesso prioritário, desde o lançamento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ ACESSO PRIORITÁRIO
• Novas funcionalidades em primeira mão
• Influência no roadmap (proponha e vote)
• Suporte prioritário
• Evolução contínua do serviço`,

  ALERT_CREATE_INTRO: `🔔 CRIAR UM ALERTA

Escolha como você quer ser alertado:`,

  ALERT_PRESET_CONSERVATIVE: `🛡️ Conservador
+2% vs média 30d
Alerta ~1x por mês
Para garantir uma boa taxa`,

  ALERT_PRESET_BALANCED: `⚖️ Equilibrado (Nossa escolha ⭐)
+3% vs média 30d
Alerta ~2-3x por mês
É o que usamos nós mesmos`,

  ALERT_PRESET_AGGRESSIVE: `🎯 Oportunista
+5% vs média 30d
Alerta ~1x a cada 2 meses
Para maximizar, mais raro mas melhor`,

  ALERT_CREATED: (pair, threshold, currentRate, avg30d, alertThreshold, locale) => `✅ Alerta criado!

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : +${threshold}% vs média 30d

Vou te alertar quando a taxa ultrapassar a média dos últimos 30 dias em ${threshold}%.

Atualmente:
• Taxa atual: ${formatRate(currentRate, locale)}
• Média 30d: ${formatRate(avg30d, locale)}
• Limite alerta: ${formatRate(alertThreshold, locale)} (+${threshold}%)`,

  ALERT_TRIGGERED: (pair, currentRate, avg30d, threshold, delta, amountExample, savings, locale) => `🔔 ALERTA PREMIUM

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}

💡 Seu limite foi atingido!

📊 Análise:
• Taxa atual: ${formatRate(currentRate, locale)}
• Média 30d: ${formatRate(avg30d, locale)}
• Diferença: +${formatAmount(delta, 1, locale)}% ✅
• ${delta > threshold ? `É ${formatAmount(delta - threshold, 1, locale)}% acima do seu limite` : 'Exatamente no seu limite'}

💰 Em ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, você ganha ~${formatAmount(savings, 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs a média`,

  FREE_ALERT: (pair, currentRate, recordDays, amountExample, savings, locale) => `🔔 ALERTA ESPECIAL

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}

📊 É a MELHOR taxa dos últimos ${recordDays} dias!

💰 Em ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, você ganha ~${formatAmount(savings, 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs a média

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 Com Premium (5 R$/mês):
• Configure seus próprios alertas
• Multi-pares (EUR→BRL + BRL→EUR)
• Vários limites personalizados
• Alertas regulares (não apenas recordes)`,

ALERTS_LIST: (alerts, locale) => {
  if (alerts.length === 0) {
    return `🔔 <b>Meus alertas</b>

Você não tem nenhum alerta ativo.

Crie seu primeiro alerta para ser notificado automaticamente!`;
  }
  
  const emojis = {
    conservative: '🛡️',
    balanced: '⚖️',
    aggressive: '🎯',
    custom: '✏️',
    absolute: '🎯',
    relative: '📊'
  };
  
  let text = `🔔 <b>Meus alertas</b>\n\n`;
  
  alerts.forEach((alert, index) => {
    const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    
    let emoji;
    if (alert.preset && emojis[alert.preset]) {
      emoji = emojis[alert.preset];
    } else {
      emoji = emojis[alert.threshold_type] || '🔔';
    }
    
    let threshold;
    if (alert.threshold_type === 'absolute') {
      threshold = `≥ ${formatRate(alert.threshold_value, locale)}`;
    } else {
      const refLabels = {
        current: 'taxa atual',
        avg7d: 'média 7d',
        avg30d: 'média 30d',
        avg90d: 'média 90d'
      };
      const refLabel = refLabels[alert.reference_type] || alert.reference_type;
      threshold = `+${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabel}`;
    }
    
    text += `${index + 1}. ${emoji} ${pairText} : ${threshold}\n`;
  });
  
  text += `\nVocê será notificado quando esses limites forem atingidos.`;
  
  return text;
},

  PREMIUM_EXPIRED: `⚠️ Seu Premium expirou

Já sentimos sua falta! 😢

Retome de onde parou:
📱 15 R$ / 3 meses
📱 27 R$ / 6 meses (−10%)
📱 50 R$ / 12 meses (−17%)`,

  PREMIUM_EXPIRING_SOON: (daysLeft) => `⏰ Seu Premium expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}

Quer renovar?

📱 15 R$ / 3 meses
📱 27 R$ / 6 meses (−10%)
📱 50 R$ / 12 meses (−17%)`,

  NOT_PREMIUM: `🔒 Funcionalidade Premium

Esta funcionalidade é reservada aos assinantes Premium.

💎 Assine Premium para:
• Criar alertas personalizados
• Receber alertas regulares
• Multi-pares e análises avançadas

Preço: a partir de 5 R$/mês`,

ALERT_CHOOSE_PAIR: `🔔 CRIAR UM ALERTA

Qual rota te interessa?`,

  ALERT_CHOOSE_PRESET: (pair) => {
    const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    return `🔔 ALERTA ${pairText}

Escolha um perfil:`;
  },

  ALERT_CHOOSE_COOLDOWN: `⏰ COOLDOWN

Intervalo mínimo entre dois alertas:

💡 Cooldown: evita notificações repetidas.
Recomendado: 1 hora para ficar reativo.`,


ALERT_CHOOSE_TYPE: (pair) => `🔔 ALERTA ${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}

Como você quer definir seu limite?`,

ALERT_CHOOSE_REFERENCE: (pair, currentRate, avg7d, avg30d, avg90d, locale) => `📊 LIMITE RELATIVO

Taxa atual: ${formatRate(currentRate, locale)}

+X% em relação a quê?

💡 <i>A referência será recalculada a cada verificação (a cada 2h)</i>`,

ALERT_CHOOSE_PERCENT: (pair, refType, refValue, locale) => {
  const refLabels = {
    current: `Taxa atual (${formatRate(refValue, locale)})`,
    avg7d: `Média 7 dias (${formatRate(refValue, locale)})`,
    avg30d: `Média 30 dias (${formatRate(refValue, locale)})`,
    avg90d: `Média 90 dias (${formatRate(refValue, locale)})`
  };
  
  return `📊 LIMITE RELATIVO
Referência: ${refLabels[refType]}

Digite a porcentagem de aumento:`;
},

ALERT_ENTER_ABSOLUTE: (pair, currentRate, locale) => `🎯 LIMITE ABSOLUTO

Taxa atual: ${formatRate(currentRate, locale)}

Digite a taxa que ativará o alerta:
(ex: ${formatRate(currentRate * 1.03, locale)})

💡 <i>Dica: Escolha ~3-5% acima da atual 
   (≈${formatRate(currentRate * 1.03, locale)} - ${formatRate(currentRate * 1.05, locale)})</i>`,

ALERT_INVALID_ABSOLUTE: `⚠️ Valor inválido.

Digite um número decimal (ex: 6.30)`,

ALERT_CREATED_FULL_V2: (alert, currentRate, refValue, calculatedThreshold, locale) => {
  const typeLabels = {
    absolute: '🎯 Absoluto',
    relative: '📊 Relativo'
  };
  
  const refLabels = {
    current: 'Taxa atual',
    avg7d: 'Média 7 dias',
    avg30d: 'Média 30 dias',
    avg90d: 'Média 90 dias'
  };
  
  let text = `✅ ALERTA CRIADO

${alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}
${typeLabels[alert.threshold_type]}`;

  if (alert.threshold_type === 'relative') {
    text += ` : +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabels[alert.reference_type]}`;
  } else {
    text += ` : ≥ ${formatRate(alert.threshold_value, locale)}`;
  }
  
  text += `\n⏰ Cooldown: ${formatCooldown(alert.cooldown_minutes)}

<b>Atualmente:</b>
• Taxa atual: ${formatRate(currentRate, locale)}`;

  if (alert.threshold_type === 'relative') {
    text += `
• ${refLabels[alert.reference_type]}: ${formatRate(refValue, locale)}`;
  }
  
  text += `
• Limite do alerta: ${formatRate(calculatedThreshold, locale)}

Vou te avisar assim que a taxa atingir ${formatRate(calculatedThreshold, locale)}!`;

  return text;
},


  ALERT_CUSTOM_INSTRUCTIONS: (pair) => {
    const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    return `✏️ LIMITE PERSONALIZADO

${pairText}

Envie seu limite em porcentagem.

Exemplos:
• +2.5 (alerta em +2,5% vs média 30d)
• +4 (alerta em +4%)

Min: +1% • Max: +10%`;
  },

  ALERT_CREATED_FULL: (pair, preset, threshold, cooldown, currentRate, avg30d, alertThreshold, locale) => {
    const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    const presetText = {
      conservative: '🛡️ Conservador',
      balanced: '⚖️ Equilibrado',
      aggressive: '🎯 Oportunista',
      custom: '✏️ Personalizado'
    }[preset] || '🔔';
    
    const cooldownText = formatCooldown(cooldown, 'pt');
    
    return `✅ ALERTA CRIADO

${pairText}
${presetText}: +${threshold}% vs média 30d
⏰ Cooldown: ${cooldownText}

Atualmente:
• Taxa atual: ${formatRate(currentRate, locale)}
• Média 30d: ${formatRate(avg30d, locale)}
• Limite alerta: ${formatRate(alertThreshold, locale)}

Vou te alertar assim que este limite for atingido!`;
  },

  ALERT_INVALID_THRESHOLD: `⚠️ Limite inválido

Digite um número entre 1 e 10.

Exemplos: 2.5, 3, 5`,

  ALERT_VIEW_DETAILS: (alert, currentRate, avg30d, alertThreshold, locale) => {
    const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    const presetEmoji = {
      conservative: '🛡️',
      balanced: '⚖️',
      aggressive: '🎯',
      custom: '✏️'
    }[alert.preset] || '🔔';
    
    const cooldownText = formatCooldown(alert.cooldown_minutes || 60, 'pt');
    
    let text = `${presetEmoji} <b>Alerta ${pairText}</b>\n\n`;
    text += `Limite: +${alert.threshold_percent}% vs média 30d\n`;
    text += `⏰ Cooldown: ${cooldownText}\n\n`;
    text += `<b>Estado atual:</b>\n`;
    text += `• Taxa atual: ${formatRate(currentRate, locale)}\n`;
    
    if (avg30d && alertThreshold) {
      text += `• Média 30d: ${formatRate(avg30d, locale)}\n`;
      text += `• Limite alerta: ${formatRate(alertThreshold, locale)}\n`;
      
      const distance = ((alertThreshold - currentRate) / currentRate * 100);
      if (distance > 0) {
        text += `\n📊 Ainda falta ${formatAmount(distance, 1, locale)}% para disparar`;
      } else {
        text += `\n✅ Limite atingido! Aguardando cooldown (max 1x/24h)`;
      }
    }
    
    if (alert.last_triggered_at) {
      const lastDate = new Date(alert.last_triggered_at);
      text += `\n\n🔔 Último alerta: ${lastDate.toLocaleDateString(locale)}`;
    }
    
    return text;
  },





  btn: {
    langFR: '🇫🇷 Français',
    langPT: '🇧🇷 Português',
    langEN: '🇬🇧 English',
    about: 'ℹ️ Sobre',
    eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
    brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (SEPA) · R${formatAmount(amt, 0, locale)}`,
    contOn: '🚀 Continuar on-chain',
    stayOff: '🏦 Ficar off-chain',
    change: '✏️ Mudar valor',
    back: '⬅️ Voltar',
    sources: '📊 Fontes dos dados',
    openWise: '🔗 Abrir Wise',
    openRemitly: '🔗 Abrir Remitly',
    openInstarem: '🔗 Abrir Instarem',
    seeOnchain: '🚀 Ver rota on-chain',
    createEU: '🇪🇺 Criar conta Europa',
    createBR: '🇧🇷 Criar conta Brasil',
    startGuide: '🚀 Começar o guia',
    whatIsUSDC: '🪙 O que é USDC?',
    whatIsExchange: '🏦 O que é um exchange?',
    proofSources: '📊 Provas & fontes',
    openKraken: '🔗 Abrir Kraken',
    openBinanceEU: '🔗 Abrir Binance (UE)',
    openBitvavo: '🔗 Abrir Bitvavo',
    openBitstamp: '🔗 Abrir Bitstamp',
    openCoinbase: '🔗 Abrir Coinbase',
    openBinanceBR: '🔗 Abrir Binance BR',
    openBitso: '🔗 Abrir Bitso',
    openMercadoBitcoin: '🔗 Abrir Mercado Bitcoin',
    openFoxbit: '🔗 Abrir Foxbit',
    startStep1: '🚀 Depositar & converter meus EUR em USDC',
    step1Done: '✅ Depositei meus EUR',
    step1_2Done: '✅ Encontrei o mercado EUR/USDC',
    step1_3Done: '✅ Comprei meus USDC',
    marketVsLimit: 'ℹ️ Market vs Limit',
    nextStep2: '👉 Ir para etapa 2 (transferência)',
    step2Done: '✅ Tenho meu endereço → continuar',
    step2_2Done: '✅ Inseri meu valor',
    step2_3Done: '✅ Confirmei a transferência',
    step3Start: '🇧🇷 Etapa 3 — Vender USDC & sacar via Pix',
    step3_1Done: '✅ Encontrei o mercado',
    step3_2Done: '✅ Fiz minha ordem',
    step3_3Done: '✅ Iniciei meu Pix',
    whyNotExact: '🤔 Por que não o saldo exato?',
    setAlert: '⏰ Ativar meu alerta',
    premium: '🚀 Descobrir Premium',
    giveFeedback: '💬 Dar uma sugestão',
    seePremium: '💎 Ver Premium',
    subscribe3m: '📱 15 R$ - 3 meses',
    subscribe6m: '📱 27 R$ - 6 meses',
    subscribe12m: '📱 50 R$ - 12 meses',
    premiumDetails: 'ℹ️ Ver todas as funcionalidades',
    createAlert: '➕ Criar um alerta',
    myAlerts: '🔔 Meus alertas',
    conservative: '🛡️ Conservador',
    balanced: '⚖️ Equilibrado',
    aggressive: '🎯 Oportunista',
    custom: '✏️ Personalizado',
    disableAlert: '🔕 Desativar',
    editAlert: '✏️ Modificar',
    backToPricing: '⬅️ Voltar aos preços',
    chooseCooldown15: '⚡ 15 minutos',
    chooseCooldown1h: '⏱️ 1 hora ⭐',
    chooseCooldown6h: '⏰ 6 horas',
    chooseCooldown24h: '📅 24 horas',
    chooseCooldown1week: '📆 1 semana',
    deleteAlert: '🗑️ Apagar',
    viewAlert: '👁️ Ver detalhes',
  },
};

// ============================================
// ENGLISH (EN) - COMPLETE TRANSLATION ✅
// ============================================

const en = {
  INTRO_TEXT: `👋 Hi!

🌐 Choose your language · Choisis ta langue · Escolha o idioma`,

  ABOUT_TEXT: `💡 About

This bot compares EUR↔BRL rates and guides you through on-chain transfers (via blockchain).

On-chain rates are often better than traditional platforms. It's legal, secure, and used by many institutions.

Free service, funded by referral links.`,

  promptAmt: `💬 Send an amount or choose:`,
  
  askRoute: (amount, locale) => `What do you want to do with ${formatAmount(amount, 0, locale)}?`,
  
  buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale }) => {
    const title = route === 'eurbrl' ? '💱 EUR → BRL' : '💱 BRL → EUR';
    const ref = `📊 Ref. ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}`;
    
    const onchainLine = route === 'eurbrl'
      ? `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`
      : `🌍 On-chain\nR${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
    
    let bankLine;
    if (!bestBank) {
      bankLine = `🏦 Best off-chain\n⚠️ Rate unavailable`;
    } else {
      bankLine = route === 'eurbrl'
        ? `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `🏦 ${bestBank.provider}\nR${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
    }
    
    let othersText = '';
    if (others.length > 0) {
      const othersList = others.map(p => 
        route === 'eurbrl' 
          ? `${p.provider} R${formatAmount(p.out, 0, locale)}` 
          : `${p.provider} €${formatAmount(p.out, 2, locale)}`
      ).join(' • ');
      othersText = `\n\nOthers: ${othersList}`;
    }
    
    let deltaText = '';
    if (delta !== null && bestBank) {
      const sign = delta >= 0 ? '+' : '−';
      deltaText = `\n\n✅ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
    }
    
    return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
  },

  buildCalcDetails: ({ route, amount, rates, onchain, locale }) => {
    const title = '🔍 On-chain calculation details';
    
    if (route === 'eurbrl') {
      const { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet } = onchain.breakdown;
      
      return `${title}

📊 EUR → BRL via USDC

1️⃣ <b>Buying USDC in Europe</b>
   💰 Amount: €${formatAmount(amount, 2, locale)}
   📉 Trading fees (~0.1-0.2%): −€${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtained: ${formatAmount(usdcAfterBuy, 2, locale)} USDC

2️⃣ <b>Blockchain transfer</b>
   🌍 Network: Polygon (MATIC)
   📉 Network fee: −${formatAmount(1, 2, locale)} USDC
   🪙 USDC received in Brazil: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Selling USDC in Brazil</b>
   🪙 USDC to sell: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 USDC/BRL rate: ${formatRate(rates.usdcBRL, locale)}
   📉 Trading fees (~0.1-0.2%): −R${formatAmount(usdcAfterNetwork * rates.usdcBRL * 0.001, 2, locale)}
   💰 BRL obtained: R${formatAmount(brlAfterTrade, 2, locale)}

4️⃣ <b>Pix withdrawal</b>
   📉 Pix fee (~R$3.50): −R${formatAmount(3.5, 2, locale)}
   
✅ <b>Total received: R${formatAmount(brlNet, 2, locale)}</b>
📊 <b>Effective rate: ${formatRate(onchain.rate, locale)}</b>

💡 Actual fees may vary slightly depending on your platform and trading volume.`;
    } else {
      // BRL → EUR
      const { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet } = onchain.breakdown;
      
      return `${title}

📊 BRL → EUR via USDC

1️⃣ <b>Buying USDC in Brazil</b>
   💰 Amount: R${formatAmount(amount, 2, locale)}
   💱 BRL/USDC rate: ${formatRate(1/rates.usdcBRL, locale)}
   📉 Trading fees (~0.1-0.2%): −R${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtained: ${formatAmount(usdcFromBRL, 2, locale)} USDC

2️⃣ <b>Blockchain transfer</b>
   🌍 Network: Polygon (MATIC)
   📉 Network fee: −${formatAmount(1, 2, locale)} USDC
   🪙 USDC received in Europe: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Selling USDC in Europe</b>
   🪙 USDC to sell: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 USDC/EUR rate: ${formatRate(rates.usdcEUR, locale)}
   📉 Trading fees (~0.1-0.2%): −€${formatAmount(usdcAfterNetwork * rates.usdcEUR * 0.001, 2, locale)}
   
✅ <b>Total received: €${formatAmount(eurNet, 2, locale)}</b>
📊 <b>Effective rate: ${formatRate(onchain.rate, locale)}</b>

💡 Actual fees may vary slightly depending on your platform and trading volume.`;
    }
  },

  SOURCES_TEXT: `📊 Data sources

EUR/BRL reference rate: Yahoo Finance (official exchange rate)

On-chain calculation:
• Crypto rates: CoinGecko (USDC/EUR, USDC/BRL)
• Real fees included:
  - Trading ~0.1-0.2%
  - Polygon network ~1 USDC
  - Pix withdrawal ~R$3.50

Off-chain rates: Wise Comparisons API (live provider rates)

Referral links: free for you, fund the service.`,

  buildOffChain: ({ route, amount, bestBank, others, locale }) => {
    const title = '🏦 Off-chain';
    
    if (!bestBank) {
      return `${title}\n\n⚠️ Rates currently unavailable.`;
    }
    
    const formatFee = (fee) => {
      if (fee === null || fee === undefined || fee === 0) return 'No fees';
      return route === 'eurbrl' ? `${formatAmount(fee, 2, locale)} EUR` : `${formatAmount(fee, 2, locale)} BRL`;
    };
    
    const priorityNames = ['Wise', 'PayPal', 'Western Union'];
    const allProviders = [bestBank, ...others];
    
    const priorityProviders = allProviders.filter(p => priorityNames.includes(p.provider));
    const otherProviders = allProviders.filter(p => !priorityNames.includes(p.provider));
    
    const maxOthers = 6 - priorityProviders.length;
    const topOthers = otherProviders.slice(0, Math.max(2, maxOthers));
    
    const displayProviders = [...priorityProviders, ...topOthers]
      .sort((a, b) => b.out - a.out);
    
    const providersList = displayProviders.map((p, i) => {
      if (route === 'eurbrl') {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 You receive: R${formatAmount(p.out, 2, locale)}\n📊 Rate: ${formatRate(p.rate, locale)}\n💳 Fees: ${formatFee(p.fee)}`;
      } else {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 You receive: €${formatAmount(p.out, 2, locale)}\n📊 Rate: ${formatRate(p.rate, locale)}\n💳 Fees: ${formatFee(p.fee)}`;
      }
    }).join('\n\n');
    
    const footer = `\n\n💡 Usually slightly more expensive than on-chain, but some prefer these solutions for their simplicity.\n\n✅ Regulated and trustworthy platforms. If you don't have an account yet, use our referral links: it's free for you, funds the service (and you might even get bonuses).\n\n<i>*Data provided by Wise Comparisons</i>`;
    
    return `${title}\n\n${providersList}${footer}`;
  },

  ONCHAIN_INTRO: `🚀 On-Chain Route

This is the method we use ourselves — and the reason this bot exists. We recommend it because it cuts out the unnecessary: fewer intermediaries, lower fees, more transparency.

🔄 Simple steps:
1️⃣ Europe → exchange your EUR → USDC (stablecoin)
2️⃣ Blockchain → send your USDC (fast, low cost)
3️⃣ Brazil → convert your USDC to BRL, receive via Pix

ℹ️ What you need:
• an 🇪🇺 exchange account in Europe
• a 🇧🇷 exchange account in Brazil

💡 Traditional transfers can cost between 2.5% and 6%, or more — while via blockchain, you can limit it to 0-1% (we have sources to prove it!).`,

  SOURCES_PROOF: `📊 Proof & sources (2025)

💡 Why do we say blockchain is often much cheaper?

• 💱 Cryptocurrency-based remittance statistics 2025: traditional services apply an average of 6.5% in fees, while crypto transfers (stablecoins, etc.) can cost as little as 1%.

• 📈 Global Remittance Prices – World Bank: in March 2025, the average cost of transfers via traditional routes is 6.49% of the amount sent.

• 🔍 CFA Institute — "Blockchain in FX and Remittances" (2025): institutional investors already use stablecoins to reduce settlement times, lower costs, and manage risks on cross-border transfers.

• 📊 McKinsey – "The stable door opens: tokenized cash / stablecoins" (2025): the volume of cross-border remittances using stablecoins has increased rapidly, and stablecoins are increasingly seen as modern payment infrastructure.`,

  EXCHANGES_EU: `🇪🇺 Exchanges in Europe

Our preference:
• Kraken — simple/free SEPA, serious, USDC available. (👋 It's what we use too)

Other solutions:
• Binance (EU) — very liquid, fees ~0.10%
  ⚠️ If you choose Binance 🇪🇺 side, you'll need another exchange 🇧🇷 side
• Bitvavo — free SEPA, simple UX, low fees
• Bitstamp — EU veteran, serious
• Coinbase Advanced — simple but higher fees

Check: SEPA ok • USDC available • reasonable fees • reputation

Our referral links fund the service (free for you, sometimes bonuses).`,

  EXCHANGES_BR: `🇧🇷 Exchanges in Brazil

Our preference:
• Binance BR — native Pix, huge liquidity, low fees (~0.10%) + 3.50 BRL fixed per Pix withdrawal. (👋 It's what we use too)

Other solutions:
• Bitso — free and instant Pix, clear interface, locally regulated
• Mercado Bitcoin — historic local player, Pix supported
• Foxbit — Pix 24/7, decent fees

Check: Pix ok • USDC available • reasonable fees • reputation

Our referral links fund the service (free for you, sometimes bonuses).

⚠️ Reminder: one exchange serves one side. You need a 🇪🇺 (SEPA) + a 🇧🇷 (Pix).`,

  WHAT_IS_USDC: `🪙 What is USDC?

USDC = USD Coin, a "stablecoin" (stable crypto).

In practice:
• 1 USDC always worth ~1 US dollar
• Issued by Circle (regulated US company)
• Reserves regularly verified
• Accepted on all major exchanges

Why we choose USDC?
• MiCA compliant (European crypto-asset regulation)
• Usable legally and simply in Europe
• Unlike Bitcoin which fluctuates, USDC remains stable

It's perfect for transferring money without variation risk.

You use it as a "pivot currency": EUR → USDC → BRL.`,

  WHAT_IS_EXCHANGE: `🏦 What is an exchange?

A crypto exchange is like a digital currency exchange office.

You can:
• Deposit traditional money (EUR, BRL...)
• Buy/sell cryptos (USDC, Bitcoin...)
• Send them to other exchanges

The most known: Kraken, Binance, Coinbase, Bitso...

For our case:
• Europe exchange = you deposit EUR, buy USDC
• Brazil exchange = you receive USDC, sell for BRL, withdraw via Pix

It's regulated and safe (if you choose recognized platforms).`,

  MARKET_VS_LIMIT: `📈 Market vs Limit

<b>Market</b>:
• Immediate execution at current price
• Simple and fast
• Recommended for beginners

<b>Limit</b>:
• You set YOUR buy/sell price
• Order only executes if market reaches your price
• Useful for large amounts or optimizing the rate

<i>Tip: if you just want to "exchange", choose Market.</i>`,

  GUIDE_TRANSITION: `✅ You have (or will have):
• A 🇪🇺 account to deposit your EUR (SEPA → USDC)
• A 🇧🇷 account to withdraw your BRL (USDC → Pix)

🌐 You're taking your first on-chain step.
It's more than just a transfer:
• you're discovering a technology that's already changing global finance,
• you're joining millions of users, companies, and institutions,
• you're keeping more value for yourself (and less for intermediaries 💸).

🚀 Now, let's start concretely: first step → deposit your EUR in your 🇪🇺 account and convert them to USDC.`,

  STEP_1_1: (amount, locale) => `1️⃣ Deposit your EUR in the exchange account

• Go to the "Deposit / Fiat" section.
• Choose EUR as currency.
• Simplest method: SEPA transfer (fast, low or no fees).

💡 "Fiat" = traditional currencies (EUR, USD, BRL…).

👉 Recommended: Kraken.

Balance estimate: €${formatAmount(amount, 0, locale)}
*⚠️ This is an estimate, close to reality. Bank fees and delays may vary slightly.*`,

  STEP_1_2: (amount, locale) => `2️⃣ Access the market to buy USDC

• In your exchange, look for "Trader / Market / Trade".
• Select the EUR/USDC pair.

💡 A crypto market is like a currency exchange: you exchange one currency for another.

Balance estimate: €${formatAmount(amount, 0, locale)} (ready for USDC purchase)
*⚠️ Indicative estimate.*`,

  STEP_1_3: (usdcAmount, locale) => `3️⃣ Buy your USDC

• Choose the order type:
  • Market → instant, simple, recommended.
  • Limit → you set your price, useful for large amounts/liquidity.

👉 For beginners: market order.

Balance estimate: ~${formatAmount(usdcAmount, 2, locale)} USDC
*⚠️ Estimate close to reality. Fees & prices may vary slightly.*`,

  STEP_1_4: `✅ Well done! You now have USDC in your 🇪🇺 account.

✨ USDC are "stablecoins": ~1 USDC = 1 USD.
This is the key to transferring your money quickly and at low cost.

Next step: send them on-chain to Brazil.`,

  STEP_2_1: `✨ This is the "on-chain" step → fast and low cost, but requires some concentration.
Unlike a bank, if you make a mistake, there's no customer service to recover your funds.

1️⃣ Get your 🇧🇷 deposit address

• In your Brazilian exchange, look for "Deposit / Crypto".
• Choose USDC as crypto to deposit.
• Select the transfer network.

💡 We recommend Polygon (MATIC) → fast, reliable, low fees (~1 USDC).

• Carefully copy the address.

💡 Imagine it's like your bank IBAN, but blockchain version (a long sequence of letters and numbers).`,

  STEP_2_2: (usdcAmount, locale) => `2️⃣ Send from your 🇪🇺 exchange

• Go to "Withdrawal / Withdraw" → USDC.
• Paste the copied address.
• Choose the same network as the deposit (e.g. Polygon).

💡 The network is like train rails: if they're not the same on both sides, the money goes elsewhere and is lost.

• Enter your amount. You can send everything, or start with a test (e.g. 10 USDC).

👉 Testing costs a bit more (fixed fees ~1 USDC apply twice), but it's a common good practice in crypto.

Estimate: you'll receive ~${formatAmount(usdcAmount - 1, 2, locale)} USDC 🇧🇷 side
*⚠️ Estimate close to reality (network fee ~1 USDC).*`,

  STEP_2_3: `3️⃣ Verify and confirm

• Carefully re-read the address and network before validating.

⚠️ A single wrong character in the address, or wrong network, and your funds are permanently lost.

👉 Once you've verified everything, you can confirm the transfer.`,

  STEP_2_4: `4️⃣ Wait for arrival

• Usually, the transaction takes 1-2 minutes, sometimes up to 10 min.
• You'll see your USDC balance appear 🇧🇷 side.

✅ Result: your USDC arrived → ready for step 3 (BRL sale + Pix withdrawal).`,

  STEP_3_1: `1️⃣ Find the USDC/BRL market 🇧🇷

• In your Brazilian exchange, go to Trader / Market.
• Select the USDC/BRL pair.

👉 Next step: your USDC finally turn into BRL 🎉`,

  STEP_3_2: (brlAmount, locale) => `2️⃣ Place your order

• "Market" → instant, at current price (simple, recommended).
• "Limit" → you set your price, useful for large amounts.

👉 For most people, "market order" = simplest and fastest.

Balance estimate: ~R${formatAmount(brlAmount, 2, locale)}
*⚠️ Estimate close to reality (fees ~0.10-0.20%).*`,

  STEP_3_3: (brlNet, locale) => `3️⃣ Withdraw your money in R$

• Once your USDC are sold, your balance appears in BRL.
• Go to Withdrawal / Withdraw.
• Choose Pix as method.

👉 Enter your Pix key (CPF, email, phone, random key)… but you already know how to do that 😉

💡 By the way: just like a crypto address, if the key is wrong, the money goes to the wrong place.

👉 Usually, fees are very low (e.g. Binance ~R$3.50 per Pix withdrawal).
Should be free honestly… but well 😅

Received balance estimate: ~R${formatAmount(brlNet, 2, locale)} net
*⚠️ Well, we shouldn't be too far from reality ;)*`,

  WHY_NOT_EXACT: `🤔 Why can't we give the exact amount?

Variables that move in real time:

• Exchange fees: can vary according to your user profile, trading volume, or occasional promotions (but always remain low).

• Network fees: fluctuate according to blockchain network congestion (~1 USDC average on Polygon, but can vary).

• Exchange rate: crypto markets move in real time, even if USDC remains stable, the USDC/BRL rate can slightly fluctuate between when you calculate and when you execute.

Our estimates are prudent and close to reality. You shouldn't have any bad surprises.`,

  STEP_3_4: `✅ Your transfer is complete!

• You converted your EUR to USDC 🇪🇺 side.
• You sent them on-chain.
• You sold them for BRL and withdrew via Pix 🇧🇷 side.

✨ Result: fast, secure, and low cost.

🌍 You just made a real blockchain passage.
What you learned today will be increasingly used in the future: you just took a step ahead.

🙌 We hope you enjoyed the experience!`,

PREMIUM_PRICING: `💎 GO PREMIUM

✨ With Premium:
• 🔔 Unlimited custom alerts
• 📢 Regular spontaneous alerts
• 🎯 Multi-pairs (EUR→BRL + BRL→EUR)
• 📊 Advanced analytics
• 🌍 Multi-currency coming soon
• ⚡ Priority access to new features

[ℹ️ See all Premium features]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 15 R$ / 3 months
   That's 5 R$/month

📱 27 R$ / 6 months
   That's 4.50 R$/month • Save 10%

📱 50 R$ / 12 months
   That's 4.17 R$/month • Save 17%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔜 International credit card coming soon`,

  PREMIUM_DETAILS: `💎 PREMIUM FEATURES

🔔 UNLIMITED CUSTOM ALERTS
Set your own trigger thresholds.
Example: "Alert me if EUR→BRL exceeds 6.20"

You can create as many alerts as you want, for different amounts or situations.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📢 REGULAR SPONTANEOUS ALERTS
Free mode: 1-2 alerts/month (exceptional records)

Premium: regular alerts as soon as conditions are favorable, no need to wait for an absolute record.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 MULTI-PAIRS
Monitor EUR→BRL AND BRL→EUR at the same time.

Perfect if you make regular transfers both ways or want to optimize in both directions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ADVANCED ANALYTICS
• Comparison with 7/30/90 day averages
• Trend identification
• History-based recommendations
• Insights to optimize your transfers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 MULTI-CURRENCY (COMING SOON)
Soon: USD, GBP, CHF, CAD and other pairs.

Premium subscribers will have priority access from launch.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ PRIORITY ACCESS
• New features in preview
• Influence the roadmap (suggest and vote)
• Priority support
• Continuous service evolution`,

  ALERT_CREATE_INTRO: `🔔 CREATE AN ALERT

Choose how you want to be alerted:`,

  ALERT_PRESET_CONSERVATIVE: `🛡️ Conservative
+2% vs 30d average
Alert ~1x per month
To secure a good rate`,

  ALERT_PRESET_BALANCED: `⚖️ Balanced (Our choice ⭐)
+3% vs 30d average
Alert ~2-3x per month
It's what we use ourselves`,

  ALERT_PRESET_AGGRESSIVE: `🎯 Opportunistic
+5% vs 30d average
Alert ~1x every 2 months
To maximize, rarer but better`,

  ALERT_CREATED: (pair, threshold, currentRate, avg30d, alertThreshold, locale) => `✅ Alert created!

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : +${threshold}% vs 30d average

I'll alert you when the rate exceeds the 30-day average by ${threshold}%.

Currently:
• Current rate: ${formatRate(currentRate, locale)}
• 30d average: ${formatRate(avg30d, locale)}
• Alert threshold: ${formatRate(alertThreshold, locale)} (+${threshold}%)`,

  ALERT_TRIGGERED: (pair, currentRate, avg30d, threshold, delta, amountExample, savings, locale) => `🔔 PREMIUM ALERT

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}

💡 Your threshold is reached!

📊 Analysis:
• Current rate: ${formatRate(currentRate, locale)}
• 30d average: ${formatRate(avg30d, locale)}
• Difference: +${formatAmount(delta, 1, locale)}% ✅
• ${delta > threshold ? `That's ${formatAmount(delta - threshold, 1, locale)}% above your threshold` : 'Right on your threshold'}

💰 On ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, you gain ~${formatAmount(savings, 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs average`,

  FREE_ALERT: (pair, currentRate, recordDays, amountExample, savings, locale) => `🔔 SPECIAL ALERT

${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'} : ${formatRate(currentRate, locale)}

📊 This is the BEST rate in ${recordDays} days!

💰 On ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, you gain ~${formatAmount(savings, 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs average

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 With Premium (5 R$/month):
• Configure your own alerts
• Multi-pairs (EUR→BRL + BRL→EUR)
• Multiple custom thresholds
• Regular alerts (not just records)`,

ALERTS_LIST: (alerts, locale) => {
  if (alerts.length === 0) {
    return `🔔 <b>My alerts</b>

You have no active alerts.

Create your first alert to be notified automatically!`;
  }
  
  const emojis = {
    conservative: '🛡️',
    balanced: '⚖️',
    aggressive: '🎯',
    custom: '✏️',
    absolute: '🎯',
    relative: '📊'
  };
  
  let text = `🔔 <b>My alerts</b>\n\n`;
  
  alerts.forEach((alert, index) => {
    const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    
    let emoji;
    if (alert.preset && emojis[alert.preset]) {
      emoji = emojis[alert.preset];
    } else {
      emoji = emojis[alert.threshold_type] || '🔔';
    }
    
    let threshold;
    if (alert.threshold_type === 'absolute') {
      threshold = `≥ ${formatRate(alert.threshold_value, locale)}`;
    } else {
      const refLabels = {
        current: 'current rate',
        avg7d: '7d avg',
        avg30d: '30d avg',
        avg90d: '90d avg'
      };
      const refLabel = refLabels[alert.reference_type] || alert.reference_type;
      threshold = `+${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabel}`;
    }
    
    text += `${index + 1}. ${emoji} ${pairText} : ${threshold}\n`;
  });
  
  text += `\nYou'll be notified when these thresholds are reached.`;
  
  return text;
},

  PREMIUM_EXPIRED: `⚠️ Your Premium has expired

We already miss you! 😢

Pick up where you left off:
📱 15 R$ / 3 months
📱 27 R$ / 6 months (−10%)
📱 50 R$ / 12 months (−17%)`,

  PREMIUM_EXPIRING_SOON: (daysLeft) => `⏰ Your Premium expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}

Want to renew?

📱 15 R$ / 3 months
📱 27 R$ / 6 months (−10%)
📱 50 R$ / 12 months (−17%)`,

  NOT_PREMIUM: `🔒 Premium Feature

This feature is reserved for Premium subscribers.

💎 Go Premium for:
• Create custom alerts
• Receive regular alerts
• Multi-pairs and advanced analytics

Price: from 5 R$/month`,


ALERT_CHOOSE_PAIR: `🔔 CREATE AN ALERT

Which route interests you?`,

  ALERT_CHOOSE_PRESET: (pair) => {
    const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    return `🔔 ALERT ${pairText}

Choose a profile:`;
  },

  ALERT_CHOOSE_COOLDOWN: `⏰ COOLDOWN

Minimum interval between two alerts:

💡 Cooldown: avoids repeated notifications.
Recommended: 1 hour to stay reactive.`,

ALERT_CHOOSE_TYPE: (pair) => `🔔 ALERT ${pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}

How do you want to define your threshold?`,

ALERT_CHOOSE_REFERENCE: (pair, currentRate, avg7d, avg30d, avg90d, locale) => `📊 RELATIVE THRESHOLD

Current rate: ${formatRate(currentRate, locale)}

+X% compared to what?

💡 <i>The reference will be recalculated at each check (every 2h)</i>`,

ALERT_CHOOSE_PERCENT: (pair, refType, refValue, locale) => {
  const refLabels = {
    current: `Current rate (${formatRate(refValue, locale)})`,
    avg7d: `7-day avg (${formatRate(refValue, locale)})`,
    avg30d: `30-day avg (${formatRate(refValue, locale)})`,
    avg90d: `90-day avg (${formatRate(refValue, locale)})`
  };
  
  return `📊 RELATIVE THRESHOLD
Reference: ${refLabels[refType]}

Enter the percentage increase:`;
},

ALERT_ENTER_ABSOLUTE: (pair, currentRate, locale) => `🎯 ABSOLUTE THRESHOLD

Current rate: ${formatRate(currentRate, locale)}

Enter the rate that will trigger the alert:
(e.g.: ${formatRate(currentRate * 1.03, locale)})

💡 <i>Tip: Choose ~3-5% above current 
   (≈${formatRate(currentRate * 1.03, locale)} - ${formatRate(currentRate * 1.05, locale)})</i>`,

ALERT_INVALID_ABSOLUTE: `⚠️ Invalid value.

Enter a decimal number (e.g.: 6.30)`,

ALERT_CREATED_FULL_V2: (alert, currentRate, refValue, calculatedThreshold, locale) => {
  const typeLabels = {
    absolute: '🎯 Absolute',
    relative: '📊 Relative'
  };
  
  const refLabels = {
    current: 'Current rate',
    avg7d: '7-day avg',
    avg30d: '30-day avg',
    avg90d: '90-day avg'
  };
  
  let text = `✅ ALERT CREATED

${alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR'}
${typeLabels[alert.threshold_type]}`;

  if (alert.threshold_type === 'relative') {
    text += ` : +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabels[alert.reference_type]}`;
  } else {
    text += ` : ≥ ${formatRate(alert.threshold_value, locale)}`;
  }
  
  text += `\n⏰ Cooldown: ${formatCooldown(alert.cooldown_minutes)}

<b>Currently:</b>
• Current rate: ${formatRate(currentRate, locale)}`;

  if (alert.threshold_type === 'relative') {
    text += `
• ${refLabels[alert.reference_type]}: ${formatRate(refValue, locale)}`;
  }
  
  text += `
• Alert threshold: ${formatRate(calculatedThreshold, locale)}

I'll alert you as soon as the rate reaches ${formatRate(calculatedThreshold, locale)}!`;

  return text;
},

  ALERT_CUSTOM_INSTRUCTIONS: (pair) => {
    const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    return `✏️ CUSTOM THRESHOLD

${pairText}

Send your threshold as a percentage.

Examples:
• +2.5 (alert at +2.5% vs 30d average)
• +4 (alert at +4%)

Min: +1% • Max: +10%`;
  },

  ALERT_CREATED_FULL: (pair, preset, threshold, cooldown, currentRate, avg30d, alertThreshold, locale) => {
    const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    const presetText = {
      conservative: '🛡️ Conservative',
      balanced: '⚖️ Balanced',
      aggressive: '🎯 Opportunistic',
      custom: '✏️ Custom'
    }[preset] || '🔔';
    
    const cooldownText = formatCooldown(cooldown, 'en');
    
    return `✅ ALERT CREATED

${pairText}
${presetText}: +${threshold}% vs 30d average
⏰ Cooldown: ${cooldownText}

Currently:
• Current rate: ${formatRate(currentRate, locale)}
• 30d average: ${formatRate(avg30d, locale)}
• Alert threshold: ${formatRate(alertThreshold, locale)}

I'll alert you as soon as this threshold is reached!`;
  },

  ALERT_INVALID_THRESHOLD: `⚠️ Invalid threshold

Enter a number between 1 and 10.

Examples: 2.5, 3, 5`,

  ALERT_VIEW_DETAILS: (alert, currentRate, avg30d, alertThreshold, locale) => {
    const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
    const presetEmoji = {
      conservative: '🛡️',
      balanced: '⚖️',
      aggressive: '🎯',
      custom: '✏️'
    }[alert.preset] || '🔔';
    
    const cooldownText = formatCooldown(alert.cooldown_minutes || 60, 'en');
    
    let text = `${presetEmoji} <b>Alert ${pairText}</b>\n\n`;
    text += `Threshold: +${alert.threshold_percent}% vs 30d average\n`;
    text += `⏰ Cooldown: ${cooldownText}\n\n`;
    text += `<b>Current state:</b>\n`;
    text += `• Current rate: ${formatRate(currentRate, locale)}\n`;
    
    if (avg30d && alertThreshold) {
      text += `• 30d average: ${formatRate(avg30d, locale)}\n`;
      text += `• Alert threshold: ${formatRate(alertThreshold, locale)}\n`;
      
      const distance = ((alertThreshold - currentRate) / currentRate * 100);
      if (distance > 0) {
        text += `\n📊 Still ${formatAmount(distance, 1, locale)}% to trigger`;
      } else {
        text += `\n✅ Threshold reached! Waiting for cooldown (max 1x/24h)`;
      }
    }
    
    if (alert.last_triggered_at) {
      const lastDate = new Date(alert.last_triggered_at);
      text += `\n\n🔔 Last alert: ${lastDate.toLocaleDateString(locale)}`;
    }
    
    return text;
  },




  btn: {
    langFR: '🇫🇷 Français',
    langPT: '🇧🇷 Português',
    langEN: '🇬🇧 English',
    about: 'ℹ️ About',
    eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
    brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (SEPA) · R${formatAmount(amt, 0, locale)}`,
    contOn: '🚀 Continue on-chain',
    stayOff: '🏦 Stay off-chain',
    change: '✏️ Change amount',
    back: '⬅️ Back',
    sources: '📊 Data sources',
    openWise: '🔗 Open Wise',
    openRemitly: '🔗 Open Remitly',
    openInstarem: '🔗 Open Instarem',
    seeOnchain: '🚀 See on-chain route',
    createEU: '🇪🇺 Create Europe account',
    createBR: '🇧🇷 Create Brazil account',
    startGuide: '🚀 Start guide',
    whatIsUSDC: '🪙 What is USDC?',
    whatIsExchange: '🏦 What is an exchange?',
    proofSources: '📊 Proof & sources',
    openKraken: '🔗 Open Kraken',
    openBinanceEU: '🔗 Open Binance (EU)',
    openBitvavo: '🔗 Open Bitvavo',
    openBitstamp: '🔗 Open Bitstamp',
    openCoinbase: '🔗 Open Coinbase',
    openBinanceBR: '🔗 Open Binance BR',
    openBitso: '🔗 Open Bitso',
    openMercadoBitcoin: '🔗 Open Mercado Bitcoin',
    openFoxbit: '🔗 Open Foxbit',
    startStep1: '🚀 Deposit & convert my EUR to USDC',
    step1Done: '✅ I deposited my EUR',
    step1_2Done: '✅ I found the EUR/USDC market',
    step1_3Done: '✅ I bought my USDC',
    marketVsLimit: 'ℹ️ Market vs Limit',
    nextStep2: '👉 Go to step 2 (transfer)',
    step2Done: '✅ I have my address → continue',
    step2_2Done: '✅ I entered my amount',
    step2_3Done: '✅ I confirmed the transfer',
    step3Start: '🇧🇷 Step 3 — Sell USDC & withdraw via Pix',
    step3_1Done: '✅ I found the market',
    step3_2Done: '✅ I placed my order',
    step3_3Done: '✅ I initiated my Pix',
    whyNotExact: '🤔 Why not exact balance?',
    setAlert: '⏰ Activate my alert',
    premium: '🚀 Discover Premium',
    giveFeedback: '💬 Give feedback',
    seePremium: '💎 See Premium',
    subscribe3m: '📱 15 R$ - 3 months',
    subscribe6m: '📱 27 R$ - 6 months',
    subscribe12m: '📱 50 R$ - 12 months',
    premiumDetails: 'ℹ️ See all features',
    createAlert: '➕ Create an alert',
    myAlerts: '🔔 My alerts',
    conservative: '🛡️ Conservative',
    balanced: '⚖️ Balanced',
    aggressive: '🎯 Oportunistic',
    custom: '✏️ Custom',
    disableAlert: '🔕 Disable',
    editAlert: '✏️ Edit',
    backToPricing: '⬅️ Back to pricing',
    chooseCooldown15: '⚡ 15 minutes',
    chooseCooldown1h: '⏱️ 1 hour ⭐',
    chooseCooldown6h: '⏰ 6 hours',
    chooseCooldown24h: '📅 24 hours',
    chooseCooldown1week: '📆 1 week',
    deleteAlert: '🗑️ Delete',
    viewAlert: '👁️ View details',
  },
};

// ============================================
// EXPORT
// ============================================

export { formatCooldown };
export const messages = { fr, pt, en };