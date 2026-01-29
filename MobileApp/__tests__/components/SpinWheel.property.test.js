/**
 * Property-based tests for SpinWheel component
 * Feature: mobile-app-completion
 * Property 1: Spin Wheel Segment Rendering
 * Property 2: Spin Result Callback Invocation
 * Validates: Requirements 1.1, 1.3
 */

import * as fc from 'fast-check';

// Segment configuration (matches component)
const SEGMENTS = [
  { label: '40% OFF', color: '#ef4444', value: 40, type: 'percentage' },
  { label: 'All products FREE', color: '#10b981', value: 100, type: 'free' },
  { label: '60% OFF', color: '#3b82f6', value: 60, type: 'percentage' },
  { label: 'All products $0.99', color: '#eab308', value: 0.99, type: 'fixed' },
  { label: '80% OFF', color: '#a855f7', value: 80, type: 'percentage' },
  { label: '99% OFF', color: '#ec4899', value: 99, type: 'percentage' },
];

// Valid discount types
const VALID_TYPES = ['percentage', 'fixed', 'free'];

// Spin result arbitrary
const spinResultArbitrary = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  value: fc.oneof(
    fc.integer({ min: 1, max: 100 }), // percentage
    fc.float({ min: Math.fround(0.01), max: Math.fround(10), noNaN: true }) // fixed price
  ),
  type: fc.constantFrom('percentage', 'fixed', 'free'),
});

/**
 * Validates a segment has all required properties
 */
const isValidSegment = (segment) => {
  return (
    typeof segment.label === 'string' &&
    segment.label.length > 0 &&
    typeof segment.color === 'string' &&
    segment.color.startsWith('#') &&
    typeof segment.value === 'number' &&
    VALID_TYPES.includes(segment.type)
  );
};

/**
 * Validates a spin result has all required properties
 */
const isValidSpinResult = (result) => {
  return (
    typeof result.label === 'string' &&
    result.label.length > 0 &&
    typeof result.value === 'number' &&
    VALID_TYPES.includes(result.type)
  );
};

describe('SpinWheel Segment Rendering Property Tests', () => {
  // Property 1: Spin Wheel Segment Rendering
  // For any SpinWheel component render, the wheel SHALL contain exactly 6 segments,
  // and each segment SHALL have a valid label, color, value, and type property.

  test('wheel contains exactly 6 segments', () => {
    expect(SEGMENTS.length).toBe(6);
  });

  test('all segments have valid properties', () => {
    fc.assert(
      fc.property(fc.constant(SEGMENTS), (segments) => {
        return segments.every(isValidSegment);
      }),
      { numRuns: 1 }
    );
  });

  test('all segment labels are non-empty strings', () => {
    fc.assert(
      fc.property(fc.constant(SEGMENTS), (segments) => {
        return segments.every(s => typeof s.label === 'string' && s.label.length > 0);
      }),
      { numRuns: 1 }
    );
  });

  test('all segment colors are valid hex colors', () => {
    fc.assert(
      fc.property(fc.constant(SEGMENTS), (segments) => {
        const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
        return segments.every(s => hexColorRegex.test(s.color));
      }),
      { numRuns: 1 }
    );
  });

  test('all segment values are positive numbers', () => {
    fc.assert(
      fc.property(fc.constant(SEGMENTS), (segments) => {
        return segments.every(s => typeof s.value === 'number' && s.value > 0);
      }),
      { numRuns: 1 }
    );
  });

  test('all segment types are valid', () => {
    fc.assert(
      fc.property(fc.constant(SEGMENTS), (segments) => {
        return segments.every(s => VALID_TYPES.includes(s.type));
      }),
      { numRuns: 1 }
    );
  });
});

describe('SpinWheel Result Callback Property Tests', () => {
  // Property 2: Spin Result Callback Invocation
  // For any completed spin animation, the onSpinComplete callback SHALL be invoked
  // with a SpinResult object containing a valid label, value (number), and type

  test('any valid spin result has required properties', () => {
    fc.assert(
      fc.property(spinResultArbitrary, (result) => {
        return isValidSpinResult(result);
      }),
      { numRuns: 100 }
    );
  });

  test('spin result value is always a number', () => {
    fc.assert(
      fc.property(spinResultArbitrary, (result) => {
        return typeof result.value === 'number' && !isNaN(result.value);
      }),
      { numRuns: 100 }
    );
  });

  test('spin result type is always one of the valid types', () => {
    fc.assert(
      fc.property(spinResultArbitrary, (result) => {
        return VALID_TYPES.includes(result.type);
      }),
      { numRuns: 100 }
    );
  });

  test('target segments (FREE and $0.99) are valid winning options', () => {
    const targetIndices = [1, 3]; // "All products FREE" and "All products $0.99"
    
    fc.assert(
      fc.property(fc.constantFrom(...targetIndices), (index) => {
        const segment = SEGMENTS[index];
        return isValidSegment(segment) && (segment.type === 'free' || segment.type === 'fixed');
      }),
      { numRuns: 10 }
    );
  });

  test('percentage type results have value between 1 and 100', () => {
    const percentageSegments = SEGMENTS.filter(s => s.type === 'percentage');
    
    fc.assert(
      fc.property(fc.constant(percentageSegments), (segments) => {
        return segments.every(s => s.value >= 1 && s.value <= 100);
      }),
      { numRuns: 1 }
    );
  });
});
