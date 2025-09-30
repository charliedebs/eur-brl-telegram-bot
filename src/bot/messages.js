// English
const en = {
    INTRO_TEXT: `👋 Hi!
  
  🌐 Choose your language · Choisis ta langue · Escolha o idioma`,
  
    ABOUT_TEXT: `💡 About
  
  This bot compares EUR↔BRL rates and guides you through on-chain transfers (via blockchain).
  
  On-chain rates are often better than traditional platforms. It's legal, secure, and used by many institutions.
  
  Free service, funded by referral links.`,
  
    promptAmt: `💬 Send an amount or choose:`,
    
    askRoute: (amount, locale) => `What do you want to do with ${formatAmount(amount, 0, locale)}?`,
    
    buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, winner, locale }) => {
      const title = route === 'eurbrl' ? '💱 EUR → BRL' : '💱 BRL → EUR';
      const ref = `📊 Ref. ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}`;
      
      const onchainLine = route === 'eurbrl'
        ? `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`
        : `🌍 On-chain\nR${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
      
      const bankLine = route === 'eurbrl'
        ? `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `🏦 ${bestBank.provider}\nR${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
      
      let othersText = '';
      if (others.length > 0) {
        const othersList = others.map(p => 
          route === 'eurbrl' 
            ? `${p.provider} R${formatAmount(p.out, 0, locale)}`
            : `${p.provider} €${formatAmount(p.out, 2, locale)}`
        ).join(' • ');
        othersText = `\n\nOthers: ${othersList}`;
      }
      
      const sign = delta >= 0 ? '+' : '−';
      const deltaText = `\n\n✅ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
      
      return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
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
  
  Referral links: free for you, fund this service.`,
  
    buildOffChain: ({ route, amount, bestBank, others, locale }) => {
      const title = '🏦 Off-chain';
      
      const bestLine = route === 'eurbrl'
        ? `Best: ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `Best: ${bestBank.provider}\nR${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
      
      let othersText = '';
      if (others.length > 0) {
        othersText = '\n\nOther options:\n' + others.map(p => {
          if (route === 'eurbrl') {
            return `• ${p.provider}: R${formatAmount(p.out, 0, locale)} (${formatRate(p.rate, locale)})`;
          } else {
            return `• ${p.provider}: €${formatAmount(p.out, 2, locale)} (${formatRate(p.rate, locale)})`;
          }
        }).join('\n');
      }
      
      return `${title}\n\n${bestLine}${othersText}\n\n💡 Usually a bit more expensive than on-chain, but some prefer these solutions for their simplicity.\n\n✅ Regulated and trustworthy platforms. If you don't have an account yet, use our referral links: it's free for you, funds the service (and you might even get bonuses).\n\n<i>Data provided by Wise Comparisons</i>`;
    },
  
    ONCHAIN_INTRO: `🚀 On-Chain Route
  
  This is the method we use ourselves — and the reason this bot exists. We recommend it because it eliminates the unnecessary: fewer intermediaries, lower fees, more transparency.
  
  🔄 Simple steps:
  1️⃣ Europe → exchange your EUR → USDC (stablecoin)
  2️⃣ Blockchain → send your USDC (fast, low cost)
  3️⃣ Brazil → convert your USDC to BRL, received via Pix
  
  ℹ️ You need:
  • an exchange account 🇪🇺 in Europe
  • an exchange account 🇧🇷 in Brazil
  
  💡 Traditional transfers can cost between 2.5% and 6%, or more — while via blockchain, you can limit this to 0-1% (we'll show you some sources to prove it!).`,
  
    SOURCES_PROOF: `📊 Proof & sources (2025)
  
  💡 Why do we say blockchain is often much cheaper?
  
  • 💱 Cryptocurrency-based remittance statistics 2025: traditional services apply an average of 6.5% fees, while crypto transfers (stablecoins, etc.) can cost as little as 1%.
  
  • 📈 Global Remittance Prices – World Bank: in March 2025, the average cost of traditional transfers is 6.49% of the amount sent.
  
  • 🔍 CFA Institute — "Blockchain in FX and Remittances" (2025): institutional investors already use stablecoins to reduce settlement times, lower costs, and manage risks on cross-border transfers.
  
  • 📊 McKinsey – "The stable door opens: tokenized cash / stablecoins" (2025): the volume of cross-border remittances using stablecoins has grown rapidly, and stablecoins are increasingly considered as modern payment infrastructure.`,
  
    EXCHANGES_EU: `🇪🇺 Exchanges in Europe
  
  Our preference:
  • Kraken — Simple/free SEPA, reliable, USDC available. (👋 It's what we use too)
  
  Other solutions:
  • Binance (EU) — very liquid, fees ~0.10%
    ⚠️ If you choose Binance on 🇪🇺 side, you'll need another exchange on 🇧🇷 side
  • Bitvavo — Free SEPA, simple UX, low fees
  • Bitstamp — EU veteran, reliable
  • Coinbase Advanced — simple but higher fees
  
  Check: SEPA ok • USDC available • reasonable fees • reputation
  
  Our referral links fund the service (free for you, sometimes bonuses).`,
  
    EXCHANGES_BR: `🇧🇷 Exchanges in Brazil
  
  Our preference:
  • Binance BR — Native Pix, huge liquidity, low fees (~0.10%) + R$3.50 fixed per Pix withdrawal. (👋 It's what we use too)
  
  Other solutions:
  • Bitso — Free and instant Pix, clear interface, locally regulated
  • Mercado Bitcoin — historic local player, Pix supported
  • Foxbit — Pix 24/7, fair fees
  
  Check: Pix ok • USDC available • reasonable fees • reputation
  
  Our referral links fund the service (free for you, sometimes bonuses).
  
  ⚠️ Reminder: one exchange serves one side. You need 🇪🇺 (SEPA) + 🇧🇷 (Pix).`,
  
    WHAT_IS_USDC: `🪙 What is USDC?
  
  USDC = USD Coin, a "stablecoin" (stable crypto).
  
  In practice:
  • 1 USDC always worth ~1 US dollar
  • Issued by Circle (regulated US company)
  • Reserves verified regularly
  • Accepted on all major exchanges
  
  Why do we choose USDC?
  • MiCA compliant (European crypto-asset regulation)
  • Legally and easily usable in Europe
  • Unlike Bitcoin which fluctuates, USDC remains stable
  
  Perfect for transferring money without variation risk.
  
  You use it as a "pivot currency": EUR → USDC → BRL.`,
  
    WHAT_IS_EXCHANGE: `🏦 What is an exchange?
  
  A crypto exchange is like a digital currency exchange.
  
  You can:
  • Deposit classic money (EUR, BRL...)
  • Buy/sell cryptos (USDC, Bitcoin...)
  • Send them to other exchanges
  
  Most known: Kraken, Binance, Coinbase, Bitso...
  
  For our case:
  • Europe exchange = you deposit EUR, buy USDC
  • Brazil exchange = you receive USDC, sell them for BRL, withdraw via Pix
  
  It's regulated and safe (if you choose recognized platforms).`,
  
    MARKET_VS_LIMIT: `📈 Market vs Limit
  
  <b>Market</b>:
  • Immediate execution at current price
  • Simple and fast
  • Recommended for beginners
  
  <b>Limit</b>:
  • You set YOUR buy/sell price
  • Order executes only if market reaches your price
  • Useful for large amounts or optimizing rate
  
  <i>Tip: if you just want to "exchange", choose Market.</i>`,
  
    GUIDE_TRANSITION: `✅ You have (or will have):
  • A 🇪🇺 account to deposit your EUR (SEPA → USDC)
  • A 🇧🇷 account to withdraw your BRL (USDC → Pix)
  
  🌐 You're taking your first on-chain step.
  It's more than a simple transfer:
  • you discover a technology already changing global finance,
  • you join millions of users, companies and institutions,
  • you keep more value for yourself (and less for intermediaries 💸).
  
  🚀 Now, let's start concretely: first step → deposit your EUR on your 🇪🇺 account and convert them to USDC.`,
  
    STEP_1_1: (amount, locale) => `<b>1️⃣ Deposit your EUR on your exchange account</b>
  
  • Go to "Deposit / Fiat" section.
  • Choose EUR as currency.
  • Simplest method: SEPA transfer (fast, low or no fees).
  
  💡 <i>"Fiat" = classic currencies (EUR, USD, BRL…).</i>
  
  👉 Recommended: Kraken.
  
  <b>Balance estimate:</b> €${formatAmount(amount, 0, locale)}
  <i>⚠️ This is an estimate, close to reality. Bank fees and delays may vary slightly.</i>`,
  
    STEP_1_2: (amount, locale) => `<b>2️⃣ Access the market to buy USDC</b>
  
  • In your exchange, look for "Trader / Market / Trade".
  • Select the EUR/USDC pair.
  
  💡 <i>A crypto market is like a currency exchange: you swap one currency for another.</i>
  
  <b>Balance estimate:</b> €${formatAmount(amount, 0, locale)} (ready to buy USDC)
  <i>⚠️ Indicative estimate.</i>`,
  
    STEP_1_3: (usdcAmount, locale) => `<b>3️⃣ Buy your USDC</b>
  
  • Choose order type:
    • <b>Market</b> → instant, simple, recommended.
    • <b>Limit</b> → you set your price, useful for large amounts/liquidity.
  
  👉 To start: market order.
  
  <b>Balance estimate:</b> ~${formatAmount(usdcAmount, 2, locale)} USDC
  <i>⚠️ Close to reality estimate. Fees & prices may vary slightly.</i>`,
  
    STEP_1_4: `✅ <b>Well done!</b> You now have USDC in your 🇪🇺 account.
  
  ✨ USDC are "stablecoins": ~1 USDC = 1 USD.
  It's the key to transfer your money quickly and cheaply.
  
  <b>Next step:</b> send them on-chain to Brazil.`,
  
    STEP_2_1: `✨ This is the "on-chain" step → fast and cheap, but requires some focus.
  <i>Unlike a bank, if you make a mistake, there's no customer service to recover your funds.</i>
  
  <b>1️⃣ Get your 🇧🇷 deposit address</b>
  
  • In your Brazilian exchange, look for "Deposit / Crypto".
  • Choose USDC as crypto to deposit.
  • Select the transfer network.
  
  💡 <i>We recommend Polygon (MATIC) → fast, reliable, low fees (~1 USDC).</i>
  
  • Copy the address carefully.
  
  💡 <i>Think of it like your bank IBAN, but blockchain version (a long string of letters and numbers).</i>`,
  
    STEP_2_2: (usdcAmount, locale) => `<b>2️⃣ Send from your 🇪🇺 exchange</b>
  
  • Go to "Withdraw" → USDC.
  • Paste the copied address.
  • Choose the same network as the deposit (e.g. Polygon).
  
  💡 <i>The network is like train tracks: if they're not the same on both sides, the money goes elsewhere and is lost.</i>
  
  • Enter your amount. You can send all, or start with a test (e.g. 10 USDC).
  
  👉 <i>The test costs a bit more (fixed fees ~1 USDC apply twice), but it's a common good practice in crypto.</i>
  
  <b>Estimate:</b> you'll receive ~${formatAmount(usdcAmount - 1, 2, locale)} USDC on 🇧🇷 side
  <i>⚠️ Close to reality estimate (network fee ~1 USDC).</i>`,
  
    STEP_2_3: `<b>3️⃣ Verify and confirm</b>
  
  • Reread the address and network carefully before validating.
  
  ⚠️ <b>One wrong character in the address, or wrong network, and your funds are permanently lost.</b>
  
  👉 Once you've checked carefully, you can confirm the transfer.`,
  
    STEP_2_4: `<b>4️⃣ Wait for arrival</b>
  
  • Generally, the transaction takes 1–2 minutes, sometimes up to 10 min.
  • You'll see your USDC balance appear on 🇧🇷 side.
  
  ✅ <b>Result:</b> your USDC arrived → ready for step 3 (BRL sale + Pix withdrawal).`,
  
    STEP_3_1: `<b>1️⃣ Find the USDC/BRL market 🇧🇷</b>
  
  • In your Brazilian exchange, go to Trader / Market.
  • Select the USDC/BRL pair.
  
  👉 Next step: your USDC finally transform into BRL 🎉`,
  
    STEP_3_2: (brlAmount, locale) => `<b>2️⃣ Place your order</b>
  
  • <b>"Market"</b> → instant, at current price (simple, recommended).
  • <b>"Limit"</b> → you set your price, useful for large amounts.
  
  👉 For most people, "market order" = simplest and fastest.
  
  <b>Balance estimate:</b> ~R${formatAmount(brlAmount, 2, locale)}
  <i>⚠️ Close to reality estimate (fees ~0.10–0.20%).</i>`,
  
    STEP_3_3: (brlNet, locale) => `<b>3️⃣ Withdraw your money in R$</b>
  
  • Once your USDC are sold, your balance appears in BRL.
  • Go to Withdraw.
  • Choose Pix as method.
  
  👉 Enter your Pix key (CPF, email, phone, random key)… but you already know how to do that 😉
  
  💡 <i>By the way: like a crypto address, if the key is wrong, money goes to the wrong place.</i>
  
  👉 Usually, fees are very low (e.g. Binance ~R$3.50 per Pix withdrawal).
  <i>Should be free honestly… but oh well 😅</i>
  
  <b>Received balance estimate:</b> ~R${formatAmount(brlNet, 2, locale)} net
  <i>⚠️ Come on, we shouldn't be too far from reality ;)</i>`,
  
    WHY_NOT_EXACT: `🤔 Why can't we give you the exact amount?
  
  Variables that move in real time:
  
  • Exchange fees: can vary based on your user profile, trading volume, or occasional promotions (but always low).
  
  • Network fees: fluctuate based on blockchain network congestion (~1 USDC average on Polygon, but can vary).
  
  • Exchange rate: crypto markets move in real time, even if USDC stays stable, the USDC/BRL rate can fluctuate slightly between when you calculate and when you execute.
  
  Our estimates are conservative and close to reality. You shouldn't have any bad surprises.`,
  
    STEP_3_4: `✅ Your transfer is complete!
  
  • You converted your EUR to USDC on 🇪🇺 side.
  • You sent them on-chain.
  • You sold them for BRL and withdrew via Pix on 🇧🇷 side.
  
  ✨ Result: fast, secure and low cost.
  
  🌍 You just made a real blockchain passage.
  What you learned today will be increasingly used in the future: you're ahead of the curve.
  
  🙌 We hope you enjoyed the experience!`,
  
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
    },
  };
  
  export const messages = { fr, pt, en };import { formatAmount, formatRate, getLocale } from '../services/rates.js';
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
    STEP_1_1: (amount, locale) => `<b>1️⃣ Déposer tes EUR sur ton compte exchange</b>
  
  • Va dans la section "Dépôt / Deposit / Fiat".
  • Choisis EUR comme devise.
  • Méthode la plus simple : virement SEPA (rapide, frais bas ou nuls).
  
  💡 <i>"Fiat" = les monnaies classiques (EUR, USD, BRL…).</i>
  
  👉 Recommandé : Kraken.
  
  <b>Estimation de ton solde :</b> €${formatAmount(amount, 0, locale)}
  <i>⚠️ C'est une estimation, proche du réel. Les frais et délais bancaires peuvent légèrement varier.</i>`,
  
    STEP_1_2: (amount, locale) => `<b>2️⃣ Accéder au marché pour acheter USDC</b>
  
  • Dans ton exchange, cherche "Trader / Marché / Trade".
  • Sélectionne la paire EUR/USDC.
  
  💡 <i>Un marché crypto, c'est comme un bureau de change : tu échanges une monnaie contre une autre.</i>
  
  <b>Estimation de ton solde :</b> €${formatAmount(amount, 0, locale)} (prêt pour achat USDC)
  <i>⚠️ Estimation indicative.</i>`,
  
    STEP_1_3: (usdcAmount, locale) => `<b>3️⃣ Acheter tes USDC</b>
  
  • Choisis le type d'ordre :
    • <b>Au marché (Market)</b> → instantané, simple, recommandé.
    • <b>Limite (Limit)</b> → tu fixes ton prix, utile pour grosses sommes/liquidité.
  
  👉 Pour débuter : ordre au marché.
  
  <b>Estimation de ton solde :</b> ~${formatAmount(usdcAmount, 2, locale)} USDC
  <i>⚠️ Estimation proche du réel. Les frais & prix peuvent légèrement varier.</i>`,
  
    STEP_1_4: `✅ <b>Bien joué !</b> Tu as maintenant des USDC dans ton compte 🇪🇺.
  
  ✨ Les USDC sont des "stablecoins" : ~1 USDC = 1 USD.
  C'est la clé pour transférer ton argent de manière rapide et peu coûteuse.
  
  <b>Prochaine étape :</b> les envoyer on-chain vers le Brésil.`,
  
    // Étape 2 : Transfert on-chain
    STEP_2_1: `✨ C'est l'étape "on-chain" → rapide et peu coûteuse, mais demande un peu de concentration.
  <i>Contrairement à une banque, si tu fais une erreur, il n'y a pas de SAV pour récupérer tes fonds.</i>
  
  <b>1️⃣ Récupérer ton adresse de dépôt 🇧🇷</b>
  
  • Dans ton exchange brésilien, cherche "Dépôt / Crypto".
  • Choisis USDC comme crypto à déposer.
  • Sélectionne le réseau de transfert.
  
  💡 <i>Nous recommandons Polygon (MATIC) → rapide, fiable, frais bas (~1 USDC).</i>
  
  • Copie soigneusement l'adresse.
  
  💡 <i>Imagine que c'est comme ton IBAN bancaire, mais version blockchain (une longue suite de lettres et chiffres).</i>`,
  
    STEP_2_2: (usdcAmount, locale) => `<b>2️⃣ Envoyer depuis ton exchange 🇪🇺</b>
  
  • Va dans "Retrait / Withdraw" → USDC.
  • Colle l'adresse copiée.
  • Choisis le même réseau que celui du dépôt (ex. Polygon).
  
  💡 <i>Le réseau, c'est comme les rails d'un train : si ce n'est pas les mêmes des deux côtés, l'argent part ailleurs et il est perdu.</i>
  
  • Indique ton montant. Tu peux tout envoyer, ou commencer par un test (ex. 10 USDC).
  
  👉 <i>Le test coûte un peu plus cher (frais fixes ~1 USDC s'appliquent deux fois), mais c'est une bonne pratique courante en crypto.</i>
  
  <b>Estimation :</b> tu recevras ~${formatAmount(usdcAmount - 1, 2, locale)} USDC côté 🇧🇷
  <i>⚠️ Estimation proche du réel (frais réseau ~1 USDC).</i>`,
  
    STEP_2_3: `<b>3️⃣ Vérifier et confirmer</b>
  
  • Relis attentivement l'adresse et le réseau avant de valider.
  
  ⚠️ <b>Un seul caractère faux dans l'adresse, ou un mauvais réseau, et tes fonds sont définitivement perdus.</b>
  
  👉 Une fois que tu as bien vérifié, tu peux confirmer le transfert.`,
  
    STEP_2_4: `<b>4️⃣ Attendre l'arrivée</b>
  
  • En général, la transaction prend 1–2 minutes, parfois jusqu'à 10 min.
  • Tu verras ton solde USDC apparaître côté 🇧🇷.
  
  ✅ <b>Résultat :</b> tes USDC sont arrivés → prêt pour l'étape 3 (vente en BRL + retrait Pix).`,
  
    // Étape 3 : Vente USDC & Pix
    STEP_3_1: `<b>1️⃣ Trouver le marché USDC/BRL 🇧🇷</b>
  
  • Dans ton exchange brésilien, va dans Trader / Mercado / Marché.
  • Sélectionne la paire USDC/BRL.
  
  👉 Prochaine étape : tes USDC se transforment enfin en BRL 🎉`,
  
    STEP_3_2: (brlAmount, locale) => `<b>2️⃣ Passer ton ordre</b>
  
  • <b>"Au marché / Market"</b> → instantané, au prix actuel (simple, recommandé).
  • <b>"Limite / Limit"</b> → tu fixes ton prix, utile pour grosses sommes.
  
  👉 Pour la plupart des gens, "ordre au marché" = le plus simple et rapide.
  
  <b>Estimation de ton solde :</b> ~R${formatAmount(brlAmount, 2, locale)}
  <i>⚠️ Estimation proche du réel (frais ~0,10–0,20%).</i>`,
  
    STEP_3_3: (brlNet, locale) => `<b>3️⃣ Retirer ton argent en R$</b>
  
  • Une fois tes USDC vendus, ton solde apparaît en BRL.
  • Va dans Retrait / Saque / Withdraw.
  • Choisis Pix comme méthode.
  
  👉 Entre ta clé Pix (CPF, email, tel, clé aléatoire)… mais ça, tu sais déjà faire 😉
  
  💡 <i>D'ailleurs : comme pour une adresse crypto, si la clé est fausse, l'argent part au mauvais endroit.</i>
  
  👉 Généralement, les frais sont très bas (ex. Binance ~R$3,50 par retrait Pix).
  <i>Ça devrait être gratuit honnêtement… mais bon 😅</i>
  
  <b>Estimation de ton solde reçu :</b> ~R${formatAmount(brlNet, 2, locale)} nets
  <i>⚠️ Allez, on ne devrait pas être trop loin de la réalité ;)</i>`,
  
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
  
  // Portuguese (Brazilian)
  const pt = {
    INTRO_TEXT: `👋 Oi !
  
  🌐 Escolha o idioma · Choisis ta langue · Choose your language`,
  
    ABOUT_TEXT: `💡 Sobre
  
  Este bot compara taxas EUR↔BRL e te guia em transferências on-chain (via blockchain).
  
  As taxas on-chain costumam ser melhores que as plataformas tradicionais. É legal, seguro e usado por muitas instituições.
  
  Serviço gratuito, financiado por links de indicação.`,
  
    promptAmt: `💬 Envie um valor ou escolha:`,
    
    askRoute: (amount, locale) => `O que você quer fazer com ${formatAmount(amount, 0, locale)}?`,
    
    buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, winner, locale }) => {
      const title = route === 'eurbrl' ? '💱 EUR → BRL' : '💱 BRL → EUR';
      const ref = `📊 Ref. ${formatRate(rates.cross, locale)} • ${new Date().toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}`;
      
      const onchainLine = route === 'eurbrl'
        ? `🌍 On-chain\n€${formatAmount(amount, 0, locale)} → R${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`
        : `🌍 On-chain\nR${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(onchain.rate, locale)})`;
      
      const bankLine = route === 'eurbrl'
        ? `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `🏦 ${bestBank.provider}\nR${formatAmount(amount, 0, locale)} → €${formatAmount(onchain.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
      
      let othersText = '';
      if (others.length > 0) {
        const othersList = others.map(p => 
          route === 'eurbrl' 
            ? `${p.provider} R${formatAmount(p.out, 0, locale)}`
            : `${p.provider} €${formatAmount(p.out, 2, locale)}`
        ).join(' • ');
        othersText = `\n\nOutros: ${othersList}`;
      }
      
      const sign = delta >= 0 ? '+' : '−';
      const deltaText = `\n\n✅ ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
      
      return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
    },
  
    SOURCES_TEXT: `📊 Fontes dos dados
  
  Taxa de referência EUR/BRL: Yahoo Finance (taxa de câmbio oficial)
  
  Cálculo on-chain:
  • Taxas crypto: CoinGecko (USDC/EUR, USDC/BRL)
  • Taxas reais incluídas:
    - Trading ~0,1-0,2%
    - Rede Polygon ~1 USDC
    - Saque Pix ~R$3,50
  
  Taxas off-chain: API Wise Comparisons (taxas ao vivo dos providers)
  
  Links de indicação: gratuitos para você, financiam o serviço.`,
  
    buildOffChain: ({ route, amount, bestBank, others, locale }) => {
      const title = '🏦 Off-chain';
      
      const bestLine = route === 'eurbrl'
        ? `Melhor: ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`
        : `Melhor: ${bestBank.provider}\nR${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
      
      let othersText = '';
      if (others.length > 0) {
        othersText = '\n\nOutras opções:\n' + others.map(p => {
          if (route === 'eurbrl') {
            return `• ${p.provider}: R${formatAmount(p.out, 0, locale)} (${formatRate(p.rate, locale)})`;
          } else {
            return `• ${p.provider}: €${formatAmount(p.out, 2, locale)} (${formatRate(p.rate, locale)})`;
          }
        }).join('\n');
      }
      
      return `${title}\n\n${bestLine}${othersText}\n\n💡 Geralmente um pouco mais caro que on-chain, mas alguns preferem essas soluções pela simplicidade.\n\n✅ Plataformas regulamentadas e confiáveis. Se você ainda não tem conta, use nossos links de indicação: é gratuito para você, financia o serviço (e você pode até ganhar bônus).\n\n<i>Dados fornecidos por Wise Comparisons</i>`;
    },
  
    ONCHAIN_INTRO: `🚀 Rota On-Chain
  
  É o método que nós mesmos usamos — e a razão pela qual este bot existe. Recomendamos porque elimina o supérfluo: menos intermediários, menos taxas, mais transparência.
  
  🔄 Etapas simples:
  1️⃣ Europa → troque seus EUR → USDC (stablecoin)
  2️⃣ Blockchain → envie seus USDC (rápido, baixo custo)
  3️⃣ Brasil → transforme seus USDC em BRL, recebidos por Pix
  
  ℹ️ Você precisa de:
  • uma conta exchange 🇪🇺 na Europa
  • uma conta exchange 🇧🇷 no Brasil
  
  💡 As transferências clássicas podem custar entre 2,5% e 6%, ou mais — enquanto via blockchain, você pode limitar isso a 0-1% (vamos te mostrar algumas fontes para provar!).`,
  
    SOURCES_PROOF: `📊 Provas e fontes (2025)
  
  💡 Por que dizemos que blockchain costuma ser bem mais barato?
  
  • 💱 Cryptocurrency-based remittance statistics 2025: serviços tradicionais aplicam em média 6,5% de taxas, enquanto transferências crypto (stablecoins, etc.) podem custar apenas 1%.
  
  • 📈 Global Remittance Prices – World Bank: em março de 2025, o custo médio de transferências por vias tradicionais é de 6,49% do valor enviado.
  
  • 🔍 CFA Institute — "Blockchain in FX and Remittances" (2025): investidores institucionais já usam stablecoins para reduzir tempos de liquidação, diminuir custos e gerenciar riscos em transferências cross-border.
  
  • 📊 McKinsey – "The stable door opens: tokenized cash / stablecoins" (2025): o volume de envios transfronteiriços usando stablecoins aumentou rapidamente, e stablecoins são cada vez mais considerados como infraestrutura de pagamento moderna.`,
  
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
  • Binance BR — Pix nativo, liquidez enorme, taxas baixas (~0,10%) + R$3,50 fixos por saque Pix. (👋 É o que usamos também)
  
  Outras soluções:
  • Bitso — Pix gratuito e instantâneo, interface clara, regulado localmente
  • Mercado Bitcoin — ator local histórico, Pix suportado
  • Foxbit — Pix 24/7, taxas corretas
  
  Verificar: Pix ok • USDC disponível • taxas razoáveis • reputação
  
  Nossos links de indicação financiam o serviço (gratuitos para você, às vezes bônus).
  
  ⚠️ Lembrete: um exchange serve para um lado. Você precisa de 🇪🇺 (SEPA) + 🇧🇷 (Pix).`,
  
    WHAT_IS_USDC: `🪙 O que é USDC?
  
  USDC = USD Coin, uma "stablecoin" (crypto estável).
  
  Na prática:
  • 1 USDC sempre vale ~1 dólar americano
  • Emitido pela Circle (empresa regulada nos EUA)
  • Reservas verificadas regularmente
  • Aceito em todas as exchanges principais
  
  Por que escolhemos USDC?
  • Conforme com MiCA (regulamentação europeia de cripto-ativos)
  • Utilizável legalmente e simplesmente na Europa
  • Ao contrário do Bitcoin que flutua, USDC permanece estável
  
  Perfeito para transferir dinheiro sem risco de variação.
  
  Você o usa como "moeda pivô": EUR → USDC → BRL.`,
  
    WHAT_IS_EXCHANGE: `🏦 O que é um exchange?
  
  Um exchange crypto é como uma casa de câmbio digital.
  
  Você pode:
  • Depositar dinheiro clássico (EUR, BRL...)
  • Comprar/vender cryptos (USDC, Bitcoin...)
  • Enviá-los para outros exchanges
  
  Os mais conhecidos: Kraken, Binance, Coinbase, Bitso...
  
  Para nosso caso:
  • Exchange Europa = você deposita EUR, compra USDC
  • Exchange Brasil = você recebe USDC, vende em BRL, saca via Pix
  
  É regulamentado e seguro (se escolher plataformas reconhecidas).`,
  
    MARKET_VS_LIMIT: `📈 Market vs Limit
  
  <b>Market (ao mercado)</b>:
  • Execução imediata ao preço atual
  • Simples e rápido
  • Recomendado para iniciantes
  
  <b>Limit (limite)</b>:
  • Você fixa SEU preço de compra/venda
  • A ordem executa apenas se o mercado atingir seu preço
  • Útil para grandes valores ou otimizar a taxa
  
  <i>Dica: se você quer "apenas trocar", escolha Market.</i>`,
  
    GUIDE_TRANSITION: `✅ Você tem (ou vai ter):
  • Uma conta 🇪🇺 para depositar seus EUR (SEPA → USDC)
  • Uma conta 🇧🇷 para sacar seus BRL (USDC → Pix)
  
  🌐 Você está dando seu primeiro passo on-chain.
  É mais que uma simples transferência:
  • você descobre uma tecnologia que já muda as finanças mundiais,
  • você se junta a milhões de usuários, empresas e instituições,
  • você guarda mais valor para você (e menos para os intermediários 💸).
  
  🚀 Agora, começamos concretamente: primeira etapa → depositar seus EUR na sua conta 🇪🇺 e convertê-los em USDC.`,
  
    STEP_1_1: (amount, locale) => `<b>1️⃣ Depositar seus EUR na sua conta exchange</b>
  
  • Vá na seção "Depósito / Deposit / Fiat".
  • Escolha EUR como moeda.
  • Método mais simples: transferência SEPA (rápida, taxas baixas ou nulas).
  
  💡 <i>"Fiat" = as moedas clássicas (EUR, USD, BRL…).</i>
  
  👉 Recomendado: Kraken.
  
  <b>Estimativa do seu saldo:</b> €${formatAmount(amount, 0, locale)}
  <i>⚠️ É uma estimativa, próxima do real. As taxas e prazos bancários podem variar ligeiramente.</i>`,
  
    STEP_1_2: (amount, locale) => `<b>2️⃣ Acessar o mercado para comprar USDC</b>
  
  • No seu exchange, procure "Trader / Mercado / Trade".
  • Selecione o par EUR/USDC.
  
  💡 <i>Um mercado crypto é como uma casa de câmbio: você troca uma moeda por outra.</i>
  
  <b>Estimativa do seu saldo:</b> €${formatAmount(amount, 0, locale)} (pronto para comprar USDC)
  <i>⚠️ Estimativa indicativa.</i>`,
  
    STEP_1_3: (usdcAmount, locale) => `<b>3️⃣ Comprar seus USDC</b>
  
  • Escolha o tipo de ordem:
    • <b>Ao mercado (Market)</b> → instantâneo, simples, recomendado.
    • <b>Limite (Limit)</b> → você fixa seu preço, útil para grandes valores/liquidez.
  
  👉 Para começar: ordem ao mercado.
  
  <b>Estimativa do seu saldo:</b> ~${formatAmount(usdcAmount, 2, locale)} USDC
  <i>⚠️ Estimativa próxima do real. As taxas & preços podem variar ligeiramente.</i>`,
  
    STEP_1_4: `✅ <b>Muito bem!</b> Você agora tem USDC na sua conta 🇪🇺.
  
  ✨ Os USDC são "stablecoins": ~1 USDC = 1 USD.
  É a chave para transferir seu dinheiro de forma rápida e econômica.
  
  <b>Próxima etapa:</b> enviá-los on-chain para o Brasil.`,
  
    STEP_2_1: `✨ Esta é a etapa "on-chain" → rápida e econômica, mas exige um pouco de concentração.
  <i>Ao contrário de um banco, se você cometer um erro, não há SAC para recuperar seus fundos.</i>
  
  <b>1️⃣ Recuperar seu endereço de depósito 🇧🇷</b>
  
  • No seu exchange brasileiro, procure "Depósito / Crypto".
  • Escolha USDC como crypto a depositar.
  • Selecione a rede de transferência.
  
  💡 <i>Recomendamos Polygon (MATIC) → rápido, confiável, taxas baixas (~1 USDC).</i>
  
  • Copie cuidadosamente o endereço.
  
  💡 <i>Imagine que é como seu IBAN bancário, mas versão blockchain (uma longa sequência de letras e números).</i>`,
  
    STEP_2_2: (usdcAmount, locale) => `<b>2️⃣ Enviar do seu exchange 🇪🇺</b>
  
  • Vá em "Saque / Withdraw" → USDC.
  • Cole o endereço copiado.
  • Escolha a mesma rede do depósito (ex. Polygon).
  
  💡 <i>A rede é como os trilhos de um trem: se não forem os mesmos dos dois lados, o dinheiro vai para outro lugar e está perdido.</i>
  
  • Indique seu valor. Você pode enviar tudo, ou começar com um teste (ex. 10 USDC).
  
  👉 <i>O teste custa um pouco mais caro (taxas fixas ~1 USDC aplicam-se duas vezes), mas é uma boa prática comum em crypto.</i>
  
  <b>Estimativa:</b> você receberá ~${formatAmount(usdcAmount - 1, 2, locale)} USDC lado 🇧🇷
  <i>⚠️ Estimativa próxima do real (taxa de rede ~1 USDC).</i>`,
  
    STEP_2_3: `<b>3️⃣ Verificar e confirmar</b>
  
  • Releia atentamente o endereço e a rede antes de validar.
  
  ⚠️ <b>Um único caractere errado no endereço, ou rede errada, e seus fundos estão definitivamente perdidos.</b>
  
  👉 Depois de verificar bem, você pode confirmar a transferência.`,
  
    STEP_2_4: `<b>4️⃣ Aguardar a chegada</b>
  
  • Em geral, a transação leva 1–2 minutos, às vezes até 10 min.
  • Você verá seu saldo USDC aparecer lado 🇧🇷.
  
  ✅ <b>Resultado:</b> seus USDC chegaram → pronto para a etapa 3 (venda em BRL + saque Pix).`,
  
    STEP_3_1: `<b>1️⃣ Encontrar o mercado USDC/BRL 🇧🇷</b>
  
  • No seu exchange brasileiro, vá em Trader / Mercado / Trade.
  • Selecione o par USDC/BRL.
  
  👉 Próxima etapa: seus USDC se transformam finalmente em BRL 🎉`,
  
    STEP_3_2: (brlAmount, locale) => `<b>2️⃣ Fazer sua ordem</b>
  
  • <b>"Ao mercado / Market"</b> → instantâneo, ao preço atual (simples, recomendado).
  • <b>"Limite / Limit"</b> → você fixa seu preço, útil para grandes valores.
  
  👉 Para a maioria das pessoas, "ordem ao mercado" = o mais simples e rápido.
  
  <b>Estimativa do seu saldo:</b> ~R${formatAmount(brlAmount, 2, locale)}
  <i>⚠️ Estimativa próxima do real (taxas ~0,10–0,20%).</i>`,
  
    STEP_3_3: (brlNet, locale) => `<b>3️⃣ Sacar seu dinheiro em R$</b>
  
  • Depois de vender seus USDC, seu saldo aparece em BRL.
  • Vá em Saque / Withdraw.
  • Escolha Pix como método.
  
  👉 Digite sua chave Pix (CPF, email, tel, chave aleatória)… mas isso você já sabe fazer 😉
  
  💡 <i>Aliás: como para um endereço crypto, se a chave estiver errada, o dinheiro vai para o lugar errado.</i>
  
  👉 Geralmente, as taxas são muito baixas (ex. Binance ~R$3,50 por saque Pix).
  <i>Deveria ser gratuito honestamente… mas fazer o quê 😅</i>
  
  <b>Estimativa do seu saldo recebido:</b> ~R${formatAmount(brlNet, 2, locale)} líquidos
  <i>⚠️ Vamos lá, não devemos estar muito longe da realidade ;)</i>`,
  
    WHY_NOT_EXACT: `🤔 Por que não podemos te dar o valor exato?
  
  As variáveis que mudam em tempo real:
  
  • Taxas dos exchanges: podem variar segundo seu perfil de usuário, seu volume de trading, ou promoções pontuais (mas sempre baixas).
  
  • Taxas de rede: flutuam segundo a congestão da rede blockchain (~1 USDC em média no Polygon, mas pode variar).
  
  • Taxa de câmbio: os mercados crypto se movem em tempo real, mesmo se o USDC permanece estável, a taxa USDC/BRL pode flutuar ligeiramente entre o momento que você calcula e o momento que você executa.
  
  Nossas estimativas são prudentes e próximas do real. Você não deve ter nenhuma surpresa ruim.`,
  
    STEP_3_4: `✅ Sua transferência está completa!
  
  • Você converteu seus EUR em USDC lado 🇪🇺.
  • Você os enviou on-chain.
  • Você os vendeu por BRL e sacou via Pix lado 🇧🇷.
  
  ✨ Resultado: rápido, seguro e com custo reduzido.
  
  🌍 Você acabou de fazer uma verdadeira passagem pela blockchain.
  O que você aprendeu hoje será cada vez mais usado no futuro: você está saindo na frente.
  
  🙌 Esperamos que tenha curtido a experiência!`,
  
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
      proofSources: '📊 Provas e fontes',
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
      nextStep2: '👉 Passar para a etapa 2 (transferência)',
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
    },
  };
  
  // English
  const en = {
  
  export const messages = { fr, pt, en };