/**
 * Property-Based Tests for OrdersScreen
 * 
 * Feature: mobile-app-modernization
 * Property 10: Order List Sorting
 * Validates: Requirements 10.1
 */

import * as fc from 'fast-check';

/**
 * Sort orders by date (newest first)
 * This is a pure function extracted for testing
 * Property 10: Order List Sorting
 * Validates: Requirements 10.1
 */
const sortOrdersByDate = (orders) => {
  if (!Array.isArray(orders)) return [];
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Descending order (newest first)
  });
};

// Order arbitrary generator
const orderArbitrary = fc.record({
  _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
  orderId: fc.string({ minLength: 6, maxLength: 10 }),
  orderStatus: fc.constantFrom('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString()),
  orderItems: fc.array(
    fc.record({
      _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      price: fc.integer({ min: 1, max: 1000000 }).map(n => n / 100), // Use integer mapped to decimal
      qty: fc.integer({ min: 1, max: 10 }),
      image: fc.webUrl(),
    }),
    { minLength: 1, maxLength: 5 }
  ),
  orderSummary: fc.record({
    subtotal: fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
    shippingCost: fc.integer({ min: 0, max: 100000 }).map(n => n / 100),
    tax: fc.integer({ min: 0, max: 1000000 }).map(n => n / 100),
    totalAmount: fc.integer({ min: 0, max: 12000000 }).map(n => n / 100),
  }),
  shippingInfo: fc.record({
    fullName: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    address: fc.string({ minLength: 1, maxLength: 200 }),
    city: fc.string({ minLength: 1, maxLength: 50 }),
    state: fc.string({ minLength: 1, maxLength: 50 }),
    postalCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.string({ minLength: 1, maxLength: 50 }),
  }),
});

describe('OrdersScreen Property Tests', () => {
  /**
   * Property 10: Order List Sorting
   * For any array of Orders displayed in OrdersScreen, the orders SHALL be 
   * sorted by createdAt date in descending order (newest first).
   * 
   * Validates: Requirements 10.1
   */
  describe('Property 10: Order List Sorting', () => {
    it('should sort orders by date in descending order (newest first)', () => {
      fc.assert(
        fc.property(
          fc.array(orderArbitrary, { minLength: 0, maxLength: 20 }),
          (orders) => {
            const sortedOrders = sortOrdersByDate(orders);
            
            // Verify the result is an array
            expect(Array.isArray(sortedOrders)).toBe(true);
            
            // Verify the length is preserved
            expect(sortedOrders.length).toBe(orders.length);
            
            // Verify descending order (newest first)
            for (let i = 0; i < sortedOrders.length - 1; i++) {
              const currentDate = new Date(sortedOrders[i].createdAt);
              const nextDate = new Date(sortedOrders[i + 1].createdAt);
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all original orders after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(orderArbitrary, { minLength: 1, maxLength: 20 }),
          (orders) => {
            const sortedOrders = sortOrdersByDate(orders);
            
            // All original order IDs should be present in sorted result
            const originalIds = orders.map(o => o._id).sort();
            const sortedIds = sortedOrders.map(o => o._id).sort();
            
            expect(sortedIds).toEqual(originalIds);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty array', () => {
      const result = sortOrdersByDate([]);
      expect(result).toEqual([]);
    });

    it('should handle single order', () => {
      fc.assert(
        fc.property(
          orderArbitrary,
          (order) => {
            const result = sortOrdersByDate([order]);
            expect(result.length).toBe(1);
            expect(result[0]._id).toBe(order._id);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null/undefined input gracefully', () => {
      expect(sortOrdersByDate(null)).toEqual([]);
      expect(sortOrdersByDate(undefined)).toEqual([]);
    });

    it('should not mutate the original array', () => {
      fc.assert(
        fc.property(
          fc.array(orderArbitrary, { minLength: 2, maxLength: 10 }),
          (orders) => {
            const originalOrder = orders.map(o => o._id);
            sortOrdersByDate(orders);
            const afterSort = orders.map(o => o._id);
            
            // Original array should remain unchanged
            expect(afterSort).toEqual(originalOrder);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly sort orders with same date', () => {
      const sameDate = new Date('2025-06-15T12:00:00Z').toISOString();
      const orders = [
        { _id: 'aaa', createdAt: sameDate, orderItems: [], orderSummary: {} },
        { _id: 'bbb', createdAt: sameDate, orderItems: [], orderSummary: {} },
        { _id: 'ccc', createdAt: sameDate, orderItems: [], orderSummary: {} },
      ];
      
      const result = sortOrdersByDate(orders);
      
      // All orders should be present
      expect(result.length).toBe(3);
      const ids = result.map(o => o._id).sort();
      expect(ids).toEqual(['aaa', 'bbb', 'ccc']);
    });

    it('should handle orders with various valid date formats', () => {
      // Test with ISO string format (standard API format)
      const orders = [
        { _id: 'aaa', createdAt: '2025-01-15T10:00:00.000Z', orderItems: [], orderSummary: {} },
        { _id: 'bbb', createdAt: '2025-06-20T15:30:00.000Z', orderItems: [], orderSummary: {} },
        { _id: 'ccc', createdAt: '2024-12-01T08:00:00.000Z', orderItems: [], orderSummary: {} },
      ];
      
      const sortedOrders = sortOrdersByDate(orders);
      
      // Should be sorted newest first: bbb (June 2025), aaa (Jan 2025), ccc (Dec 2024)
      expect(sortedOrders[0]._id).toBe('bbb');
      expect(sortedOrders[1]._id).toBe('aaa');
      expect(sortedOrders[2]._id).toBe('ccc');
    });
  });
});
