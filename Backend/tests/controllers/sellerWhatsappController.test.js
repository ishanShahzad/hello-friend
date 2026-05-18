const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../models/User');
const WhatsAppOTP = require('../../models/WhatsAppOTP');
const { verifyWhatsAppOTP, consumeVerifiedWhatsAppNumber } = require('../../controllers/sellerWhatsappController');

let mongoServer;

const resMock = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeUser = (overrides = {}) =>
  User.create({
    username: overrides.username || `user-${Date.now()}-${Math.random()}`,
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    role: overrides.role || 'user',
    isVerified: true,
    sellerInfo: overrides.sellerInfo || {},
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    WhatsAppOTP.deleteMany({}),
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('seller WhatsApp verification', () => {
  test('keeps verified OTP proof for an authenticated buyer becoming a seller', async () => {
    const buyer = await makeUser({ role: 'user' });
    await WhatsAppOTP.create({
      number: '923001112222',
      otp: '123456',
      sellerId: buyer._id,
      attempts: 0,
      verified: false,
    });

    const req = {
      user: { id: buyer._id, role: 'user' },
      body: { whatsappNumber: '+923001112222', otp: '123456' },
    };
    const res = resMock();

    await verifyWhatsAppOTP(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const otpRecord = await WhatsAppOTP.findOne({ number: '923001112222' });
    expect(otpRecord).toBeTruthy();
    expect(otpRecord.verified).toBe(true);
    expect(otpRecord.verifiedAt).toBeTruthy();

    const updatedBuyer = await User.findById(buyer._id);
    expect(updatedBuyer.sellerInfo?.whatsappVerified).not.toBe(true);
  });

  test('consumes verified OTP proof once during seller activation', async () => {
    await WhatsAppOTP.create({
      number: '923001112222',
      otp: '123456',
      attempts: 0,
      verified: true,
      verifiedAt: new Date(),
    });

    await expect(consumeVerifiedWhatsAppNumber('+923001112222')).resolves.toBe(true);
    await expect(consumeVerifiedWhatsAppNumber('+923001112222')).resolves.toBe(false);
  });

  test('updates and clears OTP immediately for an existing seller changing settings', async () => {
    const seller = await makeUser({ role: 'seller' });
    await WhatsAppOTP.create({
      number: '923009998888',
      otp: '654321',
      sellerId: seller._id,
      attempts: 0,
      verified: false,
    });

    const req = {
      user: { id: seller._id, role: 'seller' },
      body: { whatsappNumber: '+923009998888', otp: '654321' },
    };
    const res = resMock();

    await verifyWhatsAppOTP(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    await expect(WhatsAppOTP.findOne({ number: '923009998888' })).resolves.toBeNull();

    const updatedSeller = await User.findById(seller._id);
    expect(updatedSeller.sellerInfo.whatsappNumber).toBe('+923009998888');
    expect(updatedSeller.sellerInfo.whatsappVerified).toBe(true);
  });
});
