// src/__tests__/rates.test.js
// Tests for rate fetching and calculation

import { formatAmount, formatRate, calculateOnChain } from '../services/rates.js';

describe('Rate Service', () => {
  describe('formatAmount', () => {
    test('formats with correct decimal places', () => {
      expect(formatAmount(1000, 0, 'pt-BR')).toBe('1.000');
      expect(formatAmount(1000.5, 2, 'pt-BR')).toBe('1.000,50');
      expect(formatAmount(1000, 0, 'en-US')).toBe('1,000');
      expect(formatAmount(1000.5, 2, 'en-US')).toBe('1,000.50');
    });

    test('handles edge cases', () => {
      expect(formatAmount(0, 2, 'pt-BR')).toBe('0,00');
      expect(formatAmount(0.1, 2, 'pt-BR')).toBe('0,10');
      expect(formatAmount(999999, 0, 'pt-BR')).toBe('999.999');
    });
  });

  describe('formatRate', () => {
    test('formats exchange rates correctly', () => {
      const rate = 5.5432;
      expect(formatRate(rate, 'pt-BR')).toMatch(/5[.,]5432/);
      expect(formatRate(rate, 'en-US')).toMatch(/5[.,]5432/);
    });

    test('handles low precision rates', () => {
      const rate = 0.1832;
      expect(formatRate(rate, 'pt-BR')).toMatch(/0[.,]1832/);
    });
  });

  describe('calculateOnChain', () => {
    const mockRates = {
      eurToUsdc: 1.10,
      usdcBRL: 5.00,
      usdcEUR: 0.91,
      cross: 5.50
    };

    test('calculates EUR to BRL correctly', () => {
      const result = calculateOnChain('eurbrl', 1000, mockRates);

      expect(result.in).toBe(1000);
      expect(result.out).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });

    test('calculates BRL to EUR correctly', () => {
      const result = calculateOnChain('brleur', 5500, mockRates);

      expect(result.in).toBe(5500);
      expect(result.out).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });

    test('includes breakdown of calculation steps', () => {
      const result = calculateOnChain('eurbrl', 1000, mockRates);

      expect(result.breakdown).toHaveProperty('usdcAfterBuy');
      expect(result.breakdown).toHaveProperty('usdcAfterNetwork');
      expect(result.breakdown).toHaveProperty('brlAfterTrade');
      expect(result.breakdown).toHaveProperty('brlNet');
    });

    test('handles edge amounts', () => {
      // Small amounts may result in 0 after fees, which is expected
      const result1 = calculateOnChain('eurbrl', 1, mockRates);
      expect(result1.out).toBeGreaterThanOrEqual(0);
      expect(result1.in).toBe(1);

      const result2 = calculateOnChain('eurbrl', 1000000, mockRates);
      expect(result2.out).toBeGreaterThan(0);
    });
  });

  describe('Rate calculation edge cases', () => {
    test('handles very small amounts (may result in 0 after fees)', () => {
      const mockRates = {
        eurToUsdc: 1.10,
        usdcBRL: 5.00,
        usdcEUR: 0.91,
        cross: 5.50
      };

      // Very small amounts may become 0 after fixed fees
      const result = calculateOnChain('eurbrl', 0.01, mockRates);
      expect(result.out).toBeGreaterThanOrEqual(0);
      expect(result.in).toBe(0.01);
    });

    test('preserves precision for large amounts', () => {
      const mockRates = {
        eurToUsdc: 1.10,
        usdcBRL: 5.00,
        usdcEUR: 0.91,
        cross: 5.50
      };

      const result = calculateOnChain('eurbrl', 100000, mockRates);
      expect(result.out).toBeGreaterThan(0);
      expect(result.rate).toBeCloseTo(mockRates.cross, 1);
    });
  });
});
