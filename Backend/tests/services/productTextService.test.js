const {
  sanitizeProductDescription,
  sanitizeProductName,
} = require('../../services/productTextService');

describe('productTextService', () => {
  test('removes markdown stars and bullet markers from AI product descriptions', () => {
    const description = `This charming toy horse is ready for adventure!

*   **Durable & Safe:** Built to last with child-friendly materials.
*   **Encourages Imagination:** Inspires creative storytelling.

Bring home this delightful toy horse.`;

    const clean = sanitizeProductDescription(description);

    expect(clean).not.toContain('*');
    expect(clean).toContain('Durable & Safe: Built to last with child-friendly materials.');
    expect(clean).toContain('Encourages Imagination: Inspires creative storytelling.');
    expect(clean).toContain('Bring home this delightful toy horse.');
  });

  test('cleans markdown labels from product names', () => {
    expect(sanitizeProductName('**Product Name:** Toy Horse')).toBe('Toy Horse');
  });
});
