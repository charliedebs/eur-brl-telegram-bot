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

// Legacy: Premium plans configuration for webhook processing only
// One-shot payments are no longer offered; this is maintained for existing/in-flight transactions
export const PAYPAL_PLANS = {
  '3months': {
    duration: 90,
    price: 4.50,
    name: {
      pt: '3 Meses',
      fr: '3 Mois',
      en: '3 Months'
    }
  },
  '6months': {
    duration: 180,
    price: 8,
    name: {
      pt: '6 Meses',
      fr: '6 Mois',
      en: '6 Months'
    }
  },
  '12months': {
    duration: 365,
    price: 15,
    name: {
      pt: '12 Meses',
      fr: '12 Mois',
      en: '12 Months'
    }
  }
};

// Subscription plans in EUR (RECURRING payments)
export const PAYPAL_SUBSCRIPTION_PLANS = {
  quarterly: {
    plan_id: process.env.PAYPAL_PLAN_QUARTERLY || 'P-5GM58683CP051012DNEH3L4Q',
    frequency: 3,
    frequency_type: 'months',
    price: 4,
    currency: 'EUR',
    name: {
      pt: 'Trimestral',
      fr: 'Trimestriel',
      en: 'Quarterly'
    }
  },
  semiannual: {
    plan_id: process.env.PAYPAL_PLAN_SEMIANNUAL || 'P-0MP817582K270421ENEH3M7A',
    frequency: 6,
    frequency_type: 'months',
    price: 7,
    currency: 'EUR',
    name: {
      pt: 'Semestral',
      fr: 'Semestriel',
      en: '6-Month'
    }
  },
  annual: {
    plan_id: process.env.PAYPAL_PLAN_ANNUAL || 'P-16U732542L388551KNEH3NYQ',
    frequency: 12,
    frequency_type: 'months',
    price: 12,
    currency: 'EUR',
    name: {
      pt: 'Anual',
      fr: 'Annuel',
      en: 'Annual'
    }
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
 * Get subscription checkout URL for PayPal
 * @param {Object} params - Subscription parameters
 * @param {string} params.plan - Plan type (quarterly, semiannual, annual)
 * @param {string} params.telegram_id - User's Telegram ID
 * @returns {Object} Subscription checkout URL and metadata
 */
export function getSubscriptionCheckoutUrl({ plan, telegram_id }) {
  const planConfig = PAYPAL_SUBSCRIPTION_PLANS[plan];

  if (!planConfig || !planConfig.plan_id) {
    throw new Error(`Invalid PayPal subscription plan: ${plan}`);
  }

  const checkoutUrl = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${planConfig.plan_id}`;

  logger.info('[PAYPAL] Subscription checkout URL generated:', {
    plan,
    telegram_id,
    plan_id: planConfig.plan_id,
    price: planConfig.price,
    currency: planConfig.currency
  });

  return {
    checkout_url: checkoutUrl,
    plan_id: planConfig.plan_id,
    plan_name: planConfig.name,
    price: planConfig.price,
    currency: planConfig.currency,
    frequency: planConfig.frequency,
    frequency_type: planConfig.frequency_type,
    metadata: {
      telegram_id: telegram_id.toString(),
      plan: plan
    }
  };
}

/**
 * Get subscription details from PayPal
 * @param {string} subscription_id - PayPal subscription ID
 * @returns {Promise<Object>} Subscription details
 */
export async function getSubscription(subscription_id) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Get access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const baseUrl = mode === 'live'
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';

    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await tokenResponse.json();

    // Get subscription details
    const response = await fetch(
      `${baseUrl}/v1/billing/subscriptions/${subscription_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get subscription: ${response.statusText}`);
    }

    const subscription = await response.json();

    logger.info('[PAYPAL] Subscription retrieved:', {
      subscription_id,
      status: subscription.status,
      subscriber_email: subscription.subscriber?.email_address
    });

    return {
      id: subscription.id,
      status: subscription.status, // APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
      plan_id: subscription.plan_id,
      subscriber_email: subscription.subscriber?.email_address,
      start_time: subscription.start_time,
      billing_info: subscription.billing_info,
      active: subscription.status === 'ACTIVE'
    };

  } catch (error) {
    logger.error('[PAYPAL] Failed to get subscription:', {
      error: error.message,
      subscription_id
    });
    throw error;
  }
}

/**
 * Cancel a PayPal subscription
 * @param {string} subscription_id - Subscription ID to cancel
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelSubscription(subscription_id, reason = 'User requested cancellation') {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Get access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const baseUrl = mode === 'live'
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';

    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await tokenResponse.json();

    // Cancel subscription
    const response = await fetch(
      `${baseUrl}/v1/billing/subscriptions/${subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to cancel subscription: ${response.statusText}`);
    }

    logger.info('[PAYPAL] Subscription cancelled:', {
      subscription_id,
      reason
    });

    return {
      id: subscription_id,
      cancelled: true,
      reason
    };

  } catch (error) {
    logger.error('[PAYPAL] Failed to cancel subscription:', {
      error: error.message,
      subscription_id
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
 * @returns {Promise<Object|null>} Processed payment or subscription info or null
 */
export async function processWebhook(event) {
  try {
    logger.info('[PAYPAL] Webhook received:', {
      event_type: event.event_type,
      resource_id: event.resource?.id
    });

    // Handle subscription events
    if (event.event_type === 'BILLING.SUBSCRIPTION.CREATED' ||
        event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscription = event.resource;

      logger.info('[PAYPAL] Subscription webhook processed:', {
        subscription_id: subscription.id,
        status: subscription.status,
        event_type: event.event_type
      });

      return {
        type: 'subscription',
        subscription_id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        subscriber_email: subscription.subscriber?.email_address,
        event_type: event.event_type,
        active: subscription.status === 'ACTIVE'
      };
    }

    if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
        event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED' ||
        event.event_type === 'BILLING.SUBSCRIPTION.EXPIRED') {
      const subscription = event.resource;

      logger.info('[PAYPAL] Subscription status change:', {
        subscription_id: subscription.id,
        status: subscription.status,
        event_type: event.event_type
      });

      return {
        type: 'subscription_change',
        subscription_id: subscription.id,
        status: subscription.status,
        event_type: event.event_type,
        active: false
      };
    }

    // Handle one-time payment events
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const orderId = capture.supplementary_data?.related_ids?.order_id;

      if (orderId) {
        const orderDetails = await getOrderDetails(orderId);

        return {
          type: 'payment',
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
  // Check if PayPal is explicitly enabled (set PAYPAL_ENABLED=true to enable)
  const isEnabled = process.env.PAYPAL_ENABLED === 'true';
  const hasCredentials = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

  return isEnabled && hasCredentials;
}

export default {
  createPayPalOrder,
  capturePayPalOrder,
  getOrderDetails,
  processWebhook,
  verifyWebhookSignature,
  isPayPalAvailable,
  getSubscriptionCheckoutUrl,
  getSubscription,
  cancelSubscription,
  PAYPAL_PLANS,
  PAYPAL_SUBSCRIPTION_PLANS
};
