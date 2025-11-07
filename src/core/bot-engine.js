// src/core/bot-engine.js
// Platform-agnostic bot engine - works for Telegram, WhatsApp, and any future platform

import { logger } from '../utils/logger.js';
import { DatabaseService } from '../services/database.js';
import * as RatesService from '../services/rates.js';
import * as PaymentService from '../services/payments/index.js';
import { parseUserIntent } from './nlu.js';
import { messages } from '../bot/messages/messages-loader.js';

export class BotEngine {
  constructor(adapter) {
    this.adapter = adapter;
    this.db = new DatabaseService();
    this.services = {
      rates: RatesService,
      payments: PaymentService,
      database: this.db,
      nlu: { parse: parseUserIntent }
    };
  }

  /**
   * Process incoming message
   */
  async processMessage({ userId, text, platform, username, messageId }) {
    try {
      logger.info('[BOT-ENGINE] Processing message:', { userId, platform, text: text.substring(0, 50) });

      // Get or create user
      let user = await this.db.getUser(userId);
      if (!user) {
        user = await this.db.createUser(userId, 'pt'); // Default Portuguese
      }

      // Get user's message translations
      const msg = messages[user.language || 'pt'];

      // Check if user is premium
      const isPremium = await this.db.isPremium(userId);

      // Create context for handlers
      const context = {
        userId,
        user,
        isPremium,
        platform,
        text,
        msg,
        services: this.services,
        adapter: this.adapter
      };

      // Process the message
      const response = await this.routeMessage(context);

      return response;

    } catch (error) {
      logger.error('[BOT-ENGINE] Error processing message:', {
        error: error.message,
        userId,
        platform
      });

      // Return error response
      return {
        text: '❌ Erro ao processar mensagem / Error processing message',
        error: true
      };
    }
  }

  /**
   * Route message to appropriate handler
   */
  async routeMessage(context) {
    const { text, msg } = context;
    const lowerText = text.toLowerCase().trim();

    // Command routing
    if (lowerText.startsWith('/start') || lowerText === 'start' || lowerText.includes('começar')) {
      return this.handleStart(context);
    }

    if (lowerText.startsWith('/help') || lowerText.includes('ajuda') || lowerText.includes('help')) {
      return this.handleHelp(context);
    }

    if (lowerText.startsWith('/comparar') || lowerText.startsWith('/compare')) {
      return this.handleCompare(context);
    }

    if (lowerText.startsWith('/premium')) {
      return this.handlePremium(context);
    }

    if (lowerText.startsWith('/checkpayment')) {
      return this.handleCheckPayment(context);
    }

    if (lowerText.startsWith('/lang') || lowerText.startsWith('/language') || lowerText.startsWith('/idioma')) {
      return this.handleLanguage(context);
    }

    // NLU for natural language
    const intent = await this.services.nlu.parse(text, {
      language: context.user.language
    });

    if (intent.intent === 'compare' && intent.entities.amount && intent.entities.route) {
      context.nluIntent = intent;
      return this.handleCompare(context);
    }

    if (intent.intent === 'premium_status') {
      context.nluIntent = intent;
      return this.handleCheckPayment(context);
    }

    // Default response
    return {
      text: msg.UNKNOWN_COMMAND || 'Comando não reconhecido. Use /help para ver os comandos disponíveis.',
      buttons: [
        { id: 'help', text: msg.btn?.help || '❓ Ajuda' },
        { id: 'compare', text: msg.btn?.compare || '💱 Comparar' }
      ]
    };
  }

  /**
   * Handle /start command
   */
  async handleStart(context) {
    const { msg } = context;

    return {
      text: msg.WELCOME || `👋 Bem-vindo ao Bot EUR/BRL!

💱 Compare taxas de câmbio em tempo real
🏦 Encontre as melhores rotas de transferência
💎 Recursos Premium disponíveis

Use /help para ver todos os comandos.`,
      buttons: [
        { id: 'compare:1000', text: '€1000 → R$' },
        { id: 'compare:5000', text: 'R$5000 → €' },
        { id: 'premium', text: '💎 Premium' },
        { id: 'help', text: '❓ Ajuda' }
      ]
    };
  }

  /**
   * Handle /help command
   */
  async handleHelp(context) {
    const { msg } = context;

    return {
      text: msg.HELP || `📖 *Comandos Disponíveis:*

💱 */comparar [valor]* - Comparar taxas
💎 */premium* - Ver planos Premium
📊 */checkpayment* - Ver status Premium
❓ */help* - Mostrar esta ajuda

Você também pode enviar mensagens naturais como:
"Quanto fica 1000 euros em reais?"
"Quero converter 5000 reais para euros"`,
      buttons: [
        { id: 'compare', text: '💱 Comparar' },
        { id: 'premium', text: '💎 Premium' }
      ]
    };
  }

  /**
   * Handle compare command
   */
  async handleCompare(context) {
    const { text, msg, nluIntent } = context;

    // Extract amount and route from text or NLU
    let amount = 1000;
    let route = 'eurbrl';

    if (nluIntent) {
      amount = nluIntent.entities.amount || 1000;
      route = nluIntent.entities.route || 'eurbrl';
    } else {
      // Simple parsing from command
      const match = text.match(/\d+/);
      if (match) {
        amount = parseFloat(match[0]);
      }
      if (text.includes('brl') && text.includes('eur')) {
        route = 'brleur';
      }
    }

    // Get rates
    const rates = await this.services.rates.getRates();
    if (!rates) {
      return {
        text: '❌ Erro ao buscar taxas. Tente novamente.',
        error: true
      };
    }

    // Calculate
    const result = this.services.rates.calculateOnChain(route, amount, rates);
    const locale = this.services.rates.getLocale(context.user.language);

    // Format response
    const fromCurrency = route === 'eurbrl' ? 'EUR' : 'BRL';
    const toCurrency = route === 'eurbrl' ? 'BRL' : 'EUR';
    const fromSymbol = route === 'eurbrl' ? '€' : 'R$';
    const toSymbol = route === 'eurbrl' ? 'R$' : '€';

    const text = `💱 *Comparação de Taxas*

📥 Você envia: ${fromSymbol} ${this.services.rates.formatAmount(result.in, 2, locale)}
📤 Você recebe: ${toSymbol} ${this.services.rates.formatAmount(result.out, 2, locale)}

📊 Taxa efetiva: ${this.services.rates.formatRate(result.rate, locale)}
📈 Taxa de mercado: ${this.services.rates.formatRate(rates.cross, locale)}

⚡ Via stablecoin (USDC)
🔄 Cálculo em tempo real`;

    return {
      text,
      buttons: [
        { id: `compare:${route}:500`, text: `${fromSymbol}500` },
        { id: `compare:${route}:1000`, text: `${fromSymbol}1000` },
        { id: `compare:${route}:5000`, text: `${fromSymbol}5000` },
        { id: `compare:${route === 'eurbrl' ? 'brleur' : 'eurbrl'}:${amount}`, text: '🔄 Inverter' },
        { id: 'premium', text: '💎 Premium' }
      ]
    };
  }

  /**
   * Handle /premium command
   */
  async handlePremium(context) {
    const { msg, isPremium } = context;

    if (isPremium) {
      const premiumDetails = await this.services.payments.getPremiumDetails(context.userId);

      return {
        text: `✅ *Você é Premium!*

⏰ Expira em: ${premiumDetails.expires_at.toLocaleDateString()}
📅 Dias restantes: ${premiumDetails.days_remaining}

🎯 Seus benefícios:
✅ Alertas personalizados
✅ Consultas ilimitadas
✅ Suporte prioritário`,
        buttons: [
          { id: 'alerts', text: '🔔 Configurar Alertas' },
          { id: 'help', text: '❓ Ajuda' }
        ]
      };
    }

    // Show pricing
    const plans = this.services.payments.getPremiumPlans();

    return {
      text: `💎 *Planos Premium*

🟢 *Mensal* - R$ 29,90 / $5.99
📅 30 dias de acesso

🔵 *Trimestral* - R$ 79,90 / $15.99
📅 90 dias • Economize 11%

🟣 *Anual* - R$ 299,90 / $59.99
📅 365 dias • Economize 17%

🎯 *Benefícios Premium:*
✅ Alertas personalizados
✅ Consultas ilimitadas
✅ Suporte prioritário
✅ Análises avançadas`,
      buttons: [
        { id: 'subscribe:monthly', text: '🟢 Mensal' },
        { id: 'subscribe:quarterly', text: '🔵 Trimestral' },
        { id: 'subscribe:annual', text: '🟣 Anual' }
      ]
    };
  }

  /**
   * Handle language command
   */
  async handleLanguage(context) {
    return {
      text: `🌐 *Choose your language / Escolha o idioma*

Select your preferred language for the bot.`,
      buttons: [
        { id: 'lang:pt', text: '🇧🇷 Português' },
        { id: 'lang:en', text: '🇺🇸 English' },
        { id: 'lang:fr', text: '🇫🇷 Français' }
      ]
    };
  }

  /**
   * Handle /checkpayment command
   */
  async handleCheckPayment(context) {
    const premiumInfo = await this.services.payments.getPremiumDetails(context.userId);

    if (premiumInfo) {
      return {
        text: `✅ *Você é Premium!*

⏰ Expira em: ${premiumInfo.expires_at.toLocaleDateString()}
📅 Dias restantes: ${premiumInfo.days_remaining}`,
        buttons: [
          { id: 'premium', text: '💎 Ver Planos' }
        ]
      };
    }

    return {
      text: '❌ Você não tem uma assinatura Premium ativa.\n\nUse /premium para assinar.',
      buttons: [
        { id: 'premium', text: '💎 Ver Planos' }
      ]
    };
  }

  /**
   * Handle button click
   */
  async handleButtonClick({ userId, buttonId, platform }) {
    try {
      logger.info('[BOT-ENGINE] Button clicked:', { userId, buttonId, platform });

      // Get user context
      let user = await this.db.getUser(userId);
      const msg = messages[user?.language || 'pt'];
      const isPremium = await this.db.isPremium(userId);

      const context = {
        userId,
        user,
        isPremium,
        platform,
        msg,
        services: this.services,
        adapter: this.adapter
      };

      // Route button action
      if (buttonId === 'help') {
        return this.handleHelp(context);
      }

      if (buttonId === 'premium') {
        return this.handlePremium(context);
      }

      if (buttonId === 'compare') {
        return this.handleCompare(context);
      }

      if (buttonId.startsWith('compare:')) {
        const parts = buttonId.split(':');
        const route = parts[1] || 'eurbrl';
        const amount = parseFloat(parts[2]) || 1000;

        context.text = `/comparar ${amount} ${route}`;
        return this.handleCompare(context);
      }

      if (buttonId.startsWith('subscribe:')) {
        const plan = buttonId.split(':')[1];
        return this.handleSubscription(context, plan);
      }

      if (buttonId.startsWith('lang:')) {
        const language = buttonId.split(':')[1];
        await this.db.updateUser(userId, { language });
        context.user.language = language;

        return {
          text: language === 'pt' ? '✅ Idioma alterado para Português!' :
                language === 'en' ? '✅ Language changed to English!' :
                language === 'fr' ? '✅ Langue changée en Français!' :
                '✅ Language updated!',
          buttons: [
            { id: 'help', text: '❓ Ajuda' }
          ]
        };
      }

      if (buttonId.startsWith('payment:')) {
        const parts = buttonId.split(':');
        const plan = parts[1];
        const method = parts[2];
        return this.handlePaymentMethod(context, plan, method);
      }

      // Default response
      return {
        text: 'Ação não reconhecida.',
        buttons: [
          { id: 'help', text: '❓ Ajuda' }
        ]
      };

    } catch (error) {
      logger.error('[BOT-ENGINE] Error handling button:', {
        error: error.message,
        userId,
        buttonId
      });

      return {
        text: '❌ Erro ao processar ação.',
        error: true
      };
    }
  }

  /**
   * Handle subscription flow
   */
  async handleSubscription(context, plan) {
    const { msg } = context;
    const plans = this.services.payments.getPremiumPlans();
    const planInfo = plans[plan];

    if (!planInfo) {
      return {
        text: '❌ Plano inválido.',
        buttons: [{ id: 'premium', text: '💎 Ver Planos' }]
      };
    }

    const methods = this.services.payments.getAvailablePaymentMethods();

    const text = `💳 *Escolha o método de pagamento*

📦 Plano: ${planInfo.name.pt}
⏱ Duração: ${planInfo.duration} dias
💰 Preço: R$ ${planInfo.prices.BRL} / $${planInfo.prices.USD}

Selecione abaixo:`;

    const buttons = methods.map(method => ({
      id: `payment:${plan}:${method.id}`,
      text: `${method.icon} ${method.name}`
    }));
    buttons.push({ id: 'premium', text: '◀️ Voltar' });

    return {
      text,
      buttons
    };
  }

  /**
   * Handle payment method selection
   */
  async handlePaymentMethod(context, plan, method) {
    const { userId } = context;
    const plans = this.services.payments.getPremiumPlans();
    const planInfo = plans[plan];

    if (!planInfo) {
      return {
        text: '❌ Plano inválido.',
        buttons: [{ id: 'premium', text: '💎 Ver Planos' }]
      };
    }

    try {
      // Initiate payment through payment service
      const paymentData = await this.services.payments.initiatePayment({
        telegram_id: userId,
        plan,
        method,
        email: `whatsapp_${userId}@user.app` // Generic email for WhatsApp users
      });

      if (method === 'pix_manual') {
        // Return QR code for manual Pix
        return {
          text: `🏦 *Pagamento via Pix Manual*

📦 Plano: ${planInfo.name.pt}
💰 Valor: R$ ${planInfo.prices.BRL}

🔑 *Chave Pix:*
${paymentData.pix_key}

📱 *Instruções:*
1. Abra seu app bancário
2. Escaneie o QR code abaixo OU
3. Copie a chave Pix acima
4. Faça o pagamento de R$ ${planInfo.prices.BRL}
5. Envie o comprovante para confirmação

⏱️ Seu Premium será ativado em até 1 hora após confirmação.`,
          image: paymentData.qr_code_data_url,
          buttons: [
            { id: 'checkpayment', text: '✅ Verificar Pagamento' },
            { id: 'premium', text: '◀️ Voltar' }
          ]
        };
      } else if (method === 'mercadopago') {
        // Return Mercado Pago payment link
        return {
          text: `💳 *Pagamento via Mercado Pago*

📦 Plano: ${planInfo.name.pt}
💰 Valor: R$ ${planInfo.prices.BRL}

🔐 *Métodos aceitos:*
✅ Pix (instantâneo)
✅ Cartão de crédito
✅ Cartão de débito

Clique no botão abaixo para pagar:`,
          buttons: [
            { id: 'pay', text: '💳 Pagar agora', url: paymentData.init_point },
            { id: 'checkpayment', text: '✅ Verificar Pagamento' },
            { id: 'premium', text: '◀️ Voltar' }
          ]
        };
      } else if (method === 'paypal') {
        // Return PayPal payment link
        return {
          text: `💳 *Payment via PayPal*

📦 Plan: ${planInfo.name.en || planInfo.name.pt}
💰 Price: $${planInfo.prices.USD}

🔐 *Accepted:*
✅ Credit cards
✅ Debit cards
✅ PayPal balance

Click below to pay:`,
          buttons: [
            { id: 'pay', text: '💳 Pay now', url: paymentData.approval_url },
            { id: 'checkpayment', text: '✅ Check Payment' },
            { id: 'premium', text: '◀️ Back' }
          ]
        };
      }

      return {
        text: '❌ Método de pagamento não disponível.',
        buttons: [{ id: 'premium', text: '◀️ Voltar' }]
      };

    } catch (error) {
      logger.error('[BOT-ENGINE] Error initiating payment:', {
        error: error.message,
        userId,
        plan,
        method
      });

      return {
        text: '❌ Erro ao processar pagamento. Tente novamente mais tarde.',
        error: true,
        buttons: [{ id: 'premium', text: '◀️ Voltar' }]
      };
    }
  }
}

export default BotEngine;
