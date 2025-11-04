// src/__tests__/validation.test.js
// Tests for input validation utilities

import {
  validateAmount,
  parseAndValidateAmount,
  validateThreshold
} from '../utils/validation.js';

describe('Input Validation', () => {
  describe('validateAmount', () => {
    test('accepts valid amounts', () => {
      expect(validateAmount(100)).toBe(100);
      expect(validateAmount(1)).toBe(1);
      expect(validateAmount(1000000)).toBe(1000000);
      expect(validateAmount(50.5)).toBe(50.5);
    });

    test('rejects invalid amounts', () => {
      expect(validateAmount(0)).toBeNull();
      expect(validateAmount(-100)).toBeNull();
      expect(validateAmount(1000001)).toBeNull();
      expect(validateAmount(NaN)).toBeNull();
      expect(validateAmount(Infinity)).toBeNull();
      expect(validateAmount(null)).toBeNull();
      expect(validateAmount(undefined)).toBeNull();
    });

    test('respects custom min/max', () => {
      expect(validateAmount(50, 100, 200)).toBeNull();
      expect(validateAmount(150, 100, 200)).toBe(150);
      expect(validateAmount(250, 100, 200)).toBeNull();
    });
  });

  describe('parseAndValidateAmount', () => {
    test('parses European format (1.000,50)', () => {
      expect(parseAndValidateAmount('1.000,50')).toBe(1000.50);
      expect(parseAndValidateAmount('5.000')).toBe(5000);
    });

    test('parses US format (1,000.50)', () => {
      expect(parseAndValidateAmount('1,000.50')).toBe(1000.50);
      expect(parseAndValidateAmount('5,000')).toBe(5000);
    });

    test('parses simple numbers', () => {
      expect(parseAndValidateAmount('1000')).toBe(1000);
      expect(parseAndValidateAmount('100.50')).toBe(100.50);
    });

    test('handles currency symbols', () => {
      expect(parseAndValidateAmount('€1000')).toBe(1000);
      expect(parseAndValidateAmount('R$5000')).toBe(5000);
      expect(parseAndValidateAmount('1000€')).toBe(1000);
    });

    test('rejects invalid input', () => {
      expect(parseAndValidateAmount('')).toBeNull();
      expect(parseAndValidateAmount('abc')).toBeNull();
      expect(parseAndValidateAmount('---')).toBeNull();
      expect(parseAndValidateAmount(null)).toBeNull();
    });

    test('rejects out-of-bounds amounts', () => {
      expect(parseAndValidateAmount('0')).toBeNull();
      expect(parseAndValidateAmount('-100')).toBeNull();
      expect(parseAndValidateAmount('2000000')).toBeNull();
    });
  });

  describe('validateThreshold', () => {
    describe('absolute thresholds', () => {
      test('accepts valid EUR/BRL rates', () => {
        expect(validateThreshold(5.5, 'absolute', 'eurbrl')).toBe(5.5);
        expect(validateThreshold(6.0, 'absolute', 'eurbrl')).toBe(6.0);
      });

      test('rejects invalid EUR/BRL rates', () => {
        expect(validateThreshold(2.5, 'absolute', 'eurbrl')).toBeNull();
        expect(validateThreshold(11.0, 'absolute', 'eurbrl')).toBeNull();
      });

      test('accepts valid BRL/EUR rates', () => {
        expect(validateThreshold(0.15, 'absolute', 'brleur')).toBe(0.15);
        expect(validateThreshold(0.20, 'absolute', 'brleur')).toBe(0.20);
      });

      test('rejects invalid BRL/EUR rates', () => {
        expect(validateThreshold(0.05, 'absolute', 'brleur')).toBeNull();
        expect(validateThreshold(0.50, 'absolute', 'brleur')).toBeNull();
      });
    });

    describe('relative thresholds', () => {
      test('accepts valid percentages', () => {
        expect(validateThreshold(1, 'relative')).toBe(1);
        expect(validateThreshold(5, 'relative')).toBe(5);
        expect(validateThreshold(10, 'relative')).toBe(10);
        expect(validateThreshold(50, 'relative')).toBe(50);
      });

      test('rejects invalid percentages', () => {
        expect(validateThreshold(0, 'relative')).toBeNull();
        expect(validateThreshold(0.05, 'relative')).toBeNull();
        expect(validateThreshold(51, 'relative')).toBeNull();
        expect(validateThreshold(100, 'relative')).toBeNull();
      });
    });

    test('handles invalid input', () => {
      expect(validateThreshold(NaN, 'absolute', 'eurbrl')).toBeNull();
      expect(validateThreshold(null, 'absolute', 'eurbrl')).toBeNull();
      expect(validateThreshold(undefined, 'relative')).toBeNull();
    });
  });
});
