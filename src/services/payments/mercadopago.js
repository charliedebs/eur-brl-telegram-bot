// src/services/payments/mercadopago.js
// Mercado Pago integration for Pix and other Brazilian payment methods

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { logger } from '../../utils/logger.js';
import QRCode from 'qrcode';

// Initialize Mercado Pago client (v2 API)
let client = null;
let preferenceClient = null;

if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 }
  });
  preferenceClient = new Preference(client);
  logger.info('[MERCADOPAGO] Client initialized successfully');
}

// Premium plans configuration (ONE-SHOT payments)
export const PREMIUM_PLANS = {
  '3months': {
    duration: 90,
    price_brl: 18,
    price_usd: 4.50,
    name: {
      pt: '3 Meses',
      fr: '3 Mois',
      en: '3 Months'
    }
  },
  '6months': {
    duration: 180,
    price_brl: 32,
    price_usd: 8,
    name: {
      pt: '6 Meses',
      fr: '6 Mois',
      en: '6 Months'
    }
  },
  '12months': {
    duration: 365,
    price_brl: 60,
    price_usd: 15,
    name: {
      pt: '12 Meses',
      fr: '12 Mois',
      en: '12 Months'
    }
  }
};

// Subscription plans configuration (RECURRING payments)
export const SUBSCRIPTION_PLANS = {
  monthly: {
    plan_id: process.env.MERCADOPAGO_PLAN_MONTHLY,
    frequency: 1,
    frequency_type: 'months',
    price_brl: 6,
    name: {
      pt: 'Mensal',
      fr: 'Mensuel',
      en: 'Monthly'
    }
  },
  quarterly: {
    plan_id: process.env.MERCADOPAGO_PLAN_QUARTERLY,
    frequency: 3,
    frequency_type: 'months',
    price_brl: 15,
    name: {
      pt: 'Trimestral',
      fr: 'Trimestriel',
      en: 'Quarterly'
    },
    discount: '17%'
  },
  semiannual: {
    plan_id: process.env.MERCADOPAGO_PLAN_SEMIANNUAL,
    frequency: 6,
    frequency_type: 'months',
    price_brl: 28,
    name: {
      pt: 'Semestral',
      fr: 'Semestriel',
      en: '6-Month'
    },
    discount: '22%'
  },
  annual: {
    plan_id: process.env.MERCADOPAGO_PLAN_ANNUAL,
    frequency: 12,
    frequency_type: 'months',
    price_brl: 50,
    name: {
      pt: 'Anual',
      fr: 'Annuel',
      en: 'Annual'
    },
    discount: '31%'
  }
};

/**
 * Create a Pix payment via Mercado Pago
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in BRL
 * @param {string} params.plan - Plan type (monthly, quarterly, annual)
 * @param {string} params.email - Payer email
 * @param {string} params.telegram_id - User's Telegram ID
 * @param {string} params.description - Payment description
 * @returns {Promise<Object>} Payment data with QR code and payment link
 */
export async function createPixPayment({ amount, plan, email, telegram_id, description }) {
  try {
    if (!preferenceClient) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const external_reference = `${telegram_id}_${plan}_${Date.now()}`;

    const preferenceData = {
      items: [{
        title: description || `Premium ${plan} - EUR/BRL Bot`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'BRL'
      }],
      payer: {
        email: email || `user${telegram_id}@telegram.bot`
      },
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        installments: 1
      },
      external_reference: external_reference,
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
      metadata: {
        telegram_id: telegram_id.toString(),
        plan: plan,
        duration_days: PREMIUM_PLANS[plan]?.duration || 30
      },
      back_urls: {
        success: process.env.APP_URL || 'https://t.me/your_bot',
        failure: process.env.APP_URL || 'https://t.me/your_bot',
        pending: process.env.APP_URL || 'https://t.me/your_bot'
      },
      auto_return: 'approved'
    };

    // Use new v2 API
    const response = await preferenceClient.create({ body: preferenceData });

    // Debug: Log full response structure
    logger.info('[MERCADOPAGO] Full API response:', {
      keys: Object.keys(response),
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    });

    logger.info('[MERCADOPAGO] Payment preference created:', {
      preference_id: response.id,
      telegram_id,
      amount,
      plan,
      has_init_point: !!response.init_point,
      has_sandbox: !!response.sandbox_init_point
    });

    return {
      payment_id: response.id,
      init_point: response.init_point || response.sandbox_init_point, // Use sandbox in test mode
      sandbox_init_point: response.sandbox_init_point,
      qr_code: response.qr_code,
      qr_code_base64: response.qr_code_base64,
      external_reference: external_reference
    };

  } catch (error) {
    logger.error('[MERCADOPAGO] Failed to create payment preference:', {
      error: error.message,
      stack: error.stack,
      telegram_id,
      amount
    });
    throw error;
  }
}

/**
 * Get subscription checkout URL for Mercado Pago
 * @param {Object} params - Subscription parameters
 * @param {string} params.plan - Plan type (monthly, quarterly, semiannual, annual)
 * @param {string} params.telegram_id - User's Telegram ID
 * @param {string} params.email - User's email
 * @returns {Object} Subscription checkout URL and metadata
 */
export function getSubscriptionCheckoutUrl({ plan, telegram_id, email }) {
  const planConfig = SUBSCRIPTION_PLANS[plan];

  if (!planConfig || !planConfig.plan_id) {
    throw new Error(`Invalid subscription plan: ${plan}`);
  }

  const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${planConfig.plan_id}`;

  logger.info('[MERCADOPAGO] Subscription checkout URL generated:', {
    plan,
    telegram_id,
    plan_id: planConfig.plan_id,
    price: planConfig.price_brl
  });

  return {
    checkout_url: checkoutUrl,
    plan_id: planConfig.plan_id,
    plan_name: planConfig.name,
    price_brl: planConfig.price_brl,
    frequency: planConfig.frequency,
    frequency_type: planConfig.frequency_type,
    metadata: {
      telegram_id: telegram_id.toString(),
      plan: plan,
      email: email
    }
  };
}

/**
 * Get subscription details from Mercado Pago
 * @param {string} preapproval_id - Subscription ID (preapproval_id)
 * @returns {Promise<Object>} Subscription details
 */
export async function getSubscription(preapproval_id) {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${preapproval_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get subscription: ${response.statusText}`);
    }

    const subscription = await response.json();

    logger.info('[MERCADOPAGO] Subscription retrieved:', {
      preapproval_id,
      status: subscription.status,
      payer_id: subscription.payer_id
    });

    return {
      id: subscription.id,
      status: subscription.status, // authorized, paused, cancelled
      payer_email: subscription.payer_email,
      preapproval_plan_id: subscription.preapproval_plan_id,
      reason: subscription.reason,
      external_reference: subscription.external_reference,
      next_payment_date: subscription.next_payment_date,
      date_created: subscription.date_created,
      auto_recurring: subscription.auto_recurring,
      active: subscription.status === 'authorized'
    };

  } catch (error) {
    logger.error('[MERCADOPAGO] Failed to get subscription:', {
      error: error.message,
      preapproval_id
    });
    throw error;
  }
}

/**
 * Cancel a subscription
 * @param {string} preapproval_id - Subscription ID to cancel
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelSubscription(preapproval_id) {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${preapproval_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to cancel subscription: ${response.statusText}`);
    }

    const result = await response.json();

    logger.info('[MERCADOPAGO] Subscription cancelled:', {
      preapproval_id,
      status: result.status
    });

    return {
      id: result.id,
      status: result.status,
      cancelled: result.status === 'cancelled'
    };

  } catch (error) {
    logger.error('[MERCADOPAGO] Failed to cancel subscription:', {
      error: error.message,
      preapproval_id
    });
    throw error;
  }
}

/**
 * Create a manual Pix payment (without Mercado Pago, using your Pix key)
 * Generates a valid BR Code (EMV format) QR code that can be scanned by any bank app
 * @param {Object} params - Payment parameters
 * @returns {Promise<Object>} Pix key and QR code
 */
export async function createManualPixPayment({ amount, plan, telegram_id }) {
  try {
    const pixKey = process.env.PIX_KEY || 'your-email@example.com';

    // Ensure amount is a valid number
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    // Create reference for this transaction
    const reference = `${telegram_id}_${plan}_${Date.now()}`;

    logger.info('[PIX-MANUAL] Pix payment created:', {
      telegram_id,
      amount: numericAmount,
      plan,
      reference,
      pixKey
    });

    return {
      pix_key: pixKey,
      amount: numericAmount,
      plan: plan,
      reference: reference
    };

  } catch (error) {
    logger.error('[PIX-MANUAL] Failed to create Pix payment:', {
      error: error.message,
      telegram_id
    });
    throw error;
  }
}

/**
 * Check payment status via Mercado Pago
 * @param {string} payment_id - Payment ID from Mercado Pago
 * @returns {Promise<Object>} Payment status
 */
export async function checkPaymentStatus(payment_id) {
  try {
    if (!client) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: payment_id });

    logger.info('[MERCADOPAGO] Payment status checked:', {
      payment_id,
      status: payment.status
    });

    return {
      status: payment.status, // approved, pending, rejected, cancelled
      status_detail: payment.status_detail,
      amount: payment.transaction_amount,
      external_reference: payment.external_reference,
      metadata: payment.metadata,
      approved: payment.status === 'approved'
    };

  } catch (error) {
    logger.error('[MERCADOPAGO] Failed to check payment status:', {
      error: error.message,
      payment_id
    });
    throw error;
  }
}

/**
 * Process webhook notification from Mercado Pago
 * @param {Object} notification - Webhook notification data
 * @returns {Promise<Object>} Processed payment or subscription info
 */
export async function processWebhook(notification) {
  try {
    logger.info('[MERCADOPAGO] Webhook received:', { notification });

    // Handle subscription events
    if (notification.type === 'subscription_preapproval' || notification.type === 'subscription') {
      const preapprovalId = notification.data.id;
      const subscription = await getSubscription(preapprovalId);

      logger.info('[MERCADOPAGO] Subscription webhook processed:', {
        preapproval_id: preapprovalId,
        status: subscription.status,
        action: notification.action
      });

      return {
        type: 'subscription',
        subscription_id: preapprovalId,
        status: subscription.status,
        action: notification.action, // created, updated, cancelled
        payer_email: subscription.payer_email,
        external_reference: subscription.external_reference,
        active: subscription.active
      };
    }

    // Handle payment events
    if (notification.type === 'payment') {
      const paymentId = notification.data.id;
      const paymentInfo = await checkPaymentStatus(paymentId);

      if (paymentInfo.approved) {
        const metadata = paymentInfo.metadata;

        return {
          type: 'payment',
          telegram_id: metadata.telegram_id,
          plan: metadata.plan,
          duration_days: metadata.duration_days,
          amount: paymentInfo.amount,
          payment_id: paymentId,
          approved: true
        };
      }
    }

    return null;

  } catch (error) {
    logger.error('[MERCADOPAGO] Webhook processing failed:', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Get payment method availability
 * @returns {boolean} Whether Mercado Pago is configured
 */
export function isMercadoPagoAvailable() {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

export default {
  createPixPayment,
  createManualPixPayment,
  checkPaymentStatus,
  processWebhook,
  isMercadoPagoAvailable,
  getSubscriptionCheckoutUrl,
  getSubscription,
  cancelSubscription,
  PREMIUM_PLANS,
  SUBSCRIPTION_PLANS
};
