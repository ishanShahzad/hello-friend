const Product = require('../../models/Product');

describe('Product model', () => {
  test('keeps product name and description and sanitizes markdown formatting', () => {
    const product = new Product({
      name: '**Product Name:** Toy Horse',
      description: '* **Durable & Safe:** Built for imaginative play.',
      price: 1000,
      category: 'Toys',
      brand: 'Rozare',
      stock: 5,
      image: 'https://example.com/toy-horse.jpg',
    });

    const plain = product.toObject();

    expect(plain.name).toBe('Toy Horse');
    expect(plain.description).toBe('Durable & Safe: Built for imaginative play.');
    expect(plain.description).not.toContain('*');
  });
});
