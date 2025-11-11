import { formatAmount, formatRate, getLocale } from '../../services/rates.js';
import { formatCooldown } from './helpers.js';

export const messagesPt = {
    INTRO_TEXT: `👋 Oi !

    🌐 Escolha o idioma · Choisis ta langue · Choose your language`,
    
      ABOUT_TEXT: `💡 Sobre

    Este bot compara taxas EUR↔BRL e te guia em transferências on-chain (via blockchain).

    As taxas on-chain costumam ser melhores que as plataformas tradicionais. É legal, seguro e usado por muitas instituições.

    Serviço gratuito, financiado por links de indicação.

    <i>⚖️ Este serviço é apenas informativo. Não é aconselhamento financeiro. Sempre verifique taxas e condições nas plataformas antes de operar.</i>`,
    
      ERROR_RATES_UNAVAILABLE: `⚠️ Taxas crypto indisponíveis. Tente novamente em instantes.`,
      ERROR_INVALID_AMOUNT: `⚠️ Valor inválido. Digite um número (ex. 1000)`,
      ERROR_UPDATE_FAILED: `❌ Erro ao atualizar.`,
    
      // ✅ MENU PRINCIPAL
      promptAmt: `🏠 <b>Menu Principal</b>\n\n💱 Compare as melhores taxas EUR↔BRL ao vivo\n\n<b>💎 Premium:</b>\n🔔 Alertas personalizados\n⏰ Notificações no melhor momento para converter\n\n━━━━━━━━━━━━━━━━━━\n\n👉 <i>Escolha abaixo ou envie um valor (ex: 1000)</i>`,
      
      askAmount: `✏️ Digite um valor (ex. 1000)`,
      
      askRoute: (amount, locale) => `O que você quer fazer com ${formatAmount(amount, 0, locale)}?`,
      
      // ✅ TELA 3: buildComparison
      buildComparison: ({ route, amount, rates, onchain, bestBank, others, delta, locale, isTargetMode = false }) => {
        const now = new Date();

        let title;
        if (isTargetMode) {
          if (route === 'eurbrl') {
            title = `💱 Para receber ${formatAmount(amount, 0, locale)} BRL\nPrecisa ~${formatAmount(onchain.in, 0, locale)} EUR`;
          } else {
            title = `💱 Para receber ${formatAmount(amount, 0, locale)} EUR\nPrecisa ~${formatAmount(onchain.in, 0, locale)} BRL`;
          }
        } else {
          title = route === 'eurbrl'
            ? `💱 ${formatAmount(amount, 0, locale)} EUR → BRL`
            : `💱 ${formatAmount(amount, 0, locale)} BRL → EUR`;
        }

        const timeStr = now.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
        const tzAbbr = new Date().toLocaleTimeString('en-US', {timeZoneName: 'short'}).split(' ')[2];

        // ✅ Linha referência - Yahoo Finance apenas
        let ref;
        if (rates.yahooFrozen) {
          // Yahoo indisponível (fim de semana/mercado fechado) - mostrando taxa crypto
          ref = `📊 Taxa de referência ${formatRate(rates.cross, locale)} • ${timeStr} ${tzAbbr}\n⚠️ Taxa oficial congelada (fim de semana) - mostrando taxa ${rates.referenceSource}`;
        } else {
          // Yahoo disponível - referência oficial
          ref = `📊 Taxa oficial ${formatRate(rates.cross, locale)} (Yahoo Finance) • ${timeStr} ${tzAbbr}`;
        }
        
        let onchainLine, bankLine;
        
        if (isTargetMode) {
          if (route === 'eurbrl') {
            onchainLine = `🌍 On-chain\n~${formatAmount(onchain.in, 0, locale)} EUR → ${formatAmount(amount, 2, locale)} BRL (${formatRate(onchain.rate, locale)})`;
            
            if (!bestBank) {
              bankLine = `🏦 Melhor off-chain\n⚠️ Taxa indisponível`;
            } else {
              bankLine = `🏦 ${bestBank.provider}\n~${formatAmount(bestBank.in, 0, locale)} EUR → ${formatAmount(amount, 2, locale)} BRL (${formatRate(bestBank.rate, locale)})`;
            }
          } else {
            onchainLine = `🌍 On-chain\n~${formatAmount(onchain.in, 0, locale)} BRL → ${formatAmount(amount, 2, locale)} EUR (${formatRate(onchain.rate, locale)})`;
            
            if (!bestBank) {
              bankLine = `🏦 Melhor off-chain\n⚠️ Taxa indisponível`;
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
            bankLine = `🏦 Melhor off-chain\n⚠️ Taxa indisponível`;
          } else {
            if (route === 'eurbrl') {
              bankLine = `🏦 ${bestBank.provider}\n€${formatAmount(amount, 0, locale)} → R$ ${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
            } else {
              bankLine = `🏦 ${bestBank.provider}\nR$ ${formatAmount(amount, 0, locale)} → €${formatAmount(bestBank.out, 2, locale)} (${formatRate(bestBank.rate, locale)})`;
            } 
          }
        }
        
        // ✅ Seção "Outros"
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
          othersText = `\n\nOutros :\n${formattedOthers}`;
          
          if (count > 3) {
            othersText += `\n+ ${count - 3} outros disponíveis`;
          }
        }
        
        // ✅ Delta
        let deltaText = '';
        if (delta !== null && bestBank) {
          if (isTargetMode) {
            const sign = delta <= 0 ? '−' : '+';
            const absValue = Math.abs(delta);
            deltaText = delta <= 0 
              ? `\n\n✅ Você economiza aproximadamente ${sign}${formatAmount(absValue, 1, locale)}% on-chain`
              : `\n\n⚠️ ${sign}${formatAmount(absValue, 1, locale)}% on-chain (mais caro)`;
          } else {
            const sign = delta >= 0 ? '+' : '−';
            deltaText = `\n\n✅ Você economiza aproximadamente ${sign}${formatAmount(Math.abs(delta), 1, locale)}% on-chain`;
          }
        }
        
        return `${title}\n\n${ref}\n\n${onchainLine}\n\n${bankLine}${othersText}${deltaText}`;
      },
    
      // ✅ TELA 4: buildCalcDetails
      buildCalcDetails: ({ route, amount, rates, onchain, locale }) => {
        const title = '🔍 Detalhes do cálculo on-chain';
        
        if (route === 'eurbrl') {
          const { usdcAfterBuy, usdcAfterNetwork, brlAfterTrade, brlNet } = onchain.breakdown;
          
          return `${title}
    
    📊 EUR → BRL via USDC
    
    1️⃣ <b>Compra de USDC na Europa</b>
       💰 Valor : €${formatAmount(amount, 2, locale)}
       📉 Taxa de trading (~0,1%) : −€${formatAmount(amount * 0.001, 2, locale)}
       🪙 USDC obtidos : ${formatAmount(usdcAfterBuy, 2, locale)} USDC
    
    2️⃣ <b>Transferência blockchain</b>
       🌍 Rede : Polygon (MATIC)
       📉 Taxa de rede : −${formatAmount(1, 2, locale)} USDC
       🪙 USDC recebidos no Brasil : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
    
    3️⃣ <b>Venda de USDC no Brasil</b>
       🪙 USDC para vender : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
       💱 Taxa USDC/BRL : ${formatRate(rates.usdcBRL, locale)}
       📉 Taxa de trading (~0,1%) : −R$ ${formatAmount(usdcAfterNetwork * rates.usdcBRL * 0.001, 2, locale)}
       💰 BRL obtidos : R$ ${formatAmount(brlAfterTrade, 2, locale)}
    
    4️⃣ <b>Saque Pix</b>
       📉 Taxa Pix (se aplicável) : −R$ ${formatAmount(3.5, 2, locale)}
       
    ✅ <b>Total recebido : R$ ${formatAmount(brlNet, 2, locale)}</b>
    📊 <b>Taxa efetiva : ${formatRate(onchain.rate, locale)}</b>
    
    💡 As taxas reais podem variar levemente segundo sua plataforma e seu volume de trading.`;
        } else {
          const { usdcFromBRL, usdcAfterNetwork, eurOut, eurNet } = onchain.breakdown;
          
          return `${title}
    
    📊 BRL → EUR via USDC
    
    1️⃣ <b>Compra de USDC no Brasil</b>
       💰 Valor : R$ ${formatAmount(amount, 2, locale)}
       💱 Taxa BRL/USDC : ${formatRate(1/rates.usdcBRL, locale)}
       📉 Taxa de trading (~0,1%) : −R$ ${formatAmount(amount * 0.001, 2, locale)}
       🪙 USDC obtidos : ${formatAmount(usdcFromBRL, 2, locale)} USDC
    
    2️⃣ <b>Transferência blockchain</b>
       🌍 Rede : Polygon (MATIC)
       📉 Taxa de rede : −${formatAmount(1, 2, locale)} USDC
       🪙 USDC recebidos na Europa : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
    
    3️⃣ <b>Venda de USDC na Europa</b>
       🪙 USDC para vender : ${formatAmount(usdcAfterNetwork, 2, locale)} USDC
       💱 Taxa EUR/USDC : ${formatRate(rates.usdcEUR, locale)}
       📉 Taxa de trading (~0,1%) : −€${formatAmount(usdcAfterNetwork * rates.usdcEUR * 0.001, 2, locale)}
       
    ✅ <b>Total recebido : €${formatAmount(eurNet, 2, locale)}</b>
    📊 <b>Taxa efetiva : ${formatRate(onchain.rate, locale)}</b>
    
    💡 As taxas reais podem variar levemente segundo sua plataforma e seu volume de trading.`;
        }
      },
    
      SOURCES_TEXT: `📊 Fontes dos dados

    Taxa de referência EUR/BRL: Yahoo Finance (taxa oficial do mercado FX)

    Cálculo on-chain:
    • Taxas crypto: Coinpaprika (principal), CryptoCompare, ou CoinGecko (USDC/EUR, USDC/BRL)
    • Taxas reais incluídas:
      - Trading ~0,1%
      - Rede Polygon ~1 USDC
      - Saque Pix ~R$3,50

    Taxas off-chain: API Wise Comparisons (taxas ao vivo dos provedores)

    Links de indicação: gratuitos para você, financiam o serviço.`,

      SOURCES_PROOF: `📊 <b>Provas & Fontes</b>

    Clique nos links abaixo para acessar os estudos e relatórios oficiais que provam a vantagem das transferências on-chain.`,

      // ✅ TELA 5: buildOffChain
      buildOffChain: ({ route, amount, bestBank, others, locale, onchainAmount }) => {
        const title = '🏦 Off-chain';
        
        if (!bestBank) {
          return `${title}\n\n⚠️ Taxas indisponíveis no momento.`;
        }
        
        const allProviders = [bestBank, ...others];
        const displayProviders = allProviders.sort((a, b) => b.out - a.out);
        
        const providersList = displayProviders.map((p, i) => {
          if (route === 'eurbrl') {
            return `<b>${i + 1}. ${p.provider}</b>\n💰 Você recebe : R$ ${formatAmount(p.out, 2, locale)}\n📊 Taxa efetiva : ${formatRate(p.rate, locale)}`;
          } else {
            return `<b>${i + 1}. ${p.provider}</b>\n💰 Você recebe : €${formatAmount(p.out, 2, locale)}\n📊 Taxa efetiva : ${formatRate(p.rate, locale)}`;
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
            savingsText = `\n\n⚠️ <b>Off-chain custa ${currency} ${formatAmount(Math.abs(difference), 2, locale)} a mais!</b>\n💰 Economize ~${percentSavings}% escolhendo on-chain →`;
          }
        }

        const footer = `${savingsText}

    <i>*Dados fornecidos por Wise Comparisons</i>`;

        return `${title}\n\n${providersList}${footer}`;
      },
    
      // ✅ TELA 6: ONCHAIN_INTRO (direction-aware)
      ONCHAIN_INTRO: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `🚀 ROTA ON-CHAIN

    📍 <b>O processo em 3 etapas</b>
    1️⃣ Brasil → Troca seus BRL em USDC (Pix)
    2️⃣ Blockchain → Envia seus USDC
    3️⃣ Europa → Converte USDC em EUR (transferência bancária)

    ✅ <b>O que você precisa</b>
    • 🇧🇷 Exchange no Brasil aceitando depósito BRL (Pix)
    • 🇪🇺 Exchange na Europa aceitando saque EUR (transferência bancária - SEPA)

    💡 Temos recomendações!

    💡 <b>Fun fact:</b> As taxas on-chain (~0,5-1%) são 5 a 10 vezes mais baratas que transferências clássicas (2,5-6%)!`;
        }

        // Default: eurbrl
        return `🚀 ROTA ON-CHAIN

    📍 <b>O processo em 3 etapas</b>
    1️⃣ Europa → Troca seus EUR em USDC
    2️⃣ Blockchain → Envia seus USDC
    3️⃣ Brasil → Converte USDC em BRL (Pix)

    ✅ <b>O que você precisa</b>
    • 🇪🇺 Exchange na Europa aceitando depósito EUR (transferência bancária - SEPA)
    • 🇧🇷 Exchange no Brasil aceitando saque BRL (Pix)

    💡 Temos recomendações!

    💡 <b>Fun fact:</b> As taxas on-chain (~0,5-1%) são 5 a 10 vezes mais baratas que transferências clássicas (2,5-6%)!`;
      },
    
      // ✅ TELA 7: FAQ_MENU
      FAQ_MENU: `🤔 ALGUMA DÚVIDA?
    
    Escolha um assunto ou faça sua pergunta:`,
    
      // ✅ TELA 8: FAQ_WHY_ONCHAIN
      FAQ_WHY_ONCHAIN: `💡 POR QUE ON-CHAIN?
    
    🌍 <b>A blockchain elimina os intermediários</b>
    
    Transferência clássica:
    Seu banco → Banco correspondente → Banco beneficiário
    💸 Cada intermediário cobra sua comissão (2,5-6% total)
    
    Transferência on-chain:
    Você → Blockchain → Destinatário
    💸 Taxas fixas mínimas (~0,5-1% total)
    
    📊 <b>As provas:</b>
    
    • <b>Cryptocurrency-based remittance statistics 2025</b>
    Serviços tradicionais cobram em média 6,5% em taxas, contra ~1% para stablecoins.
    
    • <b>World Bank (março 2025)</b>
    Custo médio das transferências tradicionais: 6,49% do valor.
    
    • <b>CFA Institute (2025)</b>
    Investidores institucionais já usam stablecoins para reduzir custos e tempo de liquidação.
    
    • <b>McKinsey (2025)</b>
    O volume de transferências transfronteiriças via stablecoins explodiu: infraestrutura de pagamento moderna.
    
    ✅ Legal, seguro, e usado por muitas instituições.`,
    
      // ✅ TELA 9: FAQ_SEND_QUESTION
      FAQ_SEND_QUESTION: `📧 FAÇA SUA PERGUNTA
    
    Envie sua pergunta e eu a transmitirei à equipe.
    
    Você receberá uma resposta em 24-48h.
    
    <i>Para cancelar, clique em "Voltar"</i>`,
    
      FAQ_QUESTION_RECEIVED: `✅ PERGUNTA RECEBIDA

    Obrigado! Respondemos em 24-48h.`,

      FAQ_MIN_AMOUNT: `💰 QUAL O VALOR MÍNIMO?

<b>Resumo rápido:</b> A partir de €300-400, on-chain compensa.

<b>Por quê?</b>

As taxas de rede blockchain são fixas (~1 USDC ≈ €0,95).
Com valores pequenos, essa taxa fixa pesa muito.

📊 <b>Comparação prática:</b>

<b>Transferência de €50:</b>
• Taxa rede: €0,95 = 1,9%
• Taxas trading: ~0,2%
• <b>Total on-chain: ~2,1%</b>
• Wise: ~2,5%
→ Economia mínima, não vale o esforço

<b>Transferência de €500:</b>
• Taxa rede: €0,95 = 0,19%
• Taxas trading: ~0,2%
• <b>Total on-chain: ~0,4%</b>
• Wise: ~2,5%
→ <b>Economia de ~€10!</b> 💰

<b>Transferência de €5.000:</b>
• Taxa rede: €0,95 = 0,019%
• Taxas trading: ~0,2%
• <b>Total on-chain: ~0,22%</b>
• Wise: ~2,5%
→ <b>Economia de ~€115!</b> 🎉

<b>Conclusão:</b> Quanto maior o valor, maior a economia percentual.`,

      REFERRAL_EXPLANATION: `🤝 SOBRE OS LINKS DE INDICAÇÃO

<b>Transparência total:</b>

Alguns links neste bot são links de indicação (também chamados de "afiliados" ou "referral links").

<b>Como funciona?</b>

• Quando você se cadastra usando um desses links, o criador do bot recebe uma pequena comissão ou bônus
• Isso NÃO custa nada extra pra você - o preço é exatamente o mesmo
• Em alguns casos, <b>você também ganha bônus!</b>
  → Exemplo: Wise oferece até €75 após sua primeira transferência
  → Remitly oferece descontos em transferências iniciais

<b>Por que fazemos isso?</b>

• Manter este bot 100% gratuito exige tempo e recursos
• Links de indicação ajudam a cobrir custos de servidor e desenvolvimento
• É uma forma win-win: você ganha acesso gratuito + possíveis bônus, o bot continua funcionando

<b>Nossa promessa:</b>

Só recomendamos plataformas que realmente usamos e confiamos. A qualidade do serviço vem sempre em primeiro lugar.

💚 Obrigado por apoiar este projeto!`,

      // ✅ TELA 10: WHAT_IS_EXCHANGE (direction-aware)
      WHAT_IS_EXCHANGE: (route = 'eurbrl') => {
        const baseText = `🏦 O que é um exchange?

    Um exchange crypto é como um bureau de câmbio digital.

    Você pode:
    • Depositar dinheiro tradicional (EUR, BRL...)
    • Comprar/vender cryptos (USDC, Bitcoin...)
    • Enviá-los para outros exchanges

    Os mais conhecidos: Kraken, Binance, Coinbase, Bitso...

    Para nosso caso:`;

        if (route === 'brleur') {
          return `${baseText}
    • Exchange Brasil = você deposita BRL (Pix), compra USDC
    • Exchange Europa = você recebe USDC, vende por EUR, saca por transferência bancária (SEPA)

    É regulamentado e seguro (se escolher plataformas reconhecidas).

    👉 Vamos te recomendar nossos preferidos nas próximas telas.`;
        }

        // Default: eurbrl
        return `${baseText}
    • Exchange Europa = você deposita EUR, compra USDC
    • Exchange Brasil = você recebe USDC, vende por BRL, saca por Pix

    É regulamentado e seguro (se escolher plataformas reconhecidas).

    👉 Vamos te recomendar nossos preferidos nas próximas telas.`;
      },
    
      // ✅ TELA 11: EXCHANGES_EU
      EXCHANGES_EU: `🇪🇺 Exchanges para depositar/sacar EUR
    
    Nossas recomendações:
    • Kraken (👋 Usamos) — Transferência gratuita, sério, USDC disponível
    • Bitstamp — Veterano UE, sério, transferências suportadas
    
    Verificar: Transferência bancária/SEPA ok (mesmo com residência BR) • USDC disponível • taxas razoáveis • reputação
    
    ⚠️ Alguns exchanges (ex: Binance) só aceitam depósito EUR por cartão com >2% de taxas se residência BR.`,
    
      // ✅ TELA 12: EXCHANGES_BR
      EXCHANGES_BR: `🇧🇷 Exchanges para depositar/sacar BRL
    
    Nossa preferência:
    • Binance BR (👋 Usamos também) — Pix nativo, liquidez enorme, taxas baixas
    
    Outras soluções:
    • Bitso — Pix gratuito e instantâneo, interface clara, regulado localmente
    • Mercado Bitcoin — ator local histórico, Pix suportado
    • Foxbit — Pix 24/7, taxas corretas
    
    Verificar: Pix ok • USDC disponível • reputação
    
    Nossos links de indicação financiam este serviço (gratuitos para você, às vezes bônus).
    
    ⚠️ Lembrete: um exchange serve para um lado. Você precisa de um 🇪🇺 (transferência bancária) + um 🇧🇷 (Pix).`,
    
      WHAT_IS_USDC: (route = 'eurbrl') => {
        const baseText = `🪙 O que é USDC?

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
    `;

        if (route === 'brleur') {
          return `${baseText}
    Você o usa como "moeda pivô": BRL → USDC → EUR.`;
        }

        // Default: eurbrl
        return `${baseText}
    Você o usa como "moeda pivô": EUR → USDC → BRL.`;
      },
    
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
    
      // ✅ TELA 13: GUIDE_TRANSITION (direction-aware)
      GUIDE_TRANSITION: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✅ Você tem (ou vai ter):
    • Uma conta 🇧🇷 para: depositar BRL via Pix → comprar USDC
    • Uma conta 🇪🇺 para: receber USDC → vender por EUR → sacar via transferência bancária

    🌐 Você está dando seu primeiro passo on-chain.
    É mais que uma simples transferência:
    • você descobre uma tecnologia que já está mudando as finanças globais,
    • você se junta a milhões de usuários, empresas e instituições,
    • você mantém mais valor para você (e menos para os intermediários 💸).

    🚀 Agora, começamos concretamente: primeira etapa → depositar seus BRL na sua conta 🇧🇷 e convertê-los em USDC.`;
        }

        // Default: eurbrl
        return `✅ Você tem (ou vai ter):
    • Uma conta 🇪🇺 para: depositar EUR via transferência bancária → comprar USDC
    • Uma conta 🇧🇷 para: receber USDC → vender por BRL → sacar via Pix

    🌐 Você está dando seu primeiro passo on-chain.
    É mais que uma simples transferência:
    • você descobre uma tecnologia que já está mudando as finanças globais,
    • você se junta a milhões de usuários, empresas e instituições,
    • você mantém mais valor para você (e menos para os intermediários 💸).

    🚀 Agora, começamos concretamente: primeira etapa → depositar seus EUR na sua conta 🇪🇺 e convertê-los em USDC.`;
      },
    
      STEP_1_1: (amount, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `1️⃣ Depositar seus BRL na conta exchange

    • Vá na seção "Depósito / Deposit / Fiat".
    • Escolha BRL como moeda.
    • Método mais simples: Pix (instantâneo, geralmente gratuito).

    💡 "Fiat" = as moedas tradicionais (EUR, USD, BRL…).

    👉 Recomendado: Binance BR.

    Estimativa do seu saldo: R$ ${formatAmount(amount, 0, locale)}
    *⚠️ É uma estimativa, próxima do real. Taxas e prazos bancários podem variar levemente.*`;
        }

        // Default: eurbrl
        return `1️⃣ Depositar seus EUR na conta exchange

    • Vá na seção "Depósito / Deposit / Fiat".
    • Escolha EUR como moeda.
    • Método mais simples: transferência bancária / SEPA (rápida, taxas baixas ou nulas).

    💡 "Fiat" = as moedas tradicionais (EUR, USD, BRL…).

    👉 Recomendado: Kraken.

    Estimativa do seu saldo: €${formatAmount(amount, 0, locale)}
    *⚠️ É uma estimativa, próxima do real. Taxas e prazos bancários podem variar levemente.*`;
      },
    
      STEP_1_2: (amount, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `2️⃣ Acessar o mercado para comprar USDC

    • No seu exchange, procure "Trader / Mercado / Trade".
    • Selecione o par BRL/USDC ou USDC/BRL.

    💡 Um mercado crypto é como um bureau de câmbio: você troca uma moeda por outra.

    Estimativa do seu saldo: R$ ${formatAmount(amount, 0, locale)} (pronto para compra USDC)
    *⚠️ Estimativa indicativa.*`;
        }

        // Default: eurbrl
        return `2️⃣ Acessar o mercado para comprar USDC

    • No seu exchange, procure "Trader / Mercado / Trade".
    • Selecione o par EUR/USDC.

    💡 Um mercado crypto é como um bureau de câmbio: você troca uma moeda por outra.

    Estimativa do seu saldo: €${formatAmount(amount, 0, locale)} (pronto para compra USDC)
    *⚠️ Estimativa indicativa.*`;
      },
    
      STEP_1_3: (usdcAmount, locale, route = 'eurbrl') => `3️⃣ Comprar seus USDC

    • Escolha o tipo de ordem:
      • A mercado (Market) → instantâneo, simples, recomendado.
      • Limite (Limit) → você fixa seu preço, útil para grandes valores/liquidez.

    👉 Para começar: ordem a mercado.

    Estimativa do seu saldo: ~${formatAmount(usdcAmount, 2, locale)} USDC
    *⚠️ Estimativa próxima do real. Taxas e preços podem variar levemente.*`,
    
      STEP_1_4: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✅ Muito bem! Você agora tem USDC na sua conta 🇧🇷.

    ✨ USDC são "stablecoins": ~1 USDC = 1 USD.
    É a chave para transferir seu dinheiro de forma rápida e de baixo custo.

    Próxima etapa: enviá-los on-chain para a Europa.`;
        }

        // Default: eurbrl
        return `✅ Muito bem! Você agora tem USDC na sua conta 🇪🇺.

    ✨ USDC são "stablecoins": ~1 USDC = 1 USD.
    É a chave para transferir seu dinheiro de forma rápida e de baixo custo.

    Próxima etapa: enviá-los on-chain para o Brasil.`;
      },
    
      STEP_2_1: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✨ Esta é a etapa "on-chain" → rápida e de baixo custo, mas requer um pouco de concentração.
    Diferente de um banco, se você cometer um erro, não há SAC para recuperar seus fundos.

    1️⃣ Recuperar seu endereço de depósito 🇪🇺

    • No seu exchange europeu, procure "Depósito / Crypto".
    • Escolha USDC como crypto a depositar.
    • Selecione a rede de transferência.

    💡 Recomendamos Polygon (MATIC) → rápida, confiável, taxas baixas (~1 USDC).

    • Copie cuidadosamente o endereço.

    💡 Imagine que é como seu IBAN bancário, mas versão blockchain (uma longa sequência de letras e números).`;
        }

        // Default: eurbrl
        return `✨ Esta é a etapa "on-chain" → rápida e de baixo custo, mas requer um pouco de concentração.
    Diferente de um banco, se você cometer um erro, não há SAC para recuperar seus fundos.

    1️⃣ Recuperar seu endereço de depósito 🇧🇷

    • No seu exchange brasileiro, procure "Depósito / Crypto".
    • Escolha USDC como crypto a depositar.
    • Selecione a rede de transferência.

    💡 Recomendamos Polygon (MATIC) → rápida, confiável, taxas baixas (~1 USDC).

    • Copie cuidadosamente o endereço.

    💡 Imagine que é como seu IBAN bancário, mas versão blockchain (uma longa sequência de letras e números).`;
      },
    
      STEP_2_2: (usdcAmount, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `2️⃣ Enviar do seu exchange 🇧🇷

    • Vá em "Saque / Withdraw" → USDC.
    • Cole o endereço copiado.
    • Escolha a mesma rede do depósito (ex. Polygon).

    💡 A rede é como os trilhos de um trem: se não forem os mesmos dos dois lados, o dinheiro vai para outro lugar e se perde.

    • Indique seu valor. Você pode enviar tudo, ou começar com um teste (ex. 10 USDC).

    👉 O teste custa um pouco mais (taxas fixas ~1 USDC aplicam-se duas vezes), mas é uma boa prática comum em crypto.

    Estimativa: você receberá ~${formatAmount(usdcAmount - 1, 2, locale)} USDC lado 🇪🇺
    *⚠️ Estimativa próxima do real (taxa de rede ~1 USDC).*`;
        }

        // Default: eurbrl
        return `2️⃣ Enviar do seu exchange 🇪🇺

    • Vá em "Saque / Withdraw" → USDC.
    • Cole o endereço copiado.
    • Escolha a mesma rede do depósito (ex. Polygon).

    💡 A rede é como os trilhos de um trem: se não forem os mesmos dos dois lados, o dinheiro vai para outro lugar e se perde.

    • Indique seu valor. Você pode enviar tudo, ou começar com um teste (ex. 10 USDC).

    👉 O teste custa um pouco mais (taxas fixas ~1 USDC aplicam-se duas vezes), mas é uma boa prática comum em crypto.

    Estimativa: você receberá ~${formatAmount(usdcAmount - 1, 2, locale)} USDC lado 🇧🇷
    *⚠️ Estimativa próxima do real (taxa de rede ~1 USDC).*`;
      },
    
      STEP_2_3: `3️⃣ Verificar e confirmar
    
    • Releia atentamente o endereço e a rede antes de validar.
    
    ⚠️ Um único caractere errado no endereço, ou uma rede errada, e seus fundos são definitivamente perdidos.
    
    👉 Uma vez que você verificou bem, pode confirmar a transferência.`,
    
      STEP_2_4: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `4️⃣ Aguardar a chegada

    • Geralmente, a transação leva 1-2 minutos, às vezes até 10 min.
    • Você verá seu saldo USDC aparecer lado 🇪🇺.

    ✅ Resultado: seus USDC chegaram → pronto para a etapa 3 (venda em EUR + saque bancário).`;
        }

        // Default: eurbrl
        return `4️⃣ Aguardar a chegada

    • Geralmente, a transação leva 1-2 minutos, às vezes até 10 min.
    • Você verá seu saldo USDC aparecer lado 🇧🇷.

    ✅ Resultado: seus USDC chegaram → pronto para a etapa 3 (venda em BRL + saque Pix).`;
      },
    
      STEP_3_1: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `1️⃣ Encontrar o mercado USDC/EUR 🇪🇺

    • No seu exchange europeu, vá em Trader / Mercado / Market.
    • Selecione o par USDC/EUR.

    👉 Próxima etapa: seus USDC finalmente se transformam em EUR 🎉`;
        }

        // Default: eurbrl
        return `1️⃣ Encontrar o mercado USDC/BRL 🇧🇷

    • No seu exchange brasileiro, vá em Trader / Mercado / Market.
    • Selecione o par USDC/BRL.

    👉 Próxima etapa: seus USDC finalmente se transformam em BRL 🎉`;
      },
    
      STEP_3_2: (finalAmount, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `2️⃣ Fazer sua ordem

    • "A mercado / Market" → instantâneo, ao preço atual (simples, recomendado).
    • "Limite / Limit" → você fixa seu preço, útil para grandes valores.

    👉 Para a maioria das pessoas, "ordem a mercado" = o mais simples e rápido.

    Estimativa do seu saldo: ~€${formatAmount(finalAmount, 2, locale)}
    *⚠️ Estimativa próxima do real (taxas ~0,1%).*`;
        }

        // Default: eurbrl
        return `2️⃣ Fazer sua ordem

    • "A mercado / Market" → instantâneo, ao preço atual (simples, recomendado).
    • "Limite / Limit" → você fixa seu preço, útil para grandes valores.

    👉 Para a maioria das pessoas, "ordem a mercado" = o mais simples e rápido.

    Estimativa do seu saldo: ~R$ ${formatAmount(finalAmount, 2, locale)}
    *⚠️ Estimativa próxima do real (taxas ~0,1%).*`;
      },
    
      STEP_3_3: (finalNet, locale, route = 'eurbrl') => {
        if (route === 'brleur') {
          return `3️⃣ Sacar seu dinheiro em EUR

    • Uma vez seus USDC vendidos, seu saldo aparece em EUR.
    • Vá em Saque / Withdraw.
    • Escolha transferência bancária (SEPA) como método.

    👉 Digite seu IBAN bancário europeu… você já conhece bem 😉

    💡 Aliás: como para um endereço crypto, se o IBAN estiver errado, o dinheiro vai para o lugar errado.

    👉 Geralmente, as taxas são muito baixas ou gratuitas (ex. Kraken transferência bancária gratuita).

    Estimativa do seu saldo recebido: ~€${formatAmount(finalNet, 2, locale)} líquidos
    *⚠️ Bom, não devemos estar muito longe da realidade ;)*`;
        }

        // Default: eurbrl
        return `3️⃣ Sacar seu dinheiro em R$

    • Uma vez seus USDC vendidos, seu saldo aparece em BRL.
    • Vá em Saque / Withdraw.
    • Escolha Pix como método.

    👉 Digite sua chave Pix (CPF, email, tel, chave aleatória)… mas isso você já sabe fazer 😉

    💡 Aliás: como para um endereço crypto, se a chave estiver errada, o dinheiro vai para o lugar errado.

    👉 Geralmente, as taxas são muito baixas (ex. Binance ~R$3,50 por saque Pix).
    Deveria ser gratuito honestamente… mas enfim 😅

    Estimativa do seu saldo recebido: ~R$ ${formatAmount(finalNet, 2, locale)} líquidos
    *⚠️ Bom, não devemos estar muito longe da realidade ;)*`;
      },
    
      WHY_NOT_EXACT: `🤔 Por que não podemos dar o valor exato?
    
    As variáveis que se movem em tempo real:
    
    • Taxas dos exchanges: podem variar segundo seu perfil de usuário, seu volume de trading, ou promoções pontuais (mas sempre permanecem baixas).
    
    • Taxas de rede: flutuam segundo a congestionamento da rede blockchain (~1 USDC em média na Polygon, mas pode variar).
    
    • Taxa de câmbio: os mercados crypto se movem em tempo real, mesmo se o USDC permanece estável, a taxa USDC/BRL pode flutuar levemente entre o momento que você calcula e quando executa.
    
    Nossas estimativas são prudentes e próximas do real. Você não deve ter surpresas desagradáveis.`,
    
      STEP_3_4: (route = 'eurbrl') => {
        if (route === 'brleur') {
          return `✅ Sua transferência está concluída!

    • Você converteu seus BRL em USDC lado 🇧🇷.
    • Você os enviou on-chain.
    • Você os vendeu por EUR e sacou via transferência bancária lado 🇪🇺.

    ✨ Resultado: rápido, seguro e de baixo custo.

    🌍 Você acabou de fazer uma verdadeira passagem pela blockchain.
    O que você aprendeu hoje será cada vez mais usado no futuro: você acabou de dar um passo à frente.

    🙌 Esperamos que você tenha curtido a experiência!`;
        }

        // Default: eurbrl
        return `✅ Sua transferência está concluída!

    • Você converteu seus EUR em USDC lado 🇪🇺.
    • Você os enviou on-chain.
    • Você os vendeu por BRL e sacou via Pix lado 🇧🇷.

    ✨ Resultado: rápido, seguro e de baixo custo.

    🌍 Você acabou de fazer uma verdadeira passagem pela blockchain.
    O que você aprendeu hoje será cada vez mais usado no futuro: você acabou de dar um passo à frente.

    🙌 Esperamos que você tenha curtido a experiência!`;
      },
    
      // Premium e alertas
      PREMIUM_PRICING: `💎 ASSINAR PREMIUM

✨ Com Premium:
• 🔔 Alertas personalizados ilimitados
• 📢 Alertas espontâneos regulares
• 🎯 Multi-pares (EUR→BRL + BRL→EUR)
• 📊 Análises mais avançadas
• 🌍 Multi-moedas em breve
• ⚡ Acesso prioritário às novas funcionalidades

[ℹ️ Ver todas as funcionalidades Premium]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 <b>ASSINATURAS RECORRENTES</b>
Cancelável a qualquer momento via Mercado Pago

💳 <b>Planos disponíveis:</b>
• R$ 6/mês (renovação mensal)
• R$ 15/3 meses (economia de 17%)
• R$ 28/6 meses (economia de 22%)
• R$ 50/12 meses (economia de 31%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 As assinaturas se renovam automaticamente via Mercado Pago.
Você pode cancelar quando quiser, direto no app do Mercado Pago.

<i>⚖️ Serviço digital de acesso imediato. Sem reembolsos após ativação. Ao pagar, você concorda com os termos de uso.</i>

❓ Problemas com o pagamento? Use o botão "Ajuda" abaixo.`,

  PREMIUM_ONESHOT_PRICING: `💎 ASSINAR PREMIUM

✨ Com Premium:
• 🔔 Alertas personalizados ilimitados
• 📢 Alertas espontâneos regulares
• 🎯 Multi-pares (EUR→BRL + BRL→EUR)
• 📊 Análises mais avançadas
• ⚡ Acesso prioritário às novas funcionalidades

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 <b>PAGAMENTO ÚNICO (sem assinatura)</b>
Pague uma vez, use pelo período escolhido, sem renovação automática.

💳 <b>Planos disponíveis:</b>
• R$ 18 - 3 meses
• R$ 32 - 6 meses
• R$ 60 - 12 meses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<i>⚖️ Serviço digital de acesso imediato. Sem reembolsos após ativação. Ao pagar, você concorda com os termos de uso.</i>

❓ Problemas com o pagamento? Use o botão "Ajuda" abaixo.`,
    
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

      PREMIUM_ALERT: (pair, currentRate, avg30d, variation, amountExample, savings, locale) => {
        const isGoodTime = variation > 0;
        const direction = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';

        return `🔔 ALERTA ESPONTÂNEO PREMIUM

${direction} : ${formatRate(currentRate, locale)}

${isGoodTime ? '💡 Bom momento para transferir!' : '⚠️ Taxa abaixo da média - talvez esperar seja melhor'}

📊 Análise:
• Taxa atual: ${formatRate(currentRate, locale)}
• Média 30d: ${formatRate(avg30d, locale)}
• Diferença: ${variation > 0 ? '+' : ''}${formatAmount(variation, 1, locale)}% ${variation > 0 ? '🎯' : '📉'}

💰 Em ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, você ${variation > 0 ? 'ganha' : 'perde'} ~${formatAmount(Math.abs(savings), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs a média

${isGoodTime ? '✅ A taxa está favorável comparada ao último mês' : '⏳ Considere aguardar uma taxa melhor'}

⏰ Próxima alerta espontânea possível em 6h`;
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
            observation = '📈 Taxa bem acima das médias e em aceleração';
            emoji = '✅';
            analysis = 'Tendência de alta consistente em todos os períodos. Pode ser um momento favorável.';
          } else if (shortTerm > 0) {
            observation = '📊 Taxa bem acima das médias históricas';
            emoji = '✅';
            analysis = 'Taxa acima das médias de 30, 90 e 365 dias.';
          } else {
            observation = '⚠️ Taxa acima das médias, mas perdendo força';
            emoji = '➡️';
            analysis = 'Taxa está acima das médias de longo prazo, mas caindo no curto prazo.';
          }
        }
        // Scenario 2: Rate slightly above average (0 < rate ≤ 2%)
        else if (mediumTerm > 0) {
          if (shortTerm > mediumTerm + 1) {
            observation = '📈 Taxa em alta no curto prazo';
            emoji = '➡️';
            analysis = 'Taxa ligeiramente acima da média e melhorando rapidamente.';
          } else {
            observation = '📊 Taxa ligeiramente acima da média';
            emoji = '➡️';
            analysis = 'Taxa próxima das médias históricas.';
          }
        }
        // Scenario 3: Rate below average
        else {
          if (shortTerm > 0) {
            // Recovery: short term turned positive while medium term negative
            observation = '📈 Taxa em recuperação';
            emoji = '➡️';
            analysis = 'Taxa abaixo da média 30d, mas mostrando sinais de recuperação no curto prazo.';
          } else if (shortTerm < mediumTerm - 0.5) {
            // Getting worse: short term more negative than medium term
            observation = '📉 Taxa em tendência de baixa';
            emoji = '⏳';
            analysis = 'Taxa abaixo das médias e continuando em queda no curto prazo.';
          } else if (shortTerm > mediumTerm) {
            // Improving: short term less negative than medium term
            observation = '📊 Taxa abaixo da média, mas melhorando';
            emoji = '⏳';
            analysis = 'Taxa ainda abaixo das médias históricas, mas com leve recuperação.';
          } else {
            observation = '📊 Taxa abaixo das médias históricas';
            emoji = '⏳';
            analysis = 'Taxa está abaixo das médias de 30, 90 e 365 dias.';
          }
        }

        const savings30d = avg30d ? (currentRate - avg30d) * amountExample : 0;

        return `🔔 ALERTA PREMIUM - ANÁLISE COMPLETA

${direction} : ${formatRate(currentRate, locale)}

${emoji} ${observation}

📊 <b>Análise Multi-período:</b>

<b>Curto prazo (30 dias)</b>
• Média: ${avg30d ? formatRate(avg30d, locale) : 'N/D'}
• Variação: ${variation30d !== null ? (variation30d > 0 ? '+' : '') + formatAmount(variation30d, 1, locale) + '%' : 'N/D'} ${variation30d > 1 ? '📈' : variation30d < -1 ? '📉' : '➡️'}

<b>Médio prazo (90 dias)</b>
• Média: ${formatRate(avg90d, locale)}
• Variação: ${variation90d > 0 ? '+' : ''}${formatAmount(variation90d, 1, locale)}% ${variation90d > 1 ? '📈' : variation90d < -1 ? '📉' : '➡️'}

<b>Longo prazo (1 ano)</b>
• Média: ${avg365d ? formatRate(avg365d, locale) : 'N/D'}
• Variação: ${variation365d !== null ? (variation365d > 0 ? '+' : '') + formatAmount(variation365d, 1, locale) + '%' : 'N/D'} ${variation365d > 1 ? '📈' : variation365d < -1 ? '📉' : '➡️'}

💡 <b>O que isso significa:</b>
${analysis}

💰 <b>Impacto financeiro:</b>
Em ${formatAmount(amountExample, 0, locale)}${pair === 'eurbrl' ? '€' : ' R$'}, você ${savings30d > 0 ? 'ganha' : 'perde'} ~${formatAmount(Math.abs(savings30d), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs média 30d

⏰ Próxima alerta espontânea em 6h`;
      },

      PROGRAMMED_ALERT: (pair, currentRate, threshold, refValue, alert, locale) => {
        const typeLabels = {
          absolute: '🎯 Absoluto',
          relative: '📊 Relativo'
        };

        const refLabels = {
          avg30d: 'Média 30 dias',
          avg90d: 'Média 90 dias',
          avg365d: 'Média 1 ano'
        };

        const pairText = pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        const typeLabel = typeLabels[alert.threshold_type] || '🔔';

        let text = `🔔 ALERTA DISPARADO

${pairText}
${typeLabel}`;

        if (alert.threshold_type === 'relative') {
          const refLabel = refLabels[alert.reference_type];
          text += ` : +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabel}`;
        } else {
          text += ` : ≥ ${formatRate(alert.threshold_value, locale)}`;
        }

        text += `

💡 Seu limite foi atingido!

<b>Análise:</b>
• Taxa atual: ${formatRate(currentRate, locale)}`;

        if (alert.threshold_type === 'relative' && refValue) {
          const refLabel = refLabels[alert.reference_type];
          const delta = ((currentRate - refValue) / refValue) * 100;
          text += `
• ${refLabel}: ${formatRate(refValue, locale)}
• Diferença: +${formatAmount(delta, 1, locale)}%`;
        }

        text += `
• Limite alerta: ${formatRate(threshold, locale)}`;

        // Format cooldown
        const minutes = alert.cooldown_minutes || 60;
        let cooldownText;
        if (minutes < 60) cooldownText = `${minutes} min`;
        else if (minutes < 1440) cooldownText = `${Math.floor(minutes / 60)}h`;
        else if (minutes < 10080) cooldownText = `${Math.floor(minutes / 1440)} dia(s)`;
        else cooldownText = `${Math.floor(minutes / 10080)} semana(s)`;

        text += `

⏰ Próximo alerta possível em ${cooldownText}`;

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

        let text = `📢 ALERTA DO ADMIN

${pairText} : ${formatRate(currentRate, locale)}

📊 <b>Posição atual:</b>

`;

        if (stats.stats30d) {
          text += `<b>Últimos 30 dias:</b>
• Média: ${formatRate(stats.stats30d.avg, locale)}
• Mín: ${formatRate(stats.stats30d.min, locale)}
• Máx: ${formatRate(stats.stats30d.max, locale)}
• Variação vs média: ${var30d > 0 ? '+' : ''}${formatAmount(var30d, 1, locale)}%\n\n`;
        }

        if (stats.stats90d) {
          text += `<b>Últimos 90 dias:</b>
• Média: ${formatRate(stats.stats90d.avg, locale)}
• Mín: ${formatRate(stats.stats90d.min, locale)}
• Máx: ${formatRate(stats.stats90d.max, locale)}
• Variação vs média: ${var90d > 0 ? '+' : ''}${formatAmount(var90d, 1, locale)}%\n\n`;
        }

        if (stats.stats365d) {
          text += `<b>Últimos 12 meses:</b>
• Média: ${formatRate(stats.stats365d.avg, locale)}
• Mín: ${formatRate(stats.stats365d.min, locale)}
• Máx: ${formatRate(stats.stats365d.max, locale)}
• Variação vs média: ${var365d > 0 ? '+' : ''}${formatAmount(var365d, 1, locale)}%\n\n`;
        }

        if (gain30d !== null) {
          text += `💰 <b>Exemplo em ${formatAmount(amountExample, 0, locale)}${currency}:</b>
Você ${gain30d > 0 ? 'ganha' : 'perde'} ~${formatAmount(Math.abs(gain30d), 0, locale)}${pair === 'eurbrl' ? ' R$' : '€'} vs média 30d\n\n`;
        }

        text += isGoodTime
          ? `💡 Taxa acima da média - bom momento para transferir!`
          : `⏳ Taxa abaixo da média - considere aguardar.`;

        return text;
      },

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
            avg30d: 'média 30d',
            avg90d: 'média 90d',
            avg365d: 'média 1 ano'
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
    
    ALERT_CHOOSE_REFERENCE: (pair, currentRate, avg30d, avg90d, avg365d, locale) => `📊 LIMITE RELATIVO

    Taxa atual: ${formatRate(currentRate, locale)}

    +X% em relação a quê?

    💡 <i>A referência será recalculada a cada verificação (a cada 2h)</i>`,

    ALERT_CHOOSE_PERCENT: (pair, refType, refValue, locale) => {
      const refLabels = {
        current: `Taxa atual (${formatRate(refValue, locale)})`,
        avg30d: `Média 30 dias (${formatRate(refValue, locale)})`,
        avg90d: `Média 90 dias (${formatRate(refValue, locale)})`,
        avg365d: `Média 1 ano (${formatRate(refValue, locale)})`
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
        avg30d: 'Média 30 dias',
        avg90d: 'Média 90 dias',
        avg365d: 'Média 1 ano'
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
    
      ALERT_VIEW_DETAILS: (alert, currentRate, refValue, calculatedThreshold, locale) => {
        const typeLabels = {
          absolute: '🎯 Absoluto',
          relative: '📊 Relativo'
        };
        
        const refLabels = {
          current: 'Taxa atual',
          avg30d: 'Média 30 dias',
          avg90d: 'Média 90 dias',
          avg365d: 'Média 1 ano'
        };
        
        const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
        
        let text = `🔔 <b>Detalhes do alerta</b>\n\n`;
        
        if (alert.name) {
          text += `<b>Nome:</b> ${alert.name}\n\n`;
        }
        
        text += `<b>Par:</b> ${pairText}\n`;
        text += `<b>Tipo:</b> ${typeLabels[alert.threshold_type]}\n`;
        
        if (alert.threshold_type === 'relative') {
          text += `<b>Limite:</b> +${formatAmount(alert.threshold_value, 1, locale)}% vs ${refLabels[alert.reference_type]}\n`;
        } else {
          text += `<b>Limite:</b> ≥ ${formatRate(alert.threshold_value, locale)}\n`;
        }
        
        text += `<b>Cooldown:</b> ${formatCooldown(alert.cooldown_minutes)}\n\n`;
        
        text += `<b>Estado atual:</b>\n`;
        text += `• Taxa: ${formatRate(currentRate, locale)}\n`;
        
        if (alert.threshold_type === 'relative' && refValue) {
          text += `• ${refLabels[alert.reference_type]}: ${formatRate(refValue, locale)}\n`;
        }
        
        text += `• Limite do alerta: ${formatRate(calculatedThreshold, locale)}\n\n`;
        
        if (currentRate >= calculatedThreshold) {
          text += `🎯 <b>Limite atingido!</b> Você deve ser notificado em breve.`;
        } else {
          const gap = ((calculatedThreshold - currentRate) / currentRate * 100);
          text += `⏳ Ainda falta ${formatAmount(gap, 1, locale)}% para ativação.`;
        }
        
        return text;
      },
      
      ALERT_NAME_PROMPT: `✏️ <b>Nomear alerta</b>
      
      Digite um nome para este alerta (máx 50 caracteres):
      
      <i>Exemplo: "Transferência agosto", "Férias Brasil", etc.</i>
      
      Ou digite "cancelar" para manter sem nome.`,
      
      ALERT_NAME_TOO_LONG: `⚠️ Nome muito longo (máx 50 caracteres).
      
      Tente um nome mais curto.`,
      
      ALERT_NAME_SET: (name) => `✅ Alerta renomeado: <b>${name}</b>`,
      
      ALERT_NAME_CANCELLED: `↩️ Operação cancelada.`,
    
    
    
      ALERT_DEEPLINK_GROUP: `🔔 Para criar um alerta, clique aqui para continuar em privado:`,
    
    ALERT_INVALID_SYNTAX: `❌ Formato inválido
    
    <b>Exemplos :</b>
    /alert 6.30        → Alerta EUR→BRL ≥ 6.30
    /alert +3%         → Alerta EUR→BRL +3% vs média 30d
    /alert brl 0.165   → Alerta BRL→EUR ≥ 0.165
    /alert brl +5%     → Alerta BRL→EUR +5% vs média 30d`,
    
    ALERT_CREATED_QUICK: (alert, currentRate, refValue, calculatedThreshold, locale) => {
      const pairText = alert.pair === 'eurbrl' ? 'EUR → BRL' : 'BRL → EUR';
      
      let text = `✅ <b>Alerta criado</b>
    
    ${pairText}`;
    
      if (alert.threshold_type === 'absolute') {
        text += ` ≥ ${formatRate(alert.threshold_value, locale)}`;
      } else {
        text += ` +${formatAmount(alert.threshold_value, 1, locale)}% vs média 30d`;
      }
      
      text += `\n⏰ Cooldown : 1h
    
    <b>Estado atual :</b>
    • Taxa : ${formatRate(currentRate, locale)}`;
    
      if (refValue) {
        text += `\n• Média 30d : ${formatRate(refValue, locale)}`;
      }
      
      text += `\n• Limite : ${formatRate(calculatedThreshold, locale)}`;
      
      return text;
    },
    
    NOT_PREMIUM_ALERTS: `🔒 Nenhum alerta ativo
    
    Usuários Premium podem criar alertas ilimitados.
    
    💎 Com Premium :
    • Alertas personalizados
    • Multi-pares
    • Análises avançadas
    
    Preço : a partir de 5 R$/mês`,
    
    
    CONVERT_ASK_AMOUNT: "💱 Que valor você quer converter?\n\nExemplo: 253 ou 1500 brl",
    RATE_LABEL: "Taxa", // ou "Taxa" (PT), "Rate" (EN)
    BETTER_BY: "melhor em", // ou "melhor em" (PT), "better by" (EN)
    
    
      btn: {
        langFR: '🇫🇷 Français',
        langPT: '🇧🇷 Português',
        langEN: '🇬🇧 English',
        about: 'ℹ️ Sobre',
        eurbrl: (amt, locale) => `🇪🇺 EUR → 🇧🇷 BRL (Pix) · €${formatAmount(amt, 0, locale)}`,
        brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (transferência) · R$ ${formatAmount(amt, 0, locale)}`,
        
        // ✅ Botões renomeados
        contOn: '🚀 Converter on-chain',
        stayOff: '🏦 Converter off-chain',
        calcdetails: '🔍 Detalhes do cálculo on-chain',
        swapMode: '🔄 Inverter',
        change: '✏️ Alterar valor',
        moreOptions: '⚙️ Mais opções',
        
        back: '⬅️ Voltar',
        subscribe: '💳 Assinar',
        pay: '💳 Pagar',
        sources: '📊 Fontes dos dados',
        openWise: '🔗 Abrir Wise',
        openRemitly: '🔗 Abrir Remitly',
        seeOnchain: '🚀 Ver rota on-chain',
        
        // ✅ Novos botões
        createEU: '🇪🇺 Criar conta Europa',
        createBR: '🇧🇷 Criar conta Brasil',
        startGuide: '🚀 Começar o guia',
        faqDoubt: "🤔 Alguma dúvida?",
        whyOnchain: "💡 Por que on-chain?",
        askQuestion: '💬 Fazer uma pergunta',
        
        whatIsUSDC: '🪙 O que é USDC?',
        whatIsExchange: '🏦 O que é um exchange?',
        minAmount: '💰 Qual o valor mínimo?',
        aboutReferrals: '🤝 Sobre os links de indicação',
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
        
        startStep1: (route = 'eurbrl') => route === 'brleur'
          ? '🚀 Depositar & converter meus BRL em USDC'
          : '🚀 Depositar & converter meus EUR em USDC',
        step1Done: (route = 'eurbrl') => route === 'brleur'
          ? '✅ Depositei meus BRL'
          : '✅ Depositei meus EUR',
        step1_2Done: (route = 'eurbrl') => route === 'brleur'
          ? '✅ Encontrei o mercado BRL/USDC'
          : '✅ Encontrei o mercado EUR/USDC',
        step1_3Done: '✅ Comprei meus USDC',
        marketVsLimit: 'ℹ️ Market vs Limit',
        nextStep2: '👉 Ir para etapa 2 (transferência)',
        
        // ✅ Novos botões skip
        skipToStep2: "Já tenho USDC (pular)",
        skipToStep3: "⏭️ Pular para etapa 3",
        
        step2Done: '✅ Tenho meu endereço → continuar',
        step2_2Done: '✅ Inseri meu valor',
        step2_3Done: '✅ Confirmei a transferência',
        step3Start: (route = 'eurbrl') => route === 'brleur'
          ? '🇪🇺 Etapa 3 — Vender USDC & sacar por transferência'
          : '🇧🇷 Etapa 3 — Vender USDC & sacar via Pix',
        step3_1Done: '✅ Encontrei o mercado',
        step3_2Done: '✅ Fiz minha ordem',
        step3_3Done: (route = 'eurbrl') => route === 'brleur'
          ? '✅ Iniciei minha transferência'
          : '✅ Iniciei meu Pix',
        whyNotExact: '🤔 Por que não o saldo exato?',
        setAlert: '⏰ Ativar meu alerta',
        premium: '🚀 Descobrir Premium',
        giveFeedback: '💬 Dar uma sugestão',
        seePremium: '💎 Ver Premium',
        seeOneshot: '💰 Ou pagamento único (sem renovação automática) →',
        backToSubscriptions: '⬅️ Voltar às assinaturas',
        addMoreTime: '💰 Adicionar mais tempo (pagamento único)',
        switchToSubscription: '🔄 Passar para assinatura recorrente',

        // Subscription plans (recurring)
        subMPMonthly: '🔄 R$ 6/mês',
        subMPQuarterly: '🔄 R$ 15/3 meses (-17%)',
        subMPSemiannual: '🔄 R$ 28/6 meses (-22%)',
        subMPAnnual: '🔄 R$ 50/12 meses (-31%)',
        subPPQuarterly: '💳 €4/3 meses',
        subPPSemiannual: '💳 €7/6 meses',
        subPPAnnual: '💳 €12/12 meses',

        // One-shot plans
        oneshot3m: '💰 R$ 18 - 3 meses',
        oneshot6m: '💰 R$ 32 - 6 meses',
        oneshot12m: '💰 R$ 60 - 12 meses',
        oneshotPP3m: '💰 $4.50 - 3 meses',
        oneshotPP6m: '💰 $8 - 6 meses',
        oneshotPP12m: '💰 $15 - 12 meses',

        premiumDetails: 'ℹ️ Ver todas as funcionalidades',
        createAlert: '➕ Criar um alerta',
        myAlerts: '🔔 Meus alertas',
        conservative: '🛡️ Conservador',
        balanced: '⚖️ Equilibrado',
        aggressive: '🎯 Oportunista',
        custom: '✏️ Personalizado',
        disableAlert: '🔕 Desativar',
        editAlert: '✏️ Modificar',
        relativeAlert:'📊 Relativa (+X%)',
        absoluteAlert:'🎯 Absoluta (taxa fixa)',
    
        refCurrent: (rate, locale) => `💵 Taxa atual (${formatRate(rate, locale)})`,
        refAvg30d:  (rate, locale) => `📊 Média 30d (${formatRate(rate, locale)}) ⭐`,
        refAvg90d:  (rate, locale) => `📈 Média 90d (${formatRate(rate, locale)})`,
        refAvg365d: (rate, locale) => `📅 Média 1 ano (${formatRate(rate, locale)})`,
    
        backToPricing: '⬅️ Voltar aos preços',
        chooseCooldown15: '⚡ 15 minutos',
        chooseCooldown1h: '⏱️ 1 hora ⭐',
        chooseCooldown6h: '⏰ 6 horas',
        chooseCooldown24h: '📅 24 horas',
        chooseCooldown1week: '📆 1 semana',
        deleteAlert: '🗑️ Apagar',
        viewAlert: '👁️ Ver detalhes',

        // ✅ Botões adicionais para consistência linguística
        pairEurBrl: '🇪🇺 EUR → 🇧🇷 BRL',
        pairBrlEur: '🇧🇷 BRL → 🇪🇺 EUR',
        compareNow: '🚀 Comparar agora',
        editMyAlert: '⚙️ Editar meu alerta',
        deleteMyAlert: '🗑️ Apagar este alerta',
        help: '❓ Ajuda',
        paymentHelp: '💬 Ajuda com pagamento',
        mainMenu: '🏠 Menu principal',

        // Botões Premium com preços (para keyboards.js)
        plan3months: '📅 3 meses - R$ 15,00',
        plan6months: '📅 6 meses - R$ 28,00 (-7%)',
        plan12months: '📅 12 meses - R$ 50,00 (-17%)',
        renewPlan3months: '🔄 Renovar 3 meses - R$ 15,00',
        renewPlan6months: '🔄 Renovar 6 meses - R$ 28,00 (-7%)',
        renewPlan12months: '🔄 Renovar 12 meses - R$ 50,00 (-17%)',
      },
    };