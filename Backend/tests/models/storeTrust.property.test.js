const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const StoreTrust = require('../../models/StoreTrust');
const Store = require('../../models/Store');
const User = require('../../models/User');

let mongoServer;

// Custom arbitraries for generating test data
const userArbitrary = fc.record({
  username: fc.lorem({ maxCount: 1 }).map(s => (s.substring(0, 20) || 'user') + Math.random().toString(36).substring(7)),
  email: fc.emailAddress(),
  password: fc.lorem({ maxCount: 1 }).map(s => s.substring(0, 20) || 'password123'),
  role: fc.constantFrom('user', 'seller')
});

const storeArbitrary = fc.record({
  storeName: fc.lorem({ maxCount: 2 }).map(s => (s.substring(0, 50) || 'Store') + Math.random().toString(36).substring(7)),
  description: fc.lorem({ maxCount: 10 }).map(s => s.substring(0, 500)),
  isActive: fc.boolean()
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);

beforeEach(async () => {
  await StoreTrust.deleteMany({});
  await Store.deleteMany({});
  await User.deleteMany({});
});

describe('StoreTrust Property-Based Tests', () => {
  /**
   * Feature: store-trust-system, Property 1: Trust relationship creation
   * Validates: Requirements 1.3, 5.1
   */
  test('Property 1: For any user and untrusted store, trusting creates a relationship in the database', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, storeArbitrary, async (userData, storeData) => {
        // Create user and store
        const user = await User.create(userData);
        const store = await Store.create({
          ...storeData,
          seller: user._id,
          storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-')
        });

        // Verify no trust relationship exists initially
        const initialTrust = await StoreTrust.findOne({ user: user._id, store: store._id });
        expect(initialTrust).toBeNull();

        // Create trust relationship
        const storeTrust = await StoreTrust.create({
          user: user._id,
          store: store._id
        });

        // Verify trust relationship exists
        const createdTrust = await StoreTrust.findOne({ user: user._id, store: store._id });
        expect(createdTrust).not.toBeNull();
        expect(createdTrust.user.toString()).toBe(user._id.toString());
        expect(createdTrust.store.toString()).toBe(store._id.toString());
      }),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Feature: store-trust-system, Property 2: Trust relationship removal
   * Validates: Requirements 1.4, 5.2
   */
  test('Property 2: For any user and trusted store, untrusting removes the relationship from the database', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, storeArbitrary, async (userData, storeData) => {
        // Create user and store
        const user = await User.create(userData);
        const store = await Store.create({
          ...storeData,
          seller: user._id,
          storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-')
        });

        // Create trust relationship
        await StoreTrust.create({
          user: user._id,
          store: store._id
        });

        // Verify trust exists
        const trustBefore = await StoreTrust.findOne({ user: user._id, store: store._id });
        expect(trustBefore).not.toBeNull();

        // Remove trust relationship
        await StoreTrust.deleteOne({ user: user._id, store: store._id });

        // Verify trust no longer exists
        const trustAfter = await StoreTrust.findOne({ user: user._id, store: store._id });
        expect(trustAfter).toBeNull();
      }),
      { numRuns: 10 }
    );
  }, 120000);
});
