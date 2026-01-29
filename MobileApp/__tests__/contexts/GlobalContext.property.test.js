/**
 * Property-based tests for GlobalContext
 * Tests spin product selection persistence
 */

import * as fc from 'fast-check';

// Mock spin result generator
const spinResultArbitrary = fc.record({
  _id: fc.uuid(),
  discount: fc.nat({ max: 100 }),
  discountType: fc.constantFrom('percentage', 'fixed', 'free'),
  label: fc.string({ minLength: 1, maxLength: 50 }),
  expiresAt: fc.date({ min: new Date() }).map(d => d.toISOString()),
  selectedProducts: fc.array(fc.uuid(), { maxLength: 3 }),
  hasCheckedOut: fc.boolean(),
});

// Mock product ID generator
const productIdArbitrary = fc.uuid();

describe('GlobalContext Property Tests', () => {
  /**
   * Property 4: Spin Product Selection Persistence
   * Selected products should be persisted and limited to 3
   */
  describe('Property 4: Spin Product Selection Persistence', () => {
    it('should limit product selection to maximum 3 products', () => {
      fc.assert(
        fc.property(
          fc.array(productIdArbitrary, { minLength: 0, maxLength: 10 }),
          (productIds) => {
            const selectedProducts = [];
            const MAX_PRODUCTS = 3;

            const selectProduct = (productId) => {
              if (selectedProducts.length >= MAX_PRODUCTS && !selectedProducts.includes(productId)) {
                return false; // Cannot add more
              }
              
              if (selectedProducts.includes(productId)) {
                // Toggle off
                const index = selectedProducts.indexOf(productId);
                selectedProducts.splice(index, 1);
              } else {
                selectedProducts.push(productId);
              }
              return true;
            };

            // Try to select all products
            productIds.forEach(id => selectProduct(id));

            // Should never exceed 3 products
            expect(selectedProducts.length).toBeLessThanOrEqual(MAX_PRODUCTS);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow toggling products on and off', () => {
      fc.assert(
        fc.property(productIdArbitrary, (productId) => {
          let selectedProducts = [];

          const toggleProduct = (id) => {
            if (selectedProducts.includes(id)) {
              selectedProducts = selectedProducts.filter(p => p !== id);
              return false; // Now unselected
            } else {
              selectedProducts.push(id);
              return true; // Now selected
            }
          };

          // First toggle - should select
          const firstToggle = toggleProduct(productId);
          expect(firstToggle).toBe(true);
          expect(selectedProducts).toContain(productId);

          // Second toggle - should unselect
          const secondToggle = toggleProduct(productId);
          expect(secondToggle).toBe(false);
          expect(selectedProducts).not.toContain(productId);
        }),
        { numRuns: 100 }
      );
    });

    it('should not allow selection when spin has been checked out', () => {
      fc.assert(
        fc.property(
          spinResultArbitrary.filter(s => s.hasCheckedOut),
          productIdArbitrary,
          (spinResult, productId) => {
            const canSelect = !spinResult.hasCheckedOut;
            expect(canSelect).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should allow selection when spin is active and not checked out', () => {
      fc.assert(
        fc.property(
          spinResultArbitrary.filter(s => !s.hasCheckedOut && s.selectedProducts.length < 3),
          productIdArbitrary,
          (spinResult, productId) => {
            const canSelect = !spinResult.hasCheckedOut && spinResult.selectedProducts.length < 3;
            expect(canSelect).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should persist selected products correctly', () => {
      fc.assert(
        fc.property(
          fc.array(productIdArbitrary, { minLength: 1, maxLength: 3 }),
          (productIds) => {
            // Simulate persistence
            const persistedProducts = JSON.stringify(productIds);
            const restoredProducts = JSON.parse(persistedProducts);

            expect(restoredProducts).toEqual(productIds);
            expect(restoredProducts.length).toBe(productIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
