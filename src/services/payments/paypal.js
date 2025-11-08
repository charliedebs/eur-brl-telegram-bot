// src/services/payments/paypal.js
// PayPal integration for international payments

import paypal from '@paypal/checkout-server-sdk';
import { logger } from '../../utils/logger.js';

// PayPal environment setup
let paypalClient = null;

function getPayPalClient() {
  if (!paypalClient) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    let environment;
    if (mode === 'live') {
      environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
    } else {
      environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    }

    paypalClient = new paypal.core.PayPalHttpClient(environment);
    logger.info('[PAYPAL] Client initialized:', { mode });
  }

  return paypalClient;
}

// Premium plans in USD
export const PAYPAL_PLANS = {
  monthly: {
    duration: 30,
    price: 5.99,
    name: 'Monthly Premium'
  },
  quarterly: {
    duration: 90,
    price: 15.99,
    name: 'Quarterly Premium',
    discount: '11%'
  },
  annual: {
    duration: 365,
    price: 59.99,
    name: 'Annual Premium',
    discount: '17%'
  }
};

/**
 * Create a PayPal order
 * @param {Object} params - Order parameters
 * @param {string} params.plan - Plan type (monthly, quarterly, annual)
 * @param {string} params.telegram_id - User's Telegram ID
 * @param {string} params.currency - Currency code (default: USD)
 * @returns {Promise<Object>} Order data with approval URL
 */
export async function createPayPalOrder({ plan, telegram_id, currency = 'USD' }) {
  try {
    const client = getPayPalClient();
    const planInfo = PAYPAL_PLANS[plan];

    if (!planInfo) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `${telegram_id}_${plan}_${Date.now()}`,
        description: `${planInfo.name} - EUR/BRL Telegram Bot`,
        custom_id: telegram_id.toString(),
        amount: {
          currency_code: currency,
          value: planInfo.price.toFixed(2)
        }
      }],
      application_context: {
        brand_name: 'EUR/BRL Bot',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.APP_URL || 'https://t.me/your_bot'}/payment/success`,
        cancel_url: `${process.env.APP_URL || 'https://t.me/your_bot'}/payment/cancel`
      }
    });

    const response = await client.execute(request);
    const order = response.result;

    // Find approval URL
    const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

    logger.info('[PAYPAL] Order created:', {
      order_id: order.id,
      telegram_id,
      plan,
      amount: planInfo.price
    });

    return {
      order_id: order.id,
      status: order.status,
      approval_url: approvalUrl,
      amount: planInfo.price,
      currency: currency,
      plan: plan,
      duration_days: planInfo.duration
    };

  } catch (error) {
    logger.error('[PAYPAL] Failed to create order:', {
      error: error.message,
      telegram_id,
      plan
    });
    throw error;
  }
}

/**
 * Capture a PayPal order after approval
 * @param {string} order_id - PayPal order ID
 * @returns {Promise<Object>} Captured payment details
 */
export async function capturePayPalOrder(order_id) {
  try {
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(order_id);
    request.requestBody({});

    const response = await client.execute(request);
    const order = response.result;

    const capture = order.purchase_units[0].payments.captures[0];
    const telegram_id = order.purchase_units[0].custom_id;
    const reference_id = order.purchase_units[0].reference_id;

    // Extract plan from reference_id
    const planMatch = reference_id.match(/_([^_]+)_\d+$/);
    const plan = planMatch ? planMatch[1] : 'monthly';

    logger.info('[PAYPAL] Order captured:', {
      order_id,
      telegram_id,
      status: capture.status
    });

    return {
      order_id: order.id,
      capture_id: capture.id,
      telegram_id: telegram_id,
      plan: plan,
      duration_days: PAYPAL_PLANS[plan]?.duration || 30,
      amount: parseFloat(capture.amount.value),
      currency: capture.amount.currency_code,
      status: capture.status,
      approved: capture.status === 'COMPLETED'
    };

  } catch (error) {
    logger.error('[PAYPAL] Failed to capture order:', {
      error: error.message,
      order_id
    });
    throw error;
  }
}

/**
 * Get order details
 * @param {string} order_id - PayPal order ID
 * @returns {Promise<Object>} Order details
 */
export async function getOrderDetails(order_id) {
  try {
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersGetRequest(order_id);

    const response = await client.execute(request);
    const order = response.result;

    logger.info('[PAYPAL] Order details retrieved:', {
      order_id,
      status: order.status
    });

    return {
      order_id: order.id,
      status: order.status,
      telegram_id: order.purchase_units[0].custom_id,
      amount: order.purchase_units[0].amount.value,
      currency: order.purchase_units[0].amount.currency_code
    };

  } catch (error) {
    logger.error('[PAYPAL] Failed to get order details:', {
      error: error.message,
      order_id
    });
    throw error;
  }
}

/**
 * Process PayPal webhook
 * @param {Object} event - Webhook event data
 * @returns {Promise<Object|null>} Processed payment info or null
 */
export async function processWebhook(event) {
  try {
    logger.info('[PAYPAL] Webhook received:', {
      event_type: event.event_type,
      resource_id: event.resource?.id
    });

    // Handle different event types
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const orderId = capture.supplementary_data?.related_ids?.order_id;

      if (orderId) {
        const orderDetails = await getOrderDetails(orderId);

        return {
          telegram_id: orderDetails.telegram_id,
          order_id: orderId,
          capture_id: capture.id,
          amount: parseFloat(capture.amount.value),
          currency: capture.amount.currency_code,
          approved: true
        };
      }
    }

    return null;

  } catch (error) {
    logger.error('[PAYPAL] Webhook processing failed:', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Verify webhook signature (important for security)
 * @param {Object} headers - Request headers
 * @param {Object} body - Request body
 * @returns {Promise<boolean>} Whether signature is valid
 */
export async function verifyWebhookSignature(headers, body) {
  try {
    // PayPal webhook verification
    // In production, implement proper signature verification
    // See: https://developer.paypal.com/api/rest/webhooks/

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      logger.warn('[PAYPAL] Webhook ID not configured, skipping verification');
      return true; // Allow in development
    }

    // TODO: Implement proper signature verification in production
    return true;

  } catch (error) {
    logger.error('[PAYPAL] Webhook verification failed:', {
      error: error.message
    });
    return false;
  }
}

/**
 * Get payment method availability
 * @returns {boolean} Whether PayPal is configured
 */
export function isPayPalAvailable() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export default {
  createPayPalOrder,
  capturePayPalOrder,
  getOrderDetails,
  processWebhook,
  verifyWebhookSignature,
  isPayPalAvailable,
  PAYPAL_PLANS
};
