import { formatAmount, formatRate, getLocale } from '../../services/rates.js';
import { formatCooldown } from './helpers.js';

export const messagesFr = {
    INTRO_TEXT: `👋 Oi !

🌐 Choisis ta langue · Escolha o idioma · Choose your language`,

  ABOUT_TEXT: `💡 À propos

Ce bot compare les taux EUR↔BRL et te guide pour des transferts on-chain (via blockchain).

Les taux on-chain sont souvent meilleurs que les plateformes traditionnelles. C'est légal, sûr et utilisé par de nombreuses institutions.

Service gratuit, financé par des liens de parrainage.`,

  ERROR_RATES_UNAVAILABLE: `⚠️ Taux crypto indisponibles. Réessaie dans un instant.`,
  ERROR_INVALID_AMOUNT: `⚠️ Montant invalide. Entre un nombre (ex. 1000)`,
  ERROR_UPDATE_FAILED: `❌ Erreur lors de la mise à jour.`,

  // ✅ MENU PRINCIPAL
  promptAmt: `🏠 <b>Menu Principal</b>\n\n💱 Compare les meilleurs taux EUR↔BRL en direct\n\n<b>💎 Premium:</b>\n🔔 Alertes personnalisées\n⏰ Notifications au meilleur moment pour convertir\n\n━━━━━━━━━━━━━━━━━━\n\n👉 <i>Choisis ci-dessous ou envoie un montant (ex: 1000)</i>`,
  
  askAmount: `✏️ Entre un montant (ex. 1000)`,
  
  askRoute: (amount, locale) => `Tu veux faire quoi avec ${formatAmount(amount, 0, locale)} ?`,
  
  // ✅ ÉCRAN 3 : buildComparison (ref, delta, autres)
  buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale, isTargetMode = false }) => {
    const now = new Date();

    let title;
    if (isTargetMode) {
      if (route === 'eurbrl') {
        title = `💱 Pour recevoir ${formatAmount(amount, 0, locale)} BRL\nIl faut ~${formatAmount(onchain.in, 0, locale)} EUR`;
      } else {
        title = `💱 Pour recevoir ${formatAmount(amount, 0, locale)} EUR\nIl faut ~${formatAmount(onchain.in, 0, locale)} BRL`;
      }
    } else {
      title = route === 'eurbrl'
        ? `💱 ${formatAmount(amount, 0, locale)} EUR → BRL`
        : `💱 ${formatAmount(amount, 0, locale)} BRL → EUR`;
    }

    const timeStr = now.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
    const tzAbbr = new Date().toLocaleTimeString('en-US', {timeZoneName: 'short'}).split(' ')[2];

    // ✅ Ligne référence - Yahoo Finance uniquement
    let ref;
    if (rates.yahooFrozen) {
      // Yahoo indisponible (week-end/marché fermé) - affichage du taux crypto
      ref = `📊 Taux de référence ${formatRate(rates.cross, locale)} • ${timeStr} ${tzAbbr}\n⚠️ Taux officiel figé (week-end) - affichage du taux ${rates.referenceSource}`;
    } else {
      // Yahoo disponible - référence officielle
      ref = `📊 Taux officiel ${formatRate(rates.cross, locale)} (Yahoo Finance) • ${timeStr} ${tzAbbr}`;
    }
    
    let onchainLine, bankLine;
    
    if (isTargetMode) {
      if (route === 'eurbrl') {
        onchainLine = `🌍 On-chain\n~${formatAmount(onchain.in, 0, locale)} EUR → ${formatAmount(amount, 2, locale)} BRL (${formatRate(onchain.rate, locale)})`;
        
        if (!bestBank) {
          bankLine = `🏦 Meilleur off-chain\n⚠️ Taux indisponible`;
        } else {
          bankLine = `🏦 ${bestBank.provider}\n~${formatAmount(bestBank.in, 0, locale)} EUR → ${formatAmount(amount, 2, locale)} BRL (${formatRate(bestBank.rate, locale)})`;
        }
      } else {
        onchainLine = `🌍 On-chain\n~${formatAmount(onchain.in, 0, locale)} BRL → ${formatAmount(amount, 2, locale)} EUR (${formatRate(onchain.rate, locale)})`;
        
        if (!bestBank) {
          bankLine = `🏦 Meilleur off-chain\n⚠️ Taux indisponible`;
        } else {
          bankLine = `🏦 ${bestBank.provider}\n~${formatAmount(bestBank.in, 0, locale)} BRL → ${formatAmount(amount, 2, locale)} EUR (${formatRate(bestBank.rate, locale)})`;
        }
      }
    } else {
      if (route === 'eurbrl') {
        onchainLine = `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
      } else {
        onchainLine = `🌍 On-chain\nR$ ${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
      }
      
      if (!bestBank) {
        bankLine = `🏦 Meilleur off-chain\n⚠️ Taux indisponible`;
      } else {
        if (route === 'eurbrl') {
          bankLine = `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
        } else {
          bankLine = `🏦 ${bestBank.provider}\nR$ ${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
        }
      }
    }
    
    // ✅ Section "Autres" : suppression compteur (X)
    let othersText = '';
    if (others.length > 0) {
      const topOthers = others.slice(0, 3);
      const formattedOthers = topOthers.map(p => {
        if (isTargetMode) {
          return route === 'eurbrl'
            ? `• ${p.provider} : ~${formatAmount(p.in, 0, locale)} EUR`
            : `• ${p.provider} : ~${formatAmount(p.in, 0, locale)} BRL`;
        } else {
          return route === 'eurbrl'
            ? `• ${p.provider} : R$ ${formatAmount(p.out, 0, locale)}`
            : `• ${p.provider} : €${formatAmount(p.out, 2, locale)}`;
        }
      }).join('\n');
      
      const count = others.length;
      // ✅ Suppression du (X) dans "Autres"
      othersText = `\n\nAutres :\n${formattedOthers}`;
      
      // ✅ Footer sans <i>
      if (count > 3) {
        othersText += `\n+ ${count - 3} autres disponibles`;
      }
    }
    
    // ✅ Delta modifié
    let deltaText = '';
    if (delta !== null && bestBank) {
      if (isTargetMode) {
        const sign = delta <= 0 ? '−' : '+';
        const absValue = Math.abs(delta);
        deltaText = delta <= 0 
          ? `\n\n✅ Tu économises environ ${sign}${formatAmount(absValue, 1, locale)}% on-chain`
          : `\n\n⚠️ ${sign}${formatAmount(absValue, 1, locale)}% on-chain (plus cher)`;
      } else {
        const sign = delta >= 0 ? '+' : '−';
        deltaText = `\n\n✅ Tu économises environ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
      }
    }
    
    return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
  },

  // ✅ ÉCRAN 4 : buildCalcDetails (frais ~0,1%, Pix si applicable)
  buildCalcDetails: ({ route, amount, rates, onchain, locale }) => {
    const title = '🔍 Détails du calcul on-chain';
    
    if (route === 'eurbrl') {
      const { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet } = onchain.breakdown;
      
      return `${title}

📊 EUR → BRL via USDC

1️⃣ <b>Achat USDC en Europe</b>
   💰 Montant : €${formatAmount(amount, 2, locale)}
   📉 Frais trading (~0,1%) : −€${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtenus : ${formatAmount(usdcAfterBuy, 2, locale)} USDC

2️⃣ <b>Transfert blockchain</b>
   🌍 Réseau : Polygon (MATIC)
   📉 Frais réseau : −${formatAmount(1, 2, locale)} USDC
   🪙 USDC reçus au Brésil : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Vente USDC au Brésil</b>
   🪙 USDC à vendre : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 Taux USDC/BRL : ${formatRate(rates.usdcBRL, locale)}
   📉 Frais trading (~0,1%) : −R$ ${formatAmount(usdcAfterNetwork * rates.usdcBRL * 0.001, 2, locale)}
   💰 BRL obtenus : R$ ${formatAmount(brlAfterTrade, 2, locale)}

4️⃣ <b>Retrait Pix</b>
   📉 Frais Pix (si applicable) : −R$ ${formatAmount(3.5, 2, locale)}
   
✅ <b>Total reçu : R$ ${formatAmount(brlNet, 2, locale)}</b>
📊 <b>Taux effectif : ${formatRate(onchain.rate, locale)}</b>

💡 Les frais réels peuvent varier légèrement selon ta plateforme et ton volume de trading.`;
    } else {
      // BRL → EUR
      const { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet } = onchain.breakdown;
      
      return `${title}

📊 BRL → EUR via USDC

1️⃣ <b>Achat USDC au Brésil</b>
   💰 Montant : R$ ${formatAmount(amount, 2, locale)}
   💱 Taux BRL/USDC : ${formatRate(1/rates.usdcBRL, locale)}
   📉 Frais trading (~0,1%) : −R$ ${formatAmount(amount * 0.001, 2, locale)}
   🪙 USDC obtenus : ${formatAmount(usdcFromBRL, 2, locale)} USDC

2️⃣ <b>Transfert blockchain</b>
   🌍 Réseau : Polygon (MATIC)
   📉 Frais réseau : −${formatAmount(1, 2, locale)} USDC
   🪙 USDC reçus en Europe : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC

3️⃣ <b>Vente USDC en Europe</b>
   🪙 USDC à vendre : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
   💱 Taux EUR/USDC : ${formatRate(rates.usdcEUR, locale)}
   📉 Frais trading (~0,1%) : −€${formatAmount(usdcAfterNetwork * rates.usdcEUR * 0.001, 2, locale)}
   
✅ <b>Total reçu : €${formatAmount(eurNet, 2, locale)}</b>
📊 <b>Taux effectif : ${formatRate(onchain.rate, locale)}</b>

💡 Les frais réels peuvent varier légèrement selon ta plateforme et ton volume de trading.`;
    }
  },

  SOURCES_TEXT: `📊 Sources des données

Taux de référence EUR/BRL : Yahoo Finance (taux officiel du marché FX)

Calcul on-chain:
• Taux crypto : Coinpaprika (principal), CryptoCompare, ou CoinGecko (USDC/EUR, USDC/BRL)
• Frais réels inclus :
  - Trading ~0,1%
  - Réseau Polygon ~1 USDC
  - Retrait Pix ~R$3,50

Taux off-chain : API Wise Comparisons (taux live des providers)

Liens de parrainage : gratuits pour toi, financent le service.`,

  SOURCES_PROOF: `📊 <b>Preuves & Sources</b>

Cliquez sur les liens ci-dessous pour accéder aux études et rapports officiels qui prouvent l'avantage des transferts on-chain.`,

  // ✅ ÉCRAN 5 : buildOffChain (rappel on-chain, Wise, parrainage)
  buildOffChain: ({ route, amount, bestBank, others, locale, onchainAmount }) => {
    const title = '🏦 Off-chain';
    
    if (!bestBank) {
      return `${title}\n\n⚠️ Taux indisponibles pour le moment.`;
    }
    
    const allProviders = [bestBank, ...others];
    const displayProviders = allProviders.sort((a, b) => b.out - a.out);
    
    const providersList = displayProviders.map((p, i) => {
      if (route === 'eurbrl') {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 Tu reçois : R$ ${formatAmount(p.out, 2, locale)}\n📊 Taux effectif : ${formatRate(p.rate, locale)}`;
      } else {
        return `<b>${i + 1}. ${p.provider}</b>\n💰 Tu reçois : €${formatAmount(p.out, 2, locale)}\n📊 Taux effectif : ${formatRate(p.rate, locale)}`;
      }
    }).join('\n\n');
    
    const onchainCompare = onchainAmount 
      ? `~${formatAmount(onchainAmount, 0, locale)}${route === 'eurbrl' ? ' R$' : '€'}`
      : '—';
    
    const offchainBest = displayProviders[0]?.out 
      ? formatAmount(displayProviders[0].out, 0, locale)
      : '—';
    
    // ✅ Footer avec rappel on-chain + reformulation
    const footer = `

💡 Plus cher que l'on-chain (~${offchainBest}${route === 'eurbrl' ? ' R$' : '€'} vs ~${onchainCompare} on-chain)

<i>*Données fournies par Wise Comparisons</i>`;
    
    return `${title}\n\n${providersList}${footer}`;
  },

  // ✅ ÉCRAN 6 : ONCHAIN_INTRO (modifié)
  ONCHAIN_INTRO: `🚀 ROUTE ON-CHAIN

📍 <b>Le processus en 3 étapes</b>
1️⃣ Europe → Change tes EUR en USDC
2️⃣ Blockchain → Envoie tes USDC
3️⃣ Brésil → Convertis USDC en BRL (Pix)

✅ <b>Ce dont tu as besoin</b>
• 🇪🇺 Exchange en Europe acceptant dépôt EUR (SEPA)
• 🇧🇷 Exchange au Brésil acceptant retrait BRL (Pix)

💡 On a des recommandations !

💡 <b>Fun fact :</b> Les frais on-chain (~0,5-1%) sont 5 à 10 fois moins chers que les transferts classiques (2,5-6%) !`,

  // ✅ ÉCRAN 7 : FAQ_MENU (nouveau)
  FAQ_MENU: `🤔 UN DOUTE ?

Choisis un sujet ou pose ta question :`,

  // ✅ ÉCRAN 8 : FAQ_WHY_ONCHAIN (nouveau)
  FAQ_WHY_ONCHAIN: `💡 POURQUOI ON-CHAIN ?

🌍 <b>La blockchain élimine les intermédiaires</b>

Transfert classique :
Ta banque → Banque correspondante → Banque bénéficiaire
💸 Chaque intermédiaire prend sa commission (2,5-6% total)

Transfert on-chain :
Toi → Blockchain → Destinataire
💸 Frais fixes minimes (~0,5-1% total)

📊 <b>Les preuves :</b>

• <b>Cryptocurrency-based remittance statistics 2025</b>
Les services traditionnels facturent en moyenne 6,5% en frais, contre ~1% pour les stablecoins.

• <b>World Bank (mars 2025)</b>
Coût moyen des transferts traditionnels : 6,49% du montant.

• <b>CFA Institute (2025)</b>
Les investisseurs institutionnels utilisent déjà les stablecoins pour réduire les coûts et temps de règlement.

• <b>McKinsey (2025)</b>
Le volume des transferts transfrontaliers via stablecoins a explosé : infrastructure de paiement moderne.

✅ Légal, sûr, et utilisé par de nombreuses institutions.`,

  // ✅ ÉCRAN 9 : FAQ_SEND_QUESTION (nouveau)
  FAQ_SEND_QUESTION: `📧 POSE TA QUESTION

Envoie-moi ta question et je la transmettrai à l'équipe.

Tu recevras une réponse dans les 24-48h.

<i>Pour annuler, clique sur "Retour"</i>`,

  FAQ_QUESTION_RECEIVED: `✅ QUESTION REÇUE

Merci ! On te répond dans les 24-48h.`,

  // ✅ ÉCRAN 10 : WHAT_IS_EXCHANGE (ajout phrase)
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

C'est réglementé et sûr (si tu choisis des plateformes reconnues).

👉 On va te recommander nos préférés dans les prochains écrans.`,

  // ✅ ÉCRAN 11 : EXCHANGES_EU (reformulé)
  EXCHANGES_EU: `🇪🇺 Exchanges pour déposer/retirer EUR

Nos recommandations :
• Kraken (👋 On utilise) — Virement gratuit, sérieux, USDC dispo
• Bitstamp — Vétéran UE, sérieux, virements supportés

À vérifier : SEPA ok (même avec résidence BR) • USDC dispo • frais raisonnables • réputation

⚠️ Certains exchanges (ex: Binance) n'acceptent que dépôt EUR par carte avec >2% de frais si résidence BR.`,

  // ✅ ÉCRAN 12 : EXCHANGES_BR (reformulé)
  EXCHANGES_BR: `🇧🇷 Exchanges pour déposer/retirer BRL

Notre préférence :
• Binance BR (👋 On utilise aussi) — Pix natif, liquidité énorme, frais bas

Autres solutions :
• Bitso — Pix gratuit et instantané, interface claire, régulé localement
• Mercado Bitcoin — acteur local historique, Pix supporté
• Foxbit — Pix 24/7, frais corrects

À vérifier : Pix ok • USDC dispo • réputation

Nos liens de parrainage financent ce service (gratuits pour toi, parfois bonus).

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

  // ✅ ÉCRAN 13 : Validé tel quel
  GUIDE_TRANSITION: `✅ Tu as (ou tu vas avoir) :
• Un compte 🇪🇺 pour déposer tes EUR (SEPA → USDC)
• Un compte 🇧🇷 pour retirer tes BRL (USDC → Pix)

🌐 Tu fais ton premier pas on-chain.
C'est plus qu'un simple transfert :
• tu découvres une technologie qui change déjà la finance mondiale,
• tu rejoins des millions d'utilisateurs, d'entreprises et d'institutions,
• tu gardes plus de valeur pour toi (et moins pour les intermédiaires 💸).

🚀 Maintenant, on commence concrètement : première étape → déposer tes EUR sur ton compte 🇪🇺 et les convertir en USDC.`,

  // Étapes du guide (inchangées sauf notes finales)
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

Estimation de ton solde : ~R$ ${formatAmount(brlAmount, 2, locale)}
*⚠️ Estimation proche du réel (frais ~0,1%).*`,

  STEP_3_3: (brlNet, locale) => `3️⃣ Retirer ton argent en R$

• Une fois tes USDC vendus, ton solde apparaît en BRL.
• Va dans Retrait / Saque / Withdraw.
• Choisis Pix comme méthode.

👉 Entre ta clé Pix (CPF, email, tel, clé aléatoire)… mais ça, tu sais déjà faire 😉

💡 D'ailleurs : comme pour une adresse crypto, si la clé est fausse, l'argent part au mauvais endroit.

👉 Généralement, les frais sont très bas (ex. Binance ~R$3,50 par retrait Pix).
Ça devrait être gratuit honnêtement… mais bon 😅

Estimation de ton solde reçu : ~R$ ${formatAmount(brlNet, 2, locale)} nets
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

  // Premium et alertes
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

🔄 <b>ABONNEMENTS RÉCURRENTS</b>
Annulable à tout moment via Mercado Pago

💳 <b>Plans disponibles :</b>
• R$ 6/mois (renouvellement mensuel)
• R$ 15/3 mois (économie de 17%)
• R$ 28/6 mois (économie de 22%)
• R$ 50/12 mois (économie de 31%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Les abonnements se renouvellent automatiquement via Mercado Pago.
Tu peux annuler quand tu veux, directement dans l'app Mercado Pago.

❓ Problème avec le paiement ? Utilise le bouton "Aide" ci-dessous.`,

  PREMIUM_ONESHOT_PRICING: `💎 PASSER À PREMIUM

✨ Avec Premium :
• 🔔 Alertes personnalisées illimitées
• 📢 Alertes spontanées régulières
• 🎯 Multi-paires (EUR→BRL + BRL→EUR)
• 📊 Analyses plus poussées
• 🌍 Multi-devises à venir
• ⚡ Accès prioritaire aux nouvelles fonctionnalités

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 <b>PAIEMENT UNIQUE (sans abonnement)</b>

💳 <b>Mercado Pago (BRL)</b>
• R$ 18 - 3 mois
• R$ 32 - 6 mois
• R$ 60 - 12 mois

💳 <b>PayPal (USD)</b>
• $4.50 - 3 mois
• $8 - 6 mois
• $15 - 12 mois

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Paiement unique, accès Premium pour la durée choisie, pas de renouvellement automatique.`,
  
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
  
  text += `\nTu seras notifié dès que ces seuils seront atteints.`;
  
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
  
    ALERT_VIEW_DETAILS:  (alert, currentRate, refValue, calculatedThreshold, locale) => {
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
      
      const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
      
      let text = `🔔 <b>Détails de l'alerte</b>\n\n`;
      
      // Nom si défini
      if (alert.name) {
        text += `<b>Nom :</b> ${alert.name}\n\n`;
      }
      
      text += `<b>Paire :</b> ${pairText}\n`;
      text += `<b>Type :</b> ${typeLabels[alert.threshold_type]}\n`;
      
      if (alert.threshold_type === 'relative') {
        text += `<b>Seuil :</b> +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabels[alert.reference_type]}\n`;
      } else {
        text += `<b>Seuil :</b> ≥ ${formatRate(alert.threshold_value, locale)}\n`;
      }
      
      text += `<b>Cooldown :</b> ${formatCooldown(alert.cooldown_minutes)}\n\n`;
      
      text += `<b>État actuel :</b>\n`;
      text += `• Taux : ${formatRate(currentRate, locale)}\n`;
      
      if (alert.threshold_type === 'relative' && refValue) {
        text += `• ${refLabels[alert.reference_type]} : ${formatRate(refValue, locale)}\n`;
      }
      
      text += `• Seuil alerte : ${formatRate(calculatedThreshold, locale)}\n\n`;
      
      if (currentRate >= calculatedThreshold) {
        text += `🎯 <b>Seuil atteint !</b> Tu devrais être alerté bientôt.`;
      } else {
        const gap = ((calculatedThreshold - currentRate) / currentRate * 100);
        text += `⏳ Encore ${formatAmount(gap, 1, locale)}% avant déclenchement.`;
      }
      
      return text;
    },
    
    ALERT_NAME_PROMPT: `✏️ <b>Nommer l'alerte</b>
    
    Entre un nom pour cette alerte (max 50 caractères) :
    
    <i>Exemple : "Transfert août", "Vacances Brésil", etc.</i>
    
    Ou tape "annuler" pour garder sans nom.`,
    
    ALERT_NAME_TOO_LONG: `⚠️ Nom trop long (max 50 caractères).
    
    Essaie avec un nom plus court.`,
    
    ALERT_NAME_SET: (name) => `✅ Alerte renommée : <b>${name}</b>`,
    
    ALERT_NAME_CANCELLED: `↩️ Opération annulée.`,
  

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

  ALERT_DEEPLINK_GROUP: `🔔 Pour créer une alerte, clique ici pour continuer en privé :`,

ALERT_INVALID_SYNTAX: `❌ Format invalide

<b>Exemples :</b>
/alert 6.30        → Alerte EUR→BRL ≥ 6.30
/alert +3%         → Alerte EUR→BRL +3% vs moy. 30j
/alert brl 0.165   → Alerte BRL→EUR ≥ 0.165
/alert brl +5%     → Alerte BRL→EUR +5% vs moy. 30j`,

ALERT_CREATED_QUICK: (alert, currentRate, refValue, calculatedThreshold, locale) => {
  const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
  
  let text = `✅ <b>Alerte créée</b>

${pairText}`;

  if (alert.threshold_type === 'absolute') {
    text += ` ≥ ${formatRate(alert.threshold_value, locale)}`;
  } else {
    text += ` +${formatAmount(alert.threshold_value, 1, locale)}% vs moy. 30j`;
  }
  
  text += `\n⏰ Cooldown : 1h

<b>État actuel :</b>
• Taux : ${formatRate(currentRate, locale)}`;

  if (refValue) {
    text += `\n• Moy. 30j : ${formatRate(refValue, locale)}`;
  }
  
  text += `\n• Seuil : ${formatRate(calculatedThreshold, locale)}`;
  
  return text;
},

NOT_PREMIUM_ALERTS: `🔒 Aucune alerte active

Les utilisateurs Premium peuvent créer des alertes illimitées.

💎 Avec Premium :
• Alertes personnalisées
• Multi-paires
• Analyses avancées

Prix : à partir de 5 R$/mois`,





CONVERT_ASK_AMOUNT: "💱 Quel montant veux-tu convertir?\n\nExemple: 253 ou 1500 brl",
RATE_LABEL: "Taux", // ou "Taxa" (PT), "Rate" (EN)
BETTER_BY: "meilleur de", // ou "melhor em" (PT), "better by" (EN)

btn: {
  langFR: '🇫🇷 Français',
  langPT: '🇧🇷 Português',
  langEN: '🇬🇧 English',
  about: 'ℹ️ À propos',
  eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
  brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (SEPA) · R$ ${formatAmount(amt, 0, locale)}`,
  
  // ✅ Boutons renommés (Écran 3)
  contOn: '🚀 Convertir on-chain',
  stayOff: '🏦 Convertir off-chain',
  calcdetails: '🔍 Détails du calcul on-chain',
  swapMode: '🔄 Inverser',
  change: '✏️ Changer montant',
  
  back: '⬅️ Retour',
  sources: '📊 Sources des données',
  openWise: '🔗 Ouvrir Wise',
  openRemitly: '🔗 Ouvrir Remitly',
  openInstarem: '🔗 Ouvrir Instarem',
  seeOnchain: '🚀 Voir route on-chain',
  
  // ✅ Nouveaux boutons (Écran 6)
  createEU: '🇪🇺 Créer compte Europe',
  createBR: '🇧🇷 Créer compte Brésil',
  startGuide: '🚀 Démarrer le guide',
  faqDoubt: "🤔 Un doute ?",
  whyOnchain: "💡 Pourquoi on-chain ?",
  askQuestion: '💬 Poser une question',
  
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
  
  // ✅ Nouveau bouton skip (Écran 14)
  skipToStep2: "J'ai déjà des USDC (skip)",
  skipToStep3: "⏭️ Passer à l'étape 3",
  
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
  seeOneshot: '💰 Ou essaie sans abonnement →',
  backToSubscriptions: '⬅️ Retour aux abonnements',

  // Subscription plans (recurring)
  subMPMonthly: '💳 R$ 6/mois',
  subMPQuarterly: '💳 R$ 15/3 mois (-17%)',
  subMPSemiannual: '💳 R$ 28/6 mois (-22%)',
  subMPAnnual: '💳 R$ 50/12 mois (-31%)',
  subPPQuarterly: '💳 €4/3 mois',
  subPPSemiannual: '💳 €7/6 mois',
  subPPAnnual: '💳 €12/12 mois',

  // One-shot plans
  oneshot3m: '💰 R$ 18 - 3 mois',
  oneshot6m: '💰 R$ 32 - 6 mois',
  oneshot12m: '💰 R$ 60 - 12 mois',
  oneshotPP3m: '💰 $4.50 - 3 mois',
  oneshotPP6m: '💰 $8 - 6 mois',
  oneshotPP12m: '💰 $15 - 12 mois',

  premiumDetails: 'ℹ️ Voir toutes les fonctionnalités',
  createAlert: '➕ Créer une alerte',
  myAlerts: '🔔 Mes alertes',
  conservative: '🛡️ Conservateur',
  balanced: '⚖️ Équilibré',
  aggressive: '🎯 Opportuniste',
  custom: '✏️ Personnalisé',
  disableAlert: '🔕 Désactiver',
  editAlert: '✏️ Modifier',
  relativeAlert:'📊 Relatif (+X%)',
  absoluteAlert:'🎯 Absolu (valeur fixe)',

  refCurrent: (rate, locale) => `💵 Taux actuel (${formatRate(rate, locale)})`,
refAvg7d:   (rate, locale) => `📈 Moyenne 7j (${formatRate(rate, locale)})`,
refAvg30d:  (rate, locale) => `📊 Moyenne 30j (${formatRate(rate, locale)}) ⭐`,
refAvg90d:  (rate, locale) => `📉 Moyenne 90j (${formatRate(rate, locale)})`,

  backToPricing: '⬅️ Retour aux tarifs',
  chooseCooldown15: '⚡ 15 minutes',
  chooseCooldown1h: '⏱️ 1 heure ⭐',
  chooseCooldown6h: '⏰ 6 heures',
  chooseCooldown24h: '📅 24 heures',
  chooseCooldown1week: '📆 1 semaine',
  deleteAlert: '🗑️ Supprimer',
  viewAlert: '👁️ Voir détails',

  // ✅ Boutons supplémentaires pour cohérence linguistique
  pairEurBrl: '🇪🇺 EUR → 🇧🇷 BRL',
  pairBrlEur: '🇧🇷 BRL → 🇪🇺 EUR',
  compareNow: '🚀 Comparer maintenant',
  editMyAlert: '⚙️ Modifier mon alerte',
  deleteMyAlert: '🗑️ Supprimer cette alerte',
  help: '❓ Aide',
  paymentHelp: '💬 Aide pour le paiement',
  mainMenu: '🏠 Menu principal',
  compare: '💱 Comparer',

  // Boutons Premium avec prix (pour keyboards.js)
  plan3months: '📅 3 mois - R$ 15,00',
  plan6months: '📅 6 mois - R$ 28,00 (-7%)',
  plan12months: '📅 12 mois - R$ 50,00 (-17%)',
  renewPlan3months: '🔄 Prolonger 3 mois - R$ 15,00',
  renewPlan6months: '🔄 Prolonger 6 mois - R$ 28,00 (-7%)',
  renewPlan12months: '🔄 Prolonger 12 mois - R$ 50,00 (-17%)',
}
};