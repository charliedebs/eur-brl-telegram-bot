// src/services/payments/index.js
// Unified payment service handling all payment methods

import * as MercadoPago from './mercadopago.js';
import * as PayPal from './paypal.js';
import { DatabaseService } from '../database.js';
import { logger } from '../../utils/logger.js';

const db = new DatabaseService();

/**
 * Get available payment methods for user based on location/preference
 * @param {string} userCountry - User's country code (optional)
 * @returns {Array} Available payment methods
 */
export function getAvailablePaymentMethods(userCountry = null) {
  const methods = [];

  // Pix/Mercado Pago for Brazilian users
  if (MercadoPago.isMercadoPagoAvailable()) {
    methods.push({
      id: 'mercadopago',
      name: 'Mercado Pago / Pix',
      currency: 'BRL',
      icon: '🇧🇷',
      recommended: userCountry === 'BR',
      description: {
        pt: 'Pagamento instantâneo via Pix ou cartão',
        fr: 'Paiement instantané via Pix ou carte',
        en: 'Instant payment via Pix or card'
      }
    });
  }

  // Manual Pix always available (requires manual confirmation)
  methods.push({
    id: 'pix_manual',
    name: 'Pix Manual',
    currency: 'BRL',
    icon: '🏦',
    manual: true,
    description: {
      pt: 'Pagamento via Pix com confirmação manual',
      fr: 'Paiement via Pix avec confirmation manuelle',
      en: 'Pix payment with manual confirmation'
    }
  });

  // PayPal for international users
  if (PayPal.isPayPalAvailable()) {
    methods.push({
      id: 'paypal',
      name: 'PayPal',
      currency: 'USD',
      icon: '💳',
      recommended: userCountry !== 'BR',
      description: {
        pt: 'Pagamento internacional via PayPal',
        fr: 'Paiement international via PayPal',
        en: 'International payment via PayPal'
      }
    });
  }

  return methods;
}

/**
 * Get premium plans with prices in all currencies
 * @returns {Object} Plans with prices
 */
export function getPremiumPlans() {
  return {
    monthly: {
      duration: 30,
      prices: {
        BRL: 29.90,
        USD: 5.99
      },
      name: {
        pt: 'Mensal',
        fr: 'Mensuel',
        en: 'Monthly'
      },
      features: {
        pt: ['Alertas personalizados', 'Sem limite de consultas', 'Suporte prioritário'],
        fr: ['Alertes personnalisées', 'Consultations illimitées', 'Support prioritaire'],
        en: ['Custom alerts', 'Unlimited queries', 'Priority support']
      }
    },
    quarterly: {
      duration: 90,
      prices: {
        BRL: 79.90,
        USD: 15.99
      },
      discount: '11%',
      name: {
        pt: 'Trimestral',
        fr: 'Trimestriel',
        en: 'Quarterly'
      },
      features: {
        pt: ['Tudo do Mensal', '11% de desconto', '3 meses de acesso'],
        fr: ['Tout du Mensuel', '11% de réduction', "3 mois d'accès"],
        en: ['All Monthly features', '11% discount', '3 months access']
      }
    },
    annual: {
      duration: 365,
      prices: {
        BRL: 299.90,
        USD: 59.99
      },
      discount: '17%',
      name: {
        pt: 'Anual',
        fr: 'Annuel',
        en: 'Annual'
      },
      features: {
        pt: ['Tudo do Mensal', '17% de desconto', '12 meses de acesso'],
        fr: ['Tout du Mensuel', '17% de réduction', "12 mois d'accès"],
        en: ['All Monthly features', '17% discount', '12 months access']
      }
    }
  };
}

/**
 * Initiate a payment
 * @param {Object} params - Payment parameters
 * @param {string} params.telegram_id - User's Telegram ID
 * @param {string} params.plan - Plan type (monthly, quarterly, annual)
 * @param {string} params.method - Payment method (mercadopago, pix_manual, paypal)
 * @param {string} params.email - User's email (optional)
 * @returns {Promise<Object>} Payment initiation data
 */
export async function initiatePayment({ telegram_id, plan, method, email }) {
  try {
    logger.info('[PAYMENT] Initiating payment:', {
      telegram_id,
      plan,
      method
    });

    const plans = getPremiumPlans();
    const planInfo = plans[plan];

    if (!planInfo) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    let paymentData;

    switch (method) {
      case 'mercadopago':
        paymentData = await MercadoPago.createPixPayment({
          amount: planInfo.prices.BRL,
          plan,
          email,
          telegram_id,
          description: `Premium ${plan} - EUR/BRL Bot`
        });
        paymentData.method = 'mercadopago';
        paymentData.currency = 'BRL';
        break;

      case 'pix_manual':
        paymentData = await MercadoPago.createManualPixPayment({
          amount: planInfo.prices.BRL,
          plan,
          telegram_id
        });
        paymentData.method = 'pix_manual';
        paymentData.currency = 'BRL';
        paymentData.manual = true;
        break;

      case 'paypal':
        paymentData = await PayPal.createPayPalOrder({
          plan,
          telegram_id,
          currency: 'USD'
        });
        paymentData.method = 'paypal';
        paymentData.currency = 'USD';
        break;

      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }

    // Save payment record to database
    await db.createPayment({
      telegram_id,
      plan,
      method,
      amount: paymentData.amount || planInfo.prices[paymentData.currency],
      currency: paymentData.currency,
      payment_id: paymentData.payment_id || paymentData.order_id,
      status: 'pending',
      data: paymentData
    });

    logger.info('[PAYMENT] Payment initiated successfully:', {
      telegram_id,
      method,
      payment_id: paymentData.payment_id || paymentData.order_id
    });

    return {
      ...paymentData,
      plan_info: planInfo
    };

  } catch (error) {
    logger.error('[PAYMENT] Failed to initiate payment:', {
      error: error.message,
      telegram_id,
      plan,
      method
    });
    throw error;
  }
}

/**
 * Confirm manual payment (admin action)
 * @param {string} payment_id - Payment reference ID
 * @param {string} telegram_id - User's Telegram ID
 * @returns {Promise<Object>} Confirmation result
 */
export async function confirmManualPayment(payment_id, telegram_id) {
  try {
    logger.info('[PAYMENT] Confirming manual payment:', {
      payment_id,
      telegram_id
    });

    // Get payment record
    const payment = await db.getPayment(payment_id);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'approved') {
      throw new Error('Payment already confirmed');
    }

    // Activate premium
    const result = await activatePremium(telegram_id, payment.plan);

    // Update payment status
    await db.updatePaymentStatus(payment_id, 'approved');

    logger.info('[PAYMENT] Manual payment confirmed:', {
      payment_id,
      telegram_id,
      plan: payment.plan
    });

    return result;

  } catch (error) {
    logger.error('[PAYMENT] Failed to confirm manual payment:', {
      error: error.message,
      payment_id
    });
    throw error;
  }
}

/**
 * Activate premium subscription for user
 * @param {string} telegram_id - User's Telegram ID
 * @param {string} plan - Plan type
 * @returns {Promise<Object>} Activation result
 */
export async function activatePremium(telegram_id, plan) {
  try {
    const plans = getPremiumPlans();
    const planInfo = plans[plan];

    if (!planInfo) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + planInfo.duration * 24 * 60 * 60 * 1000);

    // Update user premium status
    await db.updateUser(telegram_id, {
      premium_until: expiresAt.toISOString()
    });

    logger.info('[PAYMENT] Premium activated:', {
      telegram_id,
      plan,
      expires_at: expiresAt.toISOString()
    });

    return {
      telegram_id,
      plan,
      duration_days: planInfo.duration,
      expires_at: expiresAt,
      activated: true
    };

  } catch (error) {
    logger.error('[PAYMENT] Failed to activate premium:', {
      error: error.message,
      telegram_id,
      plan
    });
    throw error;
  }
}

/**
 * Check if user has active premium
 * @param {string} telegram_id - User's Telegram ID
 * @returns {Promise<boolean>} Whether user is premium
 */
export async function checkPremiumStatus(telegram_id) {
  return await db.isPremium(telegram_id);
}

/**
 * Get user's premium details
 * @param {string} telegram_id - User's Telegram ID
 * @returns {Promise<Object|null>} Premium details or null
 */
export async function getPremiumDetails(telegram_id) {
  try {
    const user = await db.getUser(telegram_id);

    if (!user || !user.premium_until) {
      return null;
    }

    const now = new Date();
    const premiumUntil = new Date(user.premium_until);
    const isActive = premiumUntil > now;

    if (!isActive) {
      return null;
    }

    const daysRemaining = Math.ceil((premiumUntil - now) / (1000 * 60 * 60 * 24));

    return {
      is_premium: true,
      expires_at: premiumUntil,
      days_remaining: daysRemaining,
      expired: false
    };

  } catch (error) {
    logger.error('[PAYMENT] Failed to get premium details:', {
      error: error.message,
      telegram_id
    });
    return null;
  }
}

export default {
  getAvailablePaymentMethods,
  getPremiumPlans,
  initiatePayment,
  confirmManualPayment,
  activatePremium,
  checkPremiumStatus,
  getPremiumDetails,
  MercadoPago,
  PayPal
};
