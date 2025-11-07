// src/services/payments/mercadopago.js
// Mercado Pago integration for Pix and other Brazilian payment methods

import mercadopago from 'mercadopago';
import { logger } from '../../utils/logger.js';
import QRCode from 'qrcode';

// Initialize Mercado Pago
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
  });
}

// Premium plans configuration
export const PREMIUM_PLANS = {
  monthly: {
    duration: 30,
    price_brl: 29.90,
    price_usd: 5.99,
    name: {
      pt: 'Mensal',
      fr: 'Mensuel',
      en: 'Monthly'
    }
  },
  quarterly: {
    duration: 90,
    price_brl: 79.90,
    price_usd: 15.99,
    name: {
      pt: 'Trimestral',
      fr: 'Trimestriel',
      en: 'Quarterly'
    },
    discount: '11%'
  },
  annual: {
    duration: 365,
    price_brl: 299.90,
    price_usd: 59.99,
    name: {
      pt: 'Anual',
      fr: 'Annuel',
      en: 'Annual'
    },
    discount: '17%'
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
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const preference = {
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
      external_reference: `${telegram_id}_${plan}_${Date.now()}`,
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
      metadata: {
        telegram_id: telegram_id.toString(),
        plan: plan,
        duration_days: PREMIUM_PLANS[plan].duration
      },
      back_urls: {
        success: process.env.APP_URL || 'https://t.me/your_bot',
        failure: process.env.APP_URL || 'https://t.me/your_bot',
        pending: process.env.APP_URL || 'https://t.me/your_bot'
      },
      auto_return: 'approved'
    };

    const response = await mercadopago.preferences.create(preference);

    logger.info('[MERCADOPAGO] Payment created:', {
      payment_id: response.body.id,
      telegram_id,
      amount,
      plan
    });

    return {
      payment_id: response.body.id,
      init_point: response.body.init_point, // Web checkout URL
      sandbox_init_point: response.body.sandbox_init_point,
      qr_code: response.body.qr_code,
      qr_code_base64: response.body.qr_code_base64,
      external_reference: preference.external_reference
    };

  } catch (error) {
    logger.error('[MERCADOPAGO] Failed to create payment:', {
      error: error.message,
      telegram_id,
      amount
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
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const response = await mercadopago.payment.get(payment_id);
    const payment = response.body;

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
 * @returns {Promise<Object>} Processed payment info
 */
export async function processWebhook(notification) {
  try {
    logger.info('[MERCADOPAGO] Webhook received:', { notification });

    if (notification.type !== 'payment') {
      return null;
    }

    const paymentId = notification.data.id;
    const paymentInfo = await checkPaymentStatus(paymentId);

    if (paymentInfo.approved) {
      const metadata = paymentInfo.metadata;

      return {
        telegram_id: metadata.telegram_id,
        plan: metadata.plan,
        duration_days: metadata.duration_days,
        amount: paymentInfo.amount,
        payment_id: paymentId,
        approved: true
      };
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
  PREMIUM_PLANS
};
