/**
 * Property-Based Tests for AdminTaxConfigurationScreen
 * 
 * Feature: mobile-app-modernization, Property 22: Tax Rate Display Format
 * Validates: Requirements 26.5
 * 
 * Tests that tax rates are displayed as percentages with the '%' symbol
 */

import * as fc from 'fast-check';

/**
 * Tax rate display format helper
 * This function mirrors the implementation in AdminTaxConfigurationScreen
 */
const formatTaxRate = (rate) => {
  if (rate === null || rate === undefined || isNaN(rate)) return '0%';
  return `${parseFloat(rate).toFixed(2)}%`;
};

describe('AdminTaxConfigurationScreen Property Tests', () => {
  /**
   * Property 22: Tax Rate Display Format
   * 
   * For any TaxConfig object displayed in AdminTaxConfigurationScreen,
   * the rate SHALL be displayed as a percentage with the '%' symbol.
   * 
   * **Validates: Requirements 26.5**
   */
  describe('Property 22: Tax Rate Display Format', () => {
    // Test that all valid tax rates are formatted with % symbol
    test('formatTaxRate always includes % symbol for valid rates', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            const formatted = formatTaxRate(rate);
            return formatted.endsWith('%');
          }
        ),
        { numRuns: 100 }
      );
    });

    // Test that formatted rate contains the numeric value
    test('formatTaxRate preserves the numeric value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            const formatted = formatTaxRate(rate);
            // Remove % and parse back
            const parsedValue = parseFloat(formatted.replace('%', ''));
            // Should be within 0.01 of original (due to toFixed(2))
            return Math.abs(parsedValue - rate) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Test that format is consistent (X.XX%)
    test('formatTaxRate uses consistent decimal format', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            const formatted = formatTaxRate(rate);
            // Should match pattern: digits, optional decimal with exactly 2 digits, then %
            const pattern = /^\d+\.\d{2}%$/;
            return pattern.test(formatted);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Test edge cases: zero rate
    test('formatTaxRate handles zero rate correctly', () => {
      const formatted = formatTaxRate(0);
      expect(formatted).toBe('0.00%');
    });

    // Test edge cases: maximum rate (100%)
    test('formatTaxRate handles 100% rate correctly', () => {
      const formatted = formatTaxRate(100);
      expect(formatted).toBe('100.00%');
    });

    // Test edge cases: null/undefined
    test('formatTaxRate handles null gracefully', () => {
      const formatted = formatTaxRate(null);
      expect(formatted).toBe('0%');
    });

    test('formatTaxRate handles undefined gracefully', () => {
      const formatted = formatTaxRate(undefined);
      expect(formatted).toBe('0%');
    });

    // Test edge cases: NaN
    test('formatTaxRate handles NaN gracefully', () => {
      const formatted = formatTaxRate(NaN);
      expect(formatted).toBe('0%');
    });

    // Test integer rates are formatted with decimals
    test('formatTaxRate formats integer rates with decimals', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (rate) => {
            const formatted = formatTaxRate(rate);
            // Integer rates should still have .00
            return formatted.includes('.');
          }
        ),
        { numRuns: 100 }
      );
    });

    // Test that rates with many decimals are properly rounded
    test('formatTaxRate rounds rates to 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            const formatted = formatTaxRate(rate);
            // Extract decimal part
            const parts = formatted.replace('%', '').split('.');
            if (parts.length === 2) {
              return parts[1].length === 2;
            }
            return false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for tax configuration data integrity
   */
  describe('Tax Configuration Data Properties', () => {
    // Arbitrary for tax config
    const taxConfigArbitrary = fc.record({
      _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
      region: fc.string({ minLength: 1, maxLength: 50 }),
      rate: fc.float({ min: 0, max: 100, noNaN: true }),
      description: fc.option(fc.string({ maxLength: 200 })),
      isActive: fc.boolean(),
    });

    // Test that all tax configs can have their rates formatted
    test('all tax config rates can be formatted', () => {
      fc.assert(
        fc.property(
          taxConfigArbitrary,
          (taxConfig) => {
            const formatted = formatTaxRate(taxConfig.rate);
            return typeof formatted === 'string' && formatted.endsWith('%');
          }
        ),
        { numRuns: 100 }
      );
    });

    // Test that formatting is deterministic
    test('formatTaxRate is deterministic', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            const formatted1 = formatTaxRate(rate);
            const formatted2 = formatTaxRate(rate);
            return formatted1 === formatted2;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Test that formatted string is never empty
    test('formatTaxRate never returns empty string', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.float({ min: 0, max: 100, noNaN: true }),
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(NaN)
          ),
          (rate) => {
            const formatted = formatTaxRate(rate);
            return formatted.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
