import { formatAmount, formatRate, getLocale } from '../../services/rates.js';
import { formatCooldown } from './helpers.js';

export const messagesPt = {
    INTRO_TEXT: `👋 Oi !

    🌐 Escolha o idioma · Choisis ta langue · Choose your language`,
    
      ABOUT_TEXT: `💡 Sobre
    
    Este bot compara taxas EUR↔BRL e te guia em transferências on-chain (via blockchain).
    
    As taxas on-chain costumam ser melhores que as plataformas tradicionais. É legal, seguro e usado por muitas instituições.
    
    Serviço gratuito, financiado por links de indicação.`,
    
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
        
        const footer = `
    
    💡 Mais caro que on-chain (~${offchainBest}${route === 'eurbrl' ? ' R$' : '€'} vs ~${onchainCompare} on-chain)
    
    <i>*Dados fornecidos por Wise Comparisons</i>`;
        
        return `${title}\n\n${providersList}${footer}`;
      },
    
      // ✅ TELA 6: ONCHAIN_INTRO
      ONCHAIN_INTRO: `🚀 ROTA ON-CHAIN
    
    📍 <b>O processo em 3 etapas</b>
    1️⃣ Europa → Troca seus EUR em USDC
    2️⃣ Blockchain → Envia seus USDC
    3️⃣ Brasil → Converte USDC em BRL (Pix)
    
    ✅ <b>O que você precisa</b>
    • 🇪🇺 Exchange na Europa aceitando depósito EUR (SEPA)
    • 🇧🇷 Exchange no Brasil aceitando saque BRL (Pix)
    
    💡 Temos recomendações!
    
    💡 <b>Fun fact:</b> As taxas on-chain (~0,5-1%) são 5 a 10 vezes mais baratas que transferências clássicas (2,5-6%)!`,
    
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
    
      // ✅ TELA 10: WHAT_IS_EXCHANGE
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
    
    É regulamentado e seguro (se escolher plataformas reconhecidas).
    
    👉 Vamos te recomendar nossos preferidos nas próximas telas.`,
    
      // ✅ TELA 11: EXCHANGES_EU
      EXCHANGES_EU: `🇪🇺 Exchanges para depositar/sacar EUR
    
    Nossas recomendações:
    • Kraken (👋 Usamos) — Transferência gratuita, sério, USDC disponível
    • Bitstamp — Veterano UE, sério, transferências suportadas
    
    Verificar: SEPA ok (mesmo com residência BR) • USDC disponível • taxas razoáveis • reputação
    
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
    
      // ✅ TELA 13: GUIDE_TRANSITION
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
    
    Estimativa do seu saldo: ~R$ ${formatAmount(brlAmount, 2, locale)}
    *⚠️ Estimativa próxima do real (taxas ~0,1%).*`,
    
      STEP_3_3: (brlNet, locale) => `3️⃣ Sacar seu dinheiro em R$
    
    • Uma vez seus USDC vendidos, seu saldo aparece em BRL.
    • Vá em Saque / Withdraw.
    • Escolha Pix como método.
    
    👉 Digite sua chave Pix (CPF, email, tel, chave aleatória)… mas isso você já sabe fazer 😉
    
    💡 Aliás: como para um endereço crypto, se a chave estiver errada, o dinheiro vai para o lugar errado.
    
    👉 Geralmente, as taxas são muito baixas (ex. Binance ~R$3,50 por saque Pix).
    Deveria ser gratuito honestamente… mas enfim 😅
    
    Estimativa do seu saldo recebido: ~R$ ${formatAmount(brlNet, 2, locale)} líquidos
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

🔄 <b>ASSINATURAS (Cancelável a qualquer momento)</b>

💳 <b>Mercado Pago (BRL)</b>
• R$ 6/mês
• R$ 15/3 meses (-17%)
• R$ 28/6 meses (-22%)
• R$ 50/12 meses (-31%)

💳 <b>PayPal (EUR)</b>
• €4/3 meses
• €7/6 meses
• €12/12 meses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 As assinaturas se renovam automaticamente. Você pode cancelar quando quiser.`,

  PREMIUM_ONESHOT_PRICING: `💎 ASSINAR PREMIUM

✨ Com Premium:
• 🔔 Alertas personalizados ilimitados
• 📢 Alertas espontâneos regulares
• 🎯 Multi-pares (EUR→BRL + BRL→EUR)
• 📊 Análises mais avançadas
• 🌍 Multi-moedas em breve
• ⚡ Acesso prioritário às novas funcionalidades

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 <b>PAGAMENTO ÚNICO (sem assinatura)</b>

💳 <b>Mercado Pago (BRL)</b>
• R$ 18 - 3 meses
• R$ 32 - 6 meses
• R$ 60 - 12 meses

💳 <b>PayPal (USD)</b>
• $4.50 - 3 meses
• $8 - 6 meses
• $15 - 12 meses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Pagamento único, acesso Premium pela duração escolhida, sem renovação automática.`,
    
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
    
      ALERT_VIEW_DETAILS: (alert, currentRate, refValue, calculatedThreshold, locale) => {
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
        brleur: (amt, locale) => `🇧🇷 BRL → 🇪🇺 EUR (SEPA) · R$ ${formatAmount(amt, 0, locale)}`,
        
        // ✅ Botões renomeados
        contOn: '🚀 Converter on-chain',
        stayOff: '🏦 Converter off-chain',
        calcdetails: '🔍 Detalhes do cálculo on-chain',
        swapMode: '🔄 Inverter',
        change: '✏️ Alterar valor',
        
        back: '⬅️ Voltar',
        sources: '📊 Fontes dos dados',
        openWise: '🔗 Abrir Wise',
        openRemitly: '🔗 Abrir Remitly',
        openInstarem: '🔗 Abrir Instarem',
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
        
        // ✅ Novos botões skip
        skipToStep2: "Já tenho USDC (pular)",
        skipToStep3: "⏭️ Pular para etapa 3",
        
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
        seeOneshot: '💰 Ou experimente sem assinatura →',
        backToSubscriptions: '⬅️ Voltar às assinaturas',

        // Subscription plans (recurring)
        subMPMonthly: '💳 R$ 6/mês',
        subMPQuarterly: '💳 R$ 15/3 meses (-17%)',
        subMPSemiannual: '💳 R$ 28/6 meses (-22%)',
        subMPAnnual: '💳 R$ 50/12 meses (-31%)',
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
    refAvg7d:   (rate, locale) => `📈 Média 7d (${formatRate(rate, locale)})`,
    refAvg30d:  (rate, locale) => `📊 Média 30d (${formatRate(rate, locale)}) ⭐`,
    refAvg90d:  (rate, locale) => `📉 Média 90d (${formatRate(rate, locale)})`,
    
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