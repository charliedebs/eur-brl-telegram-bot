/**
 * Premium Handler
 *
 * Handles all premium-related logic:
 * - Premium pricing displays
 * - Subscription management
 * - One-shot purchases
 * - Premium feature access checks
 * - Payment help/support
 */

import { logger } from '../../utils/logger.js';

export class PremiumHandler {
  constructor(db, messages) {
    this.db = db;
    this.messages = messages;
  }

  /**
   * Get messages for user's language
   */
  getMsg(lang) {
    return this.messages[lang || 'pt'];
  }

  /**
   * Handle /premium command
   */
  async handlePremiumCommand(userId, lang, replyFn, kbBuilder) {
    const msg = this.getMsg(lang);

    try {
      // Check if user has premium
      const { getPremiumDetails } = await import('../../services/payments/index.js');
      const premiumInfo = await getPremiumDetails(userId);

      if (premiumInfo) {
        // User has premium - check if has active subscription
        const activeSubscription = await this.db.getActiveSubscription(userId);

        const expiryDate = premiumInfo.expires_at.toLocaleDateString(
          lang === 'pt' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : 'en-US'
        );

        let premiumMessage;
        let keyboardType;

        if (activeSubscription) {
          // User has an active subscription
          const planNames = {
            monthly: {
              pt: 'Mensal',
              fr: 'Mensuel',
              en: 'Monthly',
              freq: { pt: 'todo mês', fr: 'chaque mois', en: 'every month' }
            },
            quarterly: {
              pt: '3 Meses',
              fr: '3 Mois',
              en: '3 Months',
              freq: { pt: 'a cada 3 meses', fr: 'tous les 3 mois', en: 'every 3 months' }
            },
            semiannual: {
              pt: '6 Meses',
              fr: '6 Mois',
              en: '6 Months',
              freq: { pt: 'a cada 6 meses', fr: 'tous les 6 mois', en: 'every 6 months' }
            },
            annual: {
              pt: '12 Meses',
              fr: '12 Mois',
              en: '12 Months',
              freq: { pt: 'anualmente', fr: 'annuellement', en: 'annually' }
            }
          };

          const planInfo = planNames[activeSubscription.plan] || planNames.monthly;

          premiumMessage = {
            pt: `✅ <b>Você é Premium!</b>\n\n` +
                `⏰ Próxima renovação: ${expiryDate}\n` +
                `📅 Dias restantes: ${premiumInfo.days_remaining}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💎 <b>FUNCIONALIDADES ATIVAS</b>\n\n` +
                `✨ Você tem acesso a:\n` +
                `• 🔔 Alertas personalizados ilimitados\n` +
                `• 📢 Alertas espontâneos regulares\n` +
                `• 🎯 Multi-pares (EUR→BRL + BRL→EUR)\n` +
                `• 📊 Análises avançadas\n` +
                `• ⚡ Acesso prioritário às novas funcionalidades\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔄 <b>ASSINATURA ATIVA</b>\n\n` +
                `📦 Plano: ${planInfo.pt}\n` +
                `🔄 Renovação: ${planInfo.freq.pt}\n\n` +
                `Para cancelar sua assinatura, acesse seu app <b>Mercado Pago</b> → Assinaturas.`,
            fr: `✅ <b>Vous êtes Premium!</b>\n\n` +
                `⏰ Prochain renouvellement: ${expiryDate}\n` +
                `📅 Jours restants: ${premiumInfo.days_remaining}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💎 <b>FONCTIONNALITÉS ACTIVES</b>\n\n` +
                `✨ Vous avez accès à:\n` +
                `• 🔔 Alertes personnalisées illimitées\n` +
                `• 📢 Alertes spontanées régulières\n` +
                `• 🎯 Multi-paires (EUR→BRL + BRL→EUR)\n` +
                `• 📊 Analyses avancées\n` +
                `• ⚡ Accès prioritaire aux nouvelles fonctionnalités\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔄 <b>ABONNEMENT ACTIF</b>\n\n` +
                `📦 Plan: ${planInfo.fr}\n` +
                `🔄 Renouvellement: ${planInfo.freq.fr}\n\n` +
                `Pour annuler votre abonnement, accédez à votre app <b>Mercado Pago</b> → Abonnements.`,
            en: `✅ <b>You are Premium!</b>\n\n` +
                `⏰ Next renewal: ${expiryDate}\n` +
                `📅 Days remaining: ${premiumInfo.days_remaining}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💎 <b>ACTIVE FEATURES</b>\n\n` +
                `✨ You have access to:\n` +
                `• 🔔 Unlimited custom alerts\n` +
                `• 📢 Regular spontaneous alerts\n` +
                `• 🎯 Multi-pairs (EUR→BRL + BRL→EUR)\n` +
                `• 📊 Advanced analytics\n` +
                `• ⚡ Priority access to new features\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🔄 <b>ACTIVE SUBSCRIPTION</b>\n\n` +
                `📦 Plan: ${planInfo.en}\n` +
                `🔄 Renewal: ${planInfo.freq.en}\n\n` +
                `To cancel your subscription, access your <b>Mercado Pago</b> app → Subscriptions.`
          };

          keyboardType = 'premium_subscription_active';
        } else {
          // User has premium but no active subscription (one-shot payment)
          premiumMessage = {
            pt: `✅ <b>Você é Premium!</b>\n\n` +
                `⏰ Expira em: ${expiryDate}\n` +
                `📅 Dias restantes: ${premiumInfo.days_remaining}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💎 <b>FUNCIONALIDADES ATIVAS</b>\n\n` +
                `✨ Você tem acesso a:\n` +
                `• 🔔 Alertas personalizados ilimitados\n` +
                `• 📢 Alertas espontâneos regulares\n` +
                `• 🎯 Multi-pares (EUR→BRL + BRL→EUR)\n` +
                `• 📊 Análises avançadas\n` +
                `• ⚡ Acesso prioritário às novas funcionalidades\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 <b>RENOVAR SEU ACESSO</b>\n\n` +
                `Escolha abaixo para adicionar mais tempo ou passar para assinatura recorrente:`,
            fr: `✅ <b>Vous êtes Premium!</b>\n\n` +
                `⏰ Expire le: ${expiryDate}\n` +
                `📅 Jours restants: ${premiumInfo.days_remaining}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💎 <b>FONCTIONNALITÉS ACTIVES</b>\n\n` +
                `✨ Vous avez accès à:\n` +
                `• 🔔 Alertes personnalisées illimitées\n` +
                `• 📢 Alertes spontanées régulières\n` +
                `• 🎯 Multi-paires (EUR→BRL + BRL→EUR)\n` +
                `• 📊 Analyses avancées\n` +
                `• ⚡ Accès prioritaire aux nouvelles fonctionnalités\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 <b>RENOUVELER VOTRE ACCÈS</b>\n\n` +
                `Choisissez ci-dessous pour ajouter plus de temps ou passer en abonnement récurrent:`,
            en: `✅ <b>You are Premium!</b>\n\n` +
                `⏰ Expires: ${expiryDate}\n` +
                `📅 Days remaining: ${premiumInfo.days_remaining}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💎 <b>ACTIVE FEATURES</b>\n\n` +
                `✨ You have access to:\n` +
                `• 🔔 Unlimited custom alerts\n` +
                `• 📢 Regular spontaneous alerts\n` +
                `• 🎯 Multi-pairs (EUR→BRL + BRL→EUR)\n` +
                `• 📊 Advanced analytics\n` +
                `• ⚡ Priority access to new features\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `💰 <b>RENEW YOUR ACCESS</b>\n\n` +
                `Choose below to add more time or switch to recurring subscription:`
          };

          keyboardType = 'premium_oneshot_renew';
        }

        const keyboard = kbBuilder(msg, keyboardType, { lang });
        return replyFn(premiumMessage[lang] || premiumMessage.pt, { parse_mode: 'HTML', keyboard });

      } else {
        // User doesn't have premium - show regular pricing
        const keyboard = kbBuilder(msg, 'premium_pricing');
        return replyFn(msg.PREMIUM_PRICING, { parse_mode: 'HTML', keyboard });
      }

    } catch (error) {
      logger.error('[PREMIUM] Premium command failed:', { error: error.message, userId });
      // Fallback to simple premium message
      const keyboard = kbBuilder(msg, 'premium_pricing');
      return replyFn(msg.PREMIUM_PRICING, { parse_mode: 'HTML', keyboard });
    }
  }

  /**
   * Handle premium pricing view
   */
  async handlePremiumPricing(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);

    try {
      // Re-check premium status before showing pricing
      const { getPremiumDetails } = await import('../../services/payments/index.js');
      const premiumInfo = await getPremiumDetails(userId);

      if (premiumInfo) {
        // User is premium - show appropriate message
        const activeSubscription = await this.db.getActiveSubscription(userId);
        const expiryDate = premiumInfo.expires_at.toLocaleDateString(
          lang === 'pt' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : 'en-US'
        );

        let premiumMessage;
        let keyboardType;

        if (activeSubscription) {
          const planNames = {
            monthly: { pt: 'Mensal', fr: 'Mensuel', en: 'Monthly', freq: { pt: 'todo mês', fr: 'chaque mois', en: 'every month' } },
            quarterly: { pt: '3 Meses', fr: '3 Mois', en: '3 Months', freq: { pt: 'a cada 3 meses', fr: 'tous les 3 mois', en: 'every 3 months' } },
            semiannual: { pt: '6 Meses', fr: '6 Mois', en: '6 Months', freq: { pt: 'a cada 6 meses', fr: 'tous les 6 mois', en: 'every 6 months' } },
            annual: { pt: '12 Meses', fr: '12 Mois', en: '12 Months', freq: { pt: 'anualmente', fr: 'annuellement', en: 'annually' } }
          };

          const planInfo = planNames[activeSubscription.plan] || planNames.monthly;

          premiumMessage = {
            pt: `✅ <b>Você é Premium!</b>\n\n⏰ Próxima renovação: ${expiryDate}\n📅 Dias restantes: ${premiumInfo.days_remaining}\n\n💎 <b>FUNCIONALIDADES ATIVAS</b>\n✨ Alertas personalizados ilimitados\n✨ Alertas espontâneos regulares\n\n🔄 <b>ASSINATURA ATIVA</b>\n📦 Plano: ${planInfo.pt}\n🔄 Renovação: ${planInfo.freq.pt}\n\nPara cancelar sua assinatura, acesse seu app <b>Mercado Pago</b> → Assinaturas.`,
            fr: `✅ <b>Vous êtes Premium!</b>\n\n⏰ Prochain renouvellement: ${expiryDate}\n📅 Jours restants: ${premiumInfo.days_remaining}\n\n💎 <b>FONCTIONNALITÉS ACTIVES</b>\n✨ Alertes personnalisées illimitées\n✨ Alertes spontanées régulières\n\n🔄 <b>ABONNEMENT ACTIF</b>\n📦 Plan: ${planInfo.fr}\n🔄 Renouvellement: ${planInfo.freq.fr}\n\nPour annuler votre abonnement, accédez à votre app <b>Mercado Pago</b> → Abonnements.`,
            en: `✅ <b>You are Premium!</b>\n\n⏰ Next renewal: ${expiryDate}\n📅 Days remaining: ${premiumInfo.days_remaining}\n\n💎 <b>ACTIVE FEATURES</b>\n✨ Unlimited custom alerts\n✨ Regular spontaneous alerts\n\n🔄 <b>ACTIVE SUBSCRIPTION</b>\n📦 Plan: ${planInfo.en}\n🔄 Renewal: ${planInfo.freq.en}\n\nTo cancel your subscription, access your <b>Mercado Pago</b> app → Subscriptions.`
          };

          keyboardType = 'premium_subscription_active';
        } else {
          premiumMessage = {
            pt: `✅ <b>Você é Premium!</b>\n\n⏰ Expira em: ${expiryDate}\n📅 Dias restantes: ${premiumInfo.days_remaining}\n\n💎 <b>FUNCIONALIDADES ATIVAS</b>\n✨ Alertas personalizados ilimitados\n✨ Alertas espontâneos regulares\n\n💰 <b>RENOVAR SEU ACESSO</b>\n\nEscolha abaixo para adicionar mais tempo ou passar para assinatura recorrente:`,
            fr: `✅ <b>Vous êtes Premium!</b>\n\n⏰ Expire le: ${expiryDate}\n📅 Jours restants: ${premiumInfo.days_remaining}\n\n💎 <b>FONCTIONNALITÉS ACTIVES</b>\n✨ Alertes personnalisées illimitées\n✨ Alertes spontanées régulières\n\n💰 <b>RENOUVELER VOTRE ACCÈS</b>\n\nChoisissez ci-dessous pour ajouter plus de temps ou passer en abonnement récurrent:`,
            en: `✅ <b>You are Premium!</b>\n\n⏰ Expires: ${expiryDate}\n📅 Days remaining: ${premiumInfo.days_remaining}\n\n💎 <b>ACTIVE FEATURES</b>\n✨ Unlimited custom alerts\n✨ Regular spontaneous alerts\n\n💰 <b>RENEW YOUR ACCESS</b>\n\nChoose below to add more time or switch to recurring subscription:`
          };

          keyboardType = 'premium_oneshot_renew';
        }

        const keyboard = kbBuilder(msg, keyboardType, { lang });
        await editFn(premiumMessage[lang] || premiumMessage.pt, { parse_mode: 'HTML', keyboard });
      } else {
        // User not premium - show regular pricing
        const keyboard = kbBuilder(msg, 'premium_pricing');
        await editFn(msg.PREMIUM_PRICING, { parse_mode: 'HTML', keyboard });
      }

      answerFn();

    } catch (error) {
      logger.error('[PREMIUM] Premium pricing callback failed:', { error: error.message, userId });
      // Fallback
      const keyboard = kbBuilder(msg, 'premium_pricing');
      await editFn(msg.PREMIUM_PRICING, { parse_mode: 'HTML', keyboard });
      answerFn();
    }
  }

  /**
   * Handle premium details view
   */
  async handlePremiumDetails(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'premium_details');

    await editFn(msg.PREMIUM_DETAILS, { parse_mode: 'HTML', keyboard });
    answerFn();
  }

  /**
   * Handle one-shot pricing view
   */
  async handleOneshotPricing(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'premium_oneshot_pricing');

    await editFn(msg.PREMIUM_ONESHOT_PRICING, { parse_mode: 'HTML', keyboard });
    answerFn();
  }

  /**
   * Handle premium user renewing with one-shot
   */
  async handleRenewOneshot(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'premium_oneshot_pricing_renew');

    await editFn(msg.PREMIUM_ONESHOT_PRICING, { parse_mode: 'HTML', keyboard });
    answerFn();
  }

  /**
   * Handle premium user switching to subscription
   */
  async handleRenewSubscription(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);
    const keyboard = kbBuilder(msg, 'premium_subscription_pricing_renew');

    await editFn(msg.PREMIUM_PRICING, { parse_mode: 'HTML', keyboard });
    answerFn();
  }

  /**
   * Handle back to renew screen
   */
  async handleBackToRenew(userId, lang, editFn, answerFn, kbBuilder) {
    const msg = this.getMsg(lang);

    try {
      // Re-fetch premium details to show current status
      const { getPremiumDetails } = await import('../../services/payments/index.js');
      const premiumInfo = await getPremiumDetails(userId);

      if (!premiumInfo) {
        // No longer premium, redirect to pricing
        const keyboard = kbBuilder(msg, 'premium_pricing');
        await editFn(msg.PREMIUM_PRICING, { parse_mode: 'HTML', keyboard });
        answerFn();
        return;
      }

      const expiryDate = premiumInfo.expires_at.toLocaleDateString(
        lang === 'pt' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : 'en-US'
      );

      const premiumMessage = {
        pt: `✅ <b>Você é Premium!</b>\n\n⏰ Expira em: ${expiryDate}\n📅 Dias restantes: ${premiumInfo.days_remaining}\n\n💎 <b>FUNCIONALIDADES ATIVAS</b>\n✨ Alertas personalizados ilimitados\n✨ Alertas espontâneos regulares\n\n💰 <b>RENOVAR SEU ACESSO</b>\n\nEscolha abaixo para adicionar mais tempo ou passar para assinatura recorrente:`,
        fr: `✅ <b>Vous êtes Premium!</b>\n\n⏰ Expire le: ${expiryDate}\n📅 Jours restants: ${premiumInfo.days_remaining}\n\n💎 <b>FONCTIONNALITÉS ACTIVES</b>\n✨ Alertes personnalisées illimitées\n✨ Alertes spontanées régulières\n\n💰 <b>RENOUVELER VOTRE ACCÈS</b>\n\nChoisissez ci-dessous pour ajouter plus de temps ou passer en abonnement récurrent:`,
        en: `✅ <b>You are Premium!</b>\n\n⏰ Expires: ${expiryDate}\n📅 Days remaining: ${premiumInfo.days_remaining}\n\n💎 <b>ACTIVE FEATURES</b>\n✨ Unlimited custom alerts\n✨ Regular spontaneous alerts\n\n💰 <b>RENEW YOUR ACCESS</b>\n\nChoose below to add more time or switch to recurring subscription:`
      };

      const keyboard = kbBuilder(msg, 'premium_oneshot_renew', { lang });
      await editFn(premiumMessage[lang] || premiumMessage.pt, { parse_mode: 'HTML', keyboard });
      answerFn();

    } catch (error) {
      logger.error('[PREMIUM] Back to renew failed:', { error: error.message, userId });
      answerFn();
    }
  }

  /**
   * Handle payment help/support request
   */
  async handlePaymentHelp(userId, lang, editFn, answerFn, kbBuilder) {
    const helpMessage = {
      pt: `💬 <b>Ajuda com Pagamento</b>\n\nSelecione sua situação ou escreva uma mensagem personalizada:`,
      fr: `💬 <b>Aide pour le Paiement</b>\n\nSélectionnez votre situation ou écrivez un message personnalisé:`,
      en: `💬 <b>Payment Support</b>\n\nSelect your situation or write a custom message:`
    };

    const keyboard = kbBuilder({ btn: {} }, 'payment_help', { lang });

    await editFn(helpMessage[lang] || helpMessage.pt, { parse_mode: 'HTML', keyboard });
    answerFn();
  }

  /**
   * Handle predefined support scenarios
   */
  async handleSupportScenario(userId, lang, scenario, editFn, replyFn, sessionUpdate) {
    const messages = {
      no_mercadopago: {
        pt: `💬 <b>Sem Mercado Pago</b>\n\nEntendo! Estamos trabalhando para adicionar outras formas de pagamento em breve.\n\nEnquanto isso, você pode criar uma conta Mercado Pago gratuitamente em: https://www.mercadopago.com.br`,
        fr: `💬 <b>Pas de Mercado Pago</b>\n\nJe comprends ! Nous travaillons pour ajouter d'autres moyens de paiement bientôt.\n\nEn attendant, vous pouvez créer un compte Mercado Pago gratuitement sur: https://www.mercadopago.com.br`,
        en: `💬 <b>No Mercado Pago</b>\n\nI understand! We're working to add other payment methods soon.\n\nMeanwhile, you can create a free Mercado Pago account at: https://www.mercadopago.com.br`
      },
      other_currency: {
        pt: `💬 <b>Outras Moedas</b>\n\nAtualmente aceitamos apenas pagamentos em BRL via Mercado Pago.\n\nPara pagar em EUR/USD, você pode usar cartões internacionais no Mercado Pago, que farão a conversão automaticamente.`,
        fr: `💬 <b>Autres Devises</b>\n\nActuellement nous acceptons uniquement les paiements en BRL via Mercado Pago.\n\nPour payer en EUR/USD, vous pouvez utiliser des cartes internationales sur Mercado Pago, qui feront la conversion automatiquement.`,
        en: `💬 <b>Other Currencies</b>\n\nWe currently only accept payments in BRL via Mercado Pago.\n\nTo pay in EUR/USD, you can use international cards on Mercado Pago, which will convert automatically.`
      },
      payment_failed: {
        pt: `💬 <b>Pagamento Falhou</b>\n\nSinto muito por isso! Pode me enviar mais detalhes sobre o erro?\n\n- Qual mensagem de erro apareceu?\n- Qual método de pagamento tentou usar?\n- Em que etapa parou?`,
        fr: `💬 <b>Paiement Échoué</b>\n\nDésolé pour ça ! Pouvez-vous m'envoyer plus de détails sur l'erreur ?\n\n- Quel message d'erreur est apparu ?\n- Quelle méthode de paiement avez-vous essayé ?\n- À quelle étape ça s'est arrêté ?`,
        en: `💬 <b>Payment Failed</b>\n\nSorry about that! Can you send me more details about the error?\n\n- What error message appeared?\n- Which payment method did you try?\n- At which step did it stop?`
      }
    };

    if (scenario === 'custom_message') {
      sessionUpdate({ awaitingPaymentHelp: true });
      const promptMsg = {
        pt: `✍️ <b>Mensagem Personalizada</b>\n\nEscreva sua pergunta ou problema:`,
        fr: `✍️ <b>Message Personnalisé</b>\n\nÉcrivez votre question ou problème:`,
        en: `✍️ <b>Custom Message</b>\n\nWrite your question or issue:`
      };
      return editFn(promptMsg[lang] || promptMsg.pt, { parse_mode: 'HTML' });
    }

    const text = messages[scenario]?.[lang] || messages[scenario]?.pt;
    if (text) {
      return replyFn(text, { parse_mode: 'HTML' });
    }
  }

  /**
   * Process custom payment help message
   */
  async processPaymentHelpText(userId, lang, messageText, replyFn) {
    try {
      // Log support request
      await this.db.logSupportRequest(userId, 'payment_help', messageText);

      // Notify admin (if configured)
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId) {
        // Would need bot instance to send - handle in platform layer
        logger.info('[PREMIUM] Payment help request:', { userId, message: messageText });
      }

      const confirmText = {
        pt: '✅ Mensagem enviada! Responderemos em breve.',
        fr: '✅ Message envoyé ! Nous répondrons bientôt.',
        en: '✅ Message sent! We will respond soon.'
      };

      return replyFn(confirmText[lang] || confirmText.pt);

    } catch (error) {
      logger.error('[PREMIUM] Error processing payment help:', { error: error.message, userId });
      return replyFn('❌ Erreur');
    }
  }
}
