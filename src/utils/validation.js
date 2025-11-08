// src/utils/validation.js
// Input validation utilities

/**
 * Validate an amount for currency conversion
 * @param {number} amount - The amount to validate
 * @param {number} min - Minimum allowed value (default: 1)
 * @param {number} max - Maximum allowed value (default: 1,000,000)
 * @returns {number|null} - Valid amount or null if invalid
 */
export function validateAmount(amount, min = 1, max = 1000000) {
  if (!amount || !isFinite(amount) || amount < min || amount > max) {
    return null;
  }
  return amount;
}

/**
 * Parse and validate amount from user input
 * @param {string} input - User input string
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number|null} - Valid amount or null if invalid
 */
export function parseAndValidateAmount(input, min = 1, max = 1000000) {
  if (!input) return null;

  // Remove non-numeric characters except . , and -
  const cleaned = String(input).replace(/[^\d.,-]/g, '');

  // Reject if starts with minus (negative numbers)
  if (cleaned.startsWith('-')) return null;

  // Handle European format (1.000,50) and US format (1,000.50)
  let normalized;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both present: determine which is decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastDot > lastComma) {
      // Dot comes after comma: US format (1,000.50)
      normalized = cleaned.replace(/,/g, '');
    } else {
      // Comma comes after dot: European format (1.000,50)
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    // Only comma: check if it's thousands separator or decimal
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      // Pattern like "5,000" - likely US thousands separator
      normalized = cleaned.replace(',', '');
    } else {
      // Pattern like "5,50" - likely decimal separator
      normalized = cleaned.replace(',', '.');
    }
  } else if (cleaned.includes('.')) {
    // Only dot: check if it's likely a thousands separator
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // Pattern like "5.000" - likely European thousands separator
      normalized = cleaned.replace('.', '');
    } else {
      // Pattern like "5.50" - likely decimal
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }

  const amount = parseFloat(normalized);
  return validateAmount(amount, min, max);
}

/**
 * Validate alert threshold value
 * @param {number} value - Threshold value
 * @param {string} type - 'absolute' or 'relative'
 * @param {string} pair - Currency pair (for range validation)
 * @returns {number|null} - Valid value or null if invalid
 */
export function validateThreshold(value, type, pair) {
  if (!value || !isFinite(value)) return null;

  if (type === 'absolute') {
    // EUR/BRL typically ranges from 4.5 to 7.5
    // BRL/EUR typically ranges from 0.13 to 0.22
    if (pair === 'eurbrl') {
      return validateAmount(value, 3.0, 10.0);
    } else if (pair === 'brleur') {
      return validateAmount(value, 0.10, 0.35);
    }
  } else if (type === 'relative') {
    // Relative thresholds: 0.1% to 50%
    return validateAmount(value, 0.1, 50);
  }

  return null;
}
