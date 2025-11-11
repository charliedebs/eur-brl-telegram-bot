import { formatAmount, formatRate, getLocale } from '../../services/rates.js';
import { formatCooldown } from './helpers.js';

export const messagesEn = {
    INTRO_TEXT: `👋 Hi!

    🌐 Choose your language · Choisis ta langue · Escolha o idioma`,
    
      ABOUT_TEXT: `💡 About

    This bot compares EUR↔BRL rates and guides you through on-chain transfers (via blockchain).

    On-chain rates are often better than traditional platforms. It's legal, secure, and used by many institutions.

    Free service, funded by referral links.

    <i>⚖️ This service is informational only. Not financial advice. Always verify rates and conditions on platforms before operating.</i>`,
    
      ERROR_RATES_UNAVAILABLE: `⚠️ Crypto rates unavailable. Try again in a moment.`,
      ERROR_INVALID_AMOUNT: `⚠️ Invalid amount. Enter a number (e.g. 1000)`,
      ERROR_UPDATE_FAILED: `❌ Update failed.`,
    
      // ✅ MAIN MENU
      promptAmt: `🏠 <b>Main Menu</b>\n\n💱 Compare best EUR↔BRL rates live\n\n<b>💎 Premium:</b>\n🔔 Custom alerts\n⏰ Notifications at the best time to convert\n\n━━━━━━━━━━━━━━━━━━\n\n👉 <i>Choose below or send an amount (e.g. 1000)</i>`,
      
      askAmount: `✏️ Enter an amount (e.g. 1000)`,
      
      askRoute: (amount, locale) => `What do you want to do with ${formatAmount(amount, 0, locale)}?`,
      
      // ✅ SCREEN 3: buildComparison
      buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale, isTargetMode = false }) => {
        const now = new Date();

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

        // ✅ Reference line - Yahoo Finance only
        let ref;
        if (rates.yahooFrozen) {
          // Yahoo unavailable (weekend/market closed) - showing crypto cross rate instead
          ref = `📊 Reference rate ${formatRate(rates.cross, locale)} • ${timeStr} ${tzAbbr}\n⚠️ Official rate frozen (weekend) - showing ${rates.referenceSource} rate`;
        } else {
          // Yahoo available - official reference
          ref = `📊 Official rate ${formatRate(rates.cross, locale)} (Yahoo Finance) • ${timeStr} ${tzAbbr}`;
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

    EUR/BRL reference rate: Yahoo Finance (official FX market rate)

    On-chain calculation:
    • Crypto rates: Coinpaprika (primary), CryptoCompare, or CoinGecko (USDC/EUR, USDC/BRL)
    • Real fees included:
      - Trading ~0.1%
      - Polygon network ~1 USDC
      - Pix withdrawal ~R$3.50

    Off-chain rates: Wise Comparisons API (live provider rates)

    Referral links: free for you, fund the service.`,

      SOURCES_PROOF: `📊 <b>Proof & Sources</b>

    Click the links below to access official studies and reports that prove the advantage of on-chain transfers.`,

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

        // Calculate savings
        let savingsText = '';
        if (displayProviders[0]?.out && onchainAmount) {
          const difference = onchainAmount - displayProviders[0].out;
          const percentSavings = ((difference / displayProviders[0].out) * 100).toFixed(1);
          const currency = route === 'eurbrl' ? 'R$' : '€';

          if (difference > 0) {
            savingsText = `\n\n⚠️ <b>Off-chain costs ${currency} ${formatAmount(Math.abs(difference), 2, locale)} more!</b>\n💰 Save ~${percentSavings}% by choosing on-chain →`;
          }
        }

        const footer = `${savingsText}

    <i>*Data provided by Wise Comparisons</i>`;

        return `${title}\n\n${providersList}${footer}`;
      },
    
      // ✅ SCREEN 6: ONCHAIN_INTRO (direction-aware)
      ONCHAIN_INTRO: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `🚀 ON-CHAIN ROUTE

    📍 <b>The 3-step process</b>
    1️⃣ Brazil → Exchange your BRL to USDC (Pix)
    2️⃣ Blockchain → Send your USDC
    3️⃣ Europe → Convert USDC to EUR (bank transfer)

    ✅ <b>What you need</b>
    • 🇧🇷 Exchange in Brazil accepting BRL deposits (Pix)
    • 🇪🇺 Exchange in Europe accepting EUR withdrawals (bank transfer - SEPA)

    💡 We have recommendations!

    💡 <b>Fun fact:</b> On-chain fees (~0.5-1%) are 5 to 10 times cheaper than traditional transfers (2.5-6%)!`;
        }

        // Default: eurbrl
        return `🚀 ON-CHAIN ROUTE

    📍 <b>The 3-step process</b>
    1️⃣ Europe → Exchange your EUR to USDC
    2️⃣ Blockchain → Send your USDC
    3️⃣ Brazil → Convert USDC to BRL (Pix)

    ✅ <b>What you need</b>
    • 🇪🇺 Exchange in Europe accepting EUR deposits (bank transfer - SEPA)
    • 🇧🇷 Exchange in Brazil accepting BRL withdrawals (Pix)

    💡 We have recommendations!

    💡 <b>Fun fact:</b> On-chain fees (~0.5-1%) are 5 to 10 times cheaper than traditional transfers (2.5-6%)!`;
      },
    
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

      FAQ_MIN_AMOUNT: `💰 WHAT'S THE MINIMUM AMOUNT?

<b>Quick summary:</b> From €300-400, on-chain becomes worthwhile.

<b>Why?</b>

Blockchain network fees are fixed (~1 USDC ≈ €0.95).
With small amounts, this fixed fee weighs heavily.

📊 <b>Practical comparison:</b>

<b>Transfer of €50:</b>
• Network fee: €0.95 = 1.9%
• Trading fees: ~0.2%
• <b>Total on-chain: ~2.1%</b>
• Wise: ~2.5%
→ Minimal savings, not worth the effort

<b>Transfer of €500:</b>
• Network fee: €0.95 = 0.19%
• Trading fees: ~0.2%
• <b>Total on-chain: ~0.4%</b>
• Wise: ~2.5%
→ <b>Save ~€10!</b> 💰

<b>Transfer of €5,000:</b>
• Network fee: €0.95 = 0.019%
• Trading fees: ~0.2%
• <b>Total on-chain: ~0.22%</b>
• Wise: ~2.5%
→ <b>Save ~€115!</b> 🎉

<b>Conclusion:</b> The larger the amount, the greater the percentage savings.`,

      REFERRAL_EXPLANATION: `🤝 ABOUT REFERRAL LINKS

<b>Full transparency:</b>

Some links in this bot are referral links (also called "affiliate links").

<b>How does it work?</b>

• When you sign up using one of these links, the bot creator receives a small commission or bonus
• This costs you NOTHING extra - the price is exactly the same
• In some cases, <b>you also get bonuses!</b>
  → Example: Wise offers up to €75 after your first transfer
  → Remitly offers discounts on initial transfers

<b>Why do we do this?</b>

• Keeping this bot 100% free requires time and resources
• Referral links help cover server and development costs
• It's a win-win: you get free access + potential bonuses, the bot keeps running

<b>Our promise:</b>

We only recommend platforms we actually use and trust. Service quality always comes first.

💚 Thank you for supporting this project!`,

      // ✅ SCREEN 10: WHAT_IS_EXCHANGE (direction-aware)
      WHAT_IS_EXCHANGE: (route = 'eurbrl') => {
        const baseText = `🏦 What is an exchange?

    A crypto exchange is like a digital currency exchange office.

    You can:
    • Deposit traditional money (EUR, BRL...)
    • Buy/sell cryptos (USDC, Bitcoin...)
    • Send them to other exchanges

    The most known: Kraken, Binance, Coinbase, Bitso...

    For our case:`;

        if (route === 'brleur') {
          return `${baseText}
    • Brazil exchange = you deposit BRL (Pix), buy USDC
    • Europe exchange = you receive USDC, sell for EUR, withdraw via bank transfer (SEPA)

    It's regulated and safe (if you choose recognized platforms).

    👉 We'll recommend our favorites in the next screens.`;
        }

        // Default: eurbrl
        return `${baseText}
    • Europe exchange = you deposit EUR, buy USDC
    • Brazil exchange = you receive USDC, sell for BRL, withdraw via Pix

    It's regulated and safe (if you choose recognized platforms).

    👉 We'll recommend our favorites in the next screens.`;
      },
    
      // ✅ SCREEN 11: EXCHANGES_EU
      EXCHANGES_EU: `🇪🇺 Exchanges to deposit/withdraw EUR
    
    Our recommendations:
    • Kraken (👋 We use) — Free transfer, serious, USDC available
    • Bitstamp — EU veteran, serious, transfers supported
    
    Check: Bank transfer/SEPA ok (even with BR residency) • USDC available • reasonable fees • reputation
    
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
    
    ⚠️ Reminder: one exchange serves one side. You need a 🇪🇺 (bank transfer) + a 🇧🇷 (Pix).`,
    
      WHAT_IS_USDC: (route = 'eurbrl') => {
        const baseText = `🪙 What is USDC?

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
    `;

        if (route === 'brleur') {
          return `${baseText}
    You use it as a "pivot currency": BRL → USDC → EUR.`;
        }

        // Default: eurbrl
        return `${baseText}
    You use it as a "pivot currency": EUR → USDC → BRL.`;
      },
    
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
    
      // ✅ SCREEN 13: GUIDE_TRANSITION (direction-aware)
      GUIDE_TRANSITION: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✅ You have (or will have):
    • A 🇧🇷 account to: deposit BRL via Pix → buy USDC
    • A 🇪🇺 account to: receive USDC → sell for EUR → withdraw via bank transfer

    🌐 You're taking your first on-chain step.
    It's more than just a transfer:
    • you're discovering a technology that's already changing global finance,
    • you're joining millions of users, companies, and institutions,
    • you're keeping more value for yourself (and less for intermediaries 💸).

    🚀 Now, let's start concretely: first step → deposit your BRL in your 🇧🇷 account and convert them to USDC.`;
        }

        // Default: eurbrl
        return `✅ You have (or will have):
    • A 🇪🇺 account to: deposit EUR via bank transfer → buy USDC
    • A 🇧🇷 account to: receive USDC → sell for BRL → withdraw via Pix

    🌐 You're taking your first on-chain step.
    It's more than just a transfer:
    • you're discovering a technology that's already changing global finance,
    • you're joining millions of users, companies, and institutions,
    • you're keeping more value for yourself (and less for intermediaries 💸).

    🚀 Now, let's start concretely: first step → deposit your EUR in your 🇪🇺 account and convert them to USDC.`;
      },
    
      STEP_1_1: (amount, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `1️⃣ Deposit your BRL in the exchange account

    • Go to the "Deposit / Fiat" section.
    • Choose BRL as currency.
    • Simplest method: Pix (instant, usually free).

    💡 "Fiat" = traditional currencies (EUR, USD, BRL…).

    👉 Recommended: Binance BR.

    Balance estimate: R$ ${formatAmount(amount, 0, locale)}
    *⚠️ This is an estimate, close to reality. Bank fees and delays may vary slightly.*`;
        }

        // Default: eurbrl
        return `1️⃣ Deposit your EUR in the exchange account

    • Go to the "Deposit / Fiat" section.
    • Choose EUR as currency.
    • Simplest method: bank transfer / SEPA (fast, low or no fees).

    💡 "Fiat" = traditional currencies (EUR, USD, BRL…).

    👉 Recommended: Kraken.

    Balance estimate: €${formatAmount(amount, 0, locale)}
    *⚠️ This is an estimate, close to reality. Bank fees and delays may vary slightly.*`;
      },
    
      STEP_1_2: (amount, locale, route = 'eurbrl') => {
    if (route === 'brleur') {
      return `2️⃣ Access the market to buy USDC

    • In your exchange, look for "Trader / Market / Trade".
    • Select the BRL/USDC pair.

    💡 A crypto market is like a currency exchange: you exchange one currency for another.

    Balance estimate: R$ ${formatAmount(amount, 0, locale)} (ready for USDC purchase)
    *⚠️ Indicative estimate.*`;
    }

    // Default: eurbrl
    return `2️⃣ Access the market to buy USDC

    • In your exchange, look for "Trader / Market / Trade".
    • Select the EUR/USDC pair.

    💡 A crypto market is like a currency exchange: you exchange one currency for another.

    Balance estimate: €${formatAmount(amount, 0, locale)} (ready for USDC purchase)
    *⚠️ Indicative estimate.*`;
  },
    
      STEP_1_3: (usdcAmount, locale, route = 'eurbrl') => `3️⃣ Buy your USDC
    
    • Choose the order type:
      • Market → instant, simple, recommended.
      • Limit → you set your price, useful for large amounts/liquidity.
    
    👉 For beginners: market order.
    
    Balance estimate: ~${formatAmount(usdcAmount, 2, locale)} USDC
    *⚠️ Estimate close to reality. Fees & prices may vary slightly.*`,
    
      STEP_1_4: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✅ Well done! You now have USDC in your 🇧🇷 account.

    ✨ USDC are "stablecoins": ~1 USDC = 1 USD.
    This is the key to transferring your money quickly and at low cost.

    Next step: send them on-chain to Europe.`;
        }

        // Default: eurbrl
        return `✅ Well done! You now have USDC in your 🇪🇺 account.

    ✨ USDC are "stablecoins": ~1 USDC = 1 USD.
    This is the key to transferring your money quickly and at low cost.

    Next step: send them on-chain to Brazil.`;
      },
    
      STEP_2_1: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✨ This is the "on-chain" step → fast and low cost, but requires some concentration.
    Unlike a bank, if you make a mistake, there's no customer service to recover your funds.

    1️⃣ Get your 🇪🇺 deposit address

    • In your European exchange, look for "Deposit / Crypto".
    • Choose USDC as crypto to deposit.
    • Select the transfer network.

    💡 We recommend Polygon (MATIC) → fast, reliable, low fees (~1 USDC).

    • Carefully copy the address.

    💡 Imagine it's like your bank IBAN, but blockchain version (a long sequence of letters and numbers).`;
        }

        // Default: eurbrl
        return `✨ This is the "on-chain" step → fast and low cost, but requires some concentration.
    Unlike a bank, if you make a mistake, there's no customer service to recover your funds.

    1️⃣ Get your 🇧🇷 deposit address

    • In your Brazilian exchange, look for "Deposit / Crypto".
    • Choose USDC as crypto to deposit.
    • Select the transfer network.

    💡 We recommend Polygon (MATIC) → fast, reliable, low fees (~1 USDC).

    • Carefully copy the address.

    💡 Imagine it's like your bank IBAN, but blockchain version (a long sequence of letters and numbers).`;
      },
    
      STEP_2_2: (usdcAmount, locale, route = 'eurbrl') => {
    if (route === 'brleur') {
      return `2️⃣ Send from your 🇧🇷 exchange

    • Go to "Withdrawal / Withdraw" → USDC.
    • Paste the copied address.
    • Choose the same network as the deposit (e.g. Polygon).

    💡 The network is like train rails: if they're not the same on both sides, the money goes elsewhere and is lost.

    • Enter your amount. You can send everything, or start with a test (e.g. 10 USDC).

    👉 Testing costs a bit more (fixed fees ~1 USDC apply twice), but it's a common good practice in crypto.

    Estimate: you'll receive ~${formatAmount(usdcAmount - 1, 2, locale)} USDC 🇪🇺 side
    *⚠️ Estimate close to reality (network fee ~1 USDC).*`;
    }

    // Default: eurbrl
    return `2️⃣ Send from your 🇪🇺 exchange

    • Go to "Withdrawal / Withdraw" → USDC.
    • Paste the copied address.
    • Choose the same network as the deposit (e.g. Polygon).

    💡 The network is like train rails: if they're not the same on both sides, the money goes elsewhere and is lost.

    • Enter your amount. You can send everything, or start with a test (e.g. 10 USDC).

    👉 Testing costs a bit more (fixed fees ~1 USDC apply twice), but it's a common good practice in crypto.

    Estimate: you'll receive ~${formatAmount(usdcAmount - 1, 2, locale)} USDC 🇧🇷 side
    *⚠️ Estimate close to reality (network fee ~1 USDC).*`;
  },
    
      STEP_2_3: `3️⃣ Verify and confirm
    
    • Carefully re-read the address and network before validating.
    
    ⚠️ A single wrong character in the address, or wrong network, and your funds are permanently lost.
    
    👉 Once you've verified everything, you can confirm the transfer.`,
    
      STEP_2_4: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `4️⃣ Wait for arrival

    • Usually, the transaction takes 1-2 minutes, sometimes up to 10 min.
    • You'll see your USDC balance appear 🇪🇺 side.

    ✅ Result: your USDC arrived → ready for step 3 (EUR sale + bank transfer withdrawal).`;
        }

        // Default: eurbrl
        return `4️⃣ Wait for arrival

    • Usually, the transaction takes 1-2 minutes, sometimes up to 10 min.
    • You'll see your USDC balance appear 🇧🇷 side.

    ✅ Result: your USDC arrived → ready for step 3 (BRL sale + Pix withdrawal).`;
      },
    
      STEP_3_1: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `1️⃣ Find the USDC/EUR market 🇪🇺

    • In your European exchange, go to Trader / Market.
    • Select the USDC/EUR pair.

    👉 Next step: your USDC finally turn into EUR 🎉`;
        }

        // Default: eurbrl
        return `1️⃣ Find the USDC/BRL market 🇧🇷

    • In your Brazilian exchange, go to Trader / Market.
    • Select the USDC/BRL pair.

    👉 Next step: your USDC finally turn into BRL 🎉`;
      },
    
      STEP_3_2: (finalAmount, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `2️⃣ Place your order

    • "Market" → instant, at current price (simple, recommended).
    • "Limit" → you set your price, useful for large amounts.

    👉 For most people, "market order" = simplest and fastest.

    Balance estimate: ~€${formatAmount(finalAmount, 2, locale)}
    *⚠️ Estimate close to reality (fees ~0.1%).*`;
        }

        // Default: eurbrl
        return `2️⃣ Place your order

    • "Market" → instant, at current price (simple, recommended).
    • "Limit" → you set your price, useful for large amounts.

    👉 For most people, "market order" = simplest and fastest.

    Balance estimate: ~R$ ${formatAmount(finalAmount, 2, locale)}
    *⚠️ Estimate close to reality (fees ~0.1%).*`;
      },
    
      STEP_3_3: (finalNet, locale, route = 'eurbrl') => {
    if (route === 'brleur') {
      return `3️⃣ Withdraw your money in EUR

    • Once your USDC are sold, your balance appears in EUR.
    • Go to Withdrawal / Withdraw.
    • Choose bank transfer (SEPA) as method.

    👉 Enter your bank details (IBAN, etc.)… Classic banking withdrawal.

    💡 By the way: make sure your IBAN is correct, just like with any bank transfer.

    👉 Usually, bank transfer withdrawals are free or have very low fees on most European exchanges.

    Received balance estimate: ~€${formatAmount(finalNet, 2, locale)} net
    *⚠️ Well, we shouldn't be too far from reality ;)*`;
    }

    // Default: eurbrl
    return `3️⃣ Withdraw your money in R$

    • Once your USDC are sold, your balance appears in BRL.
    • Go to Withdrawal / Withdraw.
    • Choose Pix as method.

    👉 Enter your Pix key (CPF, email, phone, random key)… but you already know how to do that 😉

    💡 By the way: just like a crypto address, if the key is wrong, the money goes to the wrong place.

    👉 Usually, fees are very low (e.g. Binance ~R$3.50 per Pix withdrawal).
    Should be free honestly… but well 😅

    Received balance estimate: ~R$ ${formatAmount(finalNet, 2, locale)} net
    *⚠️ Well, we shouldn't be too far from reality ;)*`;
  },
    
      WHY_NOT_EXACT: `🤔 Why can't we give the exact amount?
    
    Variables that move in real time:
    
    • Exchange fees: can vary according to your user profile, trading volume, or occasional promotions (but always remain low).
    
    • Network fees: fluctuate according to blockchain network congestion (~1 USDC average on Polygon, but can vary).
    
    • Exchange rate: crypto markets move in real time, even if USDC remains stable, the USDC/BRL rate can slightly fluctuate between when you calculate and when you execute.
    
    Our estimates are prudent and close to reality. You shouldn't have any bad surprises.`,
    
      STEP_3_4: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✅ Your transfer is complete!

    • You converted your BRL to USDC 🇧🇷 side.
    • You sent them on-chain.
    • You sold them for EUR and withdrew via bank transfer 🇪🇺 side.

    ✨ Result: fast, secure, and low cost.

    🌍 You just made a real blockchain passage.
    What you learned today will be increasingly used in the future: you just took a step ahead.

    🙌 We hope you enjoyed the experience!`;
        }

        // Default: eurbrl
        return `✅ Your transfer is complete!

    • You converted your EUR to USDC 🇪🇺 side.
    • You sent them on-chain.
    • You sold them for BRL and withdrew via Pix 🇧🇷 side.

    ✨ Result: fast, secure, and low cost.

    🌍 You just made a real blockchain passage.
    What you learned today will be increasingly used in the future: you just took a step ahead.

    🙌 We hope you enjoyed the experience!`;
      },
    
      // Premium and alerts
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

🔄 <b>RECURRING SUBSCRIPTIONS</b>
Cancel anytime via Mercado Pago

💳 <b>Available plans:</b>
• R$ 6/month (monthly renewal)
• R$ 15/3 months (save 17%)
• R$ 28/6 months (save 22%)
• R$ 50/12 months (save 31%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Subscriptions renew automatically via Mercado Pago.
You can cancel anytime, directly in the Mercado Pago app.

<i>⚖️ Digital service with immediate access. No refunds after activation. By paying, you agree to the terms of use.</i>

❓ Payment issues? Use the "Help" button below.`,

  PREMIUM_ONESHOT_PRICING: `💎 GO PREMIUM

✨ With Premium:
• 🔔 Unlimited custom alerts
• 📢 Regular spontaneous alerts
• 🎯 Multi-pairs (EUR→BRL + BRL→EUR)
• 📊 Advanced analytics
• 🌍 Multi-currency coming soon
• ⚡ Priority access to new features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 <b>ONE-TIME PAYMENT (no subscription)</b>
Pay once, use for the chosen period, no automatic renewal.

💳 <b>Available plans:</b>
• R$ 18 - 3 months
• R$ 32 - 6 months
• R$ 60 - 12 months

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<i>⚖️ Digital service with immediate access. No refunds after activation. By paying, you agree to the terms of use.</i>

❓ Payment issues? Use the "Help" button below.`,
    
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

      PREMIUM_ALERT: (pair, currentRate, avg30d, variation, amountExample, savings, locale) => {
        const isGoodTime = variation > 0;
        const direction = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';

        return `🔔 PREMIUM SPONTANEOUS ALERT

${direction} : ${formatRate(currentRate, locale)}

${isGoodTime ? '💡 Good time to transfer!' : '⚠️ Rate below average - might be better to wait'}

📊 Analysis:
• Current rate: ${formatRate(currentRate, locale)}
• 30d average: ${formatRate(avg30d, locale)}
• Difference: ${variation > 0 ? '+' : ''}${formatAmount(variation, 1, locale)}% ${variation > 0 ? '🎯' : '📉'}

💰 On ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, you ${variation > 0 ? 'gain' : 'lose'} ~${formatAmount(Math.abs(savings), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs average

${isGoodTime ? '✅ The rate is favorable compared to the last month' : '⏳ Consider waiting for a better rate'}

⏰ Next spontaneous alert possible in 6h`;
      },

      PREMIUM_ALERT_ENHANCED: (pair, currentRate, stats, amountExample, locale) => {
        const direction = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        const {avg30d, avg90d, avg365d, variation30d, variation90d, variation365d} = stats;

        // If key data is missing, fall back to simple version
        if (variation30d === null || variation90d === null) {
          const savings = avg30d ? (currentRate - avg30d) * amountExample : 0;
          return this.PREMIUM_ALERT ? this.PREMIUM_ALERT(pair, currentRate, avg30d, variation30d || 0, amountExample, savings, locale) : '';
        }

        const shortTerm = variation30d;
        const mediumTerm = variation90d;
        const longTerm = variation365d;

        // Determine overall observation based on data (factual only)
        let observation, emoji, analysis;

        // Scenario 1: Rate significantly above average (> 2%)
        if (mediumTerm > 2) {
          if (shortTerm > mediumTerm) {
            observation = '📈 Rate well above averages and accelerating';
            emoji = '✅';
            analysis = 'Consistent upward trend across all periods. This might be a favorable moment.';
          } else if (shortTerm > 0) {
            observation = '📊 Rate well above historical averages';
            emoji = '✅';
            analysis = 'Rate is above 30, 90, and 365-day averages.';
          } else {
            observation = '⚠️ Rate above averages but losing strength';
            emoji = '➡️';
            analysis = 'Rate is above long-term averages but declining in the short term.';
          }
        }
        // Scenario 2: Rate slightly above average (0 < rate ≤ 2%)
        else if (mediumTerm > 0) {
          if (shortTerm > mediumTerm + 1) {
            observation = '📈 Rate rising in the short term';
            emoji = '➡️';
            analysis = 'Rate slightly above average and improving rapidly.';
          } else {
            observation = '📊 Rate slightly above average';
            emoji = '➡️';
            analysis = 'Rate close to historical averages.';
          }
        }
        // Scenario 3: Rate below average
        else {
          if (shortTerm > 0) {
            // Recovery: short term turned positive while medium term negative
            observation = '📈 Rate recovering';
            emoji = '➡️';
            analysis = 'Rate below 30d average but showing signs of recovery in the short term.';
          } else if (shortTerm < mediumTerm - 0.5) {
            // Getting worse: short term more negative than medium term
            observation = '📉 Rate in downward trend';
            emoji = '⏳';
            analysis = 'Rate below averages and continuing to decline in the short term.';
          } else if (shortTerm > mediumTerm) {
            // Improving: short term less negative than medium term
            observation = '📊 Rate below average but improving';
            emoji = '⏳';
            analysis = 'Rate still below historical averages but with slight recovery.';
          } else {
            observation = '📊 Rate below historical averages';
            emoji = '⏳';
            analysis = 'Rate is below 30, 90, and 365-day averages.';
          }
        }

        const savings30d = avg30d ? (currentRate - avg30d) * amountExample : 0;

        return `🔔 PREMIUM ALERT - COMPLETE ANALYSIS

${direction} : ${formatRate(currentRate, locale)}

${emoji} ${observation}

📊 <b>Multi-period Analysis:</b>

<b>Short term (30 days)</b>
• Average: ${avg30d ? formatRate(avg30d, locale) : 'N/A'}
• Change: ${variation30d !== null ? (variation30d > 0 ? '+' : '') + formatAmount(variation30d, 1, locale) + '%' : 'N/A'} ${variation30d > 1 ? '📈' : variation30d < -1 ? '📉' : '➡️'}

<b>Medium term (90 days)</b>
• Average: ${formatRate(avg90d, locale)}
• Change: ${variation90d > 0 ? '+' : ''}${formatAmount(variation90d, 1, locale)}% ${variation90d > 1 ? '📈' : variation90d < -1 ? '📉' : '➡️'}

<b>Long term (1 year)</b>
• Average: ${avg365d ? formatRate(avg365d, locale) : 'N/A'}
• Change: ${variation365d !== null ? (variation365d > 0 ? '+' : '') + formatAmount(variation365d, 1, locale) + '%' : 'N/A'} ${variation365d > 1 ? '📈' : variation365d < -1 ? '📉' : '➡️'}

💡 <b>What this means:</b>
${analysis}

💰 <b>Financial impact:</b>
On ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, you ${savings30d > 0 ? 'gain' : 'lose'} ~${formatAmount(Math.abs(savings30d), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs 30d average

⏰ Next spontaneous alert in 6h`;
      },

      PROGRAMMED_ALERT: (pair, currentRate, threshold, refValue, alert, locale) => {
        const typeLabels = {
          absolute: '🎯 Absolute',
          relative: '📊 Relative'
        };

        const refLabels = {
          avg365d: '1-year avg',
          avg30d: '30-day avg',
          avg90d: '90-day avg'
        };

        const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        const typeLabel = typeLabels[alert.threshold_type] || '🔔';

        let text = `🔔 ALERT TRIGGERED

${pairText}
${typeLabel}`;

        if (alert.threshold_type === 'relative') {
          const refLabel = refLabels[alert.reference_type];
          text += ` : +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabel}`;
        } else {
          text += ` : ≥ ${formatRate(alert.threshold_value, locale)}`;
        }

        text += `

💡 Your threshold has been reached!

<b>Analysis:</b>
• Current rate: ${formatRate(currentRate, locale)}`;

        if (alert.threshold_type === 'relative' && refValue) {
          const refLabel = refLabels[alert.reference_type];
          const delta = ((currentRate - refValue) / refValue) * 100;
          text += `
• ${refLabel}: ${formatRate(refValue, locale)}
• Difference: +${formatAmount(delta, 1, locale)}%`;
        }

        text += `
• Alert threshold: ${formatRate(threshold, locale)}`;

        // Format cooldown
        const minutes = alert.cooldown_minutes || 60;
        let cooldownText;
        if (minutes < 60) cooldownText = `${minutes} min`;
        else if (minutes < 1440) cooldownText = `${Math.floor(minutes / 60)}h`;
        else if (minutes < 10080) cooldownText = `${Math.floor(minutes / 1440)} day(s)`;
        else cooldownText = `${Math.floor(minutes / 10080)} week(s)`;

        text += `

⏰ Next alert possible in ${cooldownText}`;

        return text;
      },

      TRIGGERED_ALERT: (pair, currentRate, stats, amountExample, locale) => {
        const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        const currency = pair === 'eurbrl' ? '€' : ' R$';

        const var30d = stats.stats30d ? ((currentRate - stats.stats30d.avg) / stats.stats30d.avg * 100) : null;
        const var90d = stats.stats90d ? ((currentRate - stats.stats90d.avg) / stats.stats90d.avg * 100) : null;
        const var365d = stats.stats365d ? ((currentRate - stats.stats365d.avg) / stats.stats365d.avg * 100) : null;

        const gain30d = stats.stats30d ? (currentRate - stats.stats30d.avg) * amountExample : null;

        // Determine if it's a good time based on averages
        const isGoodTime = var30d > 0;

        let text = `📢 ADMIN ALERT

${pairText} : ${formatRate(currentRate, locale)}

📊 <b>Current position:</b>

`;

        if (stats.stats30d) {
          text += `<b>Last 30 days:</b>
• Average: ${formatRate(stats.stats30d.avg, locale)}
• Min: ${formatRate(stats.stats30d.min, locale)}
• Max: ${formatRate(stats.stats30d.max, locale)}
• Change vs average: ${var30d > 0 ? '+' : ''}${formatAmount(var30d, 1, locale)}%\n\n`;
        }

        if (stats.stats90d) {
          text += `<b>Last 90 days:</b>
• Average: ${formatRate(stats.stats90d.avg, locale)}
• Min: ${formatRate(stats.stats90d.min, locale)}
• Max: ${formatRate(stats.stats90d.max, locale)}
• Change vs average: ${var90d > 0 ? '+' : ''}${formatAmount(var90d, 1, locale)}%\n\n`;
        }

        if (stats.stats365d) {
          text += `<b>Last 12 months:</b>
• Average: ${formatRate(stats.stats365d.avg, locale)}
• Min: ${formatRate(stats.stats365d.min, locale)}
• Max: ${formatRate(stats.stats365d.max, locale)}
• Change vs average: ${var365d > 0 ? '+' : ''}${formatAmount(var365d, 1, locale)}%\n\n`;
        }

        if (gain30d !== null) {
          text += `💰 <b>Example on ${formatAmount(amountExample, 0, locale)}${currency}:</b>
You ${gain30d > 0 ? 'gain' : 'lose'} ~${formatAmount(Math.abs(gain30d), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs 30d average\n\n`;
        }

        text += isGoodTime
          ? `💡 Rate above average - good time to transfer!`
          : `⏳ Rate below average - consider waiting.`;

        return text;
      },

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
            avg365d: '1y avg',
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
    
    ALERT_CHOOSE_REFERENCE: (pair, currentRate, avg30d, avg90d, avg365d, locale) => `📊 RELATIVE THRESHOLD

    Current rate: ${formatRate(currentRate, locale)}

    +X% compared to what?

    💡 <i>The reference will be recalculated at each check (every 2h)</i>`,

    ALERT_CHOOSE_PERCENT: (pair, refType, refValue, locale) => {
      const refLabels = {
        current: `Current rate (${formatRate(refValue, locale)})`,
        avg30d: `30-day avg (${formatRate(refValue, locale)})`,
        avg90d: `90-day avg (${formatRate(refValue, locale)})`,
        avg365d: `1-year avg (${formatRate(refValue, locale)})`
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
        avg365d: '1-year avg',
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
          avg365d: '1-year avg',
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
    
    
      CONVERT_ASK_AMOUNT: "💱 What amount do you want to convert?\n\nExample: 253 or 1500 brl",
      RATE_LABEL: "Rate", // ou "Taxa" (PT), "Rate" (EN)
      BETTER_BY: "better by", // ou "melhor em" (PT), "better by" (EN)
    
    
      btn: {
        langFR: '🇫🇷 Français',
        langPT: '🇧🇷 Português',
        langEN: '🇬🇧 English',
        about: 'ℹ️ About',
        eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
        brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (bank transfer) · R$ ${formatAmount(amt, 0, locale)}`,
        
        // ✅ Renamed buttons
        contOn: '🚀 Convert on-chain',
        stayOff: '🏦 Convert off-chain',
        calcdetails: '🔍 On-chain calculation details',
        swapMode: '🔄 Swap',
        change: '✏️ Change amount',
        moreOptions: '⚙️ More options',
        
        back: '⬅️ Back',
        subscribe: '💳 Subscribe',
        pay: '💳 Pay',
        sources: '📊 Data sources',
        openWise: '🔗 Open Wise',
        openRemitly: '🔗 Open Remitly',
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
        minAmount: '💰 What\'s the minimum amount?',
        aboutReferrals: '🤝 About referral links',
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
        
        startStep1: (route = 'eurbrl') => route === 'brleur'
          ? '🚀 Deposit & convert my BRL to USDC'
          : '🚀 Deposit & convert my EUR to USDC',
        step1Done: (route = 'eurbrl') => route === 'brleur'
          ? '✅ I deposited my BRL'
          : '✅ I deposited my EUR',
        step1_2Done: (route = 'eurbrl') => route === 'brleur'
          ? '✅ I found the BRL/USDC market'
          : '✅ I found the EUR/USDC market',
        step1_3Done: '✅ I bought my USDC',
        marketVsLimit: 'ℹ️ Market vs Limit',
        nextStep2: '👉 Go to step 2 (transfer)',
        
        // ✅ New skip buttons
        skipToStep2: "I already have USDC (skip)",
        skipToStep3: "⏭️ Skip to step 3",
        
        step2Done: '✅ I have my address → continue',
        step2_2Done: '✅ I entered my amount',
        step2_3Done: '✅ I confirmed the transfer',
        step3Start: (route = 'eurbrl') => route === 'brleur'
          ? '🇪🇺 Step 3 — Sell USDC & withdraw via bank transfer'
          : '🇧🇷 Step 3 — Sell USDC & withdraw via Pix',
        step3_1Done: '✅ I found the market',
        step3_2Done: '✅ I placed my order',
        step3_3Done: (route = 'eurbrl') => route === 'brleur'
          ? '✅ I initiated my bank transfer'
          : '✅ I initiated my Pix',
        whyNotExact: '🤔 Why not exact balance?',
        setAlert: '⏰ Activate my alert',
        premium: '🚀 Discover Premium',
        giveFeedback: '💬 Give feedback',
        seePremium: '💎 See Premium',
        seeOneshot: '💰 Or one-time payment (no auto-renewal) →',
        backToSubscriptions: '⬅️ Back to subscriptions',
        addMoreTime: '💰 Add more time (one-time payment)',
        switchToSubscription: '🔄 Switch to recurring subscription',

        // Subscription plans (recurring)
        subMPMonthly: '🔄 R$ 6/month',
        subMPQuarterly: '🔄 R$ 15/3 months (-17%)',
        subMPSemiannual: '🔄 R$ 28/6 months (-22%)',
        subMPAnnual: '🔄 R$ 50/12 months (-31%)',
        subPPQuarterly: '💳 €4/3 months',
        subPPSemiannual: '💳 €7/6 months',
        subPPAnnual: '💳 €12/12 months',

        // One-shot plans
        oneshot3m: '💰 R$ 18 - 3 months',
        oneshot6m: '💰 R$ 32 - 6 months',
        oneshot12m: '💰 R$ 60 - 12 months',
        oneshotPP3m: '💰 $4.50 - 3 months',
        oneshotPP6m: '💰 $8 - 6 months',
        oneshotPP12m: '💰 $15 - 12 months',

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
        refAvg30d:  (rate, locale) => `📊 30d average (${formatRate(rate, locale)}) ⭐`,
        refAvg90d:  (rate, locale) => `📈 90d average (${formatRate(rate, locale)})`,
        refAvg365d: (rate, locale) => `📅 1-year average (${formatRate(rate, locale)})`,
    
        backToPricing: '⬅️ Back to pricing',
        chooseCooldown15: '⚡ 15 minutes',
        chooseCooldown1h: '⏱️ 1 hour ⭐',
        chooseCooldown6h: '⏰ 6 hours',
        chooseCooldown24h: '📅 24 hours',
        chooseCooldown1week: '📆 1 week',
        deleteAlert: '🗑️ Delete',
        viewAlert: '👁️ View details',

        // ✅ Additional buttons for language consistency
        pairEurBrl: '🇪🇺 EUR → 🇧🇷 BRL',
        pairBrlEur: '🇧🇷 BRL → 🇪🇺 EUR',
        compareNow: '🚀 Compare now',
        editMyAlert: '⚙️ Edit my alert',
        deleteMyAlert: '🗑️ Delete this alert',
        help: '❓ Help',
        paymentHelp: '💬 Payment support',
        mainMenu: '🏠 Main menu',

        // Premium buttons with prices (for keyboards.js)
        plan3months: '📅 3 months - R$ 15.00',
        plan6months: '📅 6 months - R$ 28.00 (-7%)',
        plan12months: '📅 12 months - R$ 50.00 (-17%)',
        renewPlan3months: '🔄 Renew 3 months - R$ 15.00',
        renewPlan6months: '🔄 Renew 6 months - R$ 28.00 (-7%)',
        renewPlan12months: '🔄 Renew 12 months - R$ 50.00 (-17%)',
      },
    };