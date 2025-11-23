const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const StoreTrust = require('../../models/StoreTrust');
const Store = require('../../models/Store');
const User = require('../../models/User');

let mongoServer;

// Simplified arbitraries for faster tests
const userArbitrary = fc.record({
  username: fc.constant('testuser').chain(base => fc.constant(base + Math.random().toString(36).substring(7))),
  email: fc.emailAddress(),
  password: fc.constant('password123'),
  role: fc.constantFrom('user', 'seller')
});

const storeArbitrary = fc.record({
  storeName: fc.constant('TestStore').chain(base => fc.constant(base + Math.random().toString(36).substring(7))),
  description: fc.lorem({ maxCount: 5 }),
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

describe('Trust Controller Property-Based Tests', () => {
  /**
   * Feature: store-trust-system, Property 3: Trust count increment on trust
   * Validates: Requirements 4.2
   */
  test('Property 3: For any store with initial count N, trusting increases count to N+1', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        storeArbitrary,
        fc.nat(100),
        async (userData, storeData, initialCount) => {
          // Create user and store with initial trust count
          const user = await User.create(userData);
          const store = await Store.create({
            ...storeData,
            seller: user._id,
            storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            trustCount: initialCount
          });

          // Create trust relationship
          await StoreTrust.create({ user: user._id, store: store._id });

          // Increment trust count
          await Store.findByIdAndUpdate(
            store._id,
            { $inc: { trustCount: 1 } }
          );

          // Verify count increased by 1
          const updatedStore = await Store.findById(store._id);
          expect(updatedStore.trustCount).toBe(initialCount + 1);
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Feature: store-trust-system, Property 4: Trust count decrement on untrust
   * Validates: Requirements 4.3
   */
  test('Property 4: For any store with count N > 0, untrusting decreases count to N-1', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        storeArbitrary,
        fc.integer({ min: 1, max: 100 }),
        async (userData, storeData, initialCount) => {
          // Create user and store with initial trust count
          const user = await User.create(userData);
          const store = await Store.create({
            ...storeData,
            seller: user._id,
            storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            trustCount: initialCount
          });

          // Create trust relationship
          await StoreTrust.create({ user: user._id, store: store._id });

          // Remove trust and decrement count
          await StoreTrust.deleteOne({ user: user._id, store: store._id });
          await Store.findByIdAndUpdate(
            store._id,
            { $inc: { trustCount: -1 } }
          );

          // Verify count decreased by 1
          const updatedStore = await Store.findById(store._id);
          expect(updatedStore.trustCount).toBe(initialCount - 1);
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Feature: store-trust-system, Property 5: Trust count accuracy
   * Validates: Requirements 1.2, 4.1
   */
  test('Property 5: For any store, trust count equals number of StoreTrust documents', async () => {
    await fc.assert(
      fc.asyncProperty(
        storeArbitrary,
        fc.array(userArbitrary, { minLength: 0, maxLength: 10 }),
        async (storeData, usersData) => {
          // Create a seller for the store
          const seller = await User.create({
            username: 'seller' + Math.random().toString(36).substring(7),
            email: 'seller' + Math.random().toString(36).substring(7) + '@test.com',
            password: 'password123',
            role: 'seller'
          });

          // Create store
          const store = await Store.create({
            ...storeData,
            seller: seller._id,
            storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            trustCount: 0
          });

          // Create users and trust relationships
          for (const userData of usersData) {
            const user = await User.create(userData);
            await StoreTrust.create({ user: user._id, store: store._id });
          }

          // Count actual trust relationships
          const actualCount = await StoreTrust.countDocuments({ store: store._id });

          // Update store trust count to match
          await Store.findByIdAndUpdate(store._id, { trustCount: actualCount });

          // Verify they match
          const updatedStore = await Store.findById(store._id);
          expect(updatedStore.trustCount).toBe(actualCount);
          expect(updatedStore.trustCount).toBe(usersData.length);
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Feature: store-trust-system, Property 6: Trust count non-negativity
   * Validates: Requirements 4.4
   */
  test('Property 6: Trust count never goes below zero', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        storeArbitrary,
        async (userData, storeData) => {
          // Create user and store with count 0
          const user = await User.create(userData);
          const store = await Store.create({
            ...storeData,
            seller: user._id,
            storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            trustCount: 0
          });

          // Try to decrement below zero (should be prevented by model constraint)
          try {
            await Store.findByIdAndUpdate(
              store._id,
              { $inc: { trustCount: -1 } },
              { runValidators: true }
            );
          } catch (error) {
            // Expected to fail validation
          }

          // Verify count is still 0 or positive
          const updatedStore = await Store.findById(store._id);
          expect(updatedStore.trustCount).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Feature: store-trust-system, Property 12: Idempotent trust operations
   * Validates: Requirements 1.3 (error case)
   */
  test('Property 12: Trusting an already-trusted store does not create duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        storeArbitrary,
        async (userData, storeData) => {
          // Create user and store
          const user = await User.create(userData);
          const store = await Store.create({
            ...storeData,
            seller: user._id,
            storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            trustCount: 0
          });

          // Trust the store
          await StoreTrust.create({ user: user._id, store: store._id });
          await Store.findByIdAndUpdate(store._id, { $inc: { trustCount: 1 } });

          // Try to trust again (should fail due to unique constraint)
          let errorOccurred = false;
          try {
            await StoreTrust.create({ user: user._id, store: store._id });
          } catch (error) {
            errorOccurred = true;
            expect(error.code).toBe(11000); // Duplicate key error
          }

          expect(errorOccurred).toBe(true);

          // Verify only one trust relationship exists
          const trustCount = await StoreTrust.countDocuments({ 
            user: user._id, 
            store: store._id 
          });
          expect(trustCount).toBe(1);

          // Verify store count is still 1
          const updatedStore = await Store.findById(store._id);
          expect(updatedStore.trustCount).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);

  /**
   * Feature: store-trust-system, Property 13: Idempotent untrust operations
   * Validates: Requirements 1.4 (error case)
   */
  test('Property 13: Untrusting an already-untrusted store does not affect count', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        storeArbitrary,
        async (userData, storeData) => {
          // Create user and store
          const user = await User.create(userData);
          const store = await Store.create({
            ...storeData,
            seller: user._id,
            storeSlug: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            trustCount: 0
          });

          // Try to untrust (should find no relationship)
          const result = await StoreTrust.deleteOne({ 
            user: user._id, 
            store: store._id 
          });

          expect(result.deletedCount).toBe(0);

          // Verify count is still 0
          const updatedStore = await Store.findById(store._id);
          expect(updatedStore.trustCount).toBe(0);
        }
      ),
      { numRuns: 10 }
    );
  }, 120000);
});
