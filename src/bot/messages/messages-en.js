import { formatAmount, formatRate, getLocale } from '../../services/rates.js';
import { formatCooldown } from './helpers.js';

export const messagesEn = {
    INTRO_TEXT: `👋 Hi!

    🌐 Choose your language · Choisis ta langue · Escolha o idioma`,
    
      ABOUT_TEXT: `💡 About
    
    This bot compares EUR↔BRL rates and guides you through on-chain transfers (via blockchain).
    
    On-chain rates are often better than traditional platforms. It's legal, secure, and used by many institutions.
    
    Free service, funded by referral links.`,
    
      ERROR_RATES_UNAVAILABLE: `⚠️ Crypto rates unavailable. Try again in a moment.`,
      ERROR_INVALID_AMOUNT: `⚠️ Invalid amount. Enter a number (e.g. 1000)`,
      ERROR_UPDATE_FAILED: `❌ Update failed.`,
    
      // ✅ SCREEN 2
      promptAmt: `💬 Send an amount or choose:`,
      
      askAmount: `✏️ Enter an amount (e.g. 1000)`,
      
      askRoute: (amount, locale) => `What do you want to do with ${formatAmount(amount, 0, locale)}?`,
      
      // ✅ SCREEN 3: buildComparison
      buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale, isTargetMode = false }) => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let title;
        if (isTargetMode) {
          if (route === 'eurbrl') {
            title = `💱 To receive ${formatAmount(amount, 0, locale)} BRL\nYou need ~${formatAmount(onchain.in, 0, locale)} EUR`;
          } else {
            title = `💱 To receive ${formatAmount(amount, 0, locale)} EUR\nYou need ~${formatAmount(onchain.in, 0, locale)} BRL`;
          }
        } else {
          title = route === 'eurbrl' 
            ? `💱 ${formatAmount(amount, 0, locale)} EUR → BRL`
            : `💱 ${formatAmount(amount, 0, locale)} BRL → EUR`;
        }
        
        const timeStr = now.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
        const tzAbbr = new Date().toLocaleTimeString('en-US', {timeZoneName: 'short'}).split(' ')[2];
        
        // ✅ Reference line
        let ref = `📊 Reference rate ${formatRate(rates.cross, locale)} • ${timeStr} ${tzAbbr}`;
        if (isWeekend) {
          ref += `\n⚠️ Weekend: rate frozen until Monday`;
        }
        
        let onchainLine, bankLine;
        
        if (isTargetMode) {
          if (route === 'eurbrl') {
            onchainLine = `🌍 On-chain\n~${formatAmount(onchain.in, 0, locale)} EUR → ${formatAmount(amount, 2, locale)} BRL (${formatRate(onchain.rate, locale)})`;
            
            if (!bestBank) {
              bankLine = `🏦 Best off-chain\n⚠️ Rate unavailable`;
            } else {
              bankLine = `🏦 ${bestBank.provider}\n~${formatAmount(bestBank.in, 0, locale)} EUR → ${formatAmount(amount, 2, locale)} BRL (${formatRate(bestBank.rate, locale)})`;
            }
          } else {
            onchainLine = `🌍 On-chain\n~${formatAmount(onchain.in, 0, locale)} BRL → ${formatAmount(amount, 2, locale)} EUR (${formatRate(onchain.rate, locale)})`;
            
            if (!bestBank) {
              bankLine = `🏦 Best off-chain\n⚠️ Rate unavailable`;
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
            bankLine = `🏦 Best off-chain\n⚠️ Rate unavailable`;
          } else {
            if (route === 'eurbrl') {
              bankLine = `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
            } else {
              bankLine = `🏦 ${bestBank.provider}\nR$ ${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
            }
          }
        }
        
        // ✅ "Others" section
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
          othersText = `\n\nOthers:\n${formattedOthers}`;
          
          if (count > 3) {
            othersText += `\n+ ${count - 3} more available`;
          }
        }
        
        // ✅ Delta
        let deltaText = '';
        if (delta !== null && bestBank) {
          if (isTargetMode) {
            const sign = delta <= 0 ? '−' : '+';
            const absValue = Math.abs(delta);
            deltaText = delta <= 0 
              ? `\n\n✅ You save approximately ${sign}${formatAmount(absValue, 1, locale)}% on-chain`
              : `\n\n⚠️ ${sign}${formatAmount(absValue, 1, locale)}% on-chain (more expensive)`;
          } else {
            const sign = delta >= 0 ? '+' : '−';
            deltaText = `\n\n✅ You save approximately ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
          }
        }
        
        return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
      },
    
      // ✅ SCREEN 4: buildCalcDetails
      buildCalcDetails: ({ route, amount, rates, onchain, locale }) => {
        const title = '🔍 On-chain calculation details';
        
        if (route === 'eurbrl') {
          const { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet } = onchain.breakdown;
          
          return `${title}
    
    📊 EUR → BRL via USDC
    
    1️⃣ <b>Buying USDC in Europe</b>
       💰 Amount: €${formatAmount(amount, 2, locale)}
       📉 Trading fees (~0.1%): −€${formatAmount(amount * 0.001, 2, locale)}
       🪙 USDC obtained: ${formatAmount(usdcAfterBuy, 2, locale)} USDC
    
    2️⃣ <b>Blockchain transfer</b>
       🌍 Network: Polygon (MATIC)
       📉 Network fee: −${formatAmount(1, 2, locale)} USDC
       🪙 USDC received in Brazil: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
    
    3️⃣ <b>Selling USDC in Brazil</b>
       🪙 USDC to sell: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
       💱 USDC/BRL rate: ${formatRate(rates.usdcBRL, locale)}
       📉 Trading fees (~0.1%): −R$ ${formatAmount(usdcAfterNetwork * rates.usdcBRL * 0.001, 2, locale)}
       💰 BRL obtained: R$ ${formatAmount(brlAfterTrade, 2, locale)}
    
    4️⃣ <b>Pix withdrawal</b>
       📉 Pix fee (if applicable): −R$ ${formatAmount(3.5, 2, locale)}
       
    ✅ <b>Total received: R$ ${formatAmount(brlNet, 2, locale)}</b>
    📊 <b>Effective rate: ${formatRate(onchain.rate, locale)}</b>
    
    💡 Actual fees may vary slightly depending on your platform and trading volume.`;
        } else {
          const { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet } = onchain.breakdown;
          
          return `${title}
    
    📊 BRL → EUR via USDC
    
    1️⃣ <b>Buying USDC in Brazil</b>
       💰 Amount: R$ ${formatAmount(amount, 2, locale)}
       💱 BRL/USDC rate: ${formatRate(1/rates.usdcBRL, locale)}
       📉 Trading fees (~0.1%): −R$ ${formatAmount(amount * 0.001, 2, locale)}
       🪙 USDC obtained: ${formatAmount(usdcFromBRL, 2, locale)} USDC
    
    2️⃣ <b>Blockchain transfer</b>
       🌍 Network: Polygon (MATIC)
       📉 Network fee: −${formatAmount(1, 2, locale)} USDC
       🪙 USDC received in Europe: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
    
    3️⃣ <b>Selling USDC in Europe</b>
       🪙 USDC to sell: ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
       💱 EUR/USDC rate: ${formatRate(rates.usdcEUR, locale)}
       📉 Trading fees (~0.1%): −€${formatAmount(usdcAfterNetwork * rates.usdcEUR * 0.001, 2, locale)}
       
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
      - Trading ~0.1%
      - Polygon network ~1 USDC
      - Pix withdrawal ~R$3.50
    
    Off-chain rates: Wise Comparisons API (live provider rates)
    
    Referral links: free for you, fund the service.`,
    
      // ✅ SCREEN 5: buildOffChain
      buildOffChain: ({ route, amount, bestBank, others, locale, onchainAmount }) => {
        const title = '🏦 Off-chain';
        
        if (!bestBank) {
          return `${title}\n\n⚠️ Rates currently unavailable.`;
        }
        
        const allProviders = [bestBank, ...others];
        const displayProviders = allProviders.sort((a, b) => b.out - a.out);
        
        const providersList = displayProviders.map((p, i) => {
          if (route === 'eurbrl') {
            return `<b>${i + 1}. ${p.provider}</b>\n💰 You receive: R$ ${formatAmount(p.out, 2, locale)}\n📊 Effective rate: ${formatRate(p.rate, locale)}`;
          } else {
            return `<b>${i + 1}. ${p.provider}</b>\n💰 You receive: €${formatAmount(p.out, 2, locale)}\n📊 Effective rate: ${formatRate(p.rate, locale)}`;
          }
        }).join('\n\n');
        
        const onchainCompare = onchainAmount 
          ? `~${formatAmount(onchainAmount, 0, locale)}${route === 'eurbrl' ? ' R$' : '€'}`
          : '—';
        
        const offchainBest = displayProviders[0]?.out 
          ? formatAmount(displayProviders[0].out, 0, locale)
          : '—';
        
        const footer = `
    
    💡 More expensive than on-chain (~${offchainBest}${route === 'eurbrl' ? ' R$' : '€'} vs ~${onchainCompare} on-chain)
    
    <i>*Data provided by Wise Comparisons</i>`;
        
        return `${title}\n\n${providersList}${footer}`;
      },
    
      // ✅ SCREEN 6: ONCHAIN_INTRO
      ONCHAIN_INTRO: `🚀 ON-CHAIN ROUTE
    
    📍 <b>The 3-step process</b>
    1️⃣ Europe → Exchange your EUR to USDC
    2️⃣ Blockchain → Send your USDC
    3️⃣ Brazil → Convert USDC to BRL (Pix)
    
    ✅ <b>What you need</b>
    • 🇪🇺 Exchange in Europe accepting EUR deposits (SEPA)
    • 🇧🇷 Exchange in Brazil accepting BRL withdrawals (Pix)
    
    💡 We have recommendations!
    
    💡 <b>Fun fact:</b> On-chain fees (~0.5-1%) are 5 to 10 times cheaper than traditional transfers (2.5-6%)!`,
    
      // ✅ SCREEN 7: FAQ_MENU
      FAQ_MENU: `🤔 ANY QUESTIONS?
    
    Choose a topic or ask your question:`,
    
      // ✅ SCREEN 8: FAQ_WHY_ONCHAIN
      FAQ_WHY_ONCHAIN: `💡 WHY ON-CHAIN?
    
    🌍 <b>Blockchain eliminates intermediaries</b>
    
    Traditional transfer:
    Your bank → Correspondent bank → Beneficiary bank
    💸 Each intermediary takes its commission (2.5-6% total)
    
    On-chain transfer:
    You → Blockchain → Recipient
    💸 Minimal fixed fees (~0.5-1% total)
    
    📊 <b>The proof:</b>
    
    • <b>Cryptocurrency-based remittance statistics 2025</b>
    Traditional services charge an average of 6.5% in fees, versus ~1% for stablecoins.
    
    • <b>World Bank (March 2025)</b>
    Average cost of traditional transfers: 6.49% of amount.
    
    • <b>CFA Institute (2025)</b>
    Institutional investors already use stablecoins to reduce costs and settlement times.
    
    • <b>McKinsey (2025)</b>
    Cross-border transfer volume via stablecoins has exploded: modern payment infrastructure.
    
    ✅ Legal, secure, and used by many institutions.`,
    
      // ✅ SCREEN 9: FAQ_SEND_QUESTION
      FAQ_SEND_QUESTION: `📧 ASK YOUR QUESTION
    
    Send me your question and I'll forward it to the team.
    
    You'll receive an answer within 24-48h.
    
    <i>To cancel, click "Back"</i>`,
    
      FAQ_QUESTION_RECEIVED: `✅ QUESTION RECEIVED
    
    Thank you! We'll answer within 24-48h.`,
    
      // ✅ SCREEN 10: WHAT_IS_EXCHANGE
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
    
    It's regulated and safe (if you choose recognized platforms).
    
    👉 We'll recommend our favorites in the next screens.`,
    
      // ✅ SCREEN 11: EXCHANGES_EU
      EXCHANGES_EU: `🇪🇺 Exchanges to deposit/withdraw EUR
    
    Our recommendations:
    • Kraken (👋 We use) — Free transfer, serious, USDC available
    • Bitstamp — EU veteran, serious, transfers supported
    
    Check: SEPA ok (even with BR residency) • USDC available • reasonable fees • reputation
    
    ⚠️ Some exchanges (e.g. Binance) only accept EUR deposit by card with >2% fees if BR residency.`,
    
      // ✅ SCREEN 12: EXCHANGES_BR
      EXCHANGES_BR: `🇧🇷 Exchanges to deposit/withdraw BRL
    
    Our preference:
    • Binance BR (👋 We use too) — Native Pix, huge liquidity, low fees
    
    Other solutions:
    • Bitso — Free and instant Pix, clear interface, locally regulated
    • Mercado Bitcoin — Historic local player, Pix supported
    • Foxbit — Pix 24/7, decent fees
    
    Check: Pix ok • USDC available • reputation
    
    Our referral links fund this service (free for you, sometimes bonuses).
    
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
    
      // ✅ SCREEN 13: GUIDE_TRANSITION
      GUIDE_TRANSITION: `✅ You have (or will have):
    • A 🇪🇺 account to deposit your EUR (SEPA → USDC)
    • A 🇧🇷 account to withdraw your BRL (USDC → Pix)
    
    🌐 You're taking your first on-chain step.
    It's more than just a transfer:
    • you're discovering a technology that's already changing global finance,
    • you're joining millions of users, companies, and institutions,
    • you're keeping more value for yourself (and less for intermediaries 💸).
    
    🚀 Now, let's start concretely: first step → deposit your EUR in your 🇪🇺 account and convert them to USDC.`,
    
      STEP_1_1: (amount, locale, route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const currency = isEurBrl ? 'EUR' : 'BRL';
        const currencySymbol = isEurBrl ? '€' : 'R$';
        const method = isEurBrl ? 'SEPA transfer' : 'Pix or TED';
        const exchange = isEurBrl ? 'Kraken' : 'Binance BR, Bitso, Mercado Bitcoin or Foxbit';
        const flag = isEurBrl ? '🇪🇺' : '🇧🇷';

        return `1️⃣ Deposit your ${currency} in the exchange account ${flag}

    • Go to the "Deposit / Fiat" section.
    • Choose ${currency} as currency.
    • Simplest method: ${method} (fast, low or no fees).

    💡 "Fiat" = traditional currencies (EUR, USD, BRL…).

    👉 Recommended: ${exchange}.

    Balance estimate: ${currencySymbol}${formatAmount(amount, 0, locale)}
    *⚠️ This is an estimate, close to reality. Bank fees and delays may vary slightly.*`;
      },

      STEP_1_2: (amount, locale, route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const currency = isEurBrl ? 'EUR' : 'BRL';
        const currencySymbol = isEurBrl ? '€' : 'R$';
        const pair = isEurBrl ? 'EUR/USDC' : 'BRL/USDC';

        return `2️⃣ Access the market to buy USDC

    • In your exchange, look for "Trader / Market / Trade".
    • Select the ${pair} pair.

    💡 A crypto market is like a currency exchange: you exchange one currency for another.

    Balance estimate: ${currencySymbol}${formatAmount(amount, 0, locale)} (ready for USDC purchase)
    *⚠️ Indicative estimate.*`;
      },

      STEP_1_3: (usdcAmount, locale, route = 'eurbrl') => {
        return `3️⃣ Buy your USDC

    • Choose the order type:
      • Market → instant, simple, recommended.
      • Limit → you set your price, useful for large amounts/liquidity.

    👉 For beginners: market order.

    Balance estimate: ~${formatAmount(usdcAmount, 2, locale)} USDC
    *⚠️ Estimate close to reality. Fees & prices may vary slightly.*`;
      },

      STEP_1_4: (route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const fromFlag = isEurBrl ? '🇪🇺' : '🇧🇷';
        const toRegion = isEurBrl ? 'Brazil' : 'Europe';

        return `✅ Well done! You now have USDC in your ${fromFlag} account.

    ✨ USDC are "stablecoins": ~1 USDC = 1 USD.
    This is the key to transferring your money quickly and at low cost.

    Next step: send them on-chain to ${toRegion}.`;
      },

      STEP_2_1: (route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const toFlag = isEurBrl ? '🇧🇷' : '🇪🇺';
        const toRegion = isEurBrl ? 'Brazilian' : 'European';

        return `✨ This is the "on-chain" step → fast and low cost, but requires some concentration.
    Unlike a bank, if you make a mistake, there's no customer service to recover your funds.

    1️⃣ Get your ${toFlag} deposit address

    • In your ${toRegion} exchange, look for "Deposit / Crypto".
    • Choose USDC as crypto to deposit.
    • Select the transfer network.

    💡 We recommend Polygon (MATIC) → fast, reliable, low fees (~1 USDC).

    • Carefully copy the address.

    💡 Imagine it's like your bank IBAN, but blockchain version (a long sequence of letters and numbers).`;
      },

      STEP_2_2: (usdcAmount, locale, route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const fromFlag = isEurBrl ? '🇪🇺' : '🇧🇷';
        const toFlag = isEurBrl ? '🇧🇷' : '🇪🇺';

        return `2️⃣ Send from your ${fromFlag} exchange

    • Go to "Withdrawal / Withdraw" → USDC.
    • Paste the copied address.
    • Choose the same network as the deposit (e.g. Polygon).

    💡 The network is like train rails: if they're not the same on both sides, the money goes elsewhere and is lost.

    • Enter your amount. You can send everything, or start with a test (e.g. 10 USDC).

    👉 Testing costs a bit more (fixed fees ~1 USDC apply twice), but it's a common good practice in crypto.

    Estimate: you'll receive ~${formatAmount(usdcAmount - 1, 2, locale)} USDC ${toFlag} side
    *⚠️ Estimate close to reality (network fee ~1 USDC).*`;
      },

      STEP_2_3: (route = 'eurbrl') => {
        return `3️⃣ Verify and confirm

    • Carefully re-read the address and network before validating.

    ⚠️ A single wrong character in the address, or wrong network, and your funds are permanently lost.

    👉 Once you've verified everything, you can confirm the transfer.`;
      },

      STEP_2_4: (route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const toFlag = isEurBrl ? '🇧🇷' : '🇪🇺';
        const toCurrency = isEurBrl ? 'BRL' : 'EUR';
        const withdrawMethod = isEurBrl ? 'Pix' : 'SEPA transfer';

        return `4️⃣ Wait for arrival

    • Usually, the transaction takes 1-2 minutes, sometimes up to 10 min.
    • You'll see your USDC balance appear ${toFlag} side.

    ✅ Result: your USDC arrived → ready for step 3 (${toCurrency} sale + ${withdrawMethod} withdrawal).`;
      },

      STEP_3_1: (route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const currency = isEurBrl ? 'BRL' : 'EUR';
        const flag = isEurBrl ? '🇧🇷' : '🇪🇺';
        const region = isEurBrl ? 'Brazilian' : 'European';
        const pair = isEurBrl ? 'USDC/BRL' : 'USDC/EUR';

        return `1️⃣ Find the ${pair} market ${flag}

    • In your ${region} exchange, go to Trader / Market.
    • Select the ${pair} pair.

    👉 Next step: your USDC finally turn into ${currency} 🎉`;
      },

      STEP_3_2: (targetAmount, locale, route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const currencySymbol = isEurBrl ? 'R$' : '€';

        return `2️⃣ Place your order

    • "Market" → instant, at current price (simple, recommended).
    • "Limit" → you set your price, useful for large amounts.

    👉 For most people, "market order" = simplest and fastest.

    Balance estimate: ~${currencySymbol} ${formatAmount(targetAmount, 2, locale)}
    *⚠️ Estimate close to reality (fees ~0.1%).*`;
      },

      STEP_3_3: (netAmount, locale, route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const currency = isEurBrl ? 'BRL' : 'EUR';
        const currencySymbol = isEurBrl ? 'R$' : '€';
        const withdrawMethod = isEurBrl ? 'Pix' : 'SEPA transfer';
        const withdrawKey = isEurBrl
          ? 'your Pix key (CPF, email, phone, random key)'
          : 'your IBAN';
        const withdrawNote = isEurBrl
          ? '… but you already know how to do that 😉'
          : '';
        const feeExample = isEurBrl
          ? 'e.g. Binance ~R$3.50 per Pix withdrawal'
          : 'usually free for SEPA';

        return `3️⃣ Withdraw your money in ${currency}

    • Once your USDC are sold, your balance appears in ${currency}.
    • Go to Withdrawal / Withdraw.
    • Choose ${withdrawMethod} as method.

    👉 Enter ${withdrawKey}${withdrawNote}

    💡 By the way: just like a crypto address, if the information is wrong, the money goes to the wrong place.

    👉 Usually, fees are very low (${feeExample}).
    ${isEurBrl ? 'Should be free honestly… but well 😅' : ''}

    Received balance estimate: ~${currencySymbol} ${formatAmount(netAmount, 2, locale)} net
    *⚠️ Well, we shouldn't be too far from reality ;)*`;
      },
    
      WHY_NOT_EXACT: `🤔 Why can't we give the exact amount?
    
    Variables that move in real time:
    
    • Exchange fees: can vary according to your user profile, trading volume, or occasional promotions (but always remain low).
    
    • Network fees: fluctuate according to blockchain network congestion (~1 USDC average on Polygon, but can vary).
    
    • Exchange rate: crypto markets move in real time, even if USDC remains stable, the USDC/BRL rate can slightly fluctuate between when you calculate and when you execute.
    
    Our estimates are prudent and close to reality. You shouldn't have any bad surprises.`,
    
      STEP_3_4: (route = 'eurbrl') => {
        const isEurBrl = route === 'eurbrl';
        const fromCurrency = isEurBrl ? 'EUR' : 'BRL';
        const toCurrency = isEurBrl ? 'BRL' : 'EUR';
        const fromFlag = isEurBrl ? '🇪🇺' : '🇧🇷';
        const toFlag = isEurBrl ? '🇧🇷' : '🇪🇺';
        const withdrawMethod = isEurBrl ? 'Pix' : 'SEPA transfer';

        return `✅ Your transfer is complete!

    • You converted your ${fromCurrency} to USDC ${fromFlag} side.
    • You sent them on-chain.
    • You sold them for ${toCurrency} and withdrew via ${withdrawMethod} ${toFlag} side.

    ✨ Result: fast, secure, and low cost.

    🌍 You just made a real blockchain passage.
    What you learned today will be increasingly used in the future: you just took a step ahead.

    🙌 We hope you enjoyed the experience!`;
      },
    
      // Premium and alerts (kept same)
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
    
      ALERT_VIEW_DETAILS: (alert, currentRate, refValue, calculatedThreshold, locale) => {
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
        
        const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        
        let text = `🔔 <b>Alert details</b>\n\n`;
        
        if (alert.name) {
          text += `<b>Name:</b> ${alert.name}\n\n`;
        }
        
        text += `<b>Pair:</b> ${pairText}\n`;
        text += `<b>Type:</b> ${typeLabels[alert.threshold_type]}\n`;
        
        if (alert.threshold_type === 'relative') {
          text += `<b>Threshold:</b> +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabels[alert.reference_type]}\n`;
        } else {
          text += `<b>Threshold:</b> ≥ ${formatRate(alert.threshold_value, locale)}\n`;
        }
        
        text += `<b>Cooldown:</b> ${formatCooldown(alert.cooldown_minutes)}\n\n`;
        
        text += `<b>Current state:</b>\n`;
        text += `• Rate: ${formatRate(currentRate, locale)}\n`;
        
        if (alert.threshold_type === 'relative' && refValue) {
          text += `• ${refLabels[alert.reference_type]}: ${formatRate(refValue, locale)}\n`;
        }
        
        text += `• Alert threshold: ${formatRate(calculatedThreshold, locale)}\n\n`;
        
        if (currentRate >= calculatedThreshold) {
          text += `🎯 <b>Threshold reached!</b> You should be notified soon.`;
        } else {
          const gap = ((calculatedThreshold - currentRate) / currentRate * 100);
          text += `⏳ ${formatAmount(gap, 1, locale)}% more to trigger.`;
        }
        
        return text;
      },
      
      ALERT_NAME_PROMPT: `✏️ <b>Name alert</b>
      
      Enter a name for this alert (max 50 characters):
      
      <i>Example: "August transfer", "Brazil vacation", etc.</i>
      
      Or type "cancel" to keep unnamed.`,
      
      ALERT_NAME_TOO_LONG: `⚠️ Name too long (max 50 characters).
      
      Try a shorter name.`,
      
      ALERT_NAME_SET: (name) => `✅ Alert renamed: <b>${name}</b>`,
      
      ALERT_NAME_CANCELLED: `↩️ Operation cancelled.`,
    
    
    
      ALERT_DEEPLINK_GROUP: `🔔 To create an alert, click here to continue in private:`,
    
      ALERT_INVALID_SYNTAX: `❌ Invalid format
      
      <b>Examples:</b>
      /alert 6.30        → Alert EUR→BRL ≥ 6.30
      /alert +3%         → Alert EUR→BRL +3% vs 30d avg
      /alert brl 0.165   → Alert BRL→EUR ≥ 0.165
      /alert brl +5%     → Alert BRL→EUR +5% vs 30d avg`,
      
      ALERT_CREATED_QUICK: (alert, currentRate, refValue, calculatedThreshold, locale) => {
        const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        
        let text = `✅ <b>Alert created</b>
      
      ${pairText}`;
      
        if (alert.threshold_type === 'absolute') {
          text += ` ≥ ${formatRate(alert.threshold_value, locale)}`;
        } else {
          text += ` +${formatAmount(alert.threshold_value, 1, locale)}% vs 30d avg`;
        }
        
        text += `\n⏰ Cooldown: 1h
      
      <b>Current state:</b>
      • Rate: ${formatRate(currentRate, locale)}`;
      
        if (refValue) {
          text += `\n• 30d avg: ${formatRate(refValue, locale)}`;
        }
        
        text += `\n• Threshold: ${formatRate(calculatedThreshold, locale)}`;
        
        return text;
      },
      
      NOT_PREMIUM_ALERTS: `🔒 No active alerts
      
      Premium users can create unlimited alerts.
      
      💎 With Premium:
      • Custom alerts
      • Multi-pairs
      • Advanced analytics
      
      Price: from 5 R$/month`,
    
    
      CONVERT_ASK_AMOUNT: "💱 What amount do you want to convert?\n\Example: 253 or 1500 brl",
      RATE_LABEL: "Rate", // ou "Taxa" (PT), "Rate" (EN)
      BETTER_BY: "better by", // ou "melhor em" (PT), "better by" (EN)
    
    
      btn: {
        langFR: '🇫🇷 Français',
        langPT: '🇧🇷 Português',
        langEN: '🇬🇧 English',
        about: 'ℹ️ About',
        eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
        brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (SEPA) · R$ ${formatAmount(amt, 0, locale)}`,
        
        // ✅ Renamed buttons
        contOn: '🚀 Convert on-chain',
        stayOff: '🏦 Convert off-chain',
        calcdetails: '🔍 On-chain calculation details',
        swapMode: '🔄 Swap',
        change: '✏️ Change amount',
        
        back: '⬅️ Back',
        sources: '📊 Data sources',
        openWise: '🔗 Open Wise',
        openRemitly: '🔗 Open Remitly',
        openInstarem: '🔗 Open Instarem',
        seeOnchain: '🚀 See on-chain route',
        
        // ✅ New buttons
        createEU: '🇪🇺 Create Europe account',
        createBR: '🇧🇷 Create Brazil account',
        startGuide: '🚀 Start guide',
        faqDoubt: "🤔 Any questions?",
        whyOnchain: "💡 Why on-chain?",
        askQuestion: '💬 Ask a question',
        
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
        
        // ✅ New skip buttons
        skipToStep2: "I already have USDC (skip)",
        skipToStep3: "⏭️ Skip to step 3",
        
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
        aggressive: '🎯 Opportunistic',
        custom: '✏️ Custom',
        disableAlert: '🔕 Disable',
        editAlert: '✏️ Edit',
        relativeAlert:'📊 Relative (+X%)',
        absoluteAlert:'🎯 Absolute (fixed rate)',
    
        refCurrent: (rate, locale) => `💵 Current rate (${formatRate(rate, locale)})`,
        refAvg7d:   (rate, locale) => `📈 7d average (${formatRate(rate, locale)})`,
        refAvg30d:  (rate, locale) => `📊 30d average (${formatRate(rate, locale)}) ⭐`,
        refAvg90d:  (rate, locale) => `📉 90d average (${formatRate(rate, locale)})`,
    
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